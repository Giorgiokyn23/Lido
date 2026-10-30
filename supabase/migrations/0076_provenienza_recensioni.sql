-- ============================================================
-- LidoRank — 0076: provenienza delle recensioni
--
-- PERCHÉ SERVE. Da quando il gestore può invitare i propri clienti (QR,
-- WhatsApp, email), una parte delle recensioni è SOLLECITATA. Non è un male:
-- è il motore della raccolta. Ma un gestore che invita solo i clienti
-- contenti introduce una distorsione, e il giorno in cui questi dati vanno a
-- un Comune bisogna poter dimostrare che il campione non è stato selezionato.
-- Senza questa colonna quella dimostrazione è impossibile, e lo è per sempre:
-- l'informazione, se non la registri nel momento in cui arriva, è persa.
--
-- REGOLA: la provenienza NON cambia il peso, lo stato o la posizione in
-- classifica. Serve a DESCRIVERE il campione, non a valutarlo. Una recensione
-- arrivata da QR vale esattamente quanto una spontanea.
--
-- Esegui DOPO 0075. Idempotente.
-- ============================================================

-- 1) La colonna ------------------------------------------------------------
alter table public.reviews add column if not exists fonte text;

alter table public.reviews drop constraint if exists reviews_fonte_check;
alter table public.reviews
  add constraint reviews_fonte_check
  check (fonte is null or fonte in ('qr', 'wa', 'mail', 'link'));

create index if not exists reviews_fonte_idx
  on public.reviews (fonte) where fonte is not null;

comment on column public.reviews.fonte is
  'Canale da cui è arrivato il recensore: qr | wa | mail | link. NULL = spontanea. Descrive il campione, non lo valuta: non entra in peso, stato o ranking.';

-- 2) Inserimento: identica alla 0062, con in più la provenienza ------------
-- Tutta la logica anti-frode (lock, limiti per IP, damper anti-ondata,
-- sospensione su accuse gravi) resta invariata parola per parola.
create or replace function public.submit_review(
  _beach uuid, _uid uuid, _ip text, _p jsonb
) returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  _n int; _nb int; _spike int; _peso numeric; _stato text; _id uuid; _fonte text;
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

  -- Provenienza: valore ammesso oppure NULL. Non tocca né _peso né _stato.
  _fonte := case when _p->>'fonte' in ('qr','wa','mail','link') then _p->>'fonte' else null end;

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
    tariffe_agevolate, prezzi_esposti, estremi_concessione_esposti,
    fonte
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
    (_p->>'tariffe_agevolate')::boolean, (_p->>'prezzi_esposti')::boolean, (_p->>'estremi_concessione_esposti')::boolean,
    _fonte
  ) returning id into _id;

  return _id;
end $$;

revoke all on function public.submit_review(uuid,uuid,text,jsonb) from public;
grant execute on function public.submit_review(uuid,uuid,text,jsonb) to anon, authenticated;

-- 3) La provenienza non deve entrare nel ranking ---------------------------
-- Estende il controllo automatico già introdotto dalla 0072.
create or replace function public.verifica_separazione_ranking()
  returns table (oggetto text, problema text)
  language sql
  stable
as $$
  with definizioni as (
    select c.relname::text as nome, pg_get_viewdef(c.oid) as corpo
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
    union all
    select p.proname::text, pg_get_functiondef(p.oid)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  ),
  vietati(parola) as (
    values ('rivendicazioni'), ('profile_status'), ('partner'),
           ('entitlement'), ('abbonament'), ('membership'), ('fonte')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- A COSA SERVIRÀ, in concreto:
--   select coalesce(fonte,'spontanea') as canale, count(*), round(avg(
--            (space_privacy+family_services+accessibility+seabed_quality)/4.0), 2) as media
--     from public.reviews where stato = 'pubblicata'
--    group by 1 order by 2 desc;
-- Se la media delle sollecitate è molto più alta delle spontanee, lo sai
-- prima che te lo faccia notare qualcun altro.
-- ============================================================
