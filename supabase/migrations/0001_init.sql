-- ============================================================================
-- Lidò — MVP schema (Supabase / PostgreSQL)
-- Recensioni strutturate per stabilimenti balneari italiani.
-- Idempotente: eseguibile più volte senza errori.
-- ============================================================================

create extension if not exists "pgcrypto";     -- gen_random_uuid()
create extension if not exists "unaccent";       -- ricerca località accent-insensitive

-- unaccent() è STABLE, non IMMUTABLE: non usabile direttamente in un indice.
-- Wrapper IMMUTABLE attorno a unaccent(text): l'indice verifica solo che
-- f_unaccent sia IMMUTABLE, non ispeziona il corpo (trucco standard PostgreSQL).
create or replace function public.f_unaccent(text)
  returns text
  language sql
  immutable
  parallel safe
  strict
  set search_path = extensions, public, pg_temp
as $$ select unaccent($1) $$;

-- ---------------------------------------------------------------------------
-- BEACHES (stabilimenti / lidi)
-- ---------------------------------------------------------------------------
create table if not exists public.beaches (
  id                          uuid primary key default gen_random_uuid(),
  nome                        text        not null,
  localita                    text        not null,
  regione                     text        not null,
  distanza_ombrelloni_metri   numeric(4,1),                 -- distanza tra file di ombrelloni (m) — metrica Bolkestein
  created_at                  timestamptz not null default now()
);

-- ricerca full-text semplice su nome+località (accent/case insensitive)
create index if not exists beaches_search_idx
  on public.beaches using gin (to_tsvector('simple', public.f_unaccent(coalesce(nome,'') || ' ' || coalesce(localita,''))));
create index if not exists beaches_regione_idx on public.beaches (regione);
create index if not exists beaches_localita_idx on public.beaches (lower(localita));

-- ---------------------------------------------------------------------------
-- REVIEWS — 6 metriche verticali (voti interi 1..5)
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id                  uuid primary key default gen_random_uuid(),
  beach_id            uuid        not null references public.beaches(id) on delete cascade,
  user_id             uuid        references auth.users(id) on delete set null,  -- nullable: MVP consente recensioni anonime
  commento            text        check (char_length(commento) <= 2000),
  space_privacy       smallint    not null check (space_privacy      between 1 and 5),  -- distanza e privacy
  family_services     smallint    not null check (family_services    between 1 and 5),  -- servizi famiglie, nursery
  accessibility       smallint    not null check (accessibility      between 1 and 5),  -- passerelle, sedia JOB
  seabed_quality      smallint    not null check (seabed_quality     between 1 and 5),  -- fondale e acqua
  pet_friendly        smallint    not null check (pet_friendly       between 1 and 5),  -- servizi per animali
  price_transparency  smallint    not null check (price_transparency between 1 and 5),  -- trasparenza prezzi
  created_at          timestamptz not null default now()
);

create index if not exists reviews_beach_idx on public.reviews (beach_id, created_at desc);

-- ---------------------------------------------------------------------------
-- VIEW punteggi aggregati — media 6 metriche + overall + conteggio
-- (view semplice: sempre coerente; a scala milioni → materialized view o colonne denormalizzate)
-- ---------------------------------------------------------------------------
create or replace view public.beach_scores as
select
  b.id,
  b.nome,
  b.localita,
  b.regione,
  b.distanza_ombrelloni_metri,
  b.created_at,
  count(r.id)                                    as reviews_count,
  round(avg(r.space_privacy)::numeric,      2)   as avg_space_privacy,
  round(avg(r.family_services)::numeric,    2)   as avg_family_services,
  round(avg(r.accessibility)::numeric,      2)   as avg_accessibility,
  round(avg(r.seabed_quality)::numeric,     2)   as avg_seabed_quality,
  round(avg(r.pet_friendly)::numeric,       2)   as avg_pet_friendly,
  round(avg(r.price_transparency)::numeric, 2)   as avg_price_transparency,
  round(avg( (r.space_privacy + r.family_services + r.accessibility
            + r.seabed_quality + r.pet_friendly + r.price_transparency) / 6.0 )::numeric, 2) as avg_overall
from public.beaches b
left join public.reviews r on r.beach_id = b.id
group by b.id;

-- ---------------------------------------------------------------------------
-- RLS — lettura pubblica, scrittura recensioni aperta (MVP)
-- ---------------------------------------------------------------------------
alter table public.beaches enable row level security;
alter table public.reviews  enable row level security;

drop policy if exists "beaches_read"  on public.beaches;
drop policy if exists "reviews_read"  on public.reviews;
drop policy if exists "reviews_write" on public.reviews;

create policy "beaches_read"  on public.beaches for select using (true);
create policy "reviews_read"  on public.reviews  for select using (true);
-- MVP: chiunque può inserire una recensione. Per limitare agli utenti loggati:
--   for insert to authenticated with check (auth.uid() = user_id)
create policy "reviews_write" on public.reviews  for insert with check (true);

-- ---------------------------------------------------------------------------
-- SEED
-- I dati reali (712 localita costiere italiane) sono nella migrazione successiva:
--   0002_seed_beaches_nazionale.sql
-- Nessuna recensione viene pre-caricata: la piattaforma parte con conteggi reali.
-- ---------------------------------------------------------------------------
