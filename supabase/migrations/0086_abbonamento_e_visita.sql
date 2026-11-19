-- ============================================================
-- LidoRank — 0086: abbonamento stagionale, e la visita non è più una casella
--
-- DUE MODIFICHE AL MODULO DI RECENSIONE, dai punti 2 e 3 di Francesco.
--
-- 1) ABBONAMENTO STAGIONALE. Chi ha l'abbonamento conosce il bagno in un
--    modo diverso da chi ci ha passato un pomeriggio, e dirlo aiuta chi
--    legge. Ma è una spunta che chiunque può mettere: per questo NON tocca
--    il peso della recensione né il punteggio dello stabilimento. Darle peso
--    significherebbe regalare una leva a chi vuole gonfiare una scheda, e lo
--    scoprirebbe il primo che ci prova.
--
-- 2) LA CONFERMA DI VISITA. Oggi la casella «confermo di aver visitato» è
--    obbligatoria e il server rifiuta la recensione senza. Francesco chiede
--    di toglierla e di togliere anche la riga «Pubblicando confermi...».
--    Una delle due si può togliere, tutte e due no: resterebbe un modulo
--    dove nessuno dichiara mai niente, e quando un gestore contesta una
--    recensione — succederà — la differenza fra «un anonimo ha scritto
--    questo» e «chi ha scritto ha dichiarato di esserci stato» è la
--    differenza fra una grana e una procedura.
--    Qui cade la CASELLA (meno attrito, come chiede lui); la dichiarazione
--    resta in una riga sotto il pulsante di invio. Il vincolo lato server
--    si sposta di conseguenza nell'azione, non in questa funzione.
--
-- La funzione submit_review NON cambia firma e la sua logica antifrode è
-- copiata alla lettera: limiti per IP, limite per bagno, blocco di
-- concorrenza, soglia di impennata, quarantena, peso 0.25 per chi scrive
-- senza account. L'unica aggiunta è una colonna in coda all'insert.
--
-- Esegui DOPO 0085. Idempotente.
-- ============================================================

-- 1) La colonna -------------------------------------------------------------
alter table public.reviews
  add column if not exists abbonato boolean;

-- 2) submit_review: stessa firma, stessa logica, una colonna in più ---------
create or replace function public.submit_review(
  _beach uuid, _uid uuid, _ip text, _p jsonb
) returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  _n int; _nb int; _spike int; _peso numeric; _stato text; _id uuid; _fonte text;
  _abbonato boolean;
begin
  if _beach is null then raise exception 'beach_missing'; end if;

  perform pg_advisory_xact_lock(hashtext(coalesce(_ip,'unknown')));

  select count(*) into _n from public.reviews
   where ip_hash = _ip and created_at > now() - interval '1 hour';
  if _n >= 6 then raise exception 'rate_limit_ip'; end if;

  select count(*) into _nb from public.reviews
   where ip_hash = _ip and beach_id = _beach and created_at > now() - interval '24 hours';
  if _nb >= 1 then raise exception 'rate_limit_beach'; end if;

  if _uid is not null then _peso := 1; else _peso := 0.25; end if;
  _stato := 'pubblicata';

  select count(*) into _spike from public.reviews
   where beach_id = _beach and created_at > now() - interval '1 hour';
  if _spike >= 25 then _stato := 'shadow'; _peso := 0; end if;

  if coalesce((_p->>'hold')::boolean, false) then
    _stato := 'shadow'; _peso := 0;
  end if;

  -- Provenienza: valore ammesso oppure NULL. Non tocca né _peso né _stato.
  _fonte := case when _p->>'fonte' in ('qr','wa','mail','link') then _p->>'fonte' else null end;

  -- Abbonamento stagionale dichiarato da chi scrive. NON tocca _peso né
  -- _stato, e non è un caso: è una spunta che chiunque può mettere, quindi
  -- farla pesare sul punteggio regalerebbe una leva a chi vuole gonfiare una
  -- scheda. Serve a dare contesto a chi legge, niente di più.
  _abbonato := case when (_p->>'abbonato') = 'true' then true else null end;

  insert into public.reviews(
    beach_id, user_id, verified, ip_hash, peso, stato,
    space_privacy, family_services, accessibility, seabed_quality,
    price_transparency, sicurezza, atmosfera,
    eventi_comunita, pulizia_igiene, impianti_sportivi,
    ormeggio, spazio_manovra, canoni, servizi_tecnici, servizi_terra,
    sicurezza_ambiente, accessibilita_porto, governance,
    commento,
    accesso_mare, docce, acqua_calda, accesso_cani, battigia_libera, chip_richiesto,
    dettagli, visita_periodo,
    eventi_giovani, fuori_stagione, ingresso_giornaliero,
    tariffe_agevolate, prezzi_esposti, estremi_concessione_esposti,
    fonte, abbonato
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::numeric, (_p->>'family_services')::numeric, (_p->>'accessibility')::numeric,
    (_p->>'seabed_quality')::numeric, (_p->>'price_transparency')::numeric,
    (_p->>'sicurezza')::numeric, (_p->>'atmosfera')::numeric,
    (_p->>'eventi_comunita')::numeric, (_p->>'pulizia_igiene')::numeric, (_p->>'impianti_sportivi')::numeric,
    (_p->>'ormeggio')::numeric, (_p->>'spazio_manovra')::numeric, (_p->>'canoni')::numeric,
    (_p->>'servizi_tecnici')::numeric, (_p->>'servizi_terra')::numeric, (_p->>'sicurezza_ambiente')::numeric,
    (_p->>'accessibilita_porto')::numeric, (_p->>'governance')::numeric,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    nullif(_p->>'accesso_cani',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean,
    case when jsonb_typeof(_p->'dettagli') = 'object' then _p->'dettagli' else null end,
    nullif(_p->>'visita_periodo',''),
    (_p->>'eventi_giovani')::boolean, (_p->>'fuori_stagione')::boolean, (_p->>'ingresso_giornaliero')::boolean,
    (_p->>'tariffe_agevolate')::boolean, (_p->>'prezzi_esposti')::boolean, (_p->>'estremi_concessione_esposti')::boolean,
    _fonte, _abbonato
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;

-- 3) La vista pubblica va rifatta, o la colonna nuova non si vede -----------
-- È esattamente il caso per cui la 0085 ha messo questa ricostruzione in una
-- funzione invece che in un blocco copiato a mano.
select public.ricostruisci_vista_recensioni();

-- 4) L'abbonamento non deve entrare nel ranking -----------------------------
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
           ('profilo_stabilimento'), ('gruppi'), ('crocier'), ('esperienze'),
           ('specializzazion'), ('music'), ('abbonato')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- DOPO L'ESECUZIONE il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
-- ============================================================
