-- ============================================================
-- LidoRank - 0045: la classifica conta TUTTE le recensioni
--
-- PROBLEMA: la vista beach_rankings contava una recensione solo se
-- `sicurezza is not null` (e calcolava la media dividendo SEMPRE per 9).
-- `sicurezza`, `rispetto_regole` e `atmosfera` erano 3 criteri FACOLTATIVI:
-- le recensioni vecchie, lasciate in bianco su quei criteri, NON venivano
-- contate in classifica, pur comparendo come "N recensioni" sul profilo
-- (beach_scores le conta tutte). Effetto: un bagno con 10 recensioni poteva
-- restare fuori classifica perché la vista ne "vedeva" meno di 10.
--
-- SOLUZIONE: ogni recensione vale, e il suo voto complessivo è la MEDIA dei
-- criteri effettivamente votati (6 oppure 9). Così recensioni vecchie e nuove
-- contano allo stesso modo e i conteggi di profilo e classifica coincidono.
--
-- Ricrea beach_scores e beach_rankings. Idempotente. Esegui in Supabase.
-- ============================================================

-- Media dei SOLI criteri votati (non-null) per ogni recensione:
--   somma dei criteri presenti / numero dei criteri presenti.
-- I 6 criteri "core" ci sono sempre; i 3 extra possono mancare nelle vecchie.

-- ---------- beach_scores (profilo / homepage) ----------
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  b.id_concessione, b.tipo, b.paese,
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
  round(avg(
    ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
    + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
    + coalesce(r.pet_friendly,0)       + coalesce(r.price_transparency,0)
    + coalesce(r.sicurezza,0)          + coalesce(r.rispetto_regole,0)
    + coalesce(r.atmosfera,0) )::numeric
    / nullif(
        (case when r.space_privacy      is not null then 1 else 0 end)
      + (case when r.family_services    is not null then 1 else 0 end)
      + (case when r.accessibility      is not null then 1 else 0 end)
      + (case when r.seabed_quality     is not null then 1 else 0 end)
      + (case when r.pet_friendly       is not null then 1 else 0 end)
      + (case when r.price_transparency is not null then 1 else 0 end)
      + (case when r.sicurezza          is not null then 1 else 0 end)
      + (case when r.rispetto_regole    is not null then 1 else 0 end)
      + (case when r.atmosfera          is not null then 1 else 0 end)
      , 0)
  )::numeric, 2)                                 as avg_overall
from public.beaches b
left join public.reviews r on r.beach_id = b.id
group by b.id;

-- ---------- beach_rankings (classifiche bayesiane) ----------
drop view if exists public.beach_rankings;
create view public.beach_rankings as
with rev as (
  -- voto complessivo di ogni recensione = media dei criteri votati
  select
    r.beach_id,
    ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
    + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
    + coalesce(r.pet_friendly,0)       + coalesce(r.price_transparency,0)
    + coalesce(r.sicurezza,0)          + coalesce(r.rispetto_regole,0)
    + coalesce(r.atmosfera,0) )::numeric
    / nullif(
        (case when r.space_privacy      is not null then 1 else 0 end)
      + (case when r.family_services    is not null then 1 else 0 end)
      + (case when r.accessibility      is not null then 1 else 0 end)
      + (case when r.seabed_quality     is not null then 1 else 0 end)
      + (case when r.pet_friendly       is not null then 1 else 0 end)
      + (case when r.price_transparency is not null then 1 else 0 end)
      + (case when r.sicurezza          is not null then 1 else 0 end)
      + (case when r.rispetto_regole    is not null then 1 else 0 end)
      + (case when r.atmosfera          is not null then 1 else 0 end)
      , 0) as overall
  from public.reviews r
),
params as (
  select coalesce(avg(overall), 3.5) as global_mean, 8::numeric as conf
  from rev
),
agg as (
  select b.id, b.nome, b.localita, b.regione, b.tipo, b.paese,
    count(rv.beach_id) as reviews_count,
    avg(rv.overall)    as avg_overall
  from public.beaches b
  join rev rv on rv.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia')
  group by b.id
),
scored as (
  select a.*,
    round(((p.conf*p.global_mean + a.reviews_count*a.avg_overall)/(p.conf+a.reviews_count))::numeric,3) as weighted_score
  from agg a cross join params p
)
select id, nome, localita, regione, tipo, paese, reviews_count,
  round(avg_overall::numeric,2) as avg_overall, weighted_score,
  rank() over (partition by paese, localita order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by paese, regione  order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (partition by paese           order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;
