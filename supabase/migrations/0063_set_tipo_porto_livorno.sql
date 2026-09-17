-- ============================================================
-- LidoRank - 0063: marca come 'porto' le 8 strutture portuali di Livorno
-- Attiva il vertical Porti (criteri nautici, card e classifica dedicati) su
-- queste strutture, che non sono stabilimenti balneari. Classificazione fornita
-- dal gestore/redazione. Rieseguibile senza effetti. Esegui DOPO 0062.
-- ============================================================

update public.beaches set tipo = 'porto'
where id in (
  '4f418150-c63c-4afc-84b8-e13cb1fa7ecf', -- Circolo Nautico Nazario Sauro
  '9557bb96-3622-47a4-bdd1-d56f8b6490e0', -- Darsena Morosini
  'be2604f9-1cf4-4de5-a70f-6699c63cb511', -- Gorgona Scalo
  '93e5446e-8171-471d-a3ae-1a91c9e75325', -- Livorno Port
  '949d4fb8-39ce-4aaa-996e-400b68e3fddf', -- Marina Livorno
  '3c37664e-1c4e-43de-84e5-4258a27b8eef', -- Porticciolo di Antignano
  '7b37ad38-8202-411c-8f54-7d905518e5f7', -- Porticciolo San Jacopo
  '4087f5bd-7d9a-4ac2-ab3a-4f3a283d5a04'  -- Porto di Ardenza
);
