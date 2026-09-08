-- ============================================================
-- LidoRank - 0043: stabilimenti balneari di Livorno città (e Quercianella)
-- I bagni storici del lungomare di Livorno (Viale Italia, Antignano, Boccale)
-- sono su scogliera/piattaforma: alcuni l'OSM li aveva, altri (es. Bagni Fiume)
-- no, pur essendo su concessione. Qui aggiungiamo SOLO i mancanti.
--
-- ANTI-DOPPIONE: Pancaldi, Acquaviva e Lido ESISTONO GIÀ → esclusi.
-- Per gli altri il controllo salta l'inserimento se esiste già una riga di
-- Livorno che contiene la parola-chiave (non solo con nome identico), così
-- non si creano doppioni anche se nel DB il nome è scritto diversamente.
-- Idempotente. Coordinate approssimate. Esegui in Supabase.
-- ============================================================

-- (0) se avevi già eseguito una versione precedente di questa migrazione,
--     rimuovi gli eventuali doppioni approssimati di bagni già presenti:
delete from public.beaches
 where paese = 'IT' and localita = 'Livorno'
   and fonte = 'ricerca redazionale (coordinate approssimate)'
   and lower(nome) in ('bagni pancaldi acquaviva','bagni lido','bagni pancaldi','bagni acquaviva');

-- (1) Livorno città — solo i mancanti, con guardia per parola-chiave
insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Livorno', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Bagni Fiume',              '%fiume%',       43.5333::numeric, 10.3100::numeric),
  ('Bagni Roma',               '%roma%',        43.5310::numeric, 10.3120::numeric),
  ('Onde del Tirreno',         '%tirreno%',     43.4875::numeric, 10.3280::numeric),
  ('Clandestino Reef Club',    '%clandestino%', 43.4860::numeric, 10.3290::numeric),
  ('Parco Marina del Boccale', '%boccale%',     43.4760::numeric, 10.3340::numeric),
  ('Bagni Paolieri',           '%paolieri%',    43.4700::numeric, 10.3350::numeric)
) as v(nome, kw, lat, lng)
where not exists (
  select 1 from public.beaches b
  where b.paese = 'IT'
    and (b.localita ilike 'Livorno' or b.localita ilike 'Quercianella'
         or b.localita ilike 'Antignano' or b.localita ilike 'Ardenza')
    and (lower(b.nome) = lower(v.nome) or b.nome ilike v.kw)
);

-- (2) Quercianella (frazione balneare di Livorno)
insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select 'Bagni Lido del Rogiolo', 'Quercianella', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       43.4550::numeric, 10.3600::numeric, 'ricerca redazionale (coordinate approssimate)'
where not exists (
  select 1 from public.beaches b
  where b.paese = 'IT'
    and (b.localita ilike 'Quercianella' or b.localita ilike 'Livorno')
    and (lower(b.nome) = lower('Bagni Lido del Rogiolo') or b.nome ilike '%rogiolo%')
);
