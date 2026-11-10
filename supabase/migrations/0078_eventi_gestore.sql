-- ============================================================
-- LidoRank — 0078: eventi pubblicati dai gestori
--
-- Prima versione minima del calendario: serate, tornei, corsi, aperture fuori
-- stagione. Niente immagini e niente locandine, di proposito — le immagini
-- richiedono storage, moderazione visiva e spazio: si aggiungono quando il
-- calendario avrà dimostrato di servire a qualcuno.
--
-- NOME DELLA TABELLA: "eventi_gestore", non "eventi". Serve a non confonderla
-- con il criterio di recensione "eventi_comunita", che invece ENTRA
-- legittimamente nel punteggio. Così il controllo automatico di separazione
-- può vietare l'una senza dare falsi allarmi sull'altra.
--
-- REGOLA: un evento non tocca punteggio, peso o posizione in classifica.
-- Il calendario si ordina per DATA, mai per piano o pagamento.
--
-- FREEMIUM: oggi può pubblicare qualunque gestore con scheda verificata.
-- Per riservarlo ai partner paganti domani basta cambiare UNA policy di
-- lettura e la condizione in puo_pubblicare_eventi(), senza migrare dati.
--
-- Esegui DOPO 0077. Idempotente.
-- ============================================================

create table if not exists public.eventi_gestore (
  id           uuid primary key default gen_random_uuid(),
  beach_id     uuid not null references public.beaches(id) on delete cascade,
  titolo       text not null,
  descrizione  text,
  data_inizio  date not null,
  data_fine    date,
  stato        text not null default 'pubblicato'
               check (stato in ('pubblicato', 'nascosto')),
  creato_da    uuid references auth.users(id),
  creato_il    timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  constraint eventi_lunghezze check (
    length(titolo) between 3 and 120 and
    coalesce(length(descrizione), 0) <= 1000
  ),
  -- la fine non può precedere l'inizio
  constraint eventi_date_coerenti check (data_fine is null or data_fine >= data_inizio)
);

create index if not exists eventi_gestore_beach_idx
  on public.eventi_gestore (beach_id, data_inizio);
create index if not exists eventi_gestore_calendario_idx
  on public.eventi_gestore (data_inizio) where stato = 'pubblicato';

alter table public.eventi_gestore enable row level security;

-- 1) Chi può pubblicare ------------------------------------------------------
-- Oggi: il gestore approvato di una scheda verificata, fino a un massimo di
-- eventi futuri attivi. Il limite evita che il calendario diventi una bacheca.
create or replace function public.puo_pubblicare_eventi(_beach uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.e_gestore_di(_beach)
     and exists (select 1 from public.beaches b
                  where b.id = _beach and b.profile_status = 'verificato');
$$;

revoke all on function public.puo_pubblicare_eventi(uuid) from public;
grant execute on function public.puo_pubblicare_eventi(uuid) to anon, authenticated;

-- 2) Lettura pubblica --------------------------------------------------------
-- Solo eventi pubblicati, di schede verificate, non ancora conclusi.
drop policy if exists "eventi_public_read" on public.eventi_gestore;
create policy "eventi_public_read" on public.eventi_gestore
  for select using (
    stato = 'pubblicato'
    and coalesce(data_fine, data_inizio) >= current_date
    and exists (select 1 from public.beaches b
                 where b.id = beach_id and b.profile_status = 'verificato')
  );

-- Il gestore vede sempre i propri, anche passati o nascosti.
drop policy if exists "eventi_gestore_read" on public.eventi_gestore;
create policy "eventi_gestore_read" on public.eventi_gestore
  for select using (public.e_gestore_di(beach_id) or public.e_admin());

-- 3) Scrittura ---------------------------------------------------------------
drop policy if exists "eventi_gestore_insert" on public.eventi_gestore;
create policy "eventi_gestore_insert" on public.eventi_gestore
  for insert with check (public.puo_pubblicare_eventi(beach_id));

drop policy if exists "eventi_gestore_update" on public.eventi_gestore;
create policy "eventi_gestore_update" on public.eventi_gestore
  for update using (public.e_gestore_di(beach_id))
           with check (public.e_gestore_di(beach_id));

drop policy if exists "eventi_gestore_delete" on public.eventi_gestore;
create policy "eventi_gestore_delete" on public.eventi_gestore
  for delete using (public.e_gestore_di(beach_id) or public.e_admin());

-- 4) Limite di eventi futuri per scheda --------------------------------------
-- Dieci bastano e avanzano per una stagione. È anche la leva naturale per il
-- freemium: domani il limite può dipendere dal piano.
create or replace function public.eventi_limite()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  n int;
begin
  select count(*) into n
    from public.eventi_gestore
   where beach_id = new.beach_id
     and coalesce(data_fine, data_inizio) >= current_date
     and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if n >= 10 then
    raise exception 'troppi_eventi';
  end if;

  new.aggiornato_il := now();
  return new;
end;
$$;

drop trigger if exists eventi_gestore_limite on public.eventi_gestore;
create trigger eventi_gestore_limite
  before insert or update on public.eventi_gestore
  for each row execute function public.eventi_limite();

-- 5) Il calendario pubblico, per località ------------------------------------
-- Ordinato per DATA, poi per nome. Mai per piano, mai per pagamento.
create or replace view public.calendario_eventi as
  select e.id, e.beach_id, b.nome as stabilimento, b.localita, b.regione, b.paese,
         e.titolo, e.descrizione, e.data_inizio, e.data_fine
    from public.eventi_gestore e
    join public.beaches b on b.id = e.beach_id
   where e.stato = 'pubblicato'
     and coalesce(e.data_fine, e.data_inizio) >= current_date
     and b.profile_status = 'verificato'
   order by e.data_inizio, b.nome;

grant select on public.calendario_eventi to anon, authenticated;

-- 6) Il controllo di separazione copre anche gli eventi ----------------------
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
           ('eventi_gestore'), ('calendario_eventi')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- NOTA sul freemium, per quando servirà.
-- Per riservare gli eventi ai partner paganti bastano due modifiche, senza
-- toccare i dati: aggiungere la condizione sul piano dentro
-- puo_pubblicare_eventi(), e la stessa nella policy eventi_public_read.
-- Il limite di 10 può diventare una colonna del piano.
-- ============================================================
