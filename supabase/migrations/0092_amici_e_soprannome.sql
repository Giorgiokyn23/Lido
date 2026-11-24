-- ============================================================
-- LidoRank — 0092: soprannome pubblico e amicizie reciproche
--
-- È il primo pezzo del lato social, e porta con sé tre decisioni che non sono
-- tecniche. Le scrivo qui perché fra sei mesi nessuno si ricorderà perché il
-- codice è così, e sembreranno complicazioni inutili da semplificare.
--
-- ─────────────────────────────────────────────────────────────
-- 1. L'OGGETTO SOCIALE È LA VISITA, NON LA RECENSIONE.
--
-- Su LidoRank le recensioni sono anonime, e devono restarlo: è l'anonimato
-- che permette a una persona di scrivere che un bagno è caro sapendo che ci
-- tornerà l'estate prossima, nella stessa città dove il gestore la conosce di
-- vista. Un social di recensioni firmate ucciderebbe esattamente questo.
--
-- Però un social non ha bisogno delle recensioni. Segui una persona perché è
-- stata in quaranta bagni della costa, non per il voto che ha dato a uno di
-- questi. Quindi: la VISITA si firma (è già in `liste_utente`, 0087), il VOTO
-- resta anonimo, e in questo file `reviews` non compare mai.
--
-- ─────────────────────────────────────────────────────────────
-- 2. AMICI RECIPROCI, NON «SEGUACI».
--
-- Beli e i social di ristoranti usano il seguire asimmetrico: chiunque può
-- seguire chiunque. Qui no, e non per somigliare meno a loro.
--
-- L'elenco dei bagni che una persona ha visitato, con le date, è la cronologia
-- di dove si trovava fisicamente una persona reale. Con il seguire
-- asimmetrico, chiunque — un ex, un datore di lavoro, un molestatore —
-- potrebbe guardare quella cronologia senza che lei possa farci niente. Con
-- l'amicizia reciproca, quella cronologia la vede solo chi è stato accettato.
--
-- Costa un passaggio in più (la richiesta va accettata) e una crescita più
-- lenta. È il prezzo giusto per non pubblicare gli spostamenti delle persone.
--
-- ─────────────────────────────────────────────────────────────
-- 3. IL NOME PUBBLICO È UN SOPRANNOME.
--
-- Non chiediamo il nome vero e non lo mostriamo. Si sceglie un soprannome
-- breve, unico, che sta in un indirizzo: è con quello che gli amici si
-- trovano. Chi non ne sceglie uno semplicemente non ha un profilo pubblico e
-- continua a usare il sito com'è adesso — il social è un'aggiunta, non un
-- pedaggio.
--
-- Esegui DOPO 0091. Idempotente.
-- ============================================================

-- 1) Il soprannome -----------------------------------------------------------
alter table public.profili add column if not exists handle text;
alter table public.profili
  add column if not exists liste_pubbliche boolean not null default false;

-- Unico senza distinzione fra maiuscole e minuscole: «Anna» e «anna» non
-- devono poter essere due persone diverse, o la somiglianza fra i due diventa
-- un modo per farsi passare per un altro.
create unique index if not exists profili_handle_unico
  on public.profili (lower(handle)) where handle is not null;

create or replace function public.handle_valido(_h text)
  returns boolean
  language sql
  immutable
as $$
  -- Lettere minuscole, cifre e trattino basso. Niente punti (si confondono
  -- con i domini), niente trattini normali (si confondono col meno a capo),
  -- niente maiuscole (vedi sopra). Da 3 a 20 caratteri.
  select _h ~ '^[a-z0-9_]{3,20}$'
     and _h !~ '^_'
     and _h !~ '_$';
$$;

alter table public.profili drop constraint if exists profili_handle_forma;
alter table public.profili
  add constraint profili_handle_forma
  check (handle is null or public.handle_valido(handle));

-- Soprannomi che non si possono prendere: sarebbero un modo per sembrare il
-- sito stesso, e «admin» che ti scrive è il primo passo di ogni truffa.
create table if not exists public.handle_riservati (handle text primary key);
insert into public.handle_riservati (handle) values
  ('admin'), ('amministratore'), ('lidorank'), ('staff'), ('moderazione'),
  ('moderatore'), ('supporto'), ('assistenza'), ('info'), ('root'),
  ('api'), ('www'), ('login'), ('eventi'), ('classifiche'), ('profilo'),
  ('gestore'), ('ufficiale'), ('verificato'), ('help'), ('support')
on conflict (handle) do nothing;

create or replace function public.imposta_handle(_handle text, _nome text default null)
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_h text := lower(btrim(coalesce(_handle, '')));
begin
  if auth.uid() is null then
    raise exception 'serve_accesso';
  end if;
  if not public.handle_valido(v_h) then
    raise exception 'handle_non_valido';
  end if;
  if exists (select 1 from public.handle_riservati r where r.handle = v_h) then
    raise exception 'handle_riservato';
  end if;
  if exists (
    select 1 from public.profili p
     where lower(p.handle) = v_h and p.user_id <> auth.uid()
  ) then
    raise exception 'handle_occupato';
  end if;

  insert into public.profili (user_id, ruolo, handle, nome)
  values (auth.uid(), 'cittadino', v_h, nullif(btrim(coalesce(_nome, '')), ''))
  on conflict (user_id) do update
    set handle = v_h,
        nome = coalesce(nullif(btrim(coalesce(_nome, '')), ''), public.profili.nome);

  return v_h;
end;
$$;

revoke all on function public.imposta_handle(text, text) from public;
grant execute on function public.imposta_handle(text, text) to authenticated;

-- 2) Le amicizie -------------------------------------------------------------
create table if not exists public.amicizie (
  richiedente  uuid not null references auth.users(id) on delete cascade,
  destinatario uuid not null references auth.users(id) on delete cascade,
  stato        text not null default 'in_attesa',
  creato_il    timestamptz not null default now(),
  decisa_il    timestamptz,
  primary key (richiedente, destinatario),
  constraint amicizie_non_se_stessi check (richiedente <> destinatario),
  constraint amicizie_stato_valori check (stato in ('in_attesa', 'accettata', 'bloccata'))
);

-- UNA SOLA RIGA PER COPPIA, in qualunque verso. Senza questo indice, Anna e
-- Bruno potrebbero avere due richieste incrociate aperte contemporaneamente, e
-- a quel punto «sono amici?» avrebbe due risposte diverse a seconda di quale
-- riga si guarda. Il verso resta scritto perché serve sapere chi ha chiesto.
create unique index if not exists amicizie_coppia_unica
  on public.amicizie (least(richiedente, destinatario), greatest(richiedente, destinatario));

create index if not exists amicizie_destinatario_idx
  on public.amicizie (destinatario, stato);

alter table public.amicizie enable row level security;

-- Si vedono solo le righe che ti riguardano. NESSUNA eccezione per
-- l'amministratore: con chi sei amico non è un contenuto da moderare, è un
-- fatto privato. È la stessa scelta già fatta nella 0087 per le liste.
drop policy if exists "amicizie_mie" on public.amicizie;
create policy "amicizie_mie" on public.amicizie
  for select using (richiedente = auth.uid() or destinatario = auth.uid());

-- Si scrive solo dalle funzioni qui sotto: niente policy di insert o update.
revoke all on public.amicizie from anon, authenticated;
grant select on public.amicizie to authenticated;

create or replace function public.sono_amici(_a uuid, _b uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.amicizie f
     where f.stato = 'accettata'
       and ((f.richiedente = _a and f.destinatario = _b)
         or (f.richiedente = _b and f.destinatario = _a))
  );
$$;

-- 3) Chiedere, rispondere, togliere -----------------------------------------
create or replace function public.richiedi_amicizia(_handle text)
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_io    uuid := auth.uid();
  v_altro uuid;
  v_riga  public.amicizie%rowtype;
begin
  if v_io is null then
    raise exception 'serve_accesso';
  end if;

  select p.user_id into v_altro
    from public.profili p where lower(p.handle) = lower(btrim(_handle));
  if v_altro is null then
    raise exception 'profilo_non_trovato';
  end if;
  if v_altro = v_io then
    raise exception 'non_se_stessi';
  end if;

  select * into v_riga from public.amicizie f
   where (f.richiedente = v_io and f.destinatario = v_altro)
      or (f.richiedente = v_altro and f.destinatario = v_io);

  if found then
    -- Già bloccati: si risponde come se il profilo non esistesse. Dire «ti ha
    -- bloccato» trasformerebbe il blocco in un messaggio, che è esattamente
    -- quello che chi blocca non vuole ricevere né mandare.
    if v_riga.stato = 'bloccata' then
      raise exception 'profilo_non_trovato';
    end if;
    if v_riga.stato = 'accettata' then
      return 'accettata';
    end if;
    -- C'è già una richiesta in attesa. Se è LORO verso di me, chiedere è il
    -- modo naturale di dire di sì: si accetta invece di creare un doppione.
    if v_riga.richiedente = v_altro then
      update public.amicizie
         set stato = 'accettata', decisa_il = now()
       where richiedente = v_altro and destinatario = v_io;
      return 'accettata';
    end if;
    return 'in_attesa';
  end if;

  insert into public.amicizie (richiedente, destinatario) values (v_io, v_altro);
  return 'in_attesa';
end;
$$;

revoke all on function public.richiedi_amicizia(text) from public;
grant execute on function public.richiedi_amicizia(text) to authenticated;

create or replace function public.rispondi_amicizia(_handle text, _accetta boolean)
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_io    uuid := auth.uid();
  v_altro uuid;
begin
  if v_io is null then
    raise exception 'serve_accesso';
  end if;

  select p.user_id into v_altro
    from public.profili p where lower(p.handle) = lower(btrim(_handle));
  if v_altro is null then
    raise exception 'profilo_non_trovato';
  end if;

  -- Si risponde solo a una richiesta ricevuta: il richiedente non può
  -- accettarsi da solo.
  if _accetta then
    update public.amicizie
       set stato = 'accettata', decisa_il = now()
     where richiedente = v_altro and destinatario = v_io and stato = 'in_attesa';
    if not found then
      raise exception 'nessuna_richiesta';
    end if;
    return 'accettata';
  end if;

  -- Rifiutare CANCELLA la riga, non la segna «rifiutata». Tenerla
  -- significherebbe che chi ha chiesto vede per sempre un no, e che chi ha
  -- rifiutato non può più cambiare idea senza che resti scritto.
  delete from public.amicizie
   where richiedente = v_altro and destinatario = v_io and stato = 'in_attesa';
  if not found then
    raise exception 'nessuna_richiesta';
  end if;
  return 'rifiutata';
end;
$$;

revoke all on function public.rispondi_amicizia(text, boolean) from public;
grant execute on function public.rispondi_amicizia(text, boolean) to authenticated;

create or replace function public.togli_amicizia(_handle text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_io    uuid := auth.uid();
  v_altro uuid;
begin
  if v_io is null then
    raise exception 'serve_accesso';
  end if;
  select p.user_id into v_altro
    from public.profili p where lower(p.handle) = lower(btrim(_handle));
  if v_altro is null then
    raise exception 'profilo_non_trovato';
  end if;

  delete from public.amicizie
   where stato <> 'bloccata'
     and ((richiedente = v_io and destinatario = v_altro)
       or (richiedente = v_altro and destinatario = v_io));
end;
$$;

revoke all on function public.togli_amicizia(text) from public;
grant execute on function public.togli_amicizia(text) to authenticated;

create or replace function public.blocca_profilo(_handle text, _blocca boolean default true)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_io    uuid := auth.uid();
  v_altro uuid;
begin
  if v_io is null then
    raise exception 'serve_accesso';
  end if;
  select p.user_id into v_altro
    from public.profili p where lower(p.handle) = lower(btrim(_handle));
  if v_altro is null or v_altro = v_io then
    raise exception 'profilo_non_trovato';
  end if;

  -- Il blocco cancella prima qualunque rapporto esistente: una sola riga per
  -- coppia, e chi blocca non deve restare amico di chi ha bloccato.
  delete from public.amicizie
   where (richiedente = v_io and destinatario = v_altro)
      or (richiedente = v_altro and destinatario = v_io);

  if _blocca then
    insert into public.amicizie (richiedente, destinatario, stato, decisa_il)
    values (v_io, v_altro, 'bloccata', now());
  end if;
end;
$$;

revoke all on function public.blocca_profilo(text, boolean) from public;
grant execute on function public.blocca_profilo(text, boolean) to authenticated;

-- 4) Chi sono i miei amici, e chi mi ha chiesto -----------------------------
create or replace function public.miei_amici()
  returns table (
    handle    text,
    nome      text,
    visitati  int,
    dal       timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.handle,
         p.nome,
         (select count(*)::int from public.liste_utente l
           where l.user_id = p.user_id and l.tipo = 'visitato'),
         f.decisa_il
    from public.amicizie f
    join public.profili p
      on p.user_id = case when f.richiedente = auth.uid() then f.destinatario
                          else f.richiedente end
   where f.stato = 'accettata'
     and auth.uid() is not null
     and (f.richiedente = auth.uid() or f.destinatario = auth.uid())
   order by p.nome nulls last, p.handle;
$$;

revoke all on function public.miei_amici() from public;
grant execute on function public.miei_amici() to authenticated;

create or replace function public.richieste_amicizia()
  returns table (
    handle    text,
    nome      text,
    visitati  int,
    creato_il timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.handle,
         p.nome,
         (select count(*)::int from public.liste_utente l
           where l.user_id = p.user_id and l.tipo = 'visitato'),
         f.creato_il
    from public.amicizie f
    join public.profili p on p.user_id = f.richiedente
   where f.destinatario = auth.uid()
     and auth.uid() is not null
     and f.stato = 'in_attesa'
   order by f.creato_il desc;
$$;

revoke all on function public.richieste_amicizia() from public;
grant execute on function public.richieste_amicizia() to authenticated;

-- 5) Il profilo di qualcun altro --------------------------------------------
-- NON restituisce il numero di recensioni scritte, ed è una sottigliezza che
-- vale la pena spiegare: se un amico sa che hai visitato tre bagni e scritto
-- tre recensioni, sa quali recensioni sono tue. Il conteggio delle recensioni
-- resta visibile solo sul proprio profilo, dove non rivela niente a nessuno.
create or replace function public.profilo_di(_handle text)
  returns table (
    handle     text,
    nome       text,
    visitati   int,
    da_provare int,
    rapporto   text,
    liste_viste boolean
  )
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_io    uuid := auth.uid();
  v_altro uuid;
  v_stato text;
  v_vede  boolean;
begin
  select p.user_id into v_altro
    from public.profili p where lower(p.handle) = lower(btrim(_handle));
  if v_altro is null then
    return;
  end if;

  -- Se mi hanno bloccato, il profilo non esiste.
  if v_io is not null and exists (
    select 1 from public.amicizie f
     where f.stato = 'bloccata'
       and ((f.richiedente = v_altro and f.destinatario = v_io)
         or (f.richiedente = v_io and f.destinatario = v_altro))
  ) then
    return;
  end if;

  v_stato := case
    when v_io is null then 'anonimo'
    when v_io = v_altro then 'io'
    when public.sono_amici(v_io, v_altro) then 'amici'
    when exists (select 1 from public.amicizie f
                  where f.richiedente = v_io and f.destinatario = v_altro
                    and f.stato = 'in_attesa') then 'richiesta_inviata'
    when exists (select 1 from public.amicizie f
                  where f.richiedente = v_altro and f.destinatario = v_io
                    and f.stato = 'in_attesa') then 'richiesta_ricevuta'
    else 'estranei'
  end;

  v_vede := v_stato in ('io', 'amici')
            or coalesce((select p.liste_pubbliche from public.profili p
                          where p.user_id = v_altro), false);

  return query
    select p.handle,
           p.nome,
           (select count(*)::int from public.liste_utente l
             where l.user_id = v_altro and l.tipo = 'visitato'),
           (select count(*)::int from public.liste_utente l
             where l.user_id = v_altro and l.tipo = 'da_provare'),
           v_stato,
           v_vede
      from public.profili p
     where p.user_id = v_altro;
end;
$$;

revoke all on function public.profilo_di(text) from public;
grant execute on function public.profilo_di(text) to anon, authenticated;

-- I bagni di qualcun altro: solo se amici, o se ha reso le liste pubbliche.
create or replace function public.liste_di(_handle text)
  returns table (
    beach_id  uuid,
    tipo      text,
    nome      text,
    localita  text,
    regione   text,
    creato_il timestamptz
  )
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_io    uuid := auth.uid();
  v_altro uuid;
begin
  select p.user_id into v_altro
    from public.profili p where lower(p.handle) = lower(btrim(_handle));
  if v_altro is null then
    return;
  end if;

  -- ATTENZIONE AL `coalesce` ESTERNO, che non è pignoleria.
  -- Per un visitatore anonimo `v_io` è nullo, e in SQL `null = v_altro` non
  -- vale «falso» ma «sconosciuto». L'intera catena di `or` diventa allora
  -- sconosciuta, `not sconosciuto` resta sconosciuto, e un `if` che riceve
  -- sconosciuto NON scatta: il controllo veniva saltato e le visite di una
  -- persona finivano in mano a chiunque. La prova 6 lo coglieva.
  if not coalesce(
    (v_io is not null and v_io = v_altro)
    or (v_io is not null and public.sono_amici(v_io, v_altro))
    or (select p.liste_pubbliche from public.profili p where p.user_id = v_altro),
    false
  ) then
    return;
  end if;

  return query
    select l.beach_id, l.tipo, b.nome, b.localita, b.regione, l.creato_il
      from public.liste_utente l
      join public.beaches b on b.id = l.beach_id
     where l.user_id = v_altro
     order by l.creato_il desc
     limit 500;
end;
$$;

revoke all on function public.liste_di(text) from public;
grant execute on function public.liste_di(text) to anon, authenticated;

-- 6) Il diario degli amici ---------------------------------------------------
-- Solo le VISITE, mai le recensioni: è la regola numero uno di questo file.
create or replace function public.diario_amici(_limite int default 40)
  returns table (
    handle    text,
    nome      text,
    beach_id  uuid,
    bagno     text,
    localita  text,
    tipo      text,
    quando    timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.handle, p.nome, l.beach_id, b.nome, b.localita, l.tipo, l.creato_il
    from public.amicizie f
    join public.profili p
      on p.user_id = case when f.richiedente = auth.uid() then f.destinatario
                          else f.richiedente end
    join public.liste_utente l on l.user_id = p.user_id
    join public.beaches b on b.id = l.beach_id
   where f.stato = 'accettata'
     and auth.uid() is not null
     and (f.richiedente = auth.uid() or f.destinatario = auth.uid())
   order by l.creato_il desc
   limit greatest(1, least(coalesce(_limite, 40), 200));
$$;

revoke all on function public.diario_amici(int) from public;
grant execute on function public.diario_amici(int) to authenticated;

-- 7) Cercare una persona -----------------------------------------------------
-- SOLO per soprannome, e solo dall'inizio. Non si cerca per nome: un elenco di
-- persone che si sfoglia scrivendo «mar» è una rubrica, e una rubrica di gente
-- con la cronologia di dove va al mare non deve esistere. Per trovare un amico
-- bisogna già sapere come si chiama qui — cioè glielo deve aver detto lui.
create or replace function public.cerca_profilo(_q text)
  returns table (handle text, nome text)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.handle, p.nome
    from public.profili p
   where p.handle is not null
     and length(btrim(coalesce(_q, ''))) >= 3
     and lower(p.handle) like lower(btrim(_q)) || '%'
     and p.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     and not exists (
       select 1 from public.amicizie f
        where f.stato = 'bloccata'
          and f.richiedente = p.user_id
          and f.destinatario = auth.uid()
     )
   order by length(p.handle), p.handle
   limit 10;
$$;

revoke all on function public.cerca_profilo(text) from public;
grant execute on function public.cerca_profilo(text) to authenticated;

-- 8) Niente di tutto questo tocca il punteggio ------------------------------
create or replace function public.verifica_separazione_ranking()
  returns table (oggetto text, problema text)
  language sql
  stable
as $$
  with definizioni as (
    select c.relname::text as nome, pg_get_viewdef(c.oid) as corpo
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
    union all
    select p.proname::text, pg_get_functiondef(p.oid)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  ),
  vietati(parola) as (
    values ('rivendicazioni'), ('profile_status'), ('partner'),
           ('entitlement'), ('abbonament'), ('membership'), ('fonte'),
           ('eventi_gestore'), ('calendario_eventi'),
           ('profilo_stabilimento'), ('gruppi'), ('crocier'), ('esperienze'),
           ('specializzazion'), ('music'), ('abbonato'),
           ('public.foto'), ('storage.'),
           ('amicizie'), ('liste_utente'), ('handle')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- DOPO L'ESECUZIONE:
--     select * from public.verifica_separazione_ranking();   -- 0 righe
-- e la prova supabase/prove/test_amici.sql.
-- ============================================================
