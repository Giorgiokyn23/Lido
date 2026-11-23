-- ============================================================
-- LidoRank — 0090: il calendario diventa un aggregatore
--
-- DA DOVE VIENE QUESTA MIGRAZIONE. Blu Livorno, il sito degli eventi della
-- Biennale del Mare, ha un filtro «per luogo» in cui fra l'Acquario,
-- l'Accademia Navale e i Cantieri compaiono i Bagni Nettuno e i Bagni
-- Tirreno. Cioè: nel programma culturale di una città, uno stabilimento
-- balneare è già una sede. Non è una cosa che dobbiamo convincere qualcuno a
-- fare — sta già succedendo, e noi siamo l'unico posto che ha l'elenco
-- completo di quelle sedi.
--
-- Perché il nostro calendario diventi utile come quei siti gli mancano due
-- cose, e sono entrambe qui dentro.
--
-- 1. IL TIPO DI EVENTO. La 0084 l'ha aggiunto alla tabella, ma la vista
--    pubblica non lo espone: dal sito non si può filtrare per «musica dal
--    vivo» o «tornei sportivi», che è il primo filtro che una persona cerca.
--
-- 2. UN'IMMAGINE. Un elenco di eventi senza fotografie non si scorre, e
--    questo lo si vede bene confrontando il nostro calendario con quelli
--    veri. Non introduciamo però un caricamento di foto per gli eventi: ne
--    usiamo una dello stabilimento, presa dalla 0089. Costa zero in
--    interfaccia, in moderazione e in archiviazione, e ha un effetto
--    collaterale desiderabile — chi ha foto sulla scheda compare meglio nel
--    calendario, il che è un incentivo a caricarle che non passa dai soldi.
--
-- NON TOCCA IL PUNTEGGIO. La foto in copertina riguarda come un evento
-- appare in un elenco, non quanto vale uno stabilimento: il controllo di
-- separazione resta a zero righe, e la prova lo verifica.
--
-- Esegui DOPO 0089. Idempotente.
-- ============================================================

-- `create or replace view` non ammette l'aggiunta di colonne in mezzo, e qui
-- ne aggiungiamo due: va ricreata.
drop view if exists public.calendario_eventi;

create view public.calendario_eventi as
  select e.id,
         e.beach_id,
         b.nome      as stabilimento,
         b.localita,
         b.regione,
         b.paese,
         e.titolo,
         e.descrizione,
         e.data_inizio,
         e.data_fine,
         e.tipo,
         f.percorso  as foto_percorso
    from public.eventi_gestore e
    join public.beaches b on b.id = e.beach_id
    -- La foto più recente dello stabilimento, se ne ha una. `left join
    -- lateral` perché serve UNA riga per evento: una join normale su foto
    -- moltiplicherebbe ogni evento per il numero di foto del bagno.
    left join lateral (
      select fo.percorso
        from public.foto fo
       where fo.beach_id = e.beach_id
         and fo.stato = 'pubblicata'
       order by fo.creato_il desc
       limit 1
    ) f on true
   where e.stato = 'pubblicato'
     and coalesce(e.data_fine, e.data_inizio) >= current_date
     and b.profile_status = 'verificato'
   order by e.data_inizio, b.nome;

grant select on public.calendario_eventi to anon, authenticated;

-- ============================================================
-- DOPO L'ESECUZIONE, il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
--
-- E il calendario deve avere le colonne nuove:
--     select titolo, tipo, foto_percorso from public.calendario_eventi limit 5;
-- ============================================================
