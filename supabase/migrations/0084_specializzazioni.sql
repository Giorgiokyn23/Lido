-- ============================================================
-- LidoRank — 0084: specializzazioni scelte dal gestore (la prima è la musica)
--
-- DA DOVE VIENE. È la proposta "Music-friendly" di Francesco, con tre
-- cambiamenti di sostanza spiegati qui sotto. L'intuizione centrale è sua ed
-- è buona: distinguere fra chi DICE di voler fare musica e chi la musica la
-- fa davvero, e far corrispondere la seconda etichetta a qualcosa di
-- verificabile sul sito.
--
-- CAMBIAMENTO 1 — UNA TABELLA, NON UNA COLONNA "MUSICA".
-- Francesco scrive che domani penserà altre categorie qualitative. Se oggi
-- aggiungessimo musica_stato, musica_racconto, musica_frequenza, domani
-- servirebbe una migrazione identica per lo sport, un'altra per la cucina, e
-- il modulo del gestore diventerebbe una collezione di casi particolari. Una
-- specializzazione ha sempre la stessa forma — un interesse, un racconto, una
-- frequenza — qualunque sia l'ambito. Quindi: una tabella con `ambito`, e la
-- musica è la prima riga. La seconda specializzazione costa zero migrazioni.
--
-- CAMBIAMENTO 2 — SENZA IL TIPO DELL'EVENTO L'ETICHETTA FORTE È UNA BUGIA.
-- Il piano dice: «"Music-friendly" solo se ha pubblicato eventi musicali sul
-- calendario». Ma eventi_gestore non sapeva che tipo di evento fosse: titolo,
-- testo e date, nient'altro. Non c'era modo di distinguere una serata DJ da
-- un mercatino, quindi l'etichetta verificata non si poteva calcolare — si
-- poteva solo dichiarare, che è l'opposto di quello che serve. Qui si aggiunge
-- eventi_gestore.tipo, preso dall'insieme chiuso che già esiste nel profilo.
--
-- CAMBIAMENTO 3 — LO STATO DICHIARATO NON PRODUCE MAI L'ETICHETTA FORTE.
-- Anche un gestore che risponde «sì, organizziamo già eventi musicali» ottiene
-- soltanto «Aperto a proposte musicali» finché sul calendario non c'è un
-- evento musicale pubblicato. L'etichetta verificata la dà il calendario, non
-- la casella. È l'unico modo perché la distinzione regga: se bastasse dirlo,
-- le due etichette sarebbero la stessa cosa con due nomi.
--
-- QUELLO CHE NON SI FA, E NON PER PIGRIZIA.
-- Niente classifica per specializzazione. Ordinare i bagni per "quanto sono
-- music-friendly" significa dare una posizione in graduatoria a una casella
-- che il gestore spunta da sé: è pay-to-rank senza il pagamento, e sarebbe la
-- prima volta che qualcosa di diverso dalle recensioni dei cittadini muove una
-- classifica. Le specializzazioni producono ELENCHI filtrabili — «i bagni
-- aperti a proposte musicali a Livorno» — non graduatorie. Il punto 6 estende
-- il controllo automatico perché questa riga resti vera anche quando nessuno
-- se la ricorderà.
--
-- Esegui DOPO 0083. Idempotente.
-- ============================================================

-- 1) Il tipo dell'evento ----------------------------------------------------
-- Stesso insieme chiuso di profilo_stabilimento.tipi_evento: un evento è una
-- delle cose che il bagno dichiara di saper ospitare. Resta facoltativo,
-- perché gli eventi già pubblicati non ne hanno uno e non vanno indovinati.
alter table public.eventi_gestore
  add column if not exists tipo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eventi_tipo_valori') then
    alter table public.eventi_gestore
      add constraint eventi_tipo_valori check (
        tipo is null or tipo in (
          'dj_set', 'musica_dal_vivo', 'degustazioni', 'cene_a_tema',
          'matrimoni', 'eventi_aziendali', 'cinema', 'tornei_sportivi',
          'corsi_sport', 'feste_private', 'mercatini', 'convegni'
        )
      );
  end if;
end $$;

create index if not exists eventi_gestore_tipo_idx
  on public.eventi_gestore (tipo, data_inizio)
  where stato = 'pubblicato' and tipo is not null;

-- 2) Quali tipi di evento valgono per quale ambito --------------------------
-- La corrispondenza sta in una funzione sola: aggiungere un ambito domani
-- vuol dire aggiungere una riga qui, non cercare la logica sparsa in tre
-- query diverse.
create or replace function public.tipi_evento_di_ambito(_ambito text)
  returns text[]
  language sql
  immutable
as $$
  select case _ambito
    when 'musica'  then array['dj_set', 'musica_dal_vivo']
    when 'sport'   then array['tornei_sportivi', 'corsi_sport']
    when 'cucina'  then array['degustazioni', 'cene_a_tema']
    when 'cultura' then array['cinema', 'convegni']
    else null
  end::text[];
$$;

grant execute on function public.tipi_evento_di_ambito(text) to anon, authenticated;

-- 3) Le specializzazioni ----------------------------------------------------
create table if not exists public.specializzazioni (
  beach_id      uuid not null references public.beaches(id) on delete cascade,
  ambito        text not null,
  stato         text not null,
  racconto      text,
  frequenza     text,
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references auth.users(id) on delete set null,
  primary key (beach_id, ambito),
  constraint specializzazioni_ambito_valori check (
    ambito in ('musica', 'sport', 'cucina', 'cultura')
  ),
  -- 'attiva'      = li organizziamo già
  -- 'interessato' = vorremmo iniziare
  -- 'non_ora'     = per ora no. Si conserva invece di cancellare la riga:
  --                 sapere chi ha detto no, e quando, serve a non richiederlo
  --                 ogni mese e a capire se l'interesse cambia nel tempo.
  constraint specializzazioni_stato_valori check (
    stato in ('attiva', 'interessato', 'non_ora')
  ),
  constraint specializzazioni_frequenza_valori check (
    frequenza is null or frequenza in
      ('occasionale', 'mensile', 'settimanale', 'piu_volte_settimana')
  ),
  constraint specializzazioni_racconto_lunghezza check (
    coalesce(length(racconto), 0) <= 600
  )
);

-- I mesi NON stanno qui. Il profilo ha già mesi_attivita: chiedere di nuovo
-- la stagionalità per ogni specializzazione sarebbe far compilare due volte
-- lo stesso dato, e due copie che prima o poi si contraddicono.

create index if not exists specializzazioni_ambito_idx
  on public.specializzazioni (ambito, stato);

alter table public.specializzazioni enable row level security;

-- Lettura pubblica solo su schede verificate, come il profilo: se la
-- rivendica cade, la specializzazione sparisce dal sito senza cancellarsi.
drop policy if exists "spec_public_read" on public.specializzazioni;
create policy "spec_public_read" on public.specializzazioni
  for select using (
    exists (select 1 from public.beaches b
             where b.id = beach_id and b.profile_status = 'verificato')
  );

drop policy if exists "spec_gestore_read" on public.specializzazioni;
create policy "spec_gestore_read" on public.specializzazioni
  for select using (public.e_gestore_di(beach_id) or public.e_admin());

drop policy if exists "spec_gestore_insert" on public.specializzazioni;
create policy "spec_gestore_insert" on public.specializzazioni
  for insert with check (public.e_gestore_di(beach_id) or public.e_admin());

drop policy if exists "spec_gestore_update" on public.specializzazioni;
create policy "spec_gestore_update" on public.specializzazioni
  for update using (public.e_gestore_di(beach_id) or public.e_admin())
           with check (public.e_gestore_di(beach_id) or public.e_admin());

-- Tracciamento, come per il profilo.
create or replace function public.specializzazioni_audit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  new.aggiornato_il := now();
  new.aggiornato_da := auth.uid();

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values ('specializzazione', new.beach_id::text || ':' || new.ambito,
          case when tg_op = 'INSERT' then 'creata' else 'modificata' end,
          auth.uid(),
          case when tg_op = 'UPDATE' then to_jsonb(old) - 'aggiornato_da' else null end,
          to_jsonb(new) - 'aggiornato_da');

  return new;
end;
$$;

drop trigger if exists specializzazioni_audit_trg on public.specializzazioni;
create trigger specializzazioni_audit_trg
  before insert or update on public.specializzazioni
  for each row execute function public.specializzazioni_audit();

-- 4) L'etichetta verificata la dà il calendario -----------------------------
-- Vero quando esiste almeno un evento pubblicato del tipo giusto, futuro o
-- degli ultimi dodici mesi. La finestra all'indietro serve perché un bagno
-- che a luglio ha fatto otto serate resta un posto dove si suona anche a
-- gennaio: azzerare l'etichetta a stagione finita sarebbe falso al contrario.
create or replace function public.specializzazione_confermata(_beach uuid, _ambito text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
      from public.eventi_gestore e
     where e.beach_id = _beach
       and e.stato = 'pubblicato'
       and e.tipo = any (public.tipi_evento_di_ambito(_ambito))
       and coalesce(e.data_fine, e.data_inizio) >= current_date - interval '12 months'
  );
$$;

grant execute on function public.specializzazione_confermata(uuid, text) to anon, authenticated;

-- Quanti eventi dell'ambito ci sono in programma: serve a dire «tre serate in
-- calendario» invece di un'etichetta muta.
create or replace function public.eventi_ambito_in_programma(_beach uuid, _ambito text)
  returns int
  language sql
  stable
  security definer
  set search_path = public
as $$
  select count(*)::int
    from public.eventi_gestore e
   where e.beach_id = _beach
     and e.stato = 'pubblicato'
     and e.tipo = any (public.tipi_evento_di_ambito(_ambito))
     and coalesce(e.data_fine, e.data_inizio) >= current_date;
$$;

grant execute on function public.eventi_ambito_in_programma(uuid, text) to anon, authenticated;

-- 5) L'elenco pubblico, per chi cerca un posto dove suonare -----------------
-- Un ELENCO, non una classifica: l'ordine è per località e nome, mai per
-- punteggio. Chi cerca una sala vuole sapere chi c'è e dove, non chi "vince".
create or replace view public.specializzazioni_pubbliche as
  select s.ambito,
         s.beach_id,
         b.nome,
         b.localita,
         b.regione,
         b.paese,
         s.stato,
         s.racconto,
         s.frequenza,
         public.specializzazione_confermata(s.beach_id, s.ambito) as confermata,
         public.eventi_ambito_in_programma(s.beach_id, s.ambito)  as eventi_in_programma,
         p.mesi_attivita,
         p.eventi_capienza,
         p.posti_ristorante
    from public.specializzazioni s
    join public.beaches b on b.id = s.beach_id
    left join public.profilo_stabilimento p on p.beach_id = s.beach_id
   where b.profile_status = 'verificato'
     and s.stato in ('attiva', 'interessato')
   order by b.localita, b.nome;

grant select on public.specializzazioni_pubbliche to anon, authenticated;

-- 6) Il controllo di separazione copre anche le specializzazioni ------------
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
           ('specializzazion'), ('music')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- 7) Alla revoca sparisce anche la specializzazione -------------------------
-- Senza questo, la dichiarazione musicale del vecchio gestore ricomparirebbe
-- appena la scheda torna verificata sotto una gestione nuova: lo stesso
-- difetto che la 0083 ha chiuso per il profilo.
create or replace function public.azzera_profilo_interno(_beach uuid, _motivo text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prima jsonb;
  v_spec  int;
begin
  select public.senza_contatti(to_jsonb(p)) into v_prima
    from public.profilo_stabilimento p
   where p.beach_id = _beach;

  update public.eventi_gestore
     set stato = 'nascosto'
   where beach_id = _beach and stato <> 'nascosto';

  delete from public.specializzazioni where beach_id = _beach;
  get diagnostics v_spec = row_count;

  delete from public.profilo_stabilimento where beach_id = _beach;

  if v_prima is not null or v_spec > 0 then
    insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
    values ('profilo_stabilimento', _beach::text, 'azzerato', auth.uid(), v_prima,
            jsonb_build_object('motivo', nullif(btrim(coalesce(_motivo, '')), ''),
                               'specializzazioni_rimosse', v_spec));
  end if;
end;
$$;

revoke all on function public.azzera_profilo_interno(uuid, text) from public;

-- ============================================================
-- DOPO L'ESECUZIONE il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
--
-- Chi cerca un posto dove suonare in Toscana:
--     select nome, localita, stato, confermata, eventi_in_programma, racconto
--       from public.specializzazioni_pubbliche
--      where ambito = 'musica' and regione = 'Toscana';
-- ============================================================
