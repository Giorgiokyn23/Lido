-- ============================================================
-- LidoRank - 0038: stabilimenti di Punta Ala (nomi commerciali reali)
-- Punta Ala e Le Rocchette (Comune di Castiglione della Pescaia, GR).
-- Nell'import OSM molti bagni comparivano solo come concessioni con numero
-- e senza nome commerciale. Qui inseriamo i bagni con i NOMI VERI.
-- Idempotente: inserisce solo se non già presenti (nome + località).
-- Coordinate approssimate (fonte: ricerca redazionale). Esegui in Supabase.
-- ============================================================

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Punta Ala', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagno La Vela',                 42.8155::numeric, 10.7395::numeric),
  ('Bagno Belmare',                 42.8168::numeric, 10.7408::numeric),
  ('Spiaggia Attrezzata Sea Life',  42.8175::numeric, 10.7418::numeric),
  ('Bagno Quadrifoglio',            42.8148::numeric, 10.7388::numeric),
  ('Golf Beach',                    42.8188::numeric, 10.7432::numeric),
  ('Bagno Rocchette',               42.8425::numeric, 10.7525::numeric),
  ('Spiaggia La Bussola',           42.8438::numeric, 10.7538::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Punta Ala'
);

-- ------------------------------------------------------------
-- PULIZIA dei record "spogli" (concessione con numero, senza nome commerciale).
-- 1) PRIMA guarda cosa c'è già a Punta Ala e quali sembrano senza nome vero:
--
-- select id, nome, id_concessione, lat, lng
--   from public.beaches
--  where localita ilike 'Punta Ala'
--  order by nome;
--
-- 2) Se vuoi rimuovere quelli il cui "nome" è solo un numero o coincide con la
--    concessione (dopo aver verificato la lista sopra), esegui:
--
-- delete from public.beaches
--  where localita ilike 'Punta Ala'
--    and (nome ~ '^[0-9]' or nome = id_concessione or nome ~* 'concession');
--
--    (attenzione: delete è definitivo; fallo solo dopo aver controllato il SELECT)
-- ------------------------------------------------------------
