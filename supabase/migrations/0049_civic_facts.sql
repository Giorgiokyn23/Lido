-- ============================================================
-- LidoRank - 0049: informazioni civiche segnalate dagli utenti (ottica Bolkestein)
--
-- Aggiunge SEI FATTI (non voti) sull'uso del demanio a beneficio della collettività.
-- Sono le cose che un bagnante può OSSERVARE e che dicono se una concessione di un
-- bene pubblico serve la comunità o esclude/opacizza:
--   eventi_giovani               : eventi/attività per giovani e comunità
--   fuori_stagione               : aperto o attivo anche fuori dalla stagione estiva
--   ingresso_giornaliero         : si entra a giornata SENZA abbonamento stagionale (accesso non escludente)
--   tariffe_agevolate            : tariffe agevolate per residenti, famiglie o disabili
--   prezzi_esposti               : listino prezzi esposto e visibile
--   estremi_concessione_esposti  : estremi della concessione demaniale esposti al pubblico
--
-- Sono booleani facoltativi: NON entrano nel punteggio né nelle classifiche; sulla
-- scheda compaiono come percentuali aggregate, come dichiarazioni degli utenti.
-- Le recensioni esistenti restano a NULL (nessun backfill): la statistica si
-- costruisce solo sulle risposte che arrivano da qui in avanti.
--
-- Additiva e idempotente. Esegui DOPO 0048 (colonne + aggiornamento RPC).
-- ============================================================

alter table public.reviews
  add column if not exists eventi_giovani              boolean,
  add column if not exists fuori_stagione              boolean,
  add column if not exists ingresso_giornaliero        boolean,
  add column if not exists tariffe_agevolate           boolean,
  add column if not exists prezzi_esposti              boolean,
  add column if not exists estremi_concessione_esposti boolean;

create or replace function public.submit_review(
  _beach uuid, _uid uuid, _ip text, _p jsonb
) returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  _n int; _nb int; _spike int; _peso numeric; _stato text; _id uuid;
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

  -- accusa grave rilevata lato app → attesa di revisione (non pubblica)
  if coalesce((_p->>'hold')::boolean, false) then
    _stato := 'shadow'; _peso := 0;
  end if;

  insert into public.reviews(
    beach_id, user_id, verified, ip_hash, peso, stato,
    space_privacy, family_services, accessibility, seabed_quality, pet_friendly,
    price_transparency, sicurezza, rispetto_regole, atmosfera, commento,
    accesso_mare, docce, acqua_calda, battigia_libera, chip_richiesto,
    visita_periodo,
    eventi_giovani, fuori_stagione, ingresso_giornaliero,
    tariffe_agevolate, prezzi_esposti, estremi_concessione_esposti
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::numeric, (_p->>'family_services')::numeric, (_p->>'accessibility')::numeric,
    (_p->>'seabed_quality')::numeric, (_p->>'pet_friendly')::numeric, (_p->>'price_transparency')::numeric,
    (_p->>'sicurezza')::numeric, (_p->>'rispetto_regole')::numeric, (_p->>'atmosfera')::numeric,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean,
    nullif(_p->>'visita_periodo',''),
    (_p->>'eventi_giovani')::boolean, (_p->>'fuori_stagione')::boolean, (_p->>'ingresso_giornaliero')::boolean,
    (_p->>'tariffe_agevolate')::boolean, (_p->>'prezzi_esposti')::boolean, (_p->>'estremi_concessione_esposti')::boolean
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;
