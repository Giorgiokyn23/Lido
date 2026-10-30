-- ============================================================
-- LidoRank — 0075: annullare una rivendica dal sito
--
-- Fino alla 0074 una rivendica approvata si poteva disfare solo via SQL.
-- Qui si chiude il ciclo con i due percorsi che servono davvero:
--
--   GESTORE  → ritira la richiesta ancora in attesa      ('annullata')
--   GESTORE  → rinuncia a una scheda già sua             ('revocata')
--   ADMIN    → revoca una rivendica approvata            ('revocata')
--
-- I dati del profilo NON vengono cancellati: smettono semplicemente di essere
-- pubblici, perché la policy di lettura richiede profile_status='verificato'.
-- Se la scheda viene rivendicata di nuovo, tornano visibili come erano.
--
-- Esegui DOPO 0074. Idempotente.
-- ============================================================

-- 1) Nuovi stati ammessi -----------------------------------------------------
alter table public.rivendicazioni drop constraint if exists rivendicazioni_stato_check;
alter table public.rivendicazioni
  add constraint rivendicazioni_stato_check
  check (stato in ('in_attesa', 'approvata', 'respinta', 'annullata', 'revocata'));

-- 2) Ricalcolo dello stato della scheda -------------------------------------
-- Unico punto di verità: lo stato della scheda deriva sempre dalle rivendiche.
create or replace function public.ricalcola_profile_status(_beach uuid)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  update public.beaches b
     set profile_status = case
           when b.profile_status = 'sospeso' then 'sospeso'   -- la sospensione la toglie solo un admin
           when exists (select 1 from public.rivendicazioni r
                         where r.beach_id = b.id and r.stato = 'approvata') then 'verificato'
           when exists (select 1 from public.rivendicazioni r
                         where r.beach_id = b.id and r.stato = 'in_attesa') then 'in_attesa'
           else 'non_rivendicato'
         end
   where b.id = _beach;
$$;

-- 3) Declassamento del ruolo ------------------------------------------------
-- Torna 'cittadino' solo chi non gestisce più nulla. Un admin resta admin.
create or replace function public.ricalcola_ruolo(_user uuid)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  update public.profili p
     set ruolo = 'cittadino'
   where p.user_id = _user
     and p.ruolo = 'gestore'
     and not exists (select 1 from public.rivendicazioni r
                      where r.user_id = _user and r.stato = 'approvata');
$$;

-- 4) ADMIN: revoca una rivendica approvata ----------------------------------
create or replace function public.revoca_rivendicazione(_rid uuid, _motivo text default null)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user  uuid;
  v_beach uuid;
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  update public.rivendicazioni
     set stato = 'revocata', motivo_rifiuto = _motivo,
         decisa_il = now(), decisa_da = auth.uid()
   where id = _rid and stato = 'approvata'
  returning user_id, beach_id into v_user, v_beach;

  if v_user is null then
    raise exception 'rivendicazione_non_approvata';
  end if;

  perform public.ricalcola_profile_status(v_beach);
  perform public.ricalcola_ruolo(v_user);

  insert into public.eventi_audit (entita, entita_id, azione, attore, dopo)
  values ('rivendicazione', _rid::text, 'revocata_da_admin', auth.uid(),
          jsonb_build_object('beach_id', v_beach, 'motivo', _motivo));
end;
$$;

revoke all on function public.revoca_rivendicazione(uuid, text) from public;
grant execute on function public.revoca_rivendicazione(uuid, text) to authenticated;

-- 5) GESTORE: ritira la richiesta o rinuncia alla scheda ---------------------
-- Funziona solo sulle proprie righe: niente controllo di ruolo, basta
-- l'identità. In attesa → 'annullata'; approvata → 'revocata'.
create or replace function public.rinuncia_rivendicazione(_rid uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_beach  uuid;
  v_stato  text;
  v_nuovo  text;
begin
  select beach_id, stato into v_beach, v_stato
    from public.rivendicazioni
   where id = _rid and user_id = auth.uid();

  if v_beach is null then
    raise exception 'rivendicazione_non_trovata';
  end if;

  if v_stato = 'in_attesa' then
    v_nuovo := 'annullata';
  elsif v_stato = 'approvata' then
    v_nuovo := 'revocata';
  else
    raise exception 'stato_non_annullabile';
  end if;

  update public.rivendicazioni
     set stato = v_nuovo, decisa_il = now(), decisa_da = auth.uid()
   where id = _rid;

  perform public.ricalcola_profile_status(v_beach);
  perform public.ricalcola_ruolo(auth.uid());

  insert into public.eventi_audit (entita, entita_id, azione, attore, dopo)
  values ('rivendicazione', _rid::text,
          case when v_nuovo = 'annullata' then 'ritirata_dal_richiedente'
               else 'rinuncia_del_gestore' end,
          auth.uid(), jsonb_build_object('beach_id', v_beach));
end;
$$;

revoke all on function public.rinuncia_rivendicazione(uuid) from public;
grant execute on function public.rinuncia_rivendicazione(uuid) to authenticated;

-- 6) L'admin deve poter vedere anche le rivendiche già approvate ------------
-- (la policy della 0071 lo prevede già tramite e_admin, qui niente da fare)

-- ============================================================
-- VERIFICA dopo l'esecuzione — tutti e tre devono tornare 0:
--
--   -- schede verificate senza una rivendica approvata
--   select count(*) from public.beaches b
--    where b.profile_status = 'verificato'
--      and not exists (select 1 from public.rivendicazioni r
--                       where r.beach_id = b.id and r.stato = 'approvata');
--
--   -- gestori senza più nessuna scheda
--   select count(*) from public.profili p
--    where p.ruolo = 'gestore'
--      and not exists (select 1 from public.rivendicazioni r
--                       where r.user_id = p.user_id and r.stato = 'approvata');
--
--   -- il lato gestori non è entrato nel ranking
--   select count(*) from public.verifica_separazione_ranking();
-- ============================================================
