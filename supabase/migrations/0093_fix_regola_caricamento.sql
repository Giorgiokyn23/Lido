-- ============================================================
-- LidoRank — 0093: la regola di caricamento rifiutava tutto
--
-- IL DIFETTO. La 0089 permetteva di caricare un file solo se il percorso
-- aveva due livelli, e lo verificava così:
--
--     array_length(storage.foldername(name), 1) = 2
--
-- Sembra ovvio, ed è sbagliato. `storage.foldername` di Supabase NON spezza
-- il percorso in pezzi: restituisce solo le CARTELLE, togliendo l'ultimo
-- elemento, che è il nome del file. Per `abc/def.webp` non restituisce
-- {abc, def.webp} ma {abc}, cioè lunghezza 1. La condizione era quindi falsa
-- per qualunque percorso, e ogni caricamento veniva rifiutato — anche quello
-- di un gestore in regola, che si vedeva dire che non era il gestore.
--
-- LA CORREZIONE non si limita a cambiare 2 in 1. Scrivere `= 1` funziona ma
-- lascia la regola appesa al comportamento di una funzione di libreria che ho
-- già frainteso una volta, e che può cambiare con un aggiornamento di
-- Supabase senza che nessuno se ne accorga finché i caricamenti non si
-- fermano. Il requisito vero è semplice e si può dire per intero:
--
--     una cartella sola, lunga almeno 16 caratteri, poi il nome del file.
--
-- Scritto come espressione sul nome, non dipende da niente.
--
-- Esegui DOPO 0092. Idempotente.
-- ============================================================

drop policy if exists "foto_caricamento" on storage.objects;
create policy "foto_caricamento" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foto'
    -- Una cartella di almeno 16 caratteri fra lettere minuscole e cifre, una
    -- sola barra, e poi un nome di file che non ne contiene altre. La
    -- cartella lunga e casuale è ciò che rende impraticabile indovinare il
    -- percorso di qualcun altro; il resto dell'impedimento viene dall'assenza
    -- di una policy di UPDATE, che vieta la sovrascrittura.
    and name ~ '^[a-z0-9]{16,}/[^/]+$'
  );

-- ============================================================
-- VERIFICA, da eseguire subito dopo. Deve stampare «vero» su entrambe le
-- righe valide e «falso» sulle altre tre:
--
--   select p as percorso,
--          (p ~ '^[a-z0-9]{16,}/[^/]+$') as accettato
--     from (values
--       ('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6/f1e2d3c4b5a69788.webp'),  -- vero
--       ('abcdefabcdefabcdefabcdef/foto.png'),                       -- vero
--       ('corto/x.webp'),                                            -- falso
--       ('senza-cartella.webp'),                                     -- falso
--       ('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6/sotto/x.webp')            -- falso
--     ) t(p);
-- ============================================================
