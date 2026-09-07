-- ============================================================
-- LidoRank - 0039: stabilimenti di Castiglione della Pescaia (nomi reali)
-- Nell'import OSM molti bagni comparivano solo come concessioni con numero e
-- senza nome commerciale. Qui inseriamo i bagni del capoluogo (non Punta Ala/
-- Le Rocchette, gestiti a parte) con i NOMI VERI.
-- Fonti: portale turistico castiglionepescaia.it + spiagge.it.
-- Idempotente: inserisce solo se non già presenti (nome + località).
-- Coordinate approssimate (ricerca redazionale). Esegui in Supabase.
-- ============================================================

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Castiglione della Pescaia', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagno Sirena',       42.7605::numeric, 10.8735::numeric),
  ('Bagno Il Faro',      42.7612::numeric, 10.8748::numeric),
  ('Bagno Laura',        42.7618::numeric, 10.8760::numeric),
  ('Bagno Perla',        42.7624::numeric, 10.8772::numeric),
  ('Bagno Medusa',       42.7630::numeric, 10.8784::numeric),
  ('Bagno Le Cannucce',  42.7636::numeric, 10.8796::numeric),
  ('Bagno Nettuno',      42.7642::numeric, 10.8808::numeric),
  ('Bagno Balena',       42.7648::numeric, 10.8820::numeric),
  ('Bagno Bruna',        42.7599::numeric, 10.8724::numeric),
  ('Bagno La Valletta',  42.7593::numeric, 10.8712::numeric),
  ('Bagno Valbona',      42.7654::numeric, 10.8832::numeric),
  ('Bagno Tito',         42.7660::numeric, 10.8844::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Castiglione della Pescaia'
);

-- ------------------------------------------------------------
-- PULIZIA dei record "spogli" (concessione con numero, senza nome commerciale).
-- 1) PRIMA guarda cosa c'è già e quali sembrano senza nome vero:
--
-- select id, nome, id_concessione, lat, lng
--   from public.beaches
--  where localita ilike 'Castiglione della Pescaia'
--  order by nome;
--
-- 2) Se vuoi rimuovere quelli il cui "nome" è solo un numero o coincide con la
--    concessione (dopo aver verificato la lista sopra), esegui:
--
-- delete from public.beaches
--  where localita ilike 'Castiglione della Pescaia'
--    and (nome ~ '^[0-9]' or nome = id_concessione or nome ~* 'concession');
--
--    (attenzione: delete è definitivo; fallo solo dopo aver controllato il SELECT)
-- ------------------------------------------------------------
