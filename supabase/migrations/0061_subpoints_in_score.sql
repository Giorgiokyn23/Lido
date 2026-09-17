-- ============================================================
-- LidoRank - 0061: i sotto-punti entrano nel punteggio (bonus/malus limitato)
--
-- I sotto-punti "sì" premiano, "no" penalizzano; gli OBBLIGATORI (⚖️) pesano il
-- doppio. Il contributo è LIMITATO a ±0,5 stelle per recensione, così non
-- destabilizza la classifica: il voto 1..5 resta dominante, i sotto-punti lo
-- rifiniscono. "non so"/"non applicabile" non contano.
--
-- bonus = 0,5 * (Σ segno·peso) / (Σ peso)   con peso 2 se obbligatorio, 1 altrimenti
--         segno = +1 per "sì", -1 per "no";  ∈ [-0,5, +0,5]
-- overall_recensione = clamp(media_criteri + bonus, 1, 5)
--
-- Le recensioni senza sotto-punti hanno bonus 0 (nessun effetto).
-- Idempotente. Esegui DOPO 0060.
-- ============================================================

create or replace function public.dettagli_bonus(_d jsonb)
  returns numeric language sql immutable as $$
  with kv as (
    select
      case when key in (
        'sp_densita','ac_passerelle','ac_job','ac_servizi',
        'fa_balneazione','pr_listino','si_bagnino','si_postazione','si_bandiere'
      ) then 2 else 1 end as w,
      value as v
    from jsonb_each_text(coalesce(_d, '{}'::jsonb))
  ),
  agg as (
    select
      coalesce(sum(case when v='si' then w when v='no' then -w else 0 end), 0) as net,
      coalesce(sum(case when v in ('si','no') then w else 0 end), 0)           as maxw
    from kv
  )
  select case when maxw = 0 then 0
              else round((0.5 * net / maxw)::numeric, 3) end
  from agg;
$$;

-- ---------- beach_scores con bonus sotto-punti nell'overall ----------
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
  round((sum(r.peso*r.sicurezza)         / nullif(sum(r.peso) filter (where r.sicurezza is not null),0))::numeric,2)         as avg_sicurezza,
  round((sum(r.peso*r.atmosfera)         / nullif(sum(r.peso) filter (where r.atmosfera is not null),0))::numeric,2)         as avg_atmosfera,
  round((sum(r.peso*r.eventi_comunita)   / nullif(sum(r.peso) filter (where r.eventi_comunita is not null),0))::numeric,2)   as avg_eventi_comunita,
  round((sum(r.peso*r.pulizia_igiene)    / nullif(sum(r.peso) filter (where r.pulizia_igiene is not null),0))::numeric,2)    as avg_pulizia_igiene,
  round((sum(r.peso*r.impianti_sportivi) / nullif(sum(r.peso) filter (where r.impianti_sportivi is not null),0))::numeric,2) as avg_impianti_sportivi,
  round((sum(r.peso * least(5, greatest(1, (
        ( coalesce(r.space_privacy,0)      + coalesce(r.family_services,0)
        + coalesce(r.accessibility,0)      + coalesce(r.seabed_quality,0)
        + coalesce(r.price_transparency,0) + coalesce(r.sicurezza,0)
        + coalesce(r.atmosfera,0)          + coalesce(r.eventi_comunita,0)
        + coalesce(r.pulizia_igiene,0)     + coalesce(r.impianti_sportivi,0) )::numeric
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
          , 0)
        ) + public.dettagli_bonus(r.dettagli)))
      ) / nullif(sum(r.peso),0))::numeric, 2)                                   as avg_overall
from public.beaches b
left join public.reviews r
       on r.beach_id = b.id
      and r.stato in ('pubblicata','ridotta')
      and r.peso > 0
group by b.id;

-- ---------- beach_rankings con bonus sotto-punti ----------
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
      + coalesce(r.pulizia_igiene,0)     + coalesce(r.impianti_sportivi,0) )::numeric
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
