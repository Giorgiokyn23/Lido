-- ============================================================
-- LidoRank - 0016: colonna osm_id per import esteri ripetibili (upsert)
-- Le righe italiane restano con osm_id NULL (i NULL non confliggono).
-- Esegui DOPO 0012. Idempotente.
-- ============================================================
alter table public.beaches
  add column if not exists osm_id text;

-- unique non-parziale: i NULL sono considerati distinti, quindi le righe IT
-- (osm_id null) convivono; gli esteri fanno upsert su osm_id.
create unique index if not exists beaches_osm_id_key on public.beaches (osm_id);
