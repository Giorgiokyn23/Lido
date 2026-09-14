-- ============================================================
-- LidoRank - 0053: aggiunte segnalate — Fregene, Santa Marinella, Costa Conero
--
-- Stabilimenti reali verificati (fonti: spiagge.it, mondobalneare, siti ufficiali:
-- singita.it, lanavedifregene.com, lidoultimaspiaggia.it, lacapanninadiportonovo.it,
-- ilmolo.it, baiadiportonovo.it). "Togo Bay" e "Singita" coprono Fregene.
-- Guardia anti-doppione per parola-chiave (salta se già presente nella località).
-- Coordinate approssimate. Idempotente. Esegui in Supabase.
-- ============================================================

insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, v.localita, v.regione, 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  -- Fregene (Fiumicino, Lazio)
  ('Singita Miracle Beach',         'Fregene',         'Lazio',  '%singita%',          41.8650::numeric, 12.2000::numeric),
  ('Togo Bay',                      'Fregene',         'Lazio',  '%togo%',             41.8620::numeric, 12.2000::numeric),
  ('Mastino',                       'Fregene',         'Lazio',  '%mastino%',          41.8680::numeric, 12.2010::numeric),
  ('Stabilimento Balneare La Nave', 'Fregene',         'Lazio',  '%la nave%',          41.8700::numeric, 12.2020::numeric),
  ('Point Break',                   'Fregene',         'Lazio',  '%point break%',      41.8580::numeric, 12.1990::numeric),
  ('L''Ultima Spiaggia',            'Fregene',         'Lazio',  '%ultima spiaggia%',  41.8720::numeric, 12.2030::numeric),
  -- Santa Marinella (Roma, Lazio) — copertura più ampia
  ('Banzai Sporting Club',          'Santa Marinella', 'Lazio',  '%banzai%',           42.0300::numeric, 11.8500::numeric),
  ('Club Tropicana',                'Santa Marinella', 'Lazio',  '%tropicana%',        42.0310::numeric, 11.8480::numeric),
  ('La Perla del Tirreno',          'Santa Marinella', 'Lazio',  '%perla del tirreno%',42.0290::numeric, 11.8520::numeric),
  ('New Barracuda Beach',           'Santa Marinella', 'Lazio',  '%barracuda%',        42.0320::numeric, 11.8460::numeric),
  ('La Gatta',                      'Santa Marinella', 'Lazio',  '%la gatta%',         42.0280::numeric, 11.8540::numeric),
  ('Capolinaro Beach',              'Santa Marinella', 'Lazio',  '%capolinaro%',       42.0250::numeric, 11.8600::numeric),
  ('Il Marinaio',                   'Santa Marinella', 'Lazio',  '%marinaio%',         42.0305::numeric, 11.8490::numeric),
  -- Costa Conero (Marche): Sirolo, Marcelli (Numana), Portonovo (Ancona)
  ('Da Silvio',                     'Sirolo',          'Marche', '%silvio%',           43.5230::numeric, 13.6200::numeric),
  ('Dal Pescatore',                 'Marcelli',        'Marche', '%pescatore%',        43.4700::numeric, 13.6300::numeric),
  ('Il Libeccio',                   'Marcelli',        'Marche', '%libeccio%',         43.4720::numeric, 13.6290::numeric),
  ('La Capannina',                  'Portonovo',       'Marche', '%capannina%',        43.5600::numeric, 13.5900::numeric),
  ('Il Molo',                       'Portonovo',       'Marche', '%molo%',             43.5610::numeric, 13.5910::numeric),
  ('Da Emilia',                     'Portonovo',       'Marche', '%emilia%',           43.5590::numeric, 13.5890::numeric)
) as v(nome, localita, regione, kw, lat, lng)
where not exists (
  select 1 from public.beaches b
  where b.paese = 'IT' and b.localita ilike v.localita
    and (lower(b.nome) = lower(v.nome) or b.nome ilike v.kw)
);
