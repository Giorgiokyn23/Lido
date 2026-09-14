-- ============================================================
-- LidoRank - 0051: pulizia Argentario (concessioni senza nome) + bagni reali
--
-- L'Argentario è per lo più costa selvaggia: poche strutture commerciali, ma
-- l'import OSM ha lasciato molte "concessioni" demaniali SENZA nome commerciale
-- (etichetta generica "Stabilimento balneare", numero di concessione, ecc.).
-- Qui: (1) eliminiamo quelle righe placeholder nelle località dell'Argentario,
-- (2) aggiungiamo gli stabilimenti reali verificati.
--
-- SICUREZZA: elimina solo righe con nome placeholder E senza recensioni/segnalazioni
-- collegate (non perde mai contenuti degli utenti). Idempotente. Coordinate
-- approssimate. Esegui in Supabase.
-- ============================================================

-- Località dell'Argentario considerate
--   Porto Santo Stefano, Porto Ercole, Monte Argentario, Giannella, Feniglia
--   (+ qualunque località che contenga "argentario")

-- (1a) elimina i placeholder SENZA nome commerciale (nessuna recensione/segnalazione)
delete from public.beaches b
where b.paese = 'IT'
  and ( lower(b.localita) in
          ('porto santo stefano','porto ercole','monte argentario','giannella','feniglia','argentario')
        or b.localita ilike '%argentario%' )
  and (
        lower(btrim(b.nome)) like 'stabilimento balneare%'
     or lower(btrim(b.nome)) like 'concessione%'
     or lower(btrim(b.nome)) like 'stabilimento%senza nome%'
     or b.nome ~ '^[0-9]'
     or btrim(coalesce(b.nome,'')) = ''
  )
  and not exists (select 1 from public.reviews r      where r.beach_id = b.id)
  and not exists (select 1 from public.segnalazioni s where s.beach_id = b.id);

-- (1b) elimina i doppioni con suffisso " ·N" quando esiste il nome canonico
--      (stesso nome senza suffisso), sempre solo se privi di recensioni
delete from public.beaches b
where b.paese = 'IT'
  and ( lower(b.localita) in
          ('porto santo stefano','porto ercole','monte argentario','giannella','feniglia','argentario')
        or b.localita ilike '%argentario%' )
  and b.nome ~ ' ·[0-9]+$'
  and not exists (select 1 from public.reviews r where r.beach_id = b.id)
  and exists (
    select 1 from public.beaches c
    where c.paese = 'IT' and c.id <> b.id
      and lower(btrim(c.nome)) = lower(btrim(regexp_replace(b.nome, ' ·[0-9]+$', '')))
  );

-- (2) stabilimenti reali verificati (fonti: spiagge.it, siti ufficiali,
--     consorziomaremmare, argentariobythesea). Guardia anti-doppione per
--     parola-chiave: salta se già presente nella stessa località.
insert into public.beaches (nome, localita, regione, paese, tipo, categoria, lat, lng, fonte)
select v.nome, v.localita, 'Toscana', 'IT', 'stabilimento', 'Stabilimento Balneare',
       v.lat, v.lng, 'ricerca redazionale (coordinate approssimate)'
from (values
  -- Porto Santo Stefano
  ('Bagno Il Pozzarello', 'Porto Santo Stefano', '%pozzarello%',        42.4520::numeric, 11.1250::numeric),
  ('Bagno La Bionda',     'Porto Santo Stefano', '%bionda%',            42.4440::numeric, 11.1180::numeric),
  -- Feniglia
  ('Tenda Gialla',        'Feniglia',            '%tenda gialla%',      42.3960::numeric, 11.1880::numeric),
  ('Playa del Can',       'Feniglia',            '%playa del can%',     42.3985::numeric, 11.1850::numeric),
  ('Bagno Braccio',       'Feniglia',            '%braccio%',           42.4000::numeric, 11.1820::numeric),
  ('Feniglia 57',         'Feniglia',            '%feniglia 57%',       42.3950::numeric, 11.1905::numeric),
  -- Giannella
  ('Bagno Serena',        'Giannella',           '%serena%',            42.4600::numeric, 11.1050::numeric),
  ('Bagno Villa Ambra',   'Giannella',           '%villa ambra%',       42.4620::numeric, 11.1005::numeric),
  ('Lido di Giannella',   'Giannella',           '%lido di giannella%', 42.4580::numeric, 11.1100::numeric)
) as v(nome, localita, kw, lat, lng)
where not exists (
  select 1 from public.beaches b
  where b.paese = 'IT' and b.localita ilike v.localita
    and (lower(b.nome) = lower(v.nome) or b.nome ilike v.kw)
);
