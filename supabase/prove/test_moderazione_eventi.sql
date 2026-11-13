-- ============================================================
-- LidoRank — prova ripetibile: moderazione eventi (migrazione 0079)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
--
-- NON LASCIA NIENTE NEL DATABASE. Il blocco finisce con un'eccezione
-- deliberata che porta con sé i risultati: PostgreSQL annulla l'intera
-- transazione, quindi utenti finti, eventi di prova e righe di audit
-- scompaiono. L'eccezione è il meccanismo di pulizia, non un guasto:
-- vedrai un messaggio rosso che contiene l'esito, ed è normale.
--
-- L'editor di Supabase non mantiene la sessione fra istruzioni separate,
-- per questo è tutto in un unico blocco invece di una tabella temporanea.
--
-- La prova si fa passare per utenti diversi scrivendo request.jwt.claims,
-- cioè la stessa variabile che auth.uid() legge in produzione: così i
-- controlli di autorizzazione vengono esercitati per davvero e non aggirati.
-- ============================================================

do $$
declare
  v_admin    uuid;
  v_gestore  uuid;
  v_estraneo uuid;
  v_beach    uuid;
  v_ev       uuid;
  v_tmp      text;
  v_n        int;
  v_m        int;
  v_ok       boolean;
  v_esito    text := '';
  v_pass     int := 0;
  v_fail     int := 0;
begin
  ---------------------------------------------------------------
  -- Presupposti
  ---------------------------------------------------------------
  select user_id into v_admin from public.profili where ruolo = 'admin' limit 1;
  if v_admin is null then
    raise exception E'PROVA NON ESEGUIBILE\n\nNella tabella profili non c''è nessun amministratore, quindi non c''è niente da provare.\nEsegui prima il blocco BOOTSTRAP in fondo alla migrazione 0071.';
  end if;

  -- Prendiamo in prestito uno stabilimento esistente invece di crearne uno:
  -- la tabella beaches ha colonne obbligatorie che una riga finta dovrebbe
  -- indovinare, e indovinare male farebbe fallire la prova per il motivo
  -- sbagliato.
  select id into v_beach from public.beaches order by id limit 1;
  if v_beach is null then
    raise exception 'PROVA NON ESEGUIBILE: nessuno stabilimento nel database.';
  end if;

  -- Due utenti usa-e-getta: l'eccezione finale li cancella.
  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-gestore@lidorank.invalid') returning id into v_gestore;
  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-estraneo@lidorank.invalid') returning id into v_estraneo;

  insert into public.eventi_gestore (beach_id, titolo, descrizione, data_inizio, creato_da)
    values (v_beach, 'Evento di prova — moderazione', 'Testo originale da conservare',
            current_date + 10, v_gestore)
    returning id into v_ev;

  ---------------------------------------------------------------
  -- A) Chi NON può moderare
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_estraneo)::text, true);
  begin
    perform public.modera_evento(v_ev, true, 'tentativo');
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  un estraneo ha potuto nascondere un evento';
  exception when others then
    if sqlerrm = 'non_autorizzato' then
      v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  un estraneo non può nascondere';
    else
      v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  errore inatteso: ' || sqlerrm;
    end if;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_gestore)::text, true);
  begin
    perform public.modera_evento(v_ev, true, 'tentativo');
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  un gestore ha potuto moderare';
  exception when others then
    if sqlerrm = 'non_autorizzato' then
      v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  nemmeno un gestore modera: è compito dell''admin';
    else
      v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  errore inatteso: ' || sqlerrm;
    end if;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_estraneo)::text, true);
  begin
    perform public.elimina_evento_admin(v_ev, 'tentativo');
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  un estraneo ha potuto eliminare';
  exception when others then
    if sqlerrm = 'non_autorizzato' then
      v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  un estraneo non può eliminare';
    else
      v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  errore inatteso: ' || sqlerrm;
    end if;
  end;

  ---------------------------------------------------------------
  -- B) L'amministratore nasconde e ripubblica
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  perform public.modera_evento(v_ev, true, 'segnalato come fuorviante');
  select stato into v_tmp from public.eventi_gestore where id = v_ev;
  if v_tmp = 'nascosto' then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  l''admin nasconde: stato = nascosto';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  stato atteso nascosto, trovato ' || coalesce(v_tmp, 'NULL');
  end if;

  select count(*) into v_n from public.eventi_audit
   where entita = 'eventi_gestore' and entita_id = v_ev::text
     and azione = 'evento_nascosto' and attore = v_admin
     and dopo->>'motivo' = 'segnalato come fuorviante'
     and prima->>'titolo' = 'Evento di prova — moderazione';
  if v_n = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  la traccia conserva autore, motivo e titolo originale';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  righe di audit attese 1, trovate ' || v_n;
  end if;

  perform public.modera_evento(v_ev, false, null);
  select stato into v_tmp from public.eventi_gestore where id = v_ev;
  select count(*) into v_n from public.eventi_audit
   where entita_id = v_ev::text and azione = 'evento_ripubblicato';
  if v_tmp = 'pubblicato' and v_n = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  ripubblicare riporta a pubblicato e lascia traccia';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  stato ' || coalesce(v_tmp,'NULL') || ', tracce ' || v_n;
  end if;

  ---------------------------------------------------------------
  -- C) Casi limite
  ---------------------------------------------------------------
  begin
    perform public.modera_evento('00000000-0000-0000-0000-000000000000', true, null);
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  un id inesistente non ha dato errore';
  exception when others then
    if sqlerrm = 'evento_non_trovato' then
      v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  un id inesistente dà evento_non_trovato';
    else
      v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  errore inatteso: ' || sqlerrm;
    end if;
  end;

  begin
    update public.eventi_audit set azione = 'manomesso' where entita_id = v_ev::text;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  il registro di audit si è fatto modificare';
  exception when others then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  il registro di audit resta append-only';
  end;

  ---------------------------------------------------------------
  -- D) Nascondere non è una scorciatoia per aggirare il limite
  ---------------------------------------------------------------
  select count(*) into v_n from public.eventi_gestore
   where beach_id = v_beach and coalesce(data_fine, data_inizio) >= current_date;

  if v_n < 10 then
    for i in 1..(10 - v_n) loop
      insert into public.eventi_gestore (beach_id, titolo, data_inizio, creato_da)
        values (v_beach, 'Riempitivo ' || i, current_date + 30 + i, v_gestore);
    end loop;
  end if;

  perform public.modera_evento(v_ev, true, 'prova limite');

  v_ok := false;
  begin
    insert into public.eventi_gestore (beach_id, titolo, data_inizio, creato_da)
      values (v_beach, 'Undicesimo', current_date + 60, v_gestore);
  exception when others then
    v_ok := (sqlerrm = 'troppi_eventi');
  end;

  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  9 PASS  nascondere non libera uno slot: il limite di 10 regge';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  9 FAIL  con un evento nascosto si è potuto superare il limite';
  end if;

  ---------------------------------------------------------------
  -- E) Eliminare conserva il contenuto rimosso
  ---------------------------------------------------------------
  perform public.elimina_evento_admin(v_ev, 'contenuto illecito');
  select count(*) into v_n from public.eventi_gestore where id = v_ev;
  select count(*) into v_m from public.eventi_audit
   where entita_id = v_ev::text and azione = 'evento_eliminato'
     and prima->>'descrizione' = 'Testo originale da conservare'
     and dopo->>'motivo' = 'contenuto illecito';
  if v_n = 0 and v_m = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 10 PASS  eliminato: la riga non c''è più, il testo resta nell''audit';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 10 FAIL  righe residue ' || v_n || ', tracce ' || v_m;
  end if;

  ---------------------------------------------------------------
  -- Esito, e annullamento di tutto
  ---------------------------------------------------------------
  raise exception E'\n==================== ESITO PROVA 0079 ====================%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n==========================================================',
    v_esito, v_pass, v_fail;
end $$;
