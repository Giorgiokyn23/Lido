-- ============================================================
-- LidoRank - 0060: backfill (INFERITO) di Pulizia & Igiene e Impianti Sportivi
--
-- ⚠️ IMPUTAZIONE autorizzata dal gestore per la fase di bootstrap ("per ora").
-- Le recensioni storiche non hanno questi due criteri (introdotti dopo). Qui NON
-- si riscrivono i voti reali esistenti: si DEDUCE un valore per i due nuovi
-- criteri a partire dalla media dei criteri già votati dalla stessa recensione.
--   base = media dei criteri non nulli tra: space_privacy, family_services,
--          accessibility, seabed_quality, price_transparency, sicurezza,
--          atmosfera, eventi_comunita
--   pulizia_igiene    = base + 0,5 (premiante: in generale i bagni sono bravi), cap 5
--   impianti_sportivi = base (neutro)
-- Arrotondati al mezzo voto (0,5), clamp 1..5. Solo dove i campi sono NULL,
-- quindi ri-eseguibile senza effetti (idempotente).
--
-- Nota di trasparenza: dopo questo backfill i valori inferiti compaiono nella
-- scheda come se fossero stati votati dal recensore. È una scelta temporanea;
-- reversibile con: update reviews set pulizia_igiene=null, impianti_sportivi=null
-- where <condizione>. Esegui DOPO 0059.
-- ============================================================

update public.reviews r
set
  pulizia_igiene    = least(5, greatest(1, round((b.base + 0.5) * 2) / 2)),
  impianti_sportivi = least(5, greatest(1, round(b.base * 2) / 2))
from (
  select id,
    ( coalesce(space_privacy,0)   + coalesce(family_services,0)   + coalesce(accessibility,0)
    + coalesce(seabed_quality,0)  + coalesce(price_transparency,0)+ coalesce(sicurezza,0)
    + coalesce(atmosfera,0)       + coalesce(eventi_comunita,0) )::numeric
    / nullif(
        (case when space_privacy      is not null then 1 else 0 end)
      + (case when family_services    is not null then 1 else 0 end)
      + (case when accessibility      is not null then 1 else 0 end)
      + (case when seabed_quality     is not null then 1 else 0 end)
      + (case when price_transparency is not null then 1 else 0 end)
      + (case when sicurezza          is not null then 1 else 0 end)
      + (case when atmosfera          is not null then 1 else 0 end)
      + (case when eventi_comunita    is not null then 1 else 0 end)
      , 0) as base
  from public.reviews
) b
where r.id = b.id
  and b.base is not null
  and r.pulizia_igiene is null
  and r.impianti_sportivi is null;
