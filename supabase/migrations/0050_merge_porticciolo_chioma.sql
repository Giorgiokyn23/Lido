-- ============================================================
-- LidoRank - 0050: unione doppione "Porticciolo del Chioma" / "…Chioma 2"
--
-- Le due schede sono lo stesso stabilimento. Teniamo quella CON il numero di
-- concessione, spostiamo lì le recensioni (e le eventuali segnalazioni) del
-- doppione, eliminiamo il doppione e ripuliamo il nome del sopravvissuto.
--
-- Robusto e idempotente: se il doppione non esiste più, non fa nulla.
-- Le note DSA (review_notices) e i flag seguono le recensioni (FK on review_id).
-- Esegui in Supabase.
-- ============================================================

do $$
declare
  _keep uuid;
begin
  -- Sopravvissuto = quello con la concessione; in subordine il nome "pulito"
  -- (senza " 2"); a parità, il più vecchio.
  select id into _keep
  from public.beaches
  where paese = 'IT'
    and lower(btrim(nome)) in ('porticciolo del chioma', 'porticciolo del chioma 2')
  order by (id_concessione is not null) desc,
           (lower(btrim(nome)) = 'porticciolo del chioma 2') asc,
           created_at asc
  limit 1;

  if _keep is null then
    raise notice 'Merge saltato: nessuna riga trovata.';
    return;
  end if;

  -- 1) evita il conflitto "una recensione per utente per bagno": se lo stesso
  --    utente autenticato ha recensito entrambe, elimina quella sul doppione.
  delete from public.reviews r
  using public.beaches b
  where r.beach_id = b.id
    and b.id <> _keep
    and b.paese = 'IT'
    and lower(btrim(b.nome)) in ('porticciolo del chioma', 'porticciolo del chioma 2')
    and r.user_id is not null
    and exists (
      select 1 from public.reviews k
      where k.beach_id = _keep and k.user_id = r.user_id
    );

  -- 2) sposta tutte le recensioni residue del/i doppione/i sul sopravvissuto
  update public.reviews r set beach_id = _keep
  from public.beaches b
  where r.beach_id = b.id
    and b.id <> _keep
    and b.paese = 'IT'
    and lower(btrim(b.nome)) in ('porticciolo del chioma', 'porticciolo del chioma 2');

  -- 3) sposta eventuali segnalazioni (condotta del bagno)
  update public.segnalazioni s set beach_id = _keep
  from public.beaches b
  where s.beach_id = b.id
    and b.id <> _keep
    and b.paese = 'IT'
    and lower(btrim(b.nome)) in ('porticciolo del chioma', 'porticciolo del chioma 2');

  -- 4) elimina il/i doppione/i
  delete from public.beaches b
  where b.id <> _keep
    and b.paese = 'IT'
    and lower(btrim(b.nome)) in ('porticciolo del chioma', 'porticciolo del chioma 2');

  -- 5) nome pulito sul sopravvissuto
  update public.beaches set nome = 'Porticciolo del Chioma' where id = _keep;

  raise notice 'Merge completato: sopravvissuto = %', _keep;
end $$;
