-- ============================================================
-- LidoRank - 0015: classifiche PER PAESE (fix multi-nazione)
-- Ogni nazione ha la sua graduatoria: i rank sono partizionati per 'paese'
-- (nazionale = dentro il Paese; regionale = paese+regione; comunale = paese+localita).
-- Esegui DOPO 0012. Idempotente.
-- ============================================================
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
  select b.id, b.nome, b.localita, b.regione, b.tipo, b.paese,
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
select id, nome, localita, regione, tipo, paese, reviews_count,
  round(avg_overall::numeric,2) as avg_overall, weighted_score,
  rank() over (partition by paese, localita order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by paese, regione  order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (partition by paese           order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;
