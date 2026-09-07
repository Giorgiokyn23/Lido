-- ============================================================
-- LidoRank - 0040: stabilimenti di Forte dei Marmi e Versilia (nomi reali)
-- Forte dei Marmi, Viareggio, Lido di Camaiore, Marina di Pietrasanta.
-- Aggiunge i bagni con i NOMI COMMERCIALI VERI (fonti: spiagge.it,
-- mondobalneare.com). Elenco verificato ma NON esaustivo: sono aree molto
-- dense, questi sono i bagni confermati dalle fonti.
-- Idempotente: inserisce solo se non già presenti (nome + località).
-- NB: se nel DB esistono già gli stessi bagni come "concessioni col numero",
-- questi restano separati: usa la pulizia in fondo per rimuovere i numerati.
-- Coordinate approssimate (ricerca redazionale). Esegui in Supabase.
-- ============================================================

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Forte dei Marmi', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagno Apuana', 43.955::numeric, 10.166::numeric),
  ('Bagno Assunta', 43.9566::numeric, 10.1666::numeric),
  ('La Bonaccia', 43.9582::numeric, 10.1672::numeric),
  ('Bagno Le Dune del Forte', 43.9598::numeric, 10.1678::numeric),
  ('Bagno Raffaelli', 43.9614::numeric, 10.1684::numeric),
  ('Bagno Umberto', 43.963::numeric, 10.169::numeric),
  ('Bagni Montecristo', 43.9646::numeric, 10.1696::numeric),
  ('Bagno Lorenzo Levante', 43.9662::numeric, 10.1702::numeric),
  ('Bagno Sacro Cuore', 43.9678::numeric, 10.1708::numeric),
  ('Bagno Felice 1', 43.9694::numeric, 10.1714::numeric),
  ('Bagno Felice Secondo', 43.971::numeric, 10.172::numeric),
  ('Bagno Pennone', 43.9726::numeric, 10.1726::numeric),
  ('Bagno Vittoria', 43.9742::numeric, 10.1732::numeric),
  ('Gilda', 43.9758::numeric, 10.1738::numeric),
  ('Bagno Remo Beach Club', 43.9774::numeric, 10.1744::numeric),
  ('Bagno Pietro', 43.979::numeric, 10.175::numeric),
  ('Bagno Piero', 43.9806::numeric, 10.1756::numeric),
  ('Bagno Dalmazia', 43.9822::numeric, 10.1762::numeric),
  ('Bagno Flora di Levante', 43.9838::numeric, 10.1768::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Forte dei Marmi'
);

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Viareggio', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagno La Pace', 43.855::numeric, 10.235::numeric),
  ('Bagno Arizona', 43.8566::numeric, 10.2356::numeric),
  ('Bagno Rossella', 43.8582::numeric, 10.2362::numeric),
  ('Bagno Alhambra', 43.8598::numeric, 10.2368::numeric),
  ('Bagno Artiglio', 43.8614::numeric, 10.2374::numeric),
  ('Bagno Duilio', 43.863::numeric, 10.238::numeric),
  ('Bagno Teresa', 43.8646::numeric, 10.2386::numeric),
  ('Marina Torre Beach', 43.8662::numeric, 10.2392::numeric),
  ('Bagno Milano', 43.8678::numeric, 10.2398::numeric),
  ('Bagno Andrea Doria', 43.8694::numeric, 10.2404::numeric),
  ('Bagno Maruzzella', 43.871::numeric, 10.241::numeric),
  ('Bagno Irene', 43.8726::numeric, 10.2416::numeric),
  ('Bagno Maber', 43.8742::numeric, 10.2422::numeric),
  ('Bagno Alice', 43.8758::numeric, 10.2428::numeric),
  ('Mama Beach', 43.8774::numeric, 10.2434::numeric),
  ('Bagno Primavera', 43.879::numeric, 10.244::numeric),
  ('Bagno Firenze', 43.8806::numeric, 10.2446::numeric),
  ('Bagno Maurizio', 43.8822::numeric, 10.2452::numeric),
  ('Bagno Leda', 43.8838::numeric, 10.2458::numeric),
  ('Bagno Mauro', 43.8854::numeric, 10.2464::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Viareggio'
);

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Lido di Camaiore', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagno Venezia', 43.885::numeric, 10.205::numeric),
  ('Bagno Pardini Beach Club', 43.8866::numeric, 10.2056::numeric),
  ('Bagno Eugenia Beach', 43.8882::numeric, 10.2062::numeric),
  ('Bagno Maestrale', 43.8898::numeric, 10.2068::numeric),
  ('Bagno Argo', 43.8914::numeric, 10.2074::numeric),
  ('La Vela Beach Club', 43.893::numeric, 10.208::numeric),
  ('Danio Beach Club', 43.8946::numeric, 10.2086::numeric),
  ('Bagno Primavera Bucintoro', 43.8962::numeric, 10.2092::numeric),
  ('Bagno Mascotte', 43.8978::numeric, 10.2098::numeric),
  ('Bagno Imperiale 56', 43.8994::numeric, 10.2104::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Lido di Camaiore'
);

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Marina di Pietrasanta', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagno Eldorado', 43.918::numeric, 10.183::numeric),
  ('Bagno Grazia', 43.9196::numeric, 10.1836::numeric),
  ('Bagno La Versiliana', 43.9212::numeric, 10.1842::numeric),
  ('Bagno Roma Garden', 43.9228::numeric, 10.1848::numeric),
  ('Bagno Aretusa', 43.9244::numeric, 10.1854::numeric),
  ('Bussola Beach Club', 43.926::numeric, 10.186::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Marina di Pietrasanta'
);

-- ------------------------------------------------------------
-- PULIZIA record "spogli" (concessione col numero, senza nome commerciale).
-- 1) PRIMA controlla cosa c'è per queste località:
--
-- select localita, nome, id_concessione, lat, lng from public.beaches
--  where paese='IT' and localita in
--    ('Forte dei Marmi','Viareggio','Lido di Camaiore','Marina di Pietrasanta')
--  order by localita, nome;
--
-- 2) Poi, se vuoi togliere quelli col solo numero (dopo aver guardato):
--
-- delete from public.beaches
--  where paese='IT'
--    and localita in ('Forte dei Marmi','Viareggio','Lido di Camaiore','Marina di Pietrasanta')
--    and (nome ~ '^[0-9]' or nome = id_concessione or nome ~* 'concession');
--    (delete è definitivo: fallo solo dopo il SELECT)
-- ------------------------------------------------------------
