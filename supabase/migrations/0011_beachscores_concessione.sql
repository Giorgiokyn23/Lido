-- ============================================================
-- Lido - 0011: espone id_concessione e tipo nella view beach_scores
-- (servono per mostrare il numero di concessione sulle card in home).
-- Esegui DOPO 0008. Idempotente.
-- ============================================================
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  b.id_concessione, b.tipo,
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
