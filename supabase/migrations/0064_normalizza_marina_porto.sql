-- ============================================================
-- LidoRank - 0064: normalizza le marine come 'porto'
-- Estende il vertical Porti (criteri nautici, card e classifica dedicati) a
-- TUTTE le strutture portuali censite come 'marina', non solo alle livornesi.
-- Così ogni porto riceve la card/manovra di tipo porto in modo uniforme.
-- Rieseguibile senza effetti. Esegui DOPO 0063.
-- ============================================================

update public.beaches set tipo = 'porto' where tipo = 'marina';
