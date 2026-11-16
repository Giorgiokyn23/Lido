-- ============================================================
-- LidoRank — 0083: alla revoca il profilo si azzera, e gli account si
--                  possono finalmente cancellare
--
-- DUE PROBLEMI DISTINTI, TROVATI INSIEME.
--
-- 1) Revocare non cancellava niente. Il profilo restava intero nel database,
--    solo invisibile, perché la lettura pubblica pretende profile_status =
--    'verificato'. Finché la scheda resta non rivendicata nessuno se ne
--    accorge — ma il giorno che un NUOVO gestore la rivendica e tu approvi,
--    la pagina ripubblica da sola descrizione, prezzi e orari del gestore
--    PRECEDENTE. Prezzi di due stagioni fa, presentati come attuali, sotto il
--    nome di chi non li ha mai scritti. È il rischio peggiore di tutti, ed è
--    silenzioso.
--
-- 2) Cancellare un utente era impossibile. Tre colonne puntavano ad
--    auth.users senza dire che fare quando l'utente sparisce, quindi il
--    "delete user" di Supabase falliva con un errore di chiave esterna per
--    chiunque avesse mai salvato un profilo o pubblicato un evento. Il
--    diritto alla cancellazione non funzionava, e lo si sarebbe scoperto nel
--    momento peggiore: quando qualcuno lo chiede per iscritto.
--
-- SCELTA CONSAPEVOLE: da qui in poi revocare è DISTRUTTIVO per il profilo.
-- Una revoca per errore non si annulla riapprovando: i dati vanno riscritti.
-- In cambio nessun dato di una gestione passata può più ricomparire sotto una
-- gestione nuova. L'interfaccia chiede conferma esplicita in entrambi i punti.
--
-- Non si tocca NIENTE della scheda pubblica — nome, località, concessione,
-- recensioni, punteggio — perché non è mai stata del gestore: è nostra.
--
-- Esegui DOPO 0082. Idempotente.
-- ============================================================

-- 1) Gli account si possono cancellare ---------------------------------------
-- Il registro continua a dire COSA è successo e QUANDO, e perde il CHI
-- quando l'account non esiste più. È il compromesso che tiene insieme un
-- registro non modificabile e il diritto di farsi cancellare.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'eventi_audit_attore_fkey') then
    alter table public.eventi_audit drop constraint eventi_audit_attore_fkey;
  end if;
  alter table public.eventi_audit
    add constraint eventi_audit_attore_fkey
    foreign key (attore) references auth.users(id) on delete set null;

  if exists (select 1 from pg_constraint where conname = 'profilo_stabilimento_aggiornato_da_fkey') then
    alter table public.profilo_stabilimento drop constraint profilo_stabilimento_aggiornato_da_fkey;
  end if;
  alter table public.profilo_stabilimento
    add constraint profilo_stabilimento_aggiornato_da_fkey
    foreign key (aggiornato_da) references auth.users(id) on delete set null;

  if exists (select 1 from pg_constraint where conname = 'eventi_gestore_creato_da_fkey') then
    alter table public.eventi_gestore drop constraint eventi_gestore_creato_da_fkey;
  end if;
  alter table public.eventi_gestore
    add constraint eventi_gestore_creato_da_fkey
    foreign key (creato_da) references auth.users(id) on delete set null;

  if exists (select 1 from pg_constraint where conname = 'rivendicazioni_decisa_da_fkey') then
    alter table public.rivendicazioni drop constraint rivendicazioni_decisa_da_fkey;
  end if;
  alter table public.rivendicazioni
    add constraint rivendicazioni_decisa_da_fkey
    foreign key (decisa_da) references auth.users(id) on delete set null;
end $$;

-- 1-bis) Il registro deve lasciarsi togliere l'autore -----------------------
-- Il trigger della 0072 rifiuta QUALUNQUE modifica a eventi_audit. Ma
-- «on delete set null» su attore È una modifica: senza questa eccezione la
-- cancellazione di un account fallisce con «eventi_audit è append-only», e
-- siamo punto e a capo. L'eccezione è volutamente strettissima: si può solo
-- togliere l'autore, mai aggiungerlo o cambiarlo, e nient'altro della riga
-- può muoversi. Il registro resta immutabile su COSA è successo e QUANDO;
-- perde solo il collegamento a una persona che ha chiesto di sparire.
create or replace function public.audit_solo_append()
  returns trigger
  language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and old.attore is not null
     and new.attore is null
     and (to_jsonb(new) - 'attore') = (to_jsonb(old) - 'attore') then
    return new;
  end if;

  raise exception 'eventi_audit è append-only';
end;
$$;

-- 2) Il registro smette di copiarsi dentro i contatti ------------------------
-- Serve a sapere chi ha cambiato cosa in caso di contestazione: il numero di
-- telefono non c'entra. Toglierlo elimina il conflitto fra una tabella che
-- per costruzione non si può modificare e una richiesta di cancellazione.
create or replace function public.profilo_audit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prezzi_cambiati boolean := false;
begin
  new.aggiornato_il := now();
  new.aggiornato_da := auth.uid();

  if tg_op = 'INSERT' then
    v_prezzi_cambiati :=
      new.prezzo_ombrellone_bassa is not null or
      new.prezzo_ombrellone_alta  is not null or
      new.prezzo_lettino          is not null or
      new.prezzo_ingresso         is not null or
      new.prezzo_stagionale_da    is not null;
  else
    v_prezzi_cambiati :=
      new.prezzo_ombrellone_bassa is distinct from old.prezzo_ombrellone_bassa or
      new.prezzo_ombrellone_alta  is distinct from old.prezzo_ombrellone_alta  or
      new.prezzo_lettino          is distinct from old.prezzo_lettino          or
      new.prezzo_ingresso         is distinct from old.prezzo_ingresso         or
      new.prezzo_stagionale_da    is distinct from old.prezzo_stagionale_da;
  end if;

  if v_prezzi_cambiati then
    new.prezzi_aggiornati_il := current_date;
  end if;

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values ('profilo_stabilimento', new.beach_id::text,
          case when tg_op = 'INSERT' then 'creato' else 'modificato' end,
          auth.uid(),
          case when tg_op = 'UPDATE'
               then public.senza_contatti(to_jsonb(old)) else null end,
          public.senza_contatti(to_jsonb(new)));

  return new;
end;
$$;

-- La redazione sta in una funzione sua: se domani si aggiunge un contatto,
-- si aggiorna qui e vale ovunque, invece di dimenticarselo in un punto solo.
create or replace function public.senza_contatti(_riga jsonb)
  returns jsonb
  language sql
  immutable
as $$
  select _riga - 'telefono' - 'email_pubblica' - 'whatsapp' - 'instagram' - 'aggiornato_da';
$$;

grant execute on function public.senza_contatti(jsonb) to authenticated;

-- 3) Azzerare il profilo -----------------------------------------------------
-- Versione interna, senza controlli: la chiamano solo le funzioni qui sotto,
-- che i controlli li hanno già fatti. Non è concessa a nessun ruolo.
create or replace function public.azzera_profilo_interno(_beach uuid, _motivo text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prima jsonb;
begin
  select public.senza_contatti(to_jsonb(p)) into v_prima
    from public.profilo_stabilimento p
   where p.beach_id = _beach;

  -- Gli eventi della vecchia gestione si nascondono, non si cancellano: se
  -- la scheda torna verificata non devono ricomparire, ma restano leggibili
  -- in moderazione se qualcuno contesta una rimozione.
  update public.eventi_gestore
     set stato = 'nascosto'
   where beach_id = _beach and stato <> 'nascosto';

  delete from public.profilo_stabilimento where beach_id = _beach;

  if v_prima is not null then
    insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
    values ('profilo_stabilimento', _beach::text, 'azzerato', auth.uid(), v_prima,
            jsonb_build_object('motivo', nullif(btrim(coalesce(_motivo, '')), '')));
  end if;
end;
$$;

revoke all on function public.azzera_profilo_interno(uuid, text) from public;

-- Versione per l'amministratore, su richiesta di cancellazione o per pulizia.
create or replace function public.azzera_profilo(_beach uuid, _motivo text default null)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;
  perform public.azzera_profilo_interno(_beach, _motivo);
end;
$$;

revoke all on function public.azzera_profilo(uuid, text) from public;
grant execute on function public.azzera_profilo(uuid, text) to authenticated;

-- 4) Revoca e rinuncia azzerano il profilo -----------------------------------
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

  -- Prima si azzera, poi si ricalcola lo stato: l'ordine conta solo per
  -- chiarezza, ma leggerlo al contrario confonderebbe chi verrà dopo.
  perform public.azzera_profilo_interno(v_beach, coalesce(_motivo, 'revoca della rivendicazione'));
  perform public.ricalcola_profile_status(v_beach);
  perform public.ricalcola_ruolo(v_user);

  insert into public.eventi_audit (entita, entita_id, azione, attore, dopo)
  values ('rivendicazione', _rid::text, 'revocata_da_admin', auth.uid(),
          jsonb_build_object('beach_id', v_beach, 'motivo', _motivo));
end;
$$;

revoke all on function public.revoca_rivendicazione(uuid, text) from public;
grant execute on function public.revoca_rivendicazione(uuid, text) to authenticated;

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

  -- Solo chi era gestore approvato aveva un profilo da azzerare. Ritirare una
  -- richiesta ancora in attesa non cancella niente, perché non c'era niente.
  if v_stato = 'approvata' then
    perform public.azzera_profilo_interno(v_beach, 'rinuncia del gestore');
  end if;

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

-- 5) Se sparisce l'utente, sparisce anche la gestione ------------------------
-- rivendicazioni.user_id è «on delete cascade» fin dalla 0071: cancellare un
-- account porta via le sue rivendicazioni. Da solo questo lascia un buco:
-- la riga sparisce, ma profile_status resta 'verificato' perché nessuno lo
-- ricalcola, e la scheda continua a pubblicare il profilo di un gestore che
-- non esiste più, senza nessuno a cui rispondere. Il trigger chiude il buco.
create or replace function public.dopo_rimozione_rivendicazione()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if old.stato = 'approvata' then
    perform public.azzera_profilo_interno(old.beach_id, 'account del gestore rimosso');
  end if;
  perform public.ricalcola_profile_status(old.beach_id);
  return old;
end;
$$;

drop trigger if exists rivendicazioni_dopo_rimozione on public.rivendicazioni;
create trigger rivendicazioni_dopo_rimozione
  after delete on public.rivendicazioni
  for each row execute function public.dopo_rimozione_rivendicazione();

-- ============================================================
-- UNA VOLTA SOLA, SE VUOI RIPULIRE IL PASSATO.
-- Le fotografie già scritte nel registro contengono ancora i contatti. La
-- tabella è append-only per trigger, quindi la ripulitura va fatta a mano,
-- da proprietario, spegnendo il trigger per il tempo necessario:
--
--   alter table public.eventi_audit disable trigger eventi_audit_no_update;
--   update public.eventi_audit
--      set prima = public.senza_contatti(prima),
--          dopo  = public.senza_contatti(dopo)
--    where entita = 'profilo_stabilimento';
--   alter table public.eventi_audit enable trigger eventi_audit_no_update;
--
-- Da eseguire consapevolmente: per qualche secondo il registro è modificabile.
-- ============================================================
