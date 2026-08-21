-- ============================================================
-- Lido - CLASSIFICHE: ranking bayesiano comunale / regionale / nazionale
-- Punteggio pesato (stile IMDb/Trustpilot): i bagni con poche recensioni
-- sono "tirati" verso la media nazionale finche' non accumulano voti veri.
--   weighted = (C * media_nazionale + n * media_bagno) / (C + n)
-- Solo tipo in ('stabilimento','spiaggia') e solo bagni con >=1 recensione.
-- Idempotente.
-- ============================================================

create or replace view public.beach_rankings as
with params as (
  select
    coalesce(avg((r.space_privacy + r.family_services + r.accessibility
               + r.seabed_quality + r.pet_friendly + r.price_transparency) / 6.0), 3.5) as global_mean,
    8::numeric as conf   -- "peso" del prior: ~8 recensioni per fidarsi della media del bagno
  from public.reviews r
),
agg as (
  select
    b.id, b.nome, b.localita, b.regione, b.tipo,
    count(r.id) as reviews_count,
    avg((r.space_privacy + r.family_services + r.accessibility
       + r.seabed_quality + r.pet_friendly + r.price_transparency) / 6.0) as avg_overall
  from public.beaches b
  join public.reviews r on r.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia')
  group by b.id
),
scored as (
  select
    a.*,
    round(((p.conf * p.global_mean + a.reviews_count * a.avg_overall) / (p.conf + a.reviews_count))::numeric, 3)
      as weighted_score
  from agg a cross join params p
)
select
  id, nome, localita, regione, tipo, reviews_count,
  round(avg_overall::numeric, 2) as avg_overall,
  weighted_score,
  rank() over (partition by localita order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by regione  order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (                      order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;
