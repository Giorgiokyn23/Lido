-- ============================================================
-- LidoRank - 0044: beach club di Positano (SA, Campania)
-- Fratelli Grassi (segnalato) + gli altri stabilimenti verificati.
-- Fonti: spiagge.it, siti ufficiali (arienzobeachclub.com, lincantopositano.com).
-- Guardia anti-doppione per parola-chiave (salta se già presente a Positano
-- anche con nome scritto diversamente). Coordinate approssimate. Esegui in Supabase.
-- ============================================================

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, 'Positano', 'Campania', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  ('Fratelli Grassi Beach Club', '%grassi%',    40.6280::numeric, 14.4848::numeric),
  ('L''Incanto',                 '%incanto%',    40.6282::numeric, 14.4856::numeric),
  ('La Scogliera',               '%scogliera%',  40.6284::numeric, 14.4862::numeric),
  ('Zighy Beach',                '%zighy%',      40.6278::numeric, 14.4842::numeric),
  ('Pupetto Beach Club',         '%pupetto%',    40.6292::numeric, 14.4818::numeric),
  ('Arienzo Beach Club',         '%arienzo%',    40.6250::numeric, 14.4980::numeric)
) as v(nome, kw, lat, lng)
where not exists (
  select 1 from public.beaches b
  where b.paese = 'IT' and b.localita ilike 'Positano'
    and (lower(b.nome) = lower(v.nome) or b.nome ilike v.kw)
);
