-- ============================================================
-- LidoRank - 0068: FIX della preservazione dati porti (la 0067 step 2 falliva:
-- non si può correlare la tabella target 'r' dentro il FROM con un join).
-- Qui 'beaches' sta nel FROM e si correla in WHERE. Idempotente (solo NULL).
-- La conversione porticcioli→porto (0067 step 1) è già avvenuta. Esegui questo.
-- ============================================================

update public.reviews r
set
  ormeggio            = coalesce(r.ormeggio,            x.base),
  spazio_manovra      = coalesce(r.spazio_manovra,      coalesce(r.space_privacy,      x.base)),
  canoni              = coalesce(r.canoni,              coalesce(r.price_transparency, x.base)),
  servizi_tecnici     = coalesce(r.servizi_tecnici,     x.base),
  servizi_terra       = coalesce(r.servizi_terra,       coalesce(r.family_services,    x.base)),
  sicurezza_ambiente  = coalesce(r.sicurezza_ambiente,  coalesce(r.sicurezza,          x.base)),
  accessibilita_porto = coalesce(r.accessibilita_porto, coalesce(r.accessibility,      x.base)),
  governance          = coalesce(r.governance,          coalesce(r.eventi_comunita,    x.base))
from public.beaches b,
  (
    select re.id,
      round((
        ( coalesce(re.space_privacy,0)   + coalesce(re.family_services,0)   + coalesce(re.accessibility,0)
        + coalesce(re.seabed_quality,0)  + coalesce(re.price_transparency,0)+ coalesce(re.sicurezza,0)
        + coalesce(re.atmosfera,0)       + coalesce(re.eventi_comunita,0)   + coalesce(re.pulizia_igiene,0)
        + coalesce(re.impianti_sportivi,0) )::numeric
        / nullif(
            (case when re.space_privacy      is not null then 1 else 0 end)
          + (case when re.family_services    is not null then 1 else 0 end)
          + (case when re.accessibility      is not null then 1 else 0 end)
          + (case when re.seabed_quality     is not null then 1 else 0 end)
          + (case when re.price_transparency is not null then 1 else 0 end)
          + (case when re.sicurezza          is not null then 1 else 0 end)
          + (case when re.atmosfera          is not null then 1 else 0 end)
          + (case when re.eventi_comunita    is not null then 1 else 0 end)
          + (case when re.pulizia_igiene     is not null then 1 else 0 end)
          + (case when re.impianti_sportivi  is not null then 1 else 0 end)
          , 0)
      ) * 2) / 2 as base
    from public.reviews re
  ) x
where x.id = r.id
  and b.id = r.beach_id
  and b.tipo = 'porto'
  and x.base is not null
  and r.space_privacy is not null
  and r.ormeggio is null;
