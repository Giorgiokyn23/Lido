-- ============================================================
-- LidoRank — 0072: stato del profilo, provenienza del dato, registro decisioni
--
-- Recepisce le idee valide della guida tecnica del 29/10/2026, riscritte sui
-- nomi REALI di questo database. Mappatura per chi legge la guida:
--
--     guida            -> qui
--     establishments   -> beaches            (UUID invariati)
--     manager_claims   -> rivendicazioni     (migrazione 0071)
--     audit_events     -> eventi_audit
--     users            -> auth.users + profili
--
-- Solo DDL additivo: nessun DROP, nessun RENAME, nessuna riscrittura di dati
-- storici. Esegui DOPO 0071. Idempotente.
-- ============================================================

-- 1) Stato del profilo, denormalizzato sulla scheda -------------------------
-- Serve a card, ricerca e filtri senza una join su rivendicazioni.
-- NON è un giudizio di qualità e NON entra nel punteggio (vedi punto 5).
alter table public.beaches
  add column if not exists profile_status text not null default 'non_rivendicato';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'beaches_profile_status_check'
  ) then
    alter table public.beaches
      add constraint beaches_profile_status_check
      check (profile_status in ('non_rivendicato', 'in_attesa', 'verificato', 'sospeso'));
  end if;
end $$;

create index if not exists beaches_profile_status_idx
  on public.beaches (profile_status);

-- 2) Provenienza del dato ---------------------------------------------------
-- Forma attesa:
--   {"fonte":"openstreetmap","licenza":"ODbL 1.0",
--    "url":"https://www.openstreetmap.org/copyright","ultimo_controllo":"2026-10-30"}
alter table public.beaches
  add column if not exists data_source jsonb;

-- Backfill: le schede importate da OpenStreetMap sono riconoscibili da osm_id
-- (migrazione 0016). Dichiarare la fonte è un obbligo della licenza ODbL, non
-- un abbellimento: va poi mostrata anche nei Termini e in pagina.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'beaches' and column_name = 'osm_id'
  ) then
    update public.beaches
       set data_source = jsonb_build_object(
             'fonte', 'openstreetmap',
             'licenza', 'ODbL 1.0',
             'url', 'https://www.openstreetmap.org/copyright',
             'ultimo_controllo', to_char(now(), 'YYYY-MM-DD')
           )
     where osm_id is not null and data_source is null;
  end if;
end $$;

-- 3) Registro append-only delle decisioni -----------------------------------
create table if not exists public.eventi_audit (
  id         bigserial primary key,
  entita     text not null,
  entita_id  text not null,
  azione     text not null,
  attore     uuid references auth.users(id),
  prima      jsonb,
  dopo       jsonb,
  creato_il  timestamptz not null default now()
);

create index if not exists eventi_audit_entita_idx
  on public.eventi_audit (entita, entita_id, creato_il desc);

alter table public.eventi_audit enable row level security;

-- Lettura: solo amministratori. Scrittura: solo funzioni security definer
-- (nessuna policy di INSERT per gli utenti).
drop policy if exists "audit_admin_read" on public.eventi_audit;
create policy "audit_admin_read" on public.eventi_audit
  for select using (public.e_admin());

-- Append-only anche per chi avesse privilegi diretti: modifiche e
-- cancellazioni vengono rifiutate dal trigger.
create or replace function public.audit_solo_append()
  returns trigger
  language plpgsql
as $$
begin
  raise exception 'eventi_audit è append-only';
end;
$$;

drop trigger if exists eventi_audit_no_update on public.eventi_audit;
create trigger eventi_audit_no_update
  before update or delete on public.eventi_audit
  for each row execute function public.audit_solo_append();

-- 4) Aggancio al flusso di rivendicazione -----------------------------------

-- 4a) Nuova richiesta -> la scheda passa "in attesa" (solo se non rivendicata).
create or replace function public.riv_segna_in_attesa()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.beaches
     set profile_status = 'in_attesa'
   where id = new.beach_id and profile_status = 'non_rivendicato';

  insert into public.eventi_audit (entita, entita_id, azione, attore, dopo)
  values ('rivendicazione', new.id::text, 'creata', new.user_id,
          jsonb_build_object('beach_id', new.beach_id, 'stato', new.stato));

  return new;
end;
$$;

drop trigger if exists rivendicazioni_in_attesa on public.rivendicazioni;
create trigger rivendicazioni_in_attesa
  after insert on public.rivendicazioni
  for each row execute function public.riv_segna_in_attesa();

-- 4b) Decisione dell'amministratore: aggiorna stato scheda e scrive l'audit.
-- Sostituisce la versione della 0071 mantenendo firma e comportamento.
create or replace function public.decidi_rivendicazione(
  _rid uuid,
  _approva boolean,
  _motivo text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user  uuid;
  v_beach uuid;
  v_prima text;
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  select r.user_id, r.beach_id, b.profile_status
    into v_user, v_beach, v_prima
    from public.rivendicazioni r
    join public.beaches b on b.id = r.beach_id
   where r.id = _rid and r.stato = 'in_attesa'
   for update of r;

  if v_user is null then
    raise exception 'richiesta_non_trovata';
  end if;

  update public.rivendicazioni
     set stato          = case when _approva then 'approvata' else 'respinta' end,
         motivo_rifiuto = case when _approva then null else _motivo end,
         decisa_il      = now(),
         decisa_da      = auth.uid()
   where id = _rid;

  if _approva then
    insert into public.profili (user_id, ruolo)
    values (v_user, 'gestore')
    on conflict (user_id) do update
      set ruolo = 'gestore'
      where public.profili.ruolo <> 'admin';

    update public.beaches set profile_status = 'verificato' where id = v_beach;
  else
    -- Torna non rivendicata solo se nessun altro claim è già approvato.
    update public.beaches
       set profile_status = 'non_rivendicato'
     where id = v_beach
       and not exists (
         select 1 from public.rivendicazioni
          where beach_id = v_beach and stato = 'approvata'
       );
  end if;

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values ('rivendicazione', _rid::text,
          case when _approva then 'approvata' else 'respinta' end,
          auth.uid(),
          jsonb_build_object('profile_status', v_prima),
          jsonb_build_object(
            'profile_status', (select profile_status from public.beaches where id = v_beach),
            'motivo', _motivo));
end;
$$;

revoke all on function public.decidi_rivendicazione(uuid, boolean, text) from public;
grant execute on function public.decidi_rivendicazione(uuid, boolean, text) to authenticated;

-- 5) Il presidio d'integrità, come test eseguibile --------------------------
-- La regola "il lato gestori non tocca la classifica" smette di essere un buon
-- proposito e diventa qualcosa che si può verificare: la funzione cerca
-- riferimenti vietati dentro viste e funzioni che calcolano punteggi o
-- classifiche. Zero righe = separazione rispettata.
--
--     select * from public.verifica_separazione_ranking();
--
-- Da eseguire dopo ogni modifica al ranking, e idealmente in CI.
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
           ('entitlement'), ('abbonament'), ('membership')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- NOTA PER IL SEGUITO
-- profile_status e data_source descrivono CHI controlla la scheda e DA DOVE
-- vengono i dati. Non sono indicatori di qualità: non devono comparire in
-- nessuna formula di punteggio né nell'ordinamento della classifica. Nella
-- ricerca possono essere usati come filtro o come spareggio, ma mai insieme a
-- un piano di abbonamento.
-- ============================================================
