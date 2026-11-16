-- ============================================================
-- LidoRank — prova ripetibile: azzeramento alla revoca (migrazione 0083)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
-- NON LASCIA NIENTE: finisce con un'eccezione deliberata che annulla tutto.
-- Il messaggio rosso contiene l'esito, ed è normale.
--
-- Che cosa dimostra, in una frase: che i dati di una gestione finita non
-- possono ricomparire sotto la gestione successiva, e che un account si può
-- davvero cancellare senza distruggere il registro di moderazione.
-- ============================================================

do $$
declare
  v_admin  uuid;
  v_g1     uuid;
  v_g2     uuid;
  v_beach  uuid;
  v_rid    uuid;
  v_n      int;
  v_ok     boolean;
  v_esito  text := '';
  v_pass   int := 0;
  v_fail   int := 0;
begin
  select user_id into v_admin from public.profili where ruolo = 'admin' limit 1;
  if v_admin is null then
    raise exception E'PROVA NON ESEGUIBILE\n\nNessun amministratore in profili: esegui prima il BOOTSTRAP della 0071.';
  end if;

  select b.id into v_beach
    from public.beaches b
    left join public.profilo_stabilimento p on p.beach_id = b.id
   where p.beach_id is null
     and not exists (select 1 from public.rivendicazioni r
                      where r.beach_id = b.id and r.stato = 'approvata')
   order by b.id
   limit 1;
  if v_beach is null then
    raise exception 'PROVA NON ESEGUIBILE: nessuno stabilimento libero.';
  end if;

  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-vecchio@lidorank.invalid') returning id into v_g1;
  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-nuovo@lidorank.invalid') returning id into v_g2;

  ---------------------------------------------------------------
  -- La vecchia gestione riempie tutto
  ---------------------------------------------------------------
  insert into public.rivendicazioni (user_id, beach_id, nome, stato, decisa_il)
    values (v_g1, v_beach, 'Prova vecchia', 'approvata', now()) returning id into v_rid;
  perform public.ricalcola_profile_status(v_beach);

  perform set_config('request.jwt.claims', json_build_object('sub', v_g1)::text, true);
  insert into public.profilo_stabilimento
    (beach_id, descrizione, orari, telefono, email_pubblica, ombrelloni_totali,
     tipo_fondo, prezzo_ombrellone_alta, bagnino, parcheggio, gruppi_max,
     accesso_senza_scalini)
  values (v_beach, 'Descrizione della vecchia gestione', '9-19', '3331112222',
          'vecchio@esempio.it', 120, 'sabbia', 25, true, 'privato_gratuito', 50, true);
  insert into public.eventi_gestore (beach_id, titolo, data_inizio, creato_da, stato)
    values (v_beach, 'Festa della vecchia gestione', current_date + 30, v_g1, 'pubblicato');

  ---------------------------------------------------------------
  -- 1..3) La revoca azzera
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  perform public.revoca_rivendicazione(v_rid, 'prova automatica');

  select count(*) into v_n from public.profilo_stabilimento where beach_id = v_beach;
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  la revoca azzera il profilo';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  il profilo è ancora lì';
  end if;

  select count(*) into v_n
    from public.eventi_gestore where beach_id = v_beach and stato = 'pubblicato';
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  gli eventi della vecchia gestione vengono nascosti';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  restano ' || v_n || ' eventi pubblici';
  end if;

  select (prima->>'descrizione' is not null) and not (prima ? 'telefono')
    into v_ok
    from public.eventi_audit
   where entita = 'profilo_stabilimento' and entita_id = v_beach::text and azione = 'azzerato'
   limit 1;
  if coalesce(v_ok, false) then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  il registro conserva i fatti e non i contatti';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  la fotografia nel registro non è come attesa';
  end if;

  ---------------------------------------------------------------
  -- 4) Il nuovo gestore non eredita niente
  --    È il motivo per cui esiste tutta questa migrazione: senza, la pagina
  --    ripubblicherebbe da sola i prezzi di chi se n'è andato.
  ---------------------------------------------------------------
  insert into public.rivendicazioni (user_id, beach_id, nome, stato, decisa_il)
    values (v_g2, v_beach, 'Prova nuova', 'approvata', now());
  perform public.ricalcola_profile_status(v_beach);

  select count(*) into v_n from public.profilo_stabilimento where beach_id = v_beach;
  if v_n = 0
     and (select profile_status from public.beaches where id = v_beach) = 'verificato'
     and (select count(*) from public.eventi_gestore
           where beach_id = v_beach and stato = 'pubblicato') = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  la nuova gestione parte da zero su una scheda verificata';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  la nuova gestione ha ereditato qualcosa';
  end if;

  ---------------------------------------------------------------
  -- 5..6) L'account si può cancellare
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims', '', true);
  v_ok := true;
  begin
    delete from auth.users where id = v_g1;
  exception when others then
    v_ok := false;
    v_esito := v_esito || E'\n      (errore: ' || sqlerrm || ')';
  end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  cancellare l''account di un ex gestore riesce';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  la cancellazione dell''account fallisce ancora';
  end if;

  select count(*) into v_n from public.eventi_audit
   where entita_id = v_beach::text;
  if v_n > 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  il registro sopravvive alla cancellazione dell''account';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  cancellando l''account è sparito anche il registro';
  end if;

  ---------------------------------------------------------------
  -- 7..8) L'eccezione all'append-only è stretta quanto deve
  ---------------------------------------------------------------
  v_ok := true;
  begin
    update public.eventi_audit set azione = 'manomesso' where entita_id = v_beach::text;
    v_ok := false;
  exception when others then null; end;
  begin
    delete from public.eventi_audit where entita_id = v_beach::text;
    v_ok := false;
  exception when others then null; end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  il registro resta immodificabile per tutto il resto';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  il registro si è fatto modificare o cancellare';
  end if;

  v_ok := true;
  begin
    update public.eventi_audit set attore = v_admin
     where entita_id = v_beach::text and attore is null;
    v_ok := false;
  exception when others then null; end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  si può solo TOGLIERE l''autore, mai rimetterlo';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  si è potuto riscrivere l''autore di una riga del registro';
  end if;

  raise exception E'\n================= ESITO PROVA 0083 =================%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n====================================================',
    v_esito, v_pass, v_fail;
end $$;
