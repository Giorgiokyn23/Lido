-- ============================================================
-- LidoRank — SUITE DI TEST DEI FLUSSI GESTORE
--
-- COME SI USA: incolla TUTTO questo file nel SQL editor di Supabase ed esegui.
--
-- IMPORTANTE: alla fine comparirà un messaggio ROSSO di "errore". NON è un
-- errore: è l'esito dei test. Lo usiamo di proposito, perché è ciò che
-- garantisce che TUTTO venga annullato e che nel database non resti nulla.
-- Leggi il contenuto del messaggio: c'è una riga per ogni controllo.
--
-- È SICURA ANCHE IN PRODUZIONE. Tutto avviene dentro un unico blocco che
-- termina sempre con un'eccezione volontaria: PostgreSQL annulla l'intero
-- blocco in ogni caso, quindi i dati di prova non possono sopravvivere.
-- Non crea tabelle, non lascia utenti, non tocca nessuna recensione.
--
-- Rilanciala dopo ogni modifica al lato gestori.
-- Richiede le migrazioni da 0071 a 0075.
-- ============================================================

do $$
declare
  u_admin    uuid := '00000000-dead-0000-0000-00000000a001';
  u_gestore  uuid := '00000000-dead-0000-0000-00000000a002';
  u_estraneo uuid := '00000000-dead-0000-0000-00000000a003';
  b_test     uuid;
  r1 uuid; r2 uuid; r3 uuid;
  v_txt text; v_n int; v_rec_prima int; v_rec_dopo int;
  res text[] := '{}';            -- 'gruppo|controllo|atteso|ottenuto'
  riga text; parti text[];
  n_pass int := 0; n_fail int := 0;
  out_txt text := '';
begin
  -- ─── Preparazione ───────────────────────────────────────
  begin
    insert into auth.users (id, email) values
      (u_admin,    'test-admin@lidorank.invalid'),
      (u_gestore,  'test-gestore@lidorank.invalid'),
      (u_estraneo, 'test-estraneo@lidorank.invalid');
  exception when others then
    raise exception E'\n\nSETUP FALLITO: non riesco a creare gli utenti di prova.\n%\n', sqlerrm;
  end;

  insert into public.profili (user_id, ruolo) values (u_admin, 'admin');

  -- Nessuna scheda nuova: ne prendiamo in prestito una libera, così il test
  -- non dipende da quali colonne di beaches siano obbligatorie.
  select b.id into b_test
    from public.beaches b
   where b.profile_status = 'non_rivendicato'
     and not exists (select 1 from public.rivendicazioni r where r.beach_id = b.id)
     and not exists (select 1 from public.profilo_stabilimento p where p.beach_id = b.id)
   limit 1;

  if b_test is null then
    raise exception E'\n\nSETUP FALLITO: nessuna scheda libera da usare per la prova.\n';
  end if;

  select count(*) into v_rec_prima from public.reviews;

  -- ─── A · richiesta e ritiro ─────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
  insert into public.rivendicazioni (user_id, beach_id, nome)
  values (u_gestore, b_test, 'Gestore di Prova') returning id into r1;

  select profile_status into v_txt from public.beaches where id = b_test;
  res := res || format('A richiesta|la scheda passa in attesa|in_attesa|%s', v_txt);

  select count(*)::text into v_txt from public.eventi_audit
   where entita = 'rivendicazione' and entita_id = r1::text and azione = 'creata';
  res := res || format('A richiesta|la richiesta finisce nel registro|1|%s', v_txt);

  perform public.rinuncia_rivendicazione(r1);
  select r.stato || ' / ' || b.profile_status into v_txt
    from public.rivendicazioni r, public.beaches b where r.id = r1 and b.id = b_test;
  res := res || format('A ritiro|il richiedente ritira e la scheda si libera|annullata / non_rivendicato|%s', v_txt);

  -- ─── B · approvazione ───────────────────────────────────
  insert into public.rivendicazioni (user_id, beach_id, nome)
  values (u_gestore, b_test, 'Gestore di Prova') returning id into r2;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
    perform public.decidi_rivendicazione(r2, true);
    v_txt := 'NON rifiutato';
  exception when others then
    v_txt := case when sqlerrm like '%non_autorizzato%' then 'rifiutato' else 'errore diverso: ' || sqlerrm end;
  end;
  res := res || format('B permessi|un non-admin NON puo approvare|rifiutato|%s', v_txt);

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin)::text, true);
  perform public.decidi_rivendicazione(r2, true);

  select r.stato || ' / ' || b.profile_status into v_txt
    from public.rivendicazioni r, public.beaches b where r.id = r2 and b.id = b_test;
  res := res || format('B approvazione|l admin approva e la scheda e verificata|approvata / verificato|%s', v_txt);

  select coalesce(ruolo, 'nessuno') into v_txt from public.profili where user_id = u_gestore;
  res := res || format('B approvazione|il richiedente diventa gestore|gestore|%s', v_txt);

  begin
    insert into public.rivendicazioni (user_id, beach_id, nome, stato)
    values (u_estraneo, b_test, 'Finto Gestore', 'approvata');
    v_txt := 'NON rifiutato';
  exception when others then
    v_txt := 'rifiutato';
  end;
  res := res || format('B unicita|un solo gestore approvato per scheda|rifiutato|%s', v_txt);

  -- ─── C · profilo pubblico ───────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
  insert into public.profilo_stabilimento (beach_id, descrizione, orari)
  values (b_test, 'Descrizione di prova automatica.', '9-19');

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_estraneo)::text, true);
    execute 'set local role authenticated';
    update public.profilo_stabilimento set descrizione = 'MANOMESSO' where beach_id = b_test;
    execute 'reset role';
  exception when others then
    execute 'reset role';
  end;
  select case when descrizione = 'MANOMESSO' then 'modificato' else 'invariato' end into v_txt
    from public.profilo_stabilimento where beach_id = b_test;
  res := res || format('C profilo|un estraneo NON puo modificare il profilo altrui|invariato|%s', v_txt);

  begin
    execute 'set local role anon';
    select count(*)::text into v_txt from public.profilo_stabilimento where beach_id = b_test;
    execute 'reset role';
  exception when others then
    execute 'reset role'; v_txt := 'errore: ' || sqlerrm;
  end;
  res := res || format('C profilo|e pubblico quando la scheda e verificata|1|%s', v_txt);

  -- ─── D · rinuncia e revoca ──────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
  perform public.rinuncia_rivendicazione(r2);

  select r.stato || ' / ' || b.profile_status || ' / ' || coalesce(p.ruolo, '?') into v_txt
    from public.rivendicazioni r, public.beaches b, public.profili p
   where r.id = r2 and b.id = b_test and p.user_id = u_gestore;
  res := res || format('D rinuncia|scheda libera e ruolo declassato|revocata / non_rivendicato / cittadino|%s', v_txt);

  select count(*)::text into v_txt from public.profilo_stabilimento where beach_id = b_test;
  res := res || format('D rinuncia|i dati del profilo NON si cancellano|1|%s', v_txt);

  begin
    execute 'set local role anon';
    select count(*)::text into v_txt from public.profilo_stabilimento where beach_id = b_test;
    execute 'reset role';
  exception when others then
    execute 'reset role'; v_txt := 'errore: ' || sqlerrm;
  end;
  res := res || format('D rinuncia|ma smettono di essere pubblici|0|%s', v_txt);

  insert into public.rivendicazioni (user_id, beach_id, nome)
  values (u_gestore, b_test, 'Gestore di Prova') returning id into r3;
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin)::text, true);
  perform public.decidi_rivendicazione(r3, true);

  begin
    execute 'set local role anon';
    select coalesce(descrizione, 'niente') into v_txt from public.profilo_stabilimento where beach_id = b_test;
    execute 'reset role';
  exception when others then
    execute 'reset role'; v_txt := 'errore: ' || sqlerrm;
  end;
  res := res || format('D ripristino|riapprovando il profilo torna com era|Descrizione di prova automatica.|%s', v_txt);

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_estraneo)::text, true);
    perform public.revoca_rivendicazione(r3);
    v_txt := 'NON rifiutato';
  exception when others then
    v_txt := case when sqlerrm like '%non_autorizzato%' then 'rifiutato' else 'errore diverso: ' || sqlerrm end;
  end;
  res := res || format('D permessi|un non-admin NON puo revocare|rifiutato|%s', v_txt);

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_estraneo)::text, true);
    perform public.rinuncia_rivendicazione(r3);
    v_txt := 'NON rifiutato';
  exception when others then
    v_txt := case when sqlerrm like '%non_trovata%' then 'rifiutato' else 'errore diverso: ' || sqlerrm end;
  end;
  res := res || format('D permessi|non si rinuncia per conto di altri|rifiutato|%s', v_txt);

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin)::text, true);
  perform public.revoca_rivendicazione(r3, 'motivo di prova');
  select r.stato || ' / ' || b.profile_status into v_txt
    from public.rivendicazioni r, public.beaches b where r.id = r3 and b.id = b_test;
  res := res || format('D revoca|l admin revoca e la scheda si libera|revocata / non_rivendicato|%s', v_txt);

  -- ─── E · integrità ──────────────────────────────────────
  select count(*)::text into v_txt from public.beaches b
   where b.profile_status = 'verificato'
     and not exists (select 1 from public.rivendicazioni r where r.beach_id = b.id and r.stato = 'approvata');
  res := res || format('E integrita|nessuna scheda verificata senza rivendica|0|%s', v_txt);

  select count(*)::text into v_txt from public.profili p
   where p.ruolo = 'gestore'
     and not exists (select 1 from public.rivendicazioni r where r.user_id = p.user_id and r.stato = 'approvata');
  res := res || format('E integrita|nessun gestore rimasto senza schede|0|%s', v_txt);

  select count(*)::text into v_txt from public.verifica_separazione_ranking();
  res := res || format('E integrita|il lato gestori non entra nel ranking|0|%s', v_txt);

  select count(*) into v_rec_dopo from public.reviews;
  res := res || format('E integrita|nessuna recensione toccata|%s|%s', v_rec_prima, v_rec_dopo);

  begin
    update public.eventi_audit set azione = 'manomesso' where entita_id = r3::text;
    v_txt := 'NON rifiutato';
  exception when others then
    v_txt := 'rifiutato';
  end;
  res := res || format('E integrita|il registro e immodificabile|rifiutato|%s', v_txt);

  -- ─── Esito ──────────────────────────────────────────────
  foreach riga in array res loop
    parti := string_to_array(riga, '|');
    if parti[3] = parti[4] then
      n_pass := n_pass + 1;
      out_txt := out_txt || format(E'  PASS  %-12s %s\n', parti[1], parti[2]);
    else
      n_fail := n_fail + 1;
      out_txt := out_txt || format(E'  FAIL  %-12s %s\n          atteso: %s\n          ottenuto: %s\n',
                                   parti[1], parti[2], parti[3], parti[4]);
    end if;
  end loop;

  -- Eccezione VOLONTARIA: annulla tutto. È la garanzia che non resti traccia.
  raise exception E'\n\n===== ESITO DEI TEST (questo non e un errore) =====\n\n%\n  %  PASS    %  FAIL\n\n  Tutte le modifiche di prova sono state annullate.\n  Nel database non e rimasto nulla.\n',
    out_txt, n_pass, n_fail;
end $$;
