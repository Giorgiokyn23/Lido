-- ============================================================
-- LidoRank - 0024: hardening anti-frode e validazione recensioni (P0)
-- Esegui DOPO 0023. Idempotente.
--
-- Cosa fa:
--  1) aggiunge stato + peso a ogni recensione (macchina a stati)
--  2) aggregazione PESATA: una review falsa a peso basso sposta poco il punteggio
--  3) RPC atomica submit_review(): rate-limit senza race condition + anti-brigading
--  4) flag con auto-quarantena a soglia (shadow-hold)
-- ============================================================

-- 1) STATO + PESO --------------------------------------------------------------
alter table public.reviews
  add column if not exists peso  numeric(4,3) not null default 1,
  add column if not exists stato text        not null default 'pubblicata';

do $$ begin
  alter table public.reviews
    add constraint reviews_stato_chk
    check (stato in ('pubblicata','ridotta','shadow','rifiutata'));
exception when duplicate_object then null; end $$;

alter table public.reviews
  add column if not exists flags_count integer not null default 0;

-- backfill dei dati esistenti: verificate = peso pieno; anonime = peso ridotto (0,25),
-- restano visibili ma pesano poco finché non arriva un account verificato.
update public.reviews
   set peso = case when verified then 1 else 0.25 end
 where peso = 1 and verified = false;

create index if not exists reviews_stato_idx on public.reviews (stato) where stato <> 'pubblicata';

-- 2) VIEW PESATE ---------------------------------------------------------------
-- helper: contribuisce al punteggio solo chi è pubblicata/ridotta e con peso > 0.
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  b.id_concessione, b.tipo, b.paese,
  count(r.id)                                                              as reviews_count,
  round(coalesce(sum(r.peso),0)::numeric,2)                               as peso_totale,
  round((sum(r.peso*r.space_privacy)      / nullif(sum(r.peso),0))::numeric,2) as avg_space_privacy,
  round((sum(r.peso*r.family_services)    / nullif(sum(r.peso),0))::numeric,2) as avg_family_services,
  round((sum(r.peso*r.accessibility)      / nullif(sum(r.peso),0))::numeric,2) as avg_accessibility,
  round((sum(r.peso*r.seabed_quality)     / nullif(sum(r.peso),0))::numeric,2) as avg_seabed_quality,
  round((sum(r.peso*r.pet_friendly)       / nullif(sum(r.peso),0))::numeric,2) as avg_pet_friendly,
  round((sum(r.peso*r.price_transparency) / nullif(sum(r.peso),0))::numeric,2) as avg_price_transparency,
  round((sum(r.peso*r.sicurezza)          / nullif(sum(r.peso) filter (where r.sicurezza is not null),0))::numeric,2) as avg_sicurezza,
  round((sum(r.peso*r.rispetto_regole)    / nullif(sum(r.peso) filter (where r.rispetto_regole is not null),0))::numeric,2) as avg_rispetto_regole,
  round((sum(r.peso*r.atmosfera)          / nullif(sum(r.peso) filter (where r.atmosfera is not null),0))::numeric,2) as avg_atmosfera,
  round((sum(r.peso*( (r.space_privacy + r.family_services + r.accessibility + r.seabed_quality
            + r.pet_friendly + r.price_transparency + coalesce(r.sicurezza,r.space_privacy)
            + coalesce(r.rispetto_regole,r.space_privacy) + coalesce(r.atmosfera,r.space_privacy)) / 9.0 ))
          / nullif(sum(r.peso),0))::numeric, 2)  as avg_overall
from public.beaches b
left join public.reviews r
       on r.beach_id = b.id
      and r.stato in ('pubblicata','ridotta')
      and r.peso > 0
group by b.id;

-- classifiche bayesiane PESATE: W = somma dei pesi (al posto del conteggio)
drop view if exists public.beach_rankings;
create view public.beach_rankings as
with params as (
  select
    coalesce(
      sum(peso*((space_privacy + family_services + accessibility + seabed_quality
        + pet_friendly + price_transparency + sicurezza + rispetto_regole + atmosfera)/9.0))
      / nullif(sum(peso),0), 3.5) as global_mean,
    8::numeric as conf
  from public.reviews
  where sicurezza is not null and stato in ('pubblicata','ridotta') and peso > 0
),
agg as (
  select b.id, b.nome, b.localita, b.regione, b.tipo, b.paese,
    count(r.id) as reviews_count,
    sum(r.peso) as w,
    sum(r.peso*((r.space_privacy + r.family_services + r.accessibility + r.seabed_quality
       + r.pet_friendly + r.price_transparency + r.sicurezza + r.rispetto_regole + r.atmosfera)/9.0))
      / nullif(sum(r.peso),0) as avg_overall
  from public.beaches b
  join public.reviews r on r.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia')
    and r.sicurezza is not null
    and r.stato in ('pubblicata','ridotta')
    and r.peso > 0
  group by b.id
),
scored as (
  select a.*,
    round(((p.conf*p.global_mean + a.w*a.avg_overall)/(p.conf+a.w))::numeric,3) as weighted_score
  from agg a cross join params p
)
select id, nome, localita, regione, tipo, paese, reviews_count,
  round(avg_overall::numeric,2) as avg_overall, weighted_score,
  rank() over (partition by paese, localita order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by paese, regione  order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (partition by paese           order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;

-- 3) RPC ATOMICA DI INSERIMENTO -----------------------------------------------
-- Sostituisce il "conta-poi-inserisci" del server action con UNA transazione:
--  - lock per-IP (niente race condition)
--  - max 6 review/ora per IP  +  max 1 review/lido/24h per IP (anti-brigading)
--  - damper di picco: se un lido riceve un'ondata, le nuove review vanno in shadow (peso 0)
--  - peso/stato calcolati in base all'autenticazione
create or replace function public.submit_review(
  _beach uuid, _uid uuid, _ip text, _p jsonb
) returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  _n int; _nb int; _spike int; _peso numeric; _stato text; _id uuid;
begin
  if _beach is null then raise exception 'beach_missing'; end if;

  -- serializza le richieste dallo stesso IP per l'intera transazione
  perform pg_advisory_xact_lock(hashtext(coalesce(_ip,'unknown')));

  select count(*) into _n from public.reviews
   where ip_hash = _ip and created_at > now() - interval '1 hour';
  if _n >= 6 then raise exception 'rate_limit_ip'; end if;

  select count(*) into _nb from public.reviews
   where ip_hash = _ip and beach_id = _beach and created_at > now() - interval '24 hours';
  if _nb >= 1 then raise exception 'rate_limit_beach'; end if;

  -- peso base per livello di fiducia
  if _uid is not null then _peso := 1; else _peso := 0.25; end if;
  _stato := 'pubblicata';

  -- damper anti-ondata: > 25 review su questo lido nell'ultima ora → shadow-hold
  select count(*) into _spike from public.reviews
   where beach_id = _beach and created_at > now() - interval '1 hour';
  if _spike >= 25 then _stato := 'shadow'; _peso := 0; end if;

  insert into public.reviews(
    beach_id, user_id, verified, ip_hash, peso, stato,
    space_privacy, family_services, accessibility, seabed_quality, pet_friendly,
    price_transparency, sicurezza, rispetto_regole, atmosfera, commento,
    accesso_mare, docce, acqua_calda, battigia_libera, chip_richiesto
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::int, (_p->>'family_services')::int, (_p->>'accessibility')::int,
    (_p->>'seabed_quality')::int, (_p->>'pet_friendly')::int, (_p->>'price_transparency')::int,
    (_p->>'sicurezza')::int, (_p->>'rispetto_regole')::int, (_p->>'atmosfera')::int,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;

-- 4) FLAG CON AUTO-QUARANTENA --------------------------------------------------
-- dedup per utente autenticato; a soglia 3 la review va in shadow-hold (peso 0)
create table if not exists public.review_flags (
  review_id   uuid not null references public.reviews(id) on delete cascade,
  flagger_uid uuid,
  created_at  timestamptz not null default now()
);
create unique index if not exists review_flags_uniq
  on public.review_flags (review_id, flagger_uid) where flagger_uid is not null;

create or replace function public.flag_review(rid uuid)
  returns void language plpgsql security definer set search_path = public
as $$
declare _uid uuid := auth.uid(); _c int;
begin
  if _uid is not null then
    insert into public.review_flags(review_id, flagger_uid)
      values (rid, _uid) on conflict do nothing;
    if not found then return; end if;   -- già segnalata da questo utente
  else
    insert into public.review_flags(review_id, flagger_uid) values (rid, null);
  end if;

  update public.reviews set flags_count = flags_count + 1, segnalata = segnalata + 1
   where id = rid
   returning flags_count into _c;

  -- quarantena automatica: 3+ segnalazioni → shadow-hold in attesa di revisione
  if _c >= 3 then
    update public.reviews set stato = 'shadow', peso = 0 where id = rid and stato <> 'rifiutata';
  end if;
end $$;

revoke all on function public.flag_review(uuid) from public;
grant execute on function public.flag_review(uuid) to anon, authenticated;
