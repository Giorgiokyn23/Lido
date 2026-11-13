-- ============================================================
-- LidoRank — 0080: gruppi, accessibilità e servizio sul profilo del gestore
--
-- A COSA SERVE. Sono i dati che un ufficio escursioni, un'agenzia, un
-- concierge d'albergo o chi organizza una gita scolastica deve conoscere per
-- decidere, e che oggi non esistono in forma strutturata da nessuna parte.
-- Google ha recensioni e foto; non ha «accetta gruppi fino a 60, inglese al
-- banco, accesso senza scalini, discesa pullman al cancello». Noi possiamo
-- averli gratis, perché è il gestore stesso a volerli scrivere: gli migliorano
-- la scheda e gli portano clienti.
--
-- Servono anche a chi visita per conto suo: famiglie numerose, gruppi di
-- amici, persone con disabilità, stranieri. Per questo i campi stanno sul
-- profilo pubblico e non in una tabella riservata: un dato che nessuno vede
-- è un dato che nessuno compila.
--
-- CAMPI STRUTTURATI, NON TESTO LIBERO. «Accettiamo gruppi, chiamare» in un
-- campo note non si può né filtrare né contare. Un numero e quattro valori
-- ammessi sì.
--
-- NULL SIGNIFICA «NON DICHIARATO», NON «NO». È una distinzione che conta
-- soprattutto sull'accessibilità: scrivere "no" dove il gestore non ha
-- risposto gli toglie clienti, e scrivere "sì" per sbaglio fa viaggiare per
-- niente una persona in sedia a rotelle. Nessuna colonna ha quindi un valore
-- predefinito diverso da null, e l'interfaccia offre tre stati: sì, no, non
-- indicato.
--
-- REGOLA DEL PROGETTO: nulla di qui entra nel punteggio o nella classifica.
-- Sono fatti dichiarati, non valutazioni, e nessuno può comprarli. Il punto 3
-- estende il controllo automatico di separazione perché resti vero.
--
-- Solo DDL additivo. Esegui DOPO 0079. Idempotente.
-- ============================================================

-- 1) Le colonne -------------------------------------------------------------
alter table public.profilo_stabilimento
  -- Gruppi. 0 = «non accettiamo gruppi», null = non dichiarato: sono due cose
  -- diverse e vanno contate diversamente.
  add column if not exists gruppi_max              smallint,
  add column if not exists gruppi_preavviso_giorni smallint,
  add column if not exists pranzo_gruppi           text,
  add column if not exists discesa_pullman         text,
  -- Accessibilità. Quattro fatti verificabili, non un giudizio complessivo:
  -- "accessibile" senza dettagli non serve a chi deve organizzarsi.
  add column if not exists accesso_senza_scalini   boolean,
  add column if not exists passerella_fino_al_mare boolean,
  add column if not exists sedia_mare              boolean,
  add column if not exists bagno_accessibile       boolean,
  -- Servizio.
  add column if not exists lingue                  text[],
  add column if not exists pagamenti_carte         boolean,
  add column if not exists ombra_garantita         boolean;

-- 2) Vincoli ----------------------------------------------------------------
-- Ogni vincolo è dentro una guardia: la migrazione deve poter essere
-- rieseguita senza esplodere su un constraint che esiste già.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profilo_gruppi_numeri') then
    alter table public.profilo_stabilimento
      add constraint profilo_gruppi_numeri check (
        (gruppi_max is null or gruppi_max between 0 and 2000) and
        (gruppi_preavviso_giorni is null or gruppi_preavviso_giorni between 0 and 60)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_pranzo_gruppi_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_pranzo_gruppi_valori check (
        pranzo_gruppi is null or pranzo_gruppi in ('no', 'su_prenotazione', 'sempre')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_discesa_pullman_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_discesa_pullman_valori check (
        discesa_pullman is null or discesa_pullman in ('no', 'nei_paraggi', 'al_cancello')
      );
  end if;

  -- L'italiano è implicito: si elencano le ALTRE lingue parlate al banco.
  -- L'insieme è chiuso perché un campo libero produce "inglese", "English",
  -- "ingl.", "EN" e nessun conteggio possibile.
  if not exists (select 1 from pg_constraint where conname = 'profilo_lingue_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_lingue_valori check (
        lingue is null or (
          array_length(lingue, 1) <= 6 and
          lingue <@ array['en', 'fr', 'de', 'es', 'ru', 'nl']::text[]
        )
      );
  end if;
end $$;

-- Indice per i filtri «accetta gruppi» e per i conteggi per località.
create index if not exists profilo_gruppi_idx
  on public.profilo_stabilimento (gruppi_max)
  where gruppi_max is not null and gruppi_max > 0;

-- 3) Il controllo di separazione copre anche questi campi -------------------
-- Se un domani qualcuno infilasse "gruppi" o il profilo del gestore in una
-- vista di ranking, questo controllo lo segnala. La regola è che la posizione
-- in classifica dipende SOLO dalle recensioni dei cittadini.
create or replace function public.verifica_separazione_ranking()
  returns table (oggetto text, problema text)
  language sql
  stable
as $$
  with definizioni as (
    select c.relname::text as nome, pg_get_viewdef(c.oid) as corpo
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
    union all
    select p.proname::text, pg_get_functiondef(p.oid)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  ),
  vietati(parola) as (
    values ('rivendicazioni'), ('profile_status'), ('partner'),
           ('entitlement'), ('abbonament'), ('membership'), ('fonte'),
           ('eventi_gestore'), ('calendario_eventi'),
           ('profilo_stabilimento'), ('gruppi'), ('crocier'), ('esperienze')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- 4) La fotografia per località, in forma aggregata -------------------------
-- È la vista che serve a te per parlare con un operatore: «a Livorno 34
-- stabilimenti reggono gruppi oltre 40 persone». Solo conteggi, nessun dato
-- di una singola persona, e legge esclusivamente schede verificate: le stesse
-- che chiunque può già vedere sul sito, quindi non espone niente di nuovo.
create or replace view public.gruppi_per_localita as
  select b.paese,
         b.regione,
         b.localita,
         count(*)                                                as schede_con_profilo,
         count(*) filter (where p.gruppi_max >= 20)              as gruppi_oltre_20,
         count(*) filter (where p.gruppi_max >= 50)              as gruppi_oltre_50,
         max(p.gruppi_max)                                       as gruppo_piu_grande,
         count(*) filter (where p.pranzo_gruppi in ('su_prenotazione', 'sempre'))
                                                                 as con_pranzo_gruppi,
         count(*) filter (where p.discesa_pullman = 'al_cancello') as con_pullman_al_cancello,
         count(*) filter (where p.accesso_senza_scalini)          as senza_scalini,
         count(*) filter (where p.passerella_fino_al_mare)        as con_passerella,
         count(*) filter (where p.sedia_mare)                     as con_sedia_mare,
         count(*) filter (where p.bagno_accessibile)              as con_bagno_accessibile,
         count(*) filter (where 'en' = any (p.lingue))            as con_inglese
    from public.profilo_stabilimento p
    join public.beaches b on b.id = p.beach_id
   where b.profile_status = 'verificato'
   group by b.paese, b.regione, b.localita;

grant select on public.gruppi_per_localita to anon, authenticated;

-- ============================================================
-- DOPO L'ESECUZIONE, il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
--
-- La fotografia per il B2B:
--     select localita, schede_con_profilo, gruppi_oltre_50, con_inglese,
--            senza_scalini
--       from public.gruppi_per_localita
--      where regione = 'Toscana'
--      order by gruppi_oltre_50 desc;
--
-- NON c'è qui la distanza dal porto, che è il dato più decisivo per chi
-- organizza una gita in pullman. Non si chiede al gestore — la accorcerebbe —
-- e non si può calcolare: beaches non ha le coordinate. Va messa per LOCALITÀ,
-- che sono poche, con distanze reali prese una volta sola. È il passo dopo.
-- ============================================================
