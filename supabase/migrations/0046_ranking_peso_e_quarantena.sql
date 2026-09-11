-- ============================================================
-- LidoRank - 0046: ranking VERITIERO — pesa i verificati ed esclude le quarantinate
--
-- Questa migrazione è la versione DEFINITIVA delle due viste e SUPERA la 0045.
--  - Se hai già eseguito la 0045: questa la corregge (la 0045 aveva tolto senza
--    volerlo il peso anti-frode reintroducendo il conteggio semplice).
--  - Se NON hai eseguito la 0045: puoi saltarla ed eseguire direttamente questa.
--
-- Combina le due cose giuste:
--  (A) PESO anti-frode (da 0024): il punteggio usa W = Σpeso, non il conteggio.
--      Account verificato = peso 1; recensione anonima = peso 0,25; recensione
--      in quarantena/rifiutata = esclusa (stato non in 'pubblicata'/'ridotta'
--      oppure peso 0). Così i verificati pesano davvero più degli anonimi e una
--      recensione messa in shadow-hold non sposta la classifica.
--  (B) CONTEGGIO equo (da 0045): una recensione conta anche se ha solo i 6
--      criteri "core" (le 3 extra erano facoltative in passato). Il voto
--      complessivo di ogni recensione è la MEDIA dei criteri effettivamente
--      votati, non una divisione fissa per 9 che escludeva le recensioni vecchie.
--
-- Nota: reviews_count = numero di recensioni che contano (pubblicate/ridotte,
-- peso>0). È questo il numero confrontato con le soglie 10/20/30 del frontend.
-- Idempotente. Esegui in Supabase.
-- ============================================================

-- ---------- beach_scores (profilo / homepage) ----------
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  b.id_concessione, b.tipo, b.paese,
  count(r.id)                                                                   as reviews_count,
  round(coalesce(sum(r.peso),0)::numeric,2)                                     as peso_totale,
  round((sum(r.peso*r.space_privacy)      / nullif(sum(r.peso),0))::numeric,2)  as avg_space_privacy,
  round((sum(r.peso*r.family_services)    / nullif(sum(r.peso),0))::numeric,2)  as avg_family_services,
  round((sum(r.peso*r.accessibility)      / nullif(sum(r.peso),0))::numeric,2)  as avg_accessibility,
  round((sum(r.peso*r.seabed_quality)     / nullif(sum(r.peso),0))::numeric,2)  as avg_seabed_quality,
  round((sum(r.peso*r.pet_friendly)       / nullif(sum(r.peso),0))::numeric,2)  as avg_pet_friendly,
  round((sum(r.peso*r.price_transparency) / nullif(sum(r.peso),0))::numeric,2)  as avg_price_transparency,
  round((sum(r.peso*r.sicurezza)       / nullif(sum(r.peso) filter (where r.sicurezza is not null),0))::numeric,2)       as avg_sicurezza,
  round((sum(r.peso*r.rispetto_regole) / nullif(sum(r.peso) filter (where r.rispetto_regole is not null),0))::numeric,2) as avg_rispetto_regole,
  round((sum(r.peso*r.atmosfera)       / nullif(sum(r.peso) filter (where r.atmosfera is not null),0))::numeric,2)       as avg_atmosfera,
  round((sum(r.peso * (
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
      )) / nullif(sum(r.peso),0))::numeric, 2)                                  as avg_overall
from public.beaches b
left join public.reviews r
       on r.beach_id = b.id
      and r.stato in ('pubblicata','ridotta')
      and r.peso > 0
group by b.id;

-- ---------- beach_rankings (classifiche bayesiane PESATE) ----------
drop view if exists public.beach_rankings;
create view public.beach_rankings as
with rev as (
  -- una riga per recensione che conta; overall = media dei criteri votati
  select
    r.beach_id,
    r.peso,
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
  where r.stato in ('pubblicata','ridotta') and r.peso > 0
),
params as (
  -- media globale pesata su TUTTE le recensioni che contano (universo bayesiano)
  select coalesce(sum(peso*overall)/nullif(sum(peso),0), 3.5) as global_mean, 8::numeric as conf
  from rev
),
agg as (
  select b.id, b.nome, b.localita, b.regione, b.tipo, b.paese,
    count(rv.beach_id)                               as reviews_count,
    sum(rv.peso)                                     as w,
    sum(rv.peso*rv.overall) / nullif(sum(rv.peso),0) as avg_overall
  from public.beaches b
  join rev rv on rv.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia')
  group by b.id
),
scored as (
  select a.*,
    round(((p.conf*p.global_mean + a.w*a.avg_overall)/(p.conf+a.w))::numeric,3) as weighted_score
  from agg a cross join params p
)
select id, nome, localita, regione, tipo, paese, reviews_count,
  round(avg_overall::numeric,2) as avg_overall, weighted_score,
  rank() over (partition by paese, localita order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by paese, regione  order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (partition by paese           order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;
