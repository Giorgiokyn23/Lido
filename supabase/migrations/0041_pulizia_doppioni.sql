-- ============================================================
-- LidoRank - 0041: pulizia doppioni e concessioni senza nome
-- L'import OSM aveva lasciato, per alcune località toscane:
--   (1) righe "spoglie": nome = "Stabilimento balneare <comune> · conc. <numero>"
--       (nessun nome commerciale → intasano l'elenco);
--   (2) doppioni con suffisso " ·2", " ·3" della stessa attività
--       (es. Bagno sirena / sirena ·2 / sirena ·3).
-- Qui li eliminiamo, tenendo il nome canonico. I bagni con nome vero
-- (e il loro numero di concessione) restano intatti.
-- Verificato sui dati reali di Castiglione: rimuove 77 spoglie + 6 doppioni,
-- lascia 17 bagni nominati (più quelli aggiunti nelle migrazioni precedenti).
-- ATTENZIONE: delete è definitivo. Le poche recensioni collegate verrebbero
-- rimosse in cascata (in fase pilota è irrilevante). Esegui in Supabase.
-- ============================================================

-- Località interessate
-- (Castiglione della Pescaia, Forte dei Marmi e Versilia + Punta Ala)

-- (1) elimina le etichette "spoglie" senza nome commerciale
delete from public.beaches
 where paese = 'IT'
   and localita in ('Castiglione della Pescaia','Forte dei Marmi','Viareggio',
                    'Lido di Camaiore','Marina di Pietrasanta','Punta Ala')
   and nome ilike 'Stabilimento balneare%';

-- (2) elimina i doppioni con suffisso ·N, ma SOLO se esiste il nome canonico
--     (così non si perde mai l'unica copia di un'attività)
delete from public.beaches d
 where d.paese = 'IT'
   and d.localita in ('Castiglione della Pescaia','Forte dei Marmi','Viareggio',
                      'Lido di Camaiore','Marina di Pietrasanta','Punta Ala')
   and d.nome ~ '·[[:space:]]*[0-9]+[[:space:]]*$'
   and exists (
     select 1 from public.beaches c
     where c.localita = d.localita
       and c.id <> d.id
       and lower(c.nome) = lower(regexp_replace(d.nome, '[[:space:]]*·[[:space:]]*[0-9]+[[:space:]]*$', ''))
   );

-- Verifica finale (opzionale): quanti bagni restano per località
-- select localita, count(*) from public.beaches
--  where paese='IT' and localita in
--    ('Castiglione della Pescaia','Forte dei Marmi','Viareggio',
--     'Lido di Camaiore','Marina di Pietrasanta','Punta Ala')
--  group by localita order by localita;
