-- ============================================================
-- LidoRank - 0035: mezzo voto (½ stella) — granularità stile MyMovies
-- I 9 criteri passano da interi 1..5 a decimali con passo 0,5 (1,0 · 1,5 … 5,0).
-- Le viste dipendono dalle colonne: vanno ELIMINATE, poi le colonne alterate,
-- poi le viste RICREATE (identiche a 0024). Esegui DOPO 0034. Idempotente.
-- ============================================================

-- 1) elimina le viste che dipendono dalle colonne dei voti
drop view if exists public.beach_rankings;
drop view if exists public.beach_scores;

-- 2) colonne dei voti: da intero a numeric(3,1) (ammette 1.0 … 5.0)
alter table public.reviews
  alter column space_privacy      type numeric(3,1) using space_privacy::numeric,
  alter column family_services    type numeric(3,1) using family_services::numeric,
  alter column accessibility      type numeric(3,1) using accessibility::numeric,
  alter column seabed_quality     type numeric(3,1) using seabed_quality::numeric,
  alter column pet_friendly       type numeric(3,1) using pet_friendly::numeric,
  alter column price_transparency type numeric(3,1) using price_transparency::numeric,
  alter column sicurezza          type numeric(3,1) using sicurezza::numeric,
  alter column rispetto_regole    type numeric(3,1) using rispetto_regole::numeric,
  alter column atmosfera          type numeric(3,1) using atmosfera::numeric;

-- 3) ricrea beach_scores (identica a 0024)
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

-- 4) ricrea beach_rankings (identica a 0024)
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

-- 5) RPC di inserimento aggiornata: i voti sono ora numerici (mezzi voti ammessi)
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
    accesso_mare, docce, acqua_calda, battigia_libera, chip_richiesto
  ) values (
    _beach, _uid, _uid is not null, _ip, _peso, _stato,
    (_p->>'space_privacy')::numeric, (_p->>'family_services')::numeric, (_p->>'accessibility')::numeric,
    (_p->>'seabed_quality')::numeric, (_p->>'pet_friendly')::numeric, (_p->>'price_transparency')::numeric,
    (_p->>'sicurezza')::numeric, (_p->>'rispetto_regole')::numeric, (_p->>'atmosfera')::numeric,
    nullif(_p->>'commento',''),
    nullif(_p->>'accesso_mare',''), nullif(_p->>'docce',''), nullif(_p->>'acqua_calda',''),
    (_p->>'battigia_libera')::boolean, (_p->>'chip_richiesto')::boolean
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;
