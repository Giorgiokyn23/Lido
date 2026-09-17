-- ============================================================
-- LidoRank - 0065: aggiorna dettagli_bonus con i sotto-punti OBBLIGATORI dei porti
-- Aggiunge alla lista "peso doppio" i sotto-punti ⚖️ portuali (canoni esposti e
-- assegnazione trasparente, servizi igienici, salvataggio/antincendio, raccolta
-- rifiuti e acque di sentina, accessibilità). Allineato a OBLIGATORY_SUBPOINTS
-- nel codice. Solo la funzione: le viste la richiamano per nome. Esegui DOPO 0064.
-- ============================================================

create or replace function public.dettagli_bonus(_d jsonb)
  returns numeric language sql immutable as $$
  with kv as (
    select
      case when key in (
        -- bagni
        'sp_densita','ac_passerelle','ac_job','ac_servizi',
        'fa_balneazione','pr_listino','si_bagnino','si_postazione','si_bandiere',
        -- porti
        'ca_listino','ca_bando','se_servizi',
        'sa_salvataggio','sa_rifiuti','sa_sentina','ap_pontili','ap_servizi'
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
