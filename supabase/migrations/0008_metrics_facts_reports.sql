-- ============================================================
-- Lido - 0008: metriche estese, fatti oggettivi, segnalazioni illeciti
-- Esegui DOPO 0007. Idempotente.
-- ============================================================

-- 1) NUOVE VALUTAZIONI 1..5 (nullable: le recensioni vecchie non le hanno) -----
alter table public.reviews
  add column if not exists sicurezza       smallint check (sicurezza       between 1 and 5),
  add column if not exists rispetto_regole smallint check (rispetto_regole between 1 and 5),
  add column if not exists atmosfera       smallint check (atmosfera       between 1 and 5);

-- 2) FATTI OGGETTIVI riportati dall'utente (attributi, non voti) --------------
alter table public.reviews
  add column if not exists accesso_mare    text    check (accesso_mare in ('libero','limitato','bloccato')),
  add column if not exists docce           text    check (docce in ('gratuite','a_pagamento','assenti')),
  add column if not exists acqua_calda     text    check (acqua_calda in ('inclusa','a_pagamento','assente')),
  add column if not exists battigia_libera boolean,
  add column if not exists chip_richiesto  boolean;

-- 3) CONTATORE segnalazioni sul bagno (per il badge pubblico neutro) ----------
alter table public.beaches
  add column if not exists segnalazioni_aperte integer not null default 0;

-- 4) TABELLA SEGNALAZIONI (coda privata per l'ente) ---------------------------
create table if not exists public.segnalazioni (
  id          uuid primary key default gen_random_uuid(),
  beach_id    uuid not null references public.beaches(id) on delete cascade,
  tipo        text not null check (tipo in (
                'pagamento_minori','lettini_battigia','accesso_bloccato',
                'no_battigia_libera','prezzi_non_esposti','occupazione_abusiva','altro')),
  descrizione text check (char_length(descrizione) <= 2000),
  email_contatto text,
  stato       text not null default 'nuovo' check (stato in ('nuovo','in_verifica','archiviato')),
  created_at  timestamptz not null default now()
);
create index if not exists segnalazioni_beach_idx on public.segnalazioni (beach_id, created_at desc);
create index if not exists segnalazioni_stato_idx on public.segnalazioni (stato);

-- trigger: mantiene aggiornato il contatore pubblico (solo segnalazioni non archiviate)
create or replace function public.bump_segnalazioni() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.beaches set segnalazioni_aperte = segnalazioni_aperte + 1 where id = new.beach_id;
  elsif tg_op = 'UPDATE' and new.stato = 'archiviato' and old.stato <> 'archiviato' then
    update public.beaches set segnalazioni_aperte = greatest(segnalazioni_aperte - 1, 0) where id = new.beach_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_bump_segnalazioni on public.segnalazioni;
create trigger trg_bump_segnalazioni
  after insert or update on public.segnalazioni
  for each row execute function public.bump_segnalazioni();

-- 5) RLS segnalazioni: chiunque può INSERIRE, NESSUNO legge con chiave anon ----
--    (coda privata: la leggono solo dashboard Supabase / service_role / enti)
alter table public.segnalazioni enable row level security;
drop policy if exists "segnalazioni_insert" on public.segnalazioni;
create policy "segnalazioni_insert" on public.segnalazioni for insert with check (true);
-- volutamente NESSUNA policy di SELECT: non leggibili pubblicamente.

-- 6) VIEW punteggi: ora su 9 metriche -----------------------------------------
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  count(r.id)                                    as reviews_count,
  round(avg(r.space_privacy)::numeric,2)         as avg_space_privacy,
  round(avg(r.family_services)::numeric,2)       as avg_family_services,
  round(avg(r.accessibility)::numeric,2)         as avg_accessibility,
  round(avg(r.seabed_quality)::numeric,2)        as avg_seabed_quality,
  round(avg(r.pet_friendly)::numeric,2)          as avg_pet_friendly,
  round(avg(r.price_transparency)::numeric,2)    as avg_price_transparency,
  round(avg(r.sicurezza)::numeric,2)             as avg_sicurezza,
  round(avg(r.rispetto_regole)::numeric,2)       as avg_rispetto_regole,
  round(avg(r.atmosfera)::numeric,2)             as avg_atmosfera,
  round(avg( (r.space_privacy + r.family_services + r.accessibility + r.seabed_quality
            + r.pet_friendly + r.price_transparency + r.sicurezza + r.rispetto_regole
            + r.atmosfera) / 9.0 )::numeric, 2)  as avg_overall
from public.beaches b
left join public.reviews r on r.beach_id = b.id
group by b.id;

-- 7) VIEW classifiche: ranking bayesiano su 9 metriche ------------------------
drop view if exists public.beach_rankings;
create view public.beach_rankings as
with params as (
  select
    coalesce(avg((space_privacy + family_services + accessibility + seabed_quality
               + pet_friendly + price_transparency + sicurezza + rispetto_regole + atmosfera) / 9.0), 3.5) as global_mean,
    8::numeric as conf
  from public.reviews
  where sicurezza is not null
),
agg as (
  select b.id, b.nome, b.localita, b.regione, b.tipo,
    count(r.id) as reviews_count,
    avg((r.space_privacy + r.family_services + r.accessibility + r.seabed_quality
       + r.pet_friendly + r.price_transparency + r.sicurezza + r.rispetto_regole + r.atmosfera) / 9.0) as avg_overall
  from public.beaches b
  join public.reviews r on r.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia') and r.sicurezza is not null
  group by b.id
),
scored as (
  select a.*,
    round(((p.conf*p.global_mean + a.reviews_count*a.avg_overall)/(p.conf+a.reviews_count))::numeric,3) as weighted_score
  from agg a cross join params p
)
select id, nome, localita, regione, tipo, reviews_count,
  round(avg_overall::numeric,2) as avg_overall, weighted_score,
  rank() over (partition by localita order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by regione  order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (                      order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;
