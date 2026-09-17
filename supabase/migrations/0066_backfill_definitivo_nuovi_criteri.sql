-- ============================================================
-- LidoRank - 0066: popola DEFINITIVAMENTE i 3 criteri nuovi su TUTTE le recensioni
--
-- Sintomo: sulle schede Eventi & Comunità / Pulizia & Igiene / Impianti Sportivi
-- restano "—" su quasi tutti i bagni. Causa: le recensioni storiche non li hanno
-- votati e il carryover di Eventi da "Rispetto Regole" (0057) copre solo le poche
-- recensioni che avevano quel criterio facoltativo → resta NULL quasi ovunque.
--
-- Qui si completa l'IMPUTAZIONE (autorizzata, bootstrap) per OGNI recensione che
-- ha almeno un criterio votato, deducendo dai criteri già presenti (present-mean):
--   base              = media dei criteri non nulli (esclusi i 3 nuovi)
--   eventi_comunita    = coalesce(valore esistente, base)            (neutro; tiene il carryover)
--   pulizia_igiene     = coalesce(valore esistente, base + 0,5)       (premiante, cap 5)
--   impianti_sportivi  = coalesce(valore esistente, base)            (neutro)
-- Solo dove il campo è ancora NULL → idempotente, non tocca i voti reali.
-- Esegui DOPO le migrazioni che aggiungono le colonne/viste (0057, 0060, 0062...).
-- ============================================================

update public.reviews r
set
  eventi_comunita   = coalesce(r.eventi_comunita,   least(5, greatest(1, round(b.base * 2) / 2))),
  pulizia_igiene    = coalesce(r.pulizia_igiene,    least(5, greatest(1, round((b.base + 0.5) * 2) / 2))),
  impianti_sportivi = coalesce(r.impianti_sportivi, least(5, greatest(1, round(b.base * 2) / 2)))
from (
  select id,
    ( coalesce(space_privacy,0)   + coalesce(family_services,0)   + coalesce(accessibility,0)
    + coalesce(seabed_quality,0)  + coalesce(price_transparency,0)+ coalesce(sicurezza,0)
    + coalesce(atmosfera,0) )::numeric
    / nullif(
        (case when space_privacy      is not null then 1 else 0 end)
      + (case when family_services    is not null then 1 else 0 end)
      + (case when accessibility      is not null then 1 else 0 end)
      + (case when seabed_quality     is not null then 1 else 0 end)
      + (case when price_transparency is not null then 1 else 0 end)
      + (case when sicurezza          is not null then 1 else 0 end)
      + (case when atmosfera          is not null then 1 else 0 end)
      , 0) as base
  from public.reviews
) b
where r.id = b.id
  and b.base is not null
  and (r.eventi_comunita is null or r.pulizia_igiene is null or r.impianti_sportivi is null)
  -- solo recensioni balneari (i porti non hanno questi criteri)
  and r.ormeggio is null and r.spazio_manovra is null and r.canoni is null;
