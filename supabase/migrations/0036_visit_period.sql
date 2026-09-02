-- ============================================================
-- LidoRank - 0036: periodo di visita + conferma cosciente dei voti
-- Aggiunge la colonna facoltativa reviews.visita_periodo ("YYYY-MM")
-- e aggiorna submit_review per salvarla. NON tocca le viste.
-- Additiva e idempotente. Esegui DOPO 0035.
-- ============================================================

-- 1) colonna facoltativa: quando l'utente dichiara di aver visitato
alter table public.reviews
  add column if not exists visita_periodo text;

-- 2) RPC aggiornata: stessa logica anti-frode di 0035 + salvataggio visita_periodo.
--    I 6 criteri principali restano obbligatori; i 3 extra ammettono null
--    (l'app invia null quando l'utente sceglie "Non valutato").
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

  insert into public.reviews(
    beach_id, user_id, verified, ip_hash, peso, stato,
    space_privacy, family_services, accessibility, seabed_quality, pet_friendly,
    price_transparency, sicurezza, rispetto_regole, atmosfera, commento,
    accesso_mare, docce, acqua_calda, battigia_libera, chip_richiesto,
    visita_periodo
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::numeric, (_p->>'family_services')::numeric, (_p->>'accessibility')::numeric,
    (_p->>'seabed_quality')::numeric, (_p->>'pet_friendly')::numeric, (_p->>'price_transparency')::numeric,
    (_p->>'sicurezza')::numeric, (_p->>'rispetto_regole')::numeric, (_p->>'atmosfera')::numeric,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean,
    nullif(_p->>'visita_periodo','')
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;
