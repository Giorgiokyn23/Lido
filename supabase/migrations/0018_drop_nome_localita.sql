-- ============================================================
-- LidoRank - 0018: rimuove il vecchio vincolo unique(nome, localita)
-- Con dati multi-Paese e località "coarse" (regione), due luoghi diversi
-- possono legittimamente avere lo stesso nome nella stessa località.
-- La deduplica ora avviene su osm_id (esteri) e id_concessione (Italia).
-- Esegui PRIMA del 0017. Idempotente.
-- ============================================================
alter table public.beaches drop constraint if exists beaches_unique_nome_localita;
