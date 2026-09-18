-- ============================================================
-- LidoRank - 0067: porticcioli/porti → tipo 'porto', SENZA perdere le recensioni
--
-- Problema: una recensione fatta coi criteri BALNEARI, quando la struttura diventa
-- 'porto', finisce sotto i criteri PORTO (vuoti) → la recensione "sparisce" dalla
-- scheda (è ciò che è successo al porto di Cavo).
--
-- Soluzione in 2 passi:
--  (1) converte a 'porto' i porticcioli/porti riconoscibili dal nome (elenco da
--      controllare prima con la query 3 di query_stabilimenti_ignoti_livorno.sql);
--  (2) PRESERVA i dati: per ogni recensione su un porto che ha criteri balneari ma
--      non quelli porto, imputa i criteri porto mappandoli sui balneari analoghi
--      (e sull'overall della recensione dove non esiste un analogo). Così il voto
--      non va perso e la recensione torna visibile.
--
-- Il passo (2) gira su TUTTI i porti (anche quelli già convertiti da 0064), quindi
-- risistema anche Cavo. Imputazione autorizzata, idempotente (solo dove NULL).
-- Esegui DOPO 0066.
-- ============================================================

-- (1) porticcioli/porti per nome → 'porto'
update public.beaches set tipo = 'porto'
where tipo in ('stabilimento','spiaggia')
  and (
        nome ilike '%porticciolo%'   or nome ilike '%darsena%'
     or nome ilike '%approdo%'       or nome ilike '%circolo nautico%'
     or nome ilike '%lega navale%'   or nome ilike '%pontile%'
     or (nome ilike '%porto %'
         and nome not ilike 'bagn%' and nome not ilike 'lido%'
         and nome not ilike 'spiaggia%' and nome not ilike 'stabilimento%')
  );

-- (2) preserva i dati: imputa i criteri porto dai criteri balneari analoghi
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
from (
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
join public.beaches b on b.id = r.beach_id
where r.id = x.id
  and b.tipo = 'porto'
  and x.base is not null
  and r.space_privacy is not null   -- ha criteri balneari da preservare
  and r.ormeggio is null;           -- non ha ancora criteri porto
