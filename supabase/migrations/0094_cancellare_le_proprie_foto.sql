-- ============================================================
-- LidoRank — 0094: chi carica una foto deve poterla cancellare
--
-- IL DIFETTO, che è mio e sta nella 0091. Avevo legato il permesso di
-- cancellare una foto all'essere gestore di quel bagno:
--
--     stato = 'pubblicata'
--     and ((user_id = auth.uid() and e_gestore_di(beach_id)) or e_admin())
--
-- e l'avevo pure motivato nel file: «un gestore che perde la concessione
-- smette di poter cancellare». Il ragionamento non regge, per due motivi.
--
-- PRIMO: non serviva. Quando una concessione viene revocata, la 0091 porta
-- già le foto a 'nascosta', e la condizione `stato = 'pubblicata'` da sola
-- impedisce di cancellarle. Il controllo sul gestore non aggiungeva niente
-- per il caso che diceva di proteggere.
--
-- SECONDO, ed è il guaio: rende impossibile cancellare una foto a chi non è
-- gestore di quel bagno. Oggi non si vede, perché caricano solo i gestori
-- sulle proprie schede. Si vedrà il giorno in cui si aprirà ai visitatori —
-- cioè quando le foto `fonte = 'visitatore'` saranno di persone che con
-- quello stabilimento non c'entrano niente, e che si troveranno la propria
-- fotografia inchiodata alla pagina senza poterla togliere. Su un prodotto
-- che scrive «le foto restano tue: puoi cancellarle quando vuoi», sarebbe
-- una bugia scritta in anticipo.
--
-- LA REGOLA GIUSTA è la più semplice: la proprietà è `user_id`, e basta.
-- Chi ha caricato può cancellare finché la foto è pubblicata; se la
-- moderazione l'ha nascosta o rimossa, non più — così nessuno può far
-- sparire le prove mentre una segnalazione è in esame.
--
-- Esegui DOPO 0093. Idempotente.
-- ============================================================

drop policy if exists "foto_self_delete" on public.foto;
create policy "foto_self_delete" on public.foto
  for delete using (
    stato = 'pubblicata'
    and (user_id = auth.uid() or public.e_admin())
  );

-- ============================================================
-- VERIFICA: supabase/prove/test_foto_gestore.sql, prova 15.
-- Deve dire «cancellare toglie anche il file ... PASSA».
-- ============================================================
