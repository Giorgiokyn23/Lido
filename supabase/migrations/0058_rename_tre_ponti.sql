-- ============================================================
-- LidoRank - 0058: correzione nome bagno (Livorno)
-- "Stabilimento balneare Livorno · conc. 2001F002365" è in realtà la
-- "Spiaggia dei Tre Ponti". Correzione fornita dal gestore/redazione.
-- Rinomina per id (sicura); la concessione 2001F002365 resta invariata.
-- Idempotente. Esegui in Supabase.
-- ============================================================

update public.beaches
   set nome = 'Spiaggia dei Tre Ponti'
 where id = '3792b23e-e966-4cc0-ab0c-95e3c14f93d5';
