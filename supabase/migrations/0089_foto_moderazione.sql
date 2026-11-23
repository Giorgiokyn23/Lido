-- ============================================================
-- LidoRank — 0089: le foto, e la moderazione che le rende possibili
--
-- È il primo mattone del lato social. Prima di scriverlo vale la pena dire
-- che cosa cambia davvero: finora tutto ciò che pubblicavamo era testo e
-- numeri, cioè contenuti di cui si discute. Una foto è un contenuto di cui
-- si RISPONDE. Può ritrarre persone che non hanno dato il consenso, può
-- essere presa da un altro sito, può essere qualcosa che non deve stare su
-- una pagina che indicizza Google. Per questo la moderazione non è un pezzo
-- da aggiungere dopo: è dentro questa migrazione, prima ancora
-- dell'interfaccia per caricarle.
--
-- TRE DECISIONI CHE VALE LA PENA SPIEGARE.
--
-- 1) LE FOTO SONO DI CHI LE SCATTA, NON DELLO STABILIMENTO. Sono legate
--    all'utente e alla recensione, non al profilo del gestore. Quindi una
--    revoca di rivendicazione NON le cancella: azzerare il profilo di un
--    gestore che se ne va non deve portarsi via le fotografie dei bagnanti,
--    che non sono sue. È la stessa distinzione per cui la revoca non tocca
--    recensioni e punteggio.
--
-- 2) SI PUBBLICANO SUBITO, SI TOLGONO IN FRETTA. Mettere ogni foto in coda
--    prima della pubblicazione sembra più prudente, ma con una persona sola
--    a moderare significa che non si pubblica niente per giorni, e il lato
--    social muore prima di nascere. La scelta è la stessa che il progetto fa
--    già per le recensioni: online subito, segnalazione visibile, rimozione
--    rapida e tracciata. Chi segnala porta la foto in cima alla coda.
--
-- 3) IL FILE SE NE VA DAVVERO. Una foto «nascosta» ma ancora raggiungibile
--    dal suo indirizzo non è rimossa: è solo tolta dall'elenco. Per questo
--    l'amministratore può cancellare l'oggetto dall'archivio, e di quella
--    cancellazione resta traccia nel registro — chi, quando, perché, e la
--    descrizione di che cosa c'era.
--
-- Esegui DOPO 0088. Idempotente.
-- ============================================================

-- 1) L'archivio ------------------------------------------------------------
-- Pubblico in lettura: le foto stanno su pagine pubbliche, e tenerle dietro
-- un permesso significherebbe firmare ogni indirizzo a ogni caricamento di
-- pagina, con il costo che ne consegue. La protezione sta altrove: solo chi
-- ha un account carica, con limiti severi, e con un nome di file che non
-- dice niente di chi l'ha caricato.
--
-- IL NOME DEL FILE È CASUALE, E QUESTA È LA PARTE DELICATA. Il modo normale
-- di organizzare lo storage su Supabase è una cartella per utente, chiamata
-- col suo identificativo: comodo, perché il permesso di scrittura diventa
-- «puoi scrivere solo nella cartella che porta il tuo nome». Qui non si può
-- fare. L'indirizzo di una foto pubblica è pubblico, quindi quella cartella
-- finirebbe nell'HTML di ogni scheda: chiunque potrebbe raggruppare le foto
-- per cartella e scoprire che la recensione a Livorno e quella a Rimini sono
-- della stessa persona. La 0085 ha appena chiuso esattamente questa falla
-- sul lato dei dati, e riaprirla dal lato degli indirizzi sarebbe assurdo.
--
-- Quindi il percorso è `<casuale>/<casuale>.webp` e non identifica nessuno.
-- Il rovescio è che il permesso di scrittura non può più essere «solo la tua
-- cartella». Non serve: senza una policy di UPDATE, lo storage rifiuta la
-- sovrascrittura, perciò il peggio che può fare un utente autenticato è
-- aggiungere un file nuovo in un punto che nessun altro userà mai. Per la
-- cancellazione la proprietà si verifica dove è davvero scritta, cioè nella
-- tabella qui sotto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Tre megabyte è un tetto DI SICUREZZA, non la dimensione attesa: il browser
-- ridimensiona e ricomprime prima di caricare, quindi in pratica arrivano
-- file da qualche centinaio di kilobyte. Il limite serve a fermare chi prova
-- a caricare un file enorme aggirando la nostra pagina.

drop policy if exists "foto_lettura_pubblica" on storage.objects;
create policy "foto_lettura_pubblica" on storage.objects
  for select using (bucket_id = 'foto');

-- Carica solo chi ha un account. Il nome del file deve essere lungo e in due
-- livelli, così resta impraticabile indovinare il percorso di un altro — e
-- comunque, senza policy di UPDATE, indovinarlo non servirebbe a niente.
drop policy if exists "foto_caricamento_proprio" on storage.objects;
drop policy if exists "foto_caricamento" on storage.objects;
create policy "foto_caricamento" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foto'
    and array_length(storage.foldername(name), 1) = 2
    and length((storage.foldername(name))[1]) >= 16
  );

-- NESSUNA policy di UPDATE sullo storage: è quella l'assenza che impedisce di
-- sovrascrivere il file di qualcun altro. Non aggiungerla.
--
-- La policy di CANCELLAZIONE non sta qui ma in fondo al file, dopo la tabella:
-- interroga `public.foto`, e un permesso non può nominare una tabella che non
-- esiste ancora.

-- 2) Il registro delle foto -------------------------------------------------
create table if not exists public.foto (
  id          uuid primary key default gen_random_uuid(),
  beach_id    uuid not null references public.beaches(id) on delete cascade,
  review_id   uuid references public.reviews(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  percorso    text not null unique,
  larghezza   int,
  altezza     int,
  stato       text not null default 'pubblicata',
  segnalazioni int not null default 0,
  didascalia  text,
  creato_il   timestamptz not null default now(),
  moderata_il timestamptz,
  moderata_da uuid references auth.users(id) on delete set null,
  motivo      text,
  constraint foto_stato_valori check (stato in ('pubblicata', 'nascosta', 'rimossa')),
  constraint foto_didascalia_lunghezza check (coalesce(length(didascalia), 0) <= 140)
);

create index if not exists foto_beach_idx
  on public.foto (beach_id, creato_il desc) where stato = 'pubblicata';

-- La coda di moderazione: prima le segnalate, poi le recenti.
create index if not exists foto_coda_idx
  on public.foto (segnalazioni desc, creato_il desc) where stato <> 'rimossa';

alter table public.foto enable row level security;

-- Lettura pubblica: solo quelle pubblicate. Chi ha caricato vede anche le
-- proprie nascoste, altrimenti non capirebbe perché la sua foto è sparita.
drop policy if exists "foto_public_read" on public.foto;
create policy "foto_public_read" on public.foto
  for select using (stato = 'pubblicata');

drop policy if exists "foto_self_read" on public.foto;
create policy "foto_self_read" on public.foto
  for select using (user_id = auth.uid() or public.e_admin());

-- Si inserisce solo per sé. Lo stato iniziale non è negoziabile dal client.
drop policy if exists "foto_self_insert" on public.foto;
create policy "foto_self_insert" on public.foto
  for insert to authenticated
  with check (user_id = auth.uid() and stato = 'pubblicata' and segnalazioni = 0);

-- Nessuna policy di UPDATE: lo stato lo cambia solo la moderazione, dalle
-- funzioni qui sotto. Chi ha caricato può cancellare, non riscrivere.
--
-- E la cancellazione vale solo finché la foto è pubblicata: se la moderazione
-- l'ha nascosta o rimossa, l'autore non può più farla sparire. Altrimenti
-- basterebbe cancellare la propria riga per far perdere il filo a chi sta
-- esaminando una segnalazione.
drop policy if exists "foto_self_delete" on public.foto;
create policy "foto_self_delete" on public.foto
  for delete using (user_id = auth.uid() and stato = 'pubblicata');

-- Su Supabase i permessi di tabella arrivano dai privilegi predefiniti dello
-- schema public, che sono generosi. Qui li restringiamo a mano: togliere
-- l'UPDATE a livello di privilegio, e non solo di policy, significa che anche
-- se un giorno qualcuno aggiungesse per sbaglio una policy di UPDATE, il
-- database direbbe no comunque.
revoke all on public.foto from anon, authenticated;
grant select on public.foto to anon, authenticated;
grant insert, delete on public.foto to authenticated;

-- 3) Quante foto, e dove ----------------------------------------------------
-- Sei per persona e per stabilimento. Non è un numero sacro: è abbastanza
-- per raccontare una giornata e poco abbastanza perché nessuno trasformi una
-- scheda nel proprio album. Il limite sta in un trigger e non
-- nell'interfaccia, perché l'interfaccia si aggira con due righe di codice.
create or replace function public.foto_limite()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  n int;
begin
  select count(*) into n
    from public.foto f
   where f.user_id = new.user_id
     and f.beach_id = new.beach_id
     and f.stato <> 'rimossa';

  if n >= 6 then
    raise exception 'troppe_foto';
  end if;

  return new;
end;
$$;

drop trigger if exists foto_limite_trg on public.foto;
create trigger foto_limite_trg
  before insert on public.foto
  for each row execute function public.foto_limite();

-- 4) Segnalare una foto -----------------------------------------------------
-- Chiunque può segnalare, anche senza account: una foto che ritrae un
-- bambino va tolta anche se chi se ne accorge non ha voglia di registrarsi.
-- Segnalare NON nasconde la foto: la porta in cima alla coda. Se bastasse
-- una segnalazione a far sparire un contenuto, basterebbe un concorrente
-- infastidito per svuotare la scheda di un rivale.
create or replace function public.segnala_foto(_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.foto
     set segnalazioni = least(segnalazioni + 1, 999)
   where id = _id and stato = 'pubblicata';

  insert into public.eventi_audit (entita, entita_id, azione, attore, dopo)
  values ('foto', _id::text, 'segnalata', auth.uid(),
          jsonb_build_object('quando', now()));
end;
$$;

revoke all on function public.segnala_foto(uuid) from public;
grant execute on function public.segnala_foto(uuid) to anon, authenticated;

-- 5) Moderare ---------------------------------------------------------------
create or replace function public.modera_foto(_id uuid, _stato text, _motivo text default null)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prima jsonb;
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;
  if _stato not in ('pubblicata', 'nascosta', 'rimossa') then
    raise exception 'stato_non_valido';
  end if;

  -- La fotografia dei metadati si prende PRIMA: se poi il file viene
  -- cancellato dall'archivio, questa riga è l'unica cosa che resta per
  -- rispondere a chi contesta la rimozione.
  --
  -- Senza `user_id`: nel registro serve sapere CHE COSA è stato rimosso e
  -- perché, non chi l'aveva caricato. Il legame con la persona resta nella
  -- riga di `foto`, che la moderazione non cancella mai — così si riconosce
  -- chi ricade, senza spargere identificativi in una tabella di storico.
  select to_jsonb(f) - 'user_id' into v_prima from public.foto f where f.id = _id;
  if v_prima is null then
    raise exception 'foto_non_trovata';
  end if;

  update public.foto
     set stato = _stato,
         moderata_il = now(),
         moderata_da = auth.uid(),
         motivo = nullif(btrim(coalesce(_motivo, '')), ''),
         -- Ripubblicare azzera il contatore: la segnalazione è stata
         -- valutata e respinta, non deve restare a pesare per sempre.
         segnalazioni = case when _stato = 'pubblicata' then 0 else segnalazioni end
   where id = _id;

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values ('foto', _id::text, 'moderata_' || _stato, auth.uid(), v_prima,
          jsonb_build_object('motivo', nullif(btrim(coalesce(_motivo, '')), '')));
end;
$$;

revoke all on function public.modera_foto(uuid, text, text) from public;
grant execute on function public.modera_foto(uuid, text, text) to authenticated;

-- La coda, per la pagina di moderazione.
create or replace function public.foto_da_moderare(_limite int default 100)
  returns table (
    id           uuid,
    beach_id     uuid,
    percorso     text,
    didascalia   text,
    stato        text,
    segnalazioni int,
    creato_il    timestamptz
  )
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  return query
    select f.id, f.beach_id, f.percorso, f.didascalia, f.stato, f.segnalazioni, f.creato_il
      from public.foto f
     where f.stato <> 'rimossa'
     order by f.segnalazioni desc, f.creato_il desc
     limit greatest(1, least(coalesce(_limite, 100), 500));
end;
$$;

revoke all on function public.foto_da_moderare(int) from public;
grant execute on function public.foto_da_moderare(int) to authenticated;

-- 6) Cancellare un file dall'archivio ---------------------------------------
-- Sta QUI, e non insieme alle altre policy dello storage, perché interroga
-- `public.foto`: lassù la tabella non era ancora stata creata, e un permesso
-- non può nominare qualcosa che non esiste. Il proprietario di un file è
-- scritto nella tabella, non nel nome del file — è la conseguenza diretta
-- della scelta di usare percorsi casuali.
drop policy if exists "foto_cancellazione" on storage.objects;
create policy "foto_cancellazione" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foto'
    and (
      public.e_admin()
      or exists (
        select 1 from public.foto f
         where f.percorso = storage.objects.name
           and f.user_id = auth.uid()
      )
    )
  );

-- 7) Le foto non entrano nel ranking ----------------------------------------
-- Un bagno fotogenico non è un bagno migliore, e avere venti foto non deve
-- far salire nessuno: sarebbe un punteggio che si compra con uno smartphone.
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
           ('public.foto'), ('storage.')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- DOPO L'ESECUZIONE il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
--
-- La coda di moderazione, se ti serve guardarla da SQL:
--     select * from public.foto_da_moderare(50);
-- ============================================================
