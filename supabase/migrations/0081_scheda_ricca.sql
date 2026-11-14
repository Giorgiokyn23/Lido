-- ============================================================
-- LidoRank — 0081: la scheda ricca
--
-- Trentacinque campi nuovi sul profilo curato dal gestore, scelti con un
-- criterio solo: o li cerca un utente prima di decidere dove andare, o
-- servono a chi compra (agenzie, uffici escursioni, Comuni, chi organizza
-- un matrimonio). Niente campi messi per fare numero.
--
-- IL PEZZO PIÙ VENDIBILE SONO I PREZZI. È la prima cosa che un bagnante
-- cerca e la sola che nessun aggregatore ha in forma confrontabile. Per
-- questo c'è prezzi_aggiornati_il, riempita da sola: un prezzo senza data
-- è un prezzo di cui non ti puoi fidare, e sei mesi dopo è una bugia.
--
-- GLI OBBLIGHI NON BLOCCANO IL SALVATAGGIO. Un modulo che rifiuta di salvare
-- finché non sono pieni trenta campi non produce trenta campi pieni: produce
-- zero profili, perché il gestore chiude la pagina e non torna, e si perde
-- anche quel poco che aveva scritto. Qui l'obbligo è legato a un VANTAGGIO:
-- profilo_minimo_completo() elenca dieci voci, e senza quelle dieci non si
-- pubblicano eventi. Chi vuole la vetrina compila. Chi non compila resta con
-- una scheda povera, che è già una penalità naturale.
--
-- L'AMMINISTRATORE PUÒ COMPILARE. Oggi i profili compilati sono zero, e
-- aspettare i gestori significa aspettare. Potendo riempire tu le schede dei
-- bagni che conosci, ti presenti al gestore con la sua pagina già migliore di
-- quella che ha su Google: è un argomento molto più forte di un modulo vuoto.
-- Ogni modifica resta tracciata in eventi_audit con il tuo nome.
--
-- REGOLA DEL PROGETTO: nulla di qui entra nel punteggio o nella classifica.
-- Sono fatti dichiarati dal gestore, non valutazioni, e nessuno può
-- comprarli. profilo_stabilimento è già nella lista nera del controllo
-- automatico di separazione, quindi la regola resta verificabile.
--
-- Solo DDL additivo. Esegui DOPO 0080. Idempotente.
-- ============================================================

-- 1) Le colonne -------------------------------------------------------------
alter table public.profilo_stabilimento
  -- Spiaggia e capienza. Gli ombrelloni sono la misura vera di uno
  -- stabilimento: dicono quanto è grande meglio di qualunque aggettivo.
  add column if not exists ombrelloni_totali          smallint,
  add column if not exists tipo_fondo                 text,
  add column if not exists spiaggia_libera_adiacente  boolean,
  add column if not exists piscina                    boolean,

  -- Prezzi. In euro. Null = non dichiarato, 0 = gratuito.
  add column if not exists prezzo_ombrellone_bassa    numeric(6,2),
  add column if not exists prezzo_ombrellone_alta     numeric(6,2),
  add column if not exists prezzo_lettino             numeric(6,2),
  add column if not exists prezzo_ingresso            numeric(6,2),
  add column if not exists prezzo_stagionale_da       numeric(7,2),
  add column if not exists prezzi_aggiornati_il       date,

  -- Stagione. Mesi, non date: un bagno apre "a maggio", non il 7 maggio.
  add column if not exists mese_apertura              smallint,
  add column if not exists mese_chiusura              smallint,
  add column if not exists aperto_tutto_anno          boolean,

  -- Servizi.
  add column if not exists bar                        boolean,
  add column if not exists ristorante                 boolean,
  add column if not exists docce                      boolean,
  add column if not exists cabine                     boolean,
  add column if not exists wifi                       boolean,
  add column if not exists parcheggio                 text,
  add column if not exists parcheggio_posti           smallint,
  add column if not exists noleggio_attrezzature      boolean,
  add column if not exists campi_sportivi             boolean,
  add column if not exists animazione                 boolean,
  add column if not exists area_bimbi                 boolean,
  add column if not exists menu_bambini               boolean,

  -- Sicurezza. Interessa i bagnanti, e interessa i Comuni: è la parte che
  -- rende questi dati utili anche a un'amministrazione.
  add column if not exists bagnino                    boolean,
  add column if not exists bagnino_orario             text,
  add column if not exists defibrillatore             boolean,

  -- Eventi privati: matrimoni, cene aziendali, feste. Il margine più alto
  -- di uno stabilimento, e oggi introvabile senza telefonare a uno a uno.
  add column if not exists eventi_privati             boolean,
  add column if not exists eventi_capienza            smallint,
  add column if not exists musica_serale              boolean,

  -- Sostenibilità.
  add column if not exists raccolta_differenziata     boolean,
  add column if not exists plastic_free               boolean,
  add column if not exists fontanella_acqua           boolean,

  -- Dove i bagni vivono per davvero.
  add column if not exists instagram                  text,
  add column if not exists whatsapp                   text;

-- 2) Vincoli ----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profilo_capienza_numeri') then
    alter table public.profilo_stabilimento
      add constraint profilo_capienza_numeri check (
        (ombrelloni_totali is null or ombrelloni_totali between 0 and 5000) and
        (parcheggio_posti  is null or parcheggio_posti  between 0 and 5000) and
        (eventi_capienza   is null or eventi_capienza   between 0 and 5000)
      );
  end if;

  -- Il tetto sui prezzi non è pedanteria: un ombrellone a 9.000 euro è un
  -- dito scivolato sullo zero, e un prezzo assurdo in vetrina fa più danno
  -- di un prezzo assente.
  if not exists (select 1 from pg_constraint where conname = 'profilo_prezzi_numeri') then
    alter table public.profilo_stabilimento
      add constraint profilo_prezzi_numeri check (
        (prezzo_ombrellone_bassa is null or prezzo_ombrellone_bassa between 0 and 2000) and
        (prezzo_ombrellone_alta  is null or prezzo_ombrellone_alta  between 0 and 2000) and
        (prezzo_lettino          is null or prezzo_lettino          between 0 and 500)  and
        (prezzo_ingresso         is null or prezzo_ingresso         between 0 and 500)  and
        (prezzo_stagionale_da    is null or prezzo_stagionale_da    between 0 and 50000)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_stagione_mesi') then
    alter table public.profilo_stabilimento
      add constraint profilo_stagione_mesi check (
        (mese_apertura  is null or mese_apertura  between 1 and 12) and
        (mese_chiusura  is null or mese_chiusura  between 1 and 12)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_tipo_fondo_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_tipo_fondo_valori check (
        tipo_fondo is null or tipo_fondo in ('sabbia', 'ghiaia', 'sassi', 'scogli', 'misto')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_parcheggio_valori') then
    alter table public.profilo_stabilimento
      add constraint profilo_parcheggio_valori check (
        parcheggio is null or parcheggio in
          ('no', 'pubblico_vicino', 'privato_gratuito', 'privato_pagamento')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profilo_lunghezze_2') then
    alter table public.profilo_stabilimento
      add constraint profilo_lunghezze_2 check (
        coalesce(length(bagnino_orario), 0) <= 120 and
        coalesce(length(instagram), 0)      <= 100 and
        coalesce(length(whatsapp), 0)       <= 40
      );
  end if;
end $$;

-- 3) La data dei prezzi si scrive da sola -----------------------------------
-- Ridefinisce il trigger della 0073 conservandone il comportamento: aggiorna
-- aggiornato_il/aggiornato_da e scrive in eventi_audit. In più, quando un
-- prezzo cambia, timbra prezzi_aggiornati_il. Così la scheda può dire
-- «prezzi aggiornati a giugno» invece di chiedere fiducia a scatola chiusa.
create or replace function public.profilo_audit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prezzi_cambiati boolean := false;
begin
  new.aggiornato_il := now();
  new.aggiornato_da := auth.uid();

  if tg_op = 'INSERT' then
    v_prezzi_cambiati :=
      new.prezzo_ombrellone_bassa is not null or
      new.prezzo_ombrellone_alta  is not null or
      new.prezzo_lettino          is not null or
      new.prezzo_ingresso         is not null or
      new.prezzo_stagionale_da    is not null;
  else
    v_prezzi_cambiati :=
      new.prezzo_ombrellone_bassa is distinct from old.prezzo_ombrellone_bassa or
      new.prezzo_ombrellone_alta  is distinct from old.prezzo_ombrellone_alta  or
      new.prezzo_lettino          is distinct from old.prezzo_lettino          or
      new.prezzo_ingresso         is distinct from old.prezzo_ingresso         or
      new.prezzo_stagionale_da    is distinct from old.prezzo_stagionale_da;
  end if;

  if v_prezzi_cambiati then
    new.prezzi_aggiornati_il := current_date;
  end if;

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values ('profilo_stabilimento', new.beach_id::text,
          case when tg_op = 'INSERT' then 'creato' else 'modificato' end,
          auth.uid(),
          case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
          to_jsonb(new));

  return new;
end;
$$;

-- 4) Il profilo minimo, e il vantaggio che ne dipende -----------------------
-- Dieci voci. Non sono le più comode da chiedere: sono quelle che rendono una
-- scheda utile a chi la legge. Senza descrizione non si capisce dov'è; senza
-- prezzo e ombrelloni non si confronta; senza bagnino e parcheggio non si
-- organizza; senza gruppi e accessibilità non ci trova chi compra.
create or replace function public.profilo_minimo_completo(_beach uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.profilo_stabilimento p
     where p.beach_id = _beach
       and coalesce(btrim(p.descrizione), '') <> ''
       and coalesce(btrim(p.orari), '') <> ''
       and (coalesce(btrim(p.telefono), '') <> '' or coalesce(btrim(p.email_pubblica), '') <> '')
       and p.ombrelloni_totali is not null
       and p.tipo_fondo is not null
       and p.prezzo_ombrellone_alta is not null
       and p.bagnino is not null
       and p.parcheggio is not null
       and p.gruppi_max is not null
       and (p.accesso_senza_scalini is not null
         or p.passerella_fino_al_mare is not null
         or p.sedia_mare is not null
         or p.bagno_accessibile is not null)
  );
$$;

revoke all on function public.profilo_minimo_completo(uuid) from public;
grant execute on function public.profilo_minimo_completo(uuid) to anon, authenticated;

-- Quante voci mancano, per poterlo dire al gestore invece di lasciarlo
-- indovinare davanti a un pulsante spento.
create or replace function public.profilo_minimo_mancanti(_beach uuid)
  returns text[]
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(array_remove(array[
    case when coalesce(btrim(p.descrizione), '') = '' then 'descrizione' end,
    case when coalesce(btrim(p.orari), '') = '' then 'orari' end,
    case when coalesce(btrim(p.telefono), '') = ''
          and coalesce(btrim(p.email_pubblica), '') = '' then 'contatto' end,
    case when p.ombrelloni_totali is null then 'ombrelloni' end,
    case when p.tipo_fondo is null then 'tipo_fondo' end,
    case when p.prezzo_ombrellone_alta is null then 'prezzo' end,
    case when p.bagnino is null then 'bagnino' end,
    case when p.parcheggio is null then 'parcheggio' end,
    case when p.gruppi_max is null then 'gruppi' end,
    case when p.accesso_senza_scalini is null
          and p.passerella_fino_al_mare is null
          and p.sedia_mare is null
          and p.bagno_accessibile is null then 'accessibilita' end
  ], null), array['descrizione','orari','contatto','ombrelloni','tipo_fondo',
                  'prezzo','bagnino','parcheggio','gruppi','accessibilita'])
    from public.beaches b
    left join public.profilo_stabilimento p on p.beach_id = b.id
   where b.id = _beach;
$$;

revoke all on function public.profilo_minimo_mancanti(uuid) from public;
grant execute on function public.profilo_minimo_mancanti(uuid) to authenticated;

-- Gli eventi richiedono il profilo minimo. È l'unico "obbligo" del sistema,
-- e non blocca mai un salvataggio: blocca una vetrina in più.
create or replace function public.puo_pubblicare_eventi(_beach uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.e_gestore_di(_beach)
     and exists (select 1 from public.beaches b
                  where b.id = _beach and b.profile_status = 'verificato')
     and public.profilo_minimo_completo(_beach);
$$;

revoke all on function public.puo_pubblicare_eventi(uuid) from public;
grant execute on function public.puo_pubblicare_eventi(uuid) to anon, authenticated;

-- 5) L'amministratore può compilare i profili -------------------------------
-- Serve a popolare il sito prima che i gestori arrivino. Non è una scorciatoia
-- sul ranking: il profilo non lo tocca. Ogni modifica è tracciata.
drop policy if exists "profilo_gestore_insert" on public.profilo_stabilimento;
create policy "profilo_gestore_insert" on public.profilo_stabilimento
  for insert with check (public.e_gestore_di(beach_id) or public.e_admin());

drop policy if exists "profilo_gestore_update" on public.profilo_stabilimento;
create policy "profilo_gestore_update" on public.profilo_stabilimento
  for update using (public.e_gestore_di(beach_id) or public.e_admin())
           with check (public.e_gestore_di(beach_id) or public.e_admin());

drop policy if exists "profilo_gestore_read" on public.profilo_stabilimento;
create policy "profilo_gestore_read" on public.profilo_stabilimento
  for select using (public.e_gestore_di(beach_id) or public.e_admin());

-- 6) La fotografia per località si arricchisce ------------------------------
-- Il prezzo medio per località è il numero che un'agenzia guarda per primo, e
-- nessuno lo pubblica. Restano solo conteggi e medie: nessun dato di una
-- singola scheda, e solo schede verificate.
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
         -- arricchimenti della 0081
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
                                                                   as con_parcheggio_privato
    from public.profilo_stabilimento p
    join public.beaches b on b.id = p.beach_id
   where b.profile_status = 'verificato'
   group by b.paese, b.regione, b.localita;

grant select on public.gruppi_per_localita to anon, authenticated;

-- ============================================================
-- DOPO L'ESECUZIONE il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
--
-- Per vedere a che punto è una scheda:
--     select public.profilo_minimo_mancanti('<beach_id>');
-- ============================================================
