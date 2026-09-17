-- ============================================================
-- LidoRank - 0059: sotto-punti facoltativi in un campo JSONB `dettagli`
--
-- Ogni criterio ha ~5 sotto-punti facoltativi (config in lib/types.ts SUBPOINTS).
-- Sono dichiarazioni a 4 stati: sì / no / non so / non applicabile.
--   - il form salva solo gli stati espressi: { "<subKey>": "si"|"no"|"na" }
--   - "non so" = chiave assente (neutro)
-- Non sono voti 1..5 e NON entrano (per ora) nel punteggio/classifica: si
-- aggregano sulla scheda come percentuali di "sì". L'eventuale contributo al
-- punteggio si valuterà a parte, sui dati reali, per non destabilizzare il ranking.
--
-- Additiva/idempotente. Esegui in Supabase DOPO 0058.
-- ============================================================

alter table public.reviews
  add column if not exists dettagli jsonb;

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

  if coalesce((_p->>'hold')::boolean, false) then
    _stato := 'shadow'; _peso := 0;
  end if;

  insert into public.reviews(
    beach_id, user_id, verified, ip_hash, peso, stato,
    space_privacy, family_services, accessibility, seabed_quality,
    price_transparency, sicurezza, atmosfera,
    eventi_comunita, pulizia_igiene, impianti_sportivi, commento,
    accesso_mare, docce, acqua_calda, accesso_cani, battigia_libera, chip_richiesto,
    dettagli, visita_periodo,
    eventi_giovani, fuori_stagione, ingresso_giornaliero,
    tariffe_agevolate, prezzi_esposti, estremi_concessione_esposti
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::numeric, (_p->>'family_services')::numeric, (_p->>'accessibility')::numeric,
    (_p->>'seabed_quality')::numeric, (_p->>'price_transparency')::numeric,
    (_p->>'sicurezza')::numeric, (_p->>'atmosfera')::numeric,
    (_p->>'eventi_comunita')::numeric, (_p->>'pulizia_igiene')::numeric, (_p->>'impianti_sportivi')::numeric,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    nullif(_p->>'accesso_cani',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean,
    case when jsonb_typeof(_p->'dettagli') = 'object' then _p->'dettagli' else null end,
    nullif(_p->>'visita_periodo',''),
    (_p->>'eventi_giovani')::boolean, (_p->>'fuori_stagione')::boolean, (_p->>'ingresso_giornaliero')::boolean,
    (_p->>'tariffe_agevolate')::boolean, (_p->>'prezzi_esposti')::boolean, (_p->>'estremi_concessione_esposti')::boolean
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;
