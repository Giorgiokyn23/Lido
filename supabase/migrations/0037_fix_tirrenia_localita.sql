-- ============================================================
-- LidoRank - 0037: correzione località costa pisana
-- Tirrenia, Calambrone e Marina di Pisa sono frazioni del COMUNE DI PISA
-- (provincia di Pisa), ma nell'import OSM molti bagni sono finiti sotto
-- "Livorno". Li ricolloco in base alla latitudine: il confine costiero
-- Pisa/Livorno è lo Scolmatore d'Arno (~43.57). La regione resta Toscana.
-- Aggiorna SOLO i record ancora taggati 'Livorno'. Idempotente.
-- Esegui in Supabase → SQL Editor.
-- ============================================================

-- (facoltativo) controllo preventivo: chi verrà toccato
-- select nome, localita, lat, lng from public.beaches
--  where paese='IT' and localita ilike 'Livorno' and lat >= 43.57
--  order by lat desc;

-- Tirrenia + Calambrone (43.57 ≤ lat < 43.645)
update public.beaches
   set localita = 'Tirrenia'
 where paese = 'IT'
   and localita ilike 'Livorno'
   and lat >= 43.57 and lat < 43.645;

-- Marina di Pisa (lat ≥ 43.645) — anch'essa Comune di Pisa
update public.beaches
   set localita = 'Marina di Pisa'
 where paese = 'IT'
   and localita ilike 'Livorno'
   and lat >= 43.645 and lat < 43.70;

-- Verifica finale (opzionale):
-- select localita, count(*) from public.beaches
--  where paese='IT' and lat >= 43.57 and lat < 43.70
--  group by localita order by localita;
