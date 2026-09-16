-- ============================================================
-- LidoRank - 0056: Pet Friendly esce dai voti e diventa un FATTO segnalato
--
-- Motivazione: "Pet Friendly" non è un asse di qualità né una materia demaniale
-- (Bolkestein), e un voto 1..5 su questa dimensione confondeva gli utenti
-- ("cosa vuol dire pet friendly 3?") e obbligava chi non ha un cane a inventare
-- un numero, sporcando la media. Diventa quindi un fatto oggettivo segnalato
-- ("Accesso cani"), come docce/acqua calda: informazione utile, NON un punteggio.
--
-- Cosa fa:
--  (A) reviews.pet_friendly diventa NULLABLE (lo storico resta, non si raccoglie più).
--  (B) nuova colonna reviews.accesso_cani (si | area_dedicata | fascia_oraria | no).
--  (C) beach_scores: rimuove avg_pet_friendly e TOGLIE pet_friendly dal voto
--      complessivo (avg_overall), anche retroattivamente per lo storico — così il
--      punteggio di qualità non è più influenzato dalla dimensione "cani".
--  (D) beach_rankings: idem, pet_friendly fuori dall'overall bayesiano.
--  (E) submit_review: non inserisce più pet_friendly, inserisce accesso_cani.
--
-- Le medie ora sono su 8 criteri (o meno, se una recensione vecchia ne ha meno):
-- la logica "media dei criteri effettivamente votati" (present-mean) resta.
-- Additiva/idempotente. Esegui in Supabase DOPO 0055.
-- ============================================================

-- (A) storico preservato, ma non più obbligatorio
alter table public.reviews
  alter column pet_friendly drop not null;

-- (B) nuovo fatto: accesso cani (attributo, non voto)
alter table public.reviews
  add column if not exists accesso_cani text
    check (accesso_cani in ('si','area_dedicata','fascia_oraria','no'));

-- ---------- (C) beach_scores SENZA pet_friendly ----------
drop view if exists public.beach_scores;
create view public.beach_scores as
select
  b.id, b.nome, b.localita, b.regione, b.distanza_ombrelloni_metri, b.created_at,
  b.id_concessione, b.tipo, b.paese,
  count(r.id)                                                                   as reviews_count,
  round(coalesce(sum(r.peso),0)::numeric,2)                                     as peso_totale,
  round((sum(r.peso*r.space_privacy)      / nullif(sum(r.peso),0))::numeric,2)  as avg_space_privacy,
  round((sum(r.peso*r.family_services)    / nullif(sum(r.peso),0))::numeric,2)  as avg_family_services,
  round((sum(r.peso*r.accessibility)      / nullif(sum(r.peso),0))::numeric,2)  as avg_accessibility,
  round((sum(r.peso*r.seabed_quality)     / nullif(sum(r.peso),0))::numeric,2)  as avg_seabed_quality,
  round((sum(r.peso*r.price_transparency) / nullif(sum(r.peso),0))::numeric,2)  as avg_price_transparency,
  round((sum(r.peso*r.sicurezza)       / nullif(sum(r.peso) filter (where r.sicurezza is not null),0))::numeric,2)       as avg_sicurezza,
  round((sum(r.peso*r.rispetto_regole) / nullif(sum(r.peso) filter (where r.rispetto_regole is not null),0))::numeric,2) as avg_rispetto_regole,
  round((sum(r.peso*r.atmosfera)       / nullif(sum(r.peso) filter (where r.atmosfera is not null),0))::numeric,2)       as avg_atmosfera,
  round((sum(r.peso * (
        ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
        + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
        + coalesce(r.price_transparency,0)
        + coalesce(r.sicurezza,0)          + coalesce(r.rispetto_regole,0)
        + coalesce(r.atmosfera,0) )::numeric
        / nullif(
            (case when r.space_privacy      is not null then 1 else 0 end)
          + (case when r.family_services    is not null then 1 else 0 end)
          + (case when r.accessibility      is not null then 1 else 0 end)
          + (case when r.seabed_quality     is not null then 1 else 0 end)
          + (case when r.price_transparency is not null then 1 else 0 end)
          + (case when r.sicurezza          is not null then 1 else 0 end)
          + (case when r.rispetto_regole    is not null then 1 else 0 end)
          + (case when r.atmosfera          is not null then 1 else 0 end)
          , 0)
      )) / nullif(sum(r.peso),0))::numeric, 2)                                  as avg_overall
from public.beaches b
left join public.reviews r
       on r.beach_id = b.id
      and r.stato in ('pubblicata','ridotta')
      and r.peso > 0
group by b.id;

-- ---------- (D) beach_rankings SENZA pet_friendly ----------
drop view if exists public.beach_rankings;
create view public.beach_rankings as
with rev as (
  select
    r.beach_id,
    r.peso,
    ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
    + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
    + coalesce(r.price_transparency,0)
    + coalesce(r.sicurezza,0)          + coalesce(r.rispetto_regole,0)
    + coalesce(r.atmosfera,0) )::numeric
    / nullif(
        (case when r.space_privacy      is not null then 1 else 0 end)
      + (case when r.family_services    is not null then 1 else 0 end)
      + (case when r.accessibility      is not null then 1 else 0 end)
      + (case when r.seabed_quality     is not null then 1 else 0 end)
      + (case when r.price_transparency is not null then 1 else 0 end)
      + (case when r.sicurezza          is not null then 1 else 0 end)
      + (case when r.rispetto_regole    is not null then 1 else 0 end)
      + (case when r.atmosfera          is not null then 1 else 0 end)
      , 0) as overall
  from public.reviews r
  where r.stato in ('pubblicata','ridotta') and r.peso > 0
),
params as (
  select coalesce(sum(peso*overall)/nullif(sum(peso),0), 3.5) as global_mean, 8::numeric as conf
  from rev
),
agg as (
  select b.id, b.nome, b.localita, b.regione, b.tipo, b.paese,
    count(rv.beach_id)                               as reviews_count,
    sum(rv.peso)                                     as w,
    sum(rv.peso*rv.overall) / nullif(sum(rv.peso),0) as avg_overall
  from public.beaches b
  join rev rv on rv.beach_id = b.id
  where b.tipo in ('stabilimento','spiaggia')
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

-- ---------- (E) submit_review: niente pet_friendly, aggiunge accesso_cani ----------
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
    space_privacy, family_services, accessibility, seabed_quality,
    price_transparency, sicurezza, rispetto_regole, atmosfera, commento,
    accesso_mare, docce, acqua_calda, accesso_cani, battigia_libera, chip_richiesto,
    visita_periodo,
    eventi_giovani, fuori_stagione, ingresso_giornaliero,
    tariffe_agevolate, prezzi_esposti, estremi_concessione_esposti
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::numeric, (_p->>'family_services')::numeric, (_p->>'accessibility')::numeric,
    (_p->>'seabed_quality')::numeric, (_p->>'price_transparency')::numeric,
    (_p->>'sicurezza')::numeric, (_p->>'rispetto_regole')::numeric, (_p->>'atmosfera')::numeric,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    nullif(_p->>'accesso_cani',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean,
    nullif(_p->>'visita_periodo',''),
    (_p->>'eventi_giovani')::boolean, (_p->>'fuori_stagione')::boolean, (_p->>'ingresso_giornaliero')::boolean,
    (_p->>'tariffe_agevolate')::boolean, (_p->>'prezzi_esposti')::boolean, (_p->>'estremi_concessione_esposti')::boolean
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;
