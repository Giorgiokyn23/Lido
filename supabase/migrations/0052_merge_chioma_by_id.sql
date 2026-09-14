-- ============================================================
-- LidoRank - 0052: unione Porticciolo del Chioma — PER ID (fix della 0050)
--
-- La 0050 non aveva agganciato il doppione perché il suo nome è
-- "Porticciolo del Chioma ·2" (suffisso "·2" da import OSM), non "…Chioma 2".
-- Qui uniamo direttamente per ID, quindi indipendente da come è scritto il nome.
--
--   KEEP  469679a4-7fa8-4955-9cac-2615be3743b3  "Porticciolo del Chioma"     (concessione 2019H001260)
--   DUP   14aee740-e7f9-47f4-8199-c7b279d622b4  "Porticciolo del Chioma ·2"  (1 recensione)
--
-- Sposta la recensione (e le eventuali segnalazioni) sul KEEP, poi elimina il DUP.
-- Le note DSA/flag seguono la recensione (FK su review_id). Idempotente.
-- Esegui in Supabase.
-- ============================================================

do $$
declare
  _keep uuid := '469679a4-7fa8-4955-9cac-2615be3743b3';
  _dup  uuid := '14aee740-e7f9-47f4-8199-c7b279d622b4';
begin
  -- procedi solo se il doppione esiste ancora (idempotenza)
  if not exists (select 1 from public.beaches where id = _dup) then
    raise notice 'Niente da fare: il doppione non esiste più.';
    return;
  end if;

  -- 1) evita il conflitto "una recensione per utente per bagno" (per sicurezza)
  delete from public.reviews r
  where r.beach_id = _dup and r.user_id is not null
    and exists (select 1 from public.reviews k where k.beach_id = _keep and k.user_id = r.user_id);

  -- 2) sposta le recensioni residue dal doppione al keep
  update public.reviews set beach_id = _keep where beach_id = _dup;

  -- 3) sposta eventuali segnalazioni (condotta del bagno)
  update public.segnalazioni set beach_id = _keep where beach_id = _dup;

  -- 4) elimina il doppione
  delete from public.beaches where id = _dup;

  raise notice 'Unione completata: recensioni spostate su % ed eliminato %', _keep, _dup;
end $$;
