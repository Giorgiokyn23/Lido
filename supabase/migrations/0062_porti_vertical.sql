-- ============================================================
-- LidoRank - 0062: vertical PORTI — criteri, punteggio e classifiche dedicate
--
-- Un porto (beaches.tipo = 'porto') ha 8 criteri nautici/demaniali PROPRI, con
-- colonne separate su `reviews`. Una recensione compila SOLO il set del suo tipo:
--   - recensione di bagno  → colonne balneari valorizzate, colonne porto NULL
--   - recensione di porto  → colonne porto valorizzate, colonne balneari NULL
-- La present-mean nelle viste isola i due mondi da sola (i NULL non contano),
-- quindi avg_overall è corretto per entrambi senza rami CASE.
--
-- Classifiche: i porti vengono classificati in una CATEGORIA separata (non tra i
-- bagni della stessa località).
--
-- Additiva/idempotente. Esegui DOPO 0061.
-- ============================================================

-- (1) colonne criterio porto (numeric mezzo-voto, 1..5, nullable)
alter table public.reviews
  add column if not exists ormeggio            numeric(3,1) check (ormeggio            between 1 and 5),
  add column if not exists spazio_manovra      numeric(3,1) check (spazio_manovra      between 1 and 5),
  add column if not exists canoni              numeric(3,1) check (canoni              between 1 and 5),
  add column if not exists servizi_tecnici     numeric(3,1) check (servizi_tecnici     between 1 and 5),
  add column if not exists servizi_terra       numeric(3,1) check (servizi_terra       between 1 and 5),
  add column if not exists sicurezza_ambiente  numeric(3,1) check (sicurezza_ambiente  between 1 and 5),
  add column if not exists accessibilita_porto numeric(3,1) check (accessibilita_porto between 1 and 5),
  add column if not exists governance          numeric(3,1) check (governance          between 1 and 5);

-- (2) beach_scores: avg per criterio (tutti null-safe) + overall su unione bagno+porto
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  b.id_concessione, b.tipo, b.paese,
  count(r.id)                                                                   as reviews_count,
  round(coalesce(sum(r.peso),0)::numeric,2)                                     as peso_totale,
  round((sum(r.peso*r.space_privacy)      / nullif(sum(r.peso) filter (where r.space_privacy is not null),0))::numeric,2)      as avg_space_privacy,
  round((sum(r.peso*r.family_services)    / nullif(sum(r.peso) filter (where r.family_services is not null),0))::numeric,2)    as avg_family_services,
  round((sum(r.peso*r.accessibility)      / nullif(sum(r.peso) filter (where r.accessibility is not null),0))::numeric,2)      as avg_accessibility,
  round((sum(r.peso*r.seabed_quality)     / nullif(sum(r.peso) filter (where r.seabed_quality is not null),0))::numeric,2)     as avg_seabed_quality,
  round((sum(r.peso*r.price_transparency) / nullif(sum(r.peso) filter (where r.price_transparency is not null),0))::numeric,2) as avg_price_transparency,
  round((sum(r.peso*r.sicurezza)         / nullif(sum(r.peso) filter (where r.sicurezza is not null),0))::numeric,2)         as avg_sicurezza,
  round((sum(r.peso*r.atmosfera)         / nullif(sum(r.peso) filter (where r.atmosfera is not null),0))::numeric,2)         as avg_atmosfera,
  round((sum(r.peso*r.eventi_comunita)   / nullif(sum(r.peso) filter (where r.eventi_comunita is not null),0))::numeric,2)   as avg_eventi_comunita,
  round((sum(r.peso*r.pulizia_igiene)    / nullif(sum(r.peso) filter (where r.pulizia_igiene is not null),0))::numeric,2)    as avg_pulizia_igiene,
  round((sum(r.peso*r.impianti_sportivi) / nullif(sum(r.peso) filter (where r.impianti_sportivi is not null),0))::numeric,2) as avg_impianti_sportivi,
  round((sum(r.peso*r.ormeggio)            / nullif(sum(r.peso) filter (where r.ormeggio is not null),0))::numeric,2)            as avg_ormeggio,
  round((sum(r.peso*r.spazio_manovra)      / nullif(sum(r.peso) filter (where r.spazio_manovra is not null),0))::numeric,2)      as avg_spazio_manovra,
  round((sum(r.peso*r.canoni)              / nullif(sum(r.peso) filter (where r.canoni is not null),0))::numeric,2)              as avg_canoni,
  round((sum(r.peso*r.servizi_tecnici)     / nullif(sum(r.peso) filter (where r.servizi_tecnici is not null),0))::numeric,2)     as avg_servizi_tecnici,
  round((sum(r.peso*r.servizi_terra)       / nullif(sum(r.peso) filter (where r.servizi_terra is not null),0))::numeric,2)       as avg_servizi_terra,
  round((sum(r.peso*r.sicurezza_ambiente)  / nullif(sum(r.peso) filter (where r.sicurezza_ambiente is not null),0))::numeric,2)  as avg_sicurezza_ambiente,
  round((sum(r.peso*r.accessibilita_porto) / nullif(sum(r.peso) filter (where r.accessibilita_porto is not null),0))::numeric,2) as avg_accessibilita_porto,
  round((sum(r.peso*r.governance)          / nullif(sum(r.peso) filter (where r.governance is not null),0))::numeric,2)          as avg_governance,
  round((sum(r.peso * least(5, greatest(1, (
        ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
        + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
        + coalesce(r.price_transparency,0) + coalesce(r.sicurezza,0)
        + coalesce(r.atmosfera,0)          + coalesce(r.eventi_comunita,0)
        + coalesce(r.pulizia_igiene,0)     + coalesce(r.impianti_sportivi,0)
        + coalesce(r.ormeggio,0)           + coalesce(r.spazio_manovra,0)
        + coalesce(r.canoni,0)             + coalesce(r.servizi_tecnici,0)
        + coalesce(r.servizi_terra,0)      + coalesce(r.sicurezza_ambiente,0)
        + coalesce(r.accessibilita_porto,0)+ coalesce(r.governance,0) )::numeric
        / nullif(
            (case when r.space_privacy      is not null then 1 else 0 end)
          + (case when r.family_services    is not null then 1 else 0 end)
          + (case when r.accessibility      is not null then 1 else 0 end)
          + (case when r.seabed_quality     is not null then 1 else 0 end)
          + (case when r.price_transparency is not null then 1 else 0 end)
          + (case when r.sicurezza          is not null then 1 else 0 end)
          + (case when r.atmosfera          is not null then 1 else 0 end)
          + (case when r.eventi_comunita    is not null then 1 else 0 end)
          + (case when r.pulizia_igiene     is not null then 1 else 0 end)
          + (case when r.impianti_sportivi  is not null then 1 else 0 end)
          + (case when r.ormeggio            is not null then 1 else 0 end)
          + (case when r.spazio_manovra      is not null then 1 else 0 end)
          + (case when r.canoni              is not null then 1 else 0 end)
          + (case when r.servizi_tecnici     is not null then 1 else 0 end)
          + (case when r.servizi_terra       is not null then 1 else 0 end)
          + (case when r.sicurezza_ambiente  is not null then 1 else 0 end)
          + (case when r.accessibilita_porto is not null then 1 else 0 end)
          + (case when r.governance          is not null then 1 else 0 end)
          , 0)
        ) + public.dettagli_bonus(r.dettagli)))
      ) / nullif(sum(r.peso),0))::numeric, 2)                                   as avg_overall
from public.beaches b
left join public.reviews r
       on r.beach_id = b.id
      and r.stato in ('pubblicata','ridotta')
      and r.peso > 0
group by b.id;

-- (3) beach_rankings: include i porti, classificati in categoria separata
drop view if exists public.beach_rankings;
create view public.beach_rankings as
with rev as (
  select
    r.beach_id,
    r.peso,
    least(5, greatest(1, (
      ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
      + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
      + coalesce(r.price_transparency,0) + coalesce(r.sicurezza,0)
      + coalesce(r.atmosfera,0)          + coalesce(r.eventi_comunita,0)
      + coalesce(r.pulizia_igiene,0)     + coalesce(r.impianti_sportivi,0)
      + coalesce(r.ormeggio,0)           + coalesce(r.spazio_manovra,0)
      + coalesce(r.canoni,0)             + coalesce(r.servizi_tecnici,0)
      + coalesce(r.servizi_terra,0)      + coalesce(r.sicurezza_ambiente,0)
      + coalesce(r.accessibilita_porto,0)+ coalesce(r.governance,0) )::numeric
      / nullif(
          (case when r.space_privacy      is not null then 1 else 0 end)
        + (case when r.family_services    is not null then 1 else 0 end)
        + (case when r.accessibility      is not null then 1 else 0 end)
        + (case when r.seabed_quality     is not null then 1 else 0 end)
        + (case when r.price_transparency is not null then 1 else 0 end)
        + (case when r.sicurezza          is not null then 1 else 0 end)
        + (case when r.atmosfera          is not null then 1 else 0 end)
        + (case when r.eventi_comunita    is not null then 1 else 0 end)
        + (case when r.pulizia_igiene     is not null then 1 else 0 end)
        + (case when r.impianti_sportivi  is not null then 1 else 0 end)
        + (case when r.ormeggio            is not null then 1 else 0 end)
        + (case when r.spazio_manovra      is not null then 1 else 0 end)
        + (case when r.canoni              is not null then 1 else 0 end)
        + (case when r.servizi_tecnici     is not null then 1 else 0 end)
        + (case when r.servizi_terra       is not null then 1 else 0 end)
        + (case when r.sicurezza_ambiente  is not null then 1 else 0 end)
        + (case when r.accessibilita_porto is not null then 1 else 0 end)
        + (case when r.governance          is not null then 1 else 0 end)
        , 0)
      ) + public.dettagli_bonus(r.dettagli))) as overall
  from public.reviews r
  where r.stato in ('pubblicata','ridotta') and r.peso > 0
),
params as (
  select coalesce(sum(peso*overall)/nullif(sum(peso),0), 3.5) as global_mean, 8::numeric as conf
  from rev
),
agg as (
  select b.id, b.nome, b.localita, b.regione, b.tipo, b.paese,
    case when b.tipo = 'porto' then 'porto' else 'balneare' end as cat,
    count(rv.beach_id)                               as reviews_count,
    sum(rv.peso)                                     as w,
    sum(rv.peso*rv.overall) / nullif(sum(rv.peso),0) as avg_overall
  from public.beaches b
  join rev rv on rv.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia','porto')
  group by b.id
),
scored as (
  select a.*,
    round(((p.conf*p.global_mean + a.w*a.avg_overall)/(p.conf+a.w))::numeric,3) as weighted_score
  from agg a cross join params p
)
select id, nome, localita, regione, tipo, paese, reviews_count,
  round(avg_overall::numeric,2) as avg_overall, weighted_score,
  rank() over (partition by paese, localita, cat order by weighted_score desc, reviews_count desc) as rank_comune,
  rank() over (partition by paese, regione,  cat order by weighted_score desc, reviews_count desc) as rank_regione,
  rank() over (partition by paese,           cat order by weighted_score desc, reviews_count desc) as rank_nazionale
from scored;

-- (4) submit_review: accetta anche gli 8 criteri porto
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
    eventi_comunita, pulizia_igiene, impianti_sportivi,
    ormeggio, spazio_manovra, canoni, servizi_tecnici, servizi_terra,
    sicurezza_ambiente, accessibilita_porto, governance,
    commento,
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
    (_p->>'tariffe_agevolate')::boolean, (_p->>'prezzi_esposti')::boolean, (_p->>'estremi_concessione_esposti')::boolean
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;
