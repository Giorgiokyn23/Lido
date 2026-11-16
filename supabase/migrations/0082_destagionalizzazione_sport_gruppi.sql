-- ============================================================
-- LidoRank — 0082: destagionalizzazione, sport, tipi di evento e di gruppo
--
-- Da dove viene. Sono i suggerimenti di Francesco, tenuti solo dove producono
-- un DATO e scartati dove producevano un prodotto nuovo. La differenza non è
-- di gusto: un campo si riempie in dieci secondi e si può contare; un albero
-- di torneo con i risultati scritti dai clienti è un'applicazione a sé, con
-- account, moderazione e notifiche, e oggi avremmo zero tornei perché abbiamo
-- zero gestori.
--
-- PERCHÉ LA DESTAGIONALIZZAZIONE VALE PIÙ DEGLI ALTRI CAMPI. Non è un dato
-- che interessa al bagnante: interessa a chi i soldi li distribuisce. La
-- destagionalizzazione è un obiettivo dichiarato dei Comuni costieri e delle
-- Regioni, con bandi e fondi dedicati. Un elenco di chi fa davvero qualcosa
-- da ottobre a marzo, località per località, non esiste da nessuna parte: non
-- ce l'ha il Comune, che pure lo finanzia. Per questo i mesi di attività sono
-- un campo strutturato e contabile, e non solo un testo libero.
--
-- GLI SPORT SONO UN INSIEME CHIUSO. In campo libero diventano "beach volley",
-- "beachvolley", "pallavolo da spiaggia" e "BV": quattro righe che il
-- database non sa essere la stessa cosa. Con un insieme chiuso si contano,
-- si filtrano, e un domani si costruisce sopra la pagina di una disciplina.
--
-- REGOLA DEL PROGETTO: nulla di qui entra nel punteggio o nella classifica.
-- Organizzare tornei o aprire d'inverno non fa salire una scheda: fa trovare
-- quella scheda a chi cerca quella cosa. È una distinzione che va difesa
-- proprio quando sembra innocuo violarla.
--
-- Solo DDL additivo. Esegui DOPO 0081. Idempotente.
-- ============================================================

-- 1) Le colonne -------------------------------------------------------------
alter table public.profilo_stabilimento
  -- Capienza degli spazi coperti: quanti si siedono davvero a tavola. È la
  -- domanda che fa chiunque organizzi qualcosa, e oggi si risponde solo al
  -- telefono.
  add column if not exists posti_ristorante        smallint,

  -- Che cosa ci si può organizzare dentro.
  add column if not exists tipi_evento             text[],

  -- Che tipo di comitive si accolgono. 'croceristi' è il gancio con il porto
  -- senza costruire un mercato di tour che oggi non avrebbe né offerta né
  -- domanda.
  add column if not exists tipi_gruppi             text[],

  -- Sport praticabili e tornei.
  add column if not exists sport                   text[],
  add column if not exists tornei_organizzati      boolean,

  -- Destagionalizzazione: i mesi in cui succede qualcosa, e il racconto.
  -- I mesi si contano, il racconto si legge: servono tutti e due, e sono
  -- due campi perché un testo non si aggrega e un numero non si cita.
  add column if not exists mesi_attivita           smallint[],
  add column if not exists destagionalizzazione    text;

-- 2) Vincoli ----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profilo_posti_ristorante') then
    alter table public.profilo_stabilimento
      add constraint profilo_posti_ristorante check (
        posti_ristorante is null or posti_ristorante between 0 and 2000
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_tipi_evento_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_tipi_evento_valori check (
        tipi_evento is null or (
          array_length(tipi_evento, 1) <= 12 and
          tipi_evento <@ array[
            'dj_set', 'musica_dal_vivo', 'degustazioni', 'cene_a_tema',
            'matrimoni', 'eventi_aziendali', 'cinema', 'tornei_sportivi',
            'corsi_sport', 'feste_private', 'mercatini', 'convegni'
          ]::text[]
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_tipi_gruppi_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_tipi_gruppi_valori check (
        tipi_gruppi is null or (
          array_length(tipi_gruppi, 1) <= 8 and
          tipi_gruppi <@ array[
            'croceristi', 'tour_privati', 'scolaresche', 'centri_estivi',
            'gruppi_sportivi', 'terza_eta', 'aziende', 'associazioni'
          ]::text[]
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_sport_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_sport_valori check (
        sport is null or (
          array_length(sport, 1) <= 14 and
          sport <@ array[
            'beach_volley', 'beach_tennis', 'racchettoni', 'sup', 'canoa',
            'vela', 'windsurf', 'kitesurf', 'nuoto', 'snorkeling',
            'calcetto', 'bocce', 'padel', 'fitness'
          ]::text[]
        )
      );
  end if;

  -- I mesi sono numeri di calendario: fuori da 1-12 non è un mese.
  if not exists (select 1 from pg_constraint where conname = 'profilo_mesi_attivita_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_mesi_attivita_valori check (
        mesi_attivita is null or (
          array_length(mesi_attivita, 1) <= 12 and
          mesi_attivita <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_destagionalizzazione_lunghezza') then
    alter table public.profilo_stabilimento
      add constraint profilo_destagionalizzazione_lunghezza check (
        coalesce(length(destagionalizzazione), 0) <= 1000
      );
  end if;
end $$;

-- Indice per la domanda «chi è attivo fuori stagione in questa zona»: è la
-- query che un Comune o una Regione farebbe per prima.
create index if not exists profilo_fuori_stagione_idx
  on public.profilo_stabilimento using gin (mesi_attivita);

-- 3) Una funzione sola per «è attivo fuori stagione» -----------------------
-- Fuori stagione = da ottobre a marzo. La definizione sta qui e non sparsa
-- nelle query, perché il giorno che diventasse «novembre-febbraio» si cambia
-- in un posto solo.
create or replace function public.attivo_fuori_stagione(_mesi smallint[])
  returns boolean
  language sql
  immutable
as $$
  select coalesce(_mesi && array[10, 11, 12, 1, 2, 3]::smallint[], false);
$$;

grant execute on function public.attivo_fuori_stagione(smallint[]) to anon, authenticated;

-- 4) La fotografia per località si arricchisce ------------------------------
-- Restano conteggi e medie: nessun dato di una singola scheda, solo schede
-- verificate. Le tre colonne nuove sono quelle che servono a una riunione in
-- Comune, non a un bagnante.
create or replace view public.gruppi_per_localita as
  select b.paese,
         b.regione,
         b.localita,
         count(*)                                                 as schede_con_profilo,
         count(*) filter (where p.gruppi_max >= 20)               as gruppi_oltre_20,
         count(*) filter (where p.gruppi_max >= 50)               as gruppi_oltre_50,
         max(p.gruppi_max)                                        as gruppo_piu_grande,
         count(*) filter (where p.pranzo_gruppi in ('su_prenotazione', 'sempre'))
                                                                  as con_pranzo_gruppi,
         count(*) filter (where p.discesa_pullman = 'al_cancello') as con_pullman_al_cancello,
         count(*) filter (where p.accesso_senza_scalini)           as senza_scalini,
         count(*) filter (where p.passerella_fino_al_mare)         as con_passerella,
         count(*) filter (where p.sedia_mare)                      as con_sedia_mare,
         count(*) filter (where p.bagno_accessibile)               as con_bagno_accessibile,
         count(*) filter (where 'en' = any (p.lingue))             as con_inglese,
         round(avg(p.prezzo_ombrellone_alta), 2)                   as prezzo_medio_alta,
         min(p.prezzo_ombrellone_alta)                             as prezzo_minimo_alta,
         max(p.prezzo_ombrellone_alta)                             as prezzo_massimo_alta,
         sum(p.ombrelloni_totali)                                  as ombrelloni_dichiarati,
         count(*) filter (where p.bagnino)                         as con_bagnino,
         count(*) filter (where p.defibrillatore)                  as con_defibrillatore,
         count(*) filter (where p.eventi_privati)                  as per_eventi_privati,
         count(*) filter (where p.area_bimbi)                      as con_area_bimbi,
         count(*) filter (where p.piscina)                         as con_piscina,
         count(*) filter (where p.parcheggio in ('privato_gratuito', 'privato_pagamento'))
                                                                   as con_parcheggio_privato,
         -- arricchimenti della 0082
         count(*) filter (where public.attivo_fuori_stagione(p.mesi_attivita))
                                                                   as attivi_fuori_stagione,
         count(*) filter (where p.tornei_organizzati)              as con_tornei,
         count(*) filter (where 'croceristi' = any (p.tipi_gruppi)) as per_croceristi,
         count(*) filter (where 'scolaresche' = any (p.tipi_gruppi)) as per_scolaresche,
         sum(p.posti_ristorante)                                    as posti_ristorante_totali
    from public.profilo_stabilimento p
    join public.beaches b on b.id = p.beach_id
   where b.profile_status = 'verificato'
   group by b.paese, b.regione, b.localita;

grant select on public.gruppi_per_localita to anon, authenticated;

-- ============================================================
-- DOPO L'ESECUZIONE il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
--
-- La domanda da portare in Comune:
--     select localita, schede_con_profilo, attivi_fuori_stagione, con_tornei
--       from public.gruppi_per_localita
--      where regione = 'Toscana'
--      order by attivi_fuori_stagione desc;
-- ============================================================
