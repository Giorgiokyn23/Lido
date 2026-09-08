-- ============================================================
-- LidoRank - 0042: aggiunte segnalate (verificate su concessione)
-- Albissola Marina (SV, Liguria), Rosignano Solvay e Castiglioncello (LI, Toscana).
-- Tutti confermati come stabilimenti balneari (quindi su concessione demaniale)
-- da fonti pubbliche (spiagge.it, mondobalneare.com).
-- Idempotente: inserisce solo se non già presenti (nome + località).
-- Coordinate approssimate (ricerca redazionale). Esegui in Supabase.
-- ============================================================

-- Albissola Marina (Liguria)
insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Albissola Marina', 'Liguria', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Soleluna Beach Village', 44.3272::numeric, 8.5030::numeric),
  ('Bagni Ultima Spiaggia',  44.3280::numeric, 8.5042::numeric),
  ('Bagni La Conchiglia',    44.3288::numeric, 8.5054::numeric),
  ('La Flaca Beach',         44.3264::numeric, 8.5018::numeric),
  ('Lido Spa Resort',        44.3296::numeric, 8.5066::numeric)
) as v(nome, lat, lng)
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower(v.nome) and b.localita = 'Albissola Marina'
);

-- Rosignano Solvay (Toscana)
insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select 'Lo Scoglietto', 'Rosignano Solvay', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       43.4010::numeric, 10.4280::numeric, 'ricerca redazionale (coordinate approssimate)'
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower('Lo Scoglietto') and b.localita = 'Rosignano Solvay'
);

-- Castiglioncello (Toscana)
insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select 'Bagni Ausonia', 'Castiglioncello', 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       43.4070::numeric, 10.4100::numeric, 'ricerca redazionale (coordinate approssimate)'
where not exists (
  select 1 from public.beaches b
  where lower(b.nome) = lower('Bagni Ausonia') and b.localita = 'Castiglioncello'
);
