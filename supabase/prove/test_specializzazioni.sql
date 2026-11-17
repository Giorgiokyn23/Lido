-- ============================================================
-- LidoRank — prova ripetibile: specializzazioni (migrazione 0084)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
-- NON LASCIA NIENTE: finisce con un'eccezione deliberata che annulla tutto.
-- Il messaggio rosso contiene l'esito, ed è normale.
--
-- Che cosa dimostra in una frase: che l'etichetta «Music-friendly» non si può
-- ottenere dichiarandola, ma solo pubblicando eventi musicali veri.
-- ============================================================

do $$
declare
  v_admin  uuid;
  v_g      uuid;
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
    values (gen_random_uuid(), 'prova-musica@lidorank.invalid') returning id into v_g;
  insert into public.rivendicazioni (user_id, beach_id, nome, stato, decisa_il)
    values (v_g, v_beach, 'Prova musica', 'approvata', now()) returning id into v_rid;
  perform public.ricalcola_profile_status(v_beach);
  perform set_config('request.jwt.claims', json_build_object('sub', v_g)::text, true);

  ---------------------------------------------------------------
  -- A) Dichiarare non basta. Mai.
  ---------------------------------------------------------------
  insert into public.specializzazioni (beach_id, ambito, stato, racconto, frequenza)
    values (v_beach, 'musica', 'attiva',
            'Un chitarrista al tramonto, volume basso.', 'settimanale');

  if not public.specializzazione_confermata(v_beach, 'musica') then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  «organizziamo già musica» con calendario vuoto NON conferma l''etichetta';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  l''etichetta forte si ottiene dichiarandola — è il difetto che questa migrazione doveva evitare';
  end if;

  insert into public.eventi_gestore (beach_id, titolo, data_inizio, creato_da, stato)
    values (v_beach, 'Serata senza tipo', current_date + 10, v_g, 'pubblicato');
  if not public.specializzazione_confermata(v_beach, 'musica') then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  un evento senza tipo non conferma niente';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  un evento senza tipo ha confermato l''etichetta';
  end if;

  insert into public.eventi_gestore (beach_id, titolo, data_inizio, creato_da, stato, tipo)
    values (v_beach, 'Mercatino', current_date + 11, v_g, 'pubblicato', 'mercatini');
  if not public.specializzazione_confermata(v_beach, 'musica') then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  un evento di un altro tipo non conferma la musica';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  un mercatino ha reso il bagno music-friendly';
  end if;

  ---------------------------------------------------------------
  -- B) Il calendario conferma
  ---------------------------------------------------------------
  insert into public.eventi_gestore (beach_id, titolo, data_inizio, creato_da, stato, tipo)
    values (v_beach, 'DJ set al tramonto', current_date + 12, v_g, 'pubblicato', 'dj_set');
  if public.specializzazione_confermata(v_beach, 'musica')
     and public.eventi_ambito_in_programma(v_beach, 'musica') = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  un DJ set pubblicato conferma l''etichetta e si conta';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  il DJ set non ha confermato l''etichetta';
  end if;

  ---------------------------------------------------------------
  -- C) La moderazione ha l'ultima parola
  ---------------------------------------------------------------
  update public.eventi_gestore set stato = 'nascosto'
   where beach_id = v_beach and tipo = 'dj_set';
  if not public.specializzazione_confermata(v_beach, 'musica') then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  nascondendo l''evento l''etichetta cade: un contenuto rimosso non vale';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  l''etichetta regge su un evento nascosto';
  end if;
  update public.eventi_gestore set stato = 'pubblicato'
   where beach_id = v_beach and tipo = 'dj_set';

  ---------------------------------------------------------------
  -- D) La finestra all'indietro: un bagno che ha suonato in estate
  --    resta un posto dove si suona anche a gennaio, ma non per sempre.
  ---------------------------------------------------------------
  update public.eventi_gestore set data_inizio = current_date - 150, data_fine = null
   where beach_id = v_beach and tipo = 'dj_set';
  if public.specializzazione_confermata(v_beach, 'musica')
     and public.eventi_ambito_in_programma(v_beach, 'musica') = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  un evento di cinque mesi fa conferma ancora, ma non è «in programma»';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  la finestra dei dodici mesi non funziona come previsto';
  end if;

  update public.eventi_gestore set data_inizio = current_date - 400
   where beach_id = v_beach and tipo = 'dj_set';
  if not public.specializzazione_confermata(v_beach, 'musica') then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  oltre i dodici mesi l''etichetta scade';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  un evento di tredici mesi fa conferma ancora';
  end if;

  ---------------------------------------------------------------
  -- E) Ambiti e stati sono insiemi chiusi
  ---------------------------------------------------------------
  v_ok := true;
  begin
    insert into public.specializzazioni (beach_id, ambito, stato)
      values (v_beach, 'astrologia', 'attiva');
    v_ok := false;
  exception when others then null; end;
  begin
    insert into public.specializzazioni (beach_id, ambito, stato)
      values (v_beach, 'sport', 'entusiasta');
    v_ok := false;
  exception when others then null; end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  ambiti e stati inventati vengono rifiutati';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  un ambito o uno stato fuori insieme è passato';
  end if;

  ---------------------------------------------------------------
  -- F) L'elenco pubblico è un elenco, non una classifica
  ---------------------------------------------------------------
  select count(*) into v_n
    from public.specializzazioni_pubbliche
   where ambito = 'musica' and beach_id = v_beach;
  if v_n = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  9 PASS  la scheda compare nell''elenco pubblico delle specializzazioni';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  9 FAIL  righe trovate nell''elenco: ' || v_n;
  end if;

  if pg_get_viewdef('public.specializzazioni_pubbliche'::regclass) not ilike '%punteggio%'
     and pg_get_viewdef('public.specializzazioni_pubbliche'::regclass) not ilike '%score%'
     and pg_get_viewdef('public.specializzazioni_pubbliche'::regclass) not ilike '%rank%' then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 10 PASS  l''elenco non ordina per punteggio: nessuna graduatoria per specializzazione';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 10 FAIL  l''elenco ha dentro un punteggio — diventerebbe una classifica comprabile';
  end if;

  ---------------------------------------------------------------
  -- G) «Non ora» esce dall'elenco, e la revoca cancella tutto
  ---------------------------------------------------------------
  update public.specializzazioni set stato = 'non_ora'
   where beach_id = v_beach and ambito = 'musica';
  select count(*) into v_n
    from public.specializzazioni_pubbliche
   where ambito = 'musica' and beach_id = v_beach;
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 11 PASS  chi risponde «non ora» sparisce dall''elenco pubblico';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 11 FAIL  «non ora» resta visibile';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  perform public.revoca_rivendicazione(v_rid, 'prova automatica');
  select count(*) into v_n from public.specializzazioni where beach_id = v_beach;
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 12 PASS  la revoca cancella anche la specializzazione: niente eredità alla gestione nuova';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 12 FAIL  la specializzazione del vecchio gestore è sopravvissuta alla revoca';
  end if;

  ---------------------------------------------------------------
  -- H) La regola che non si tocca
  ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 13 PASS  nessun riferimento vietato dentro punteggi e classifiche';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 13 FAIL  ' || v_n || ' riferimenti vietati — esegui select * from public.verifica_separazione_ranking();';
  end if;

  raise exception E'\n================= ESITO PROVA 0084 =================%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n====================================================',
    v_esito, v_pass, v_fail;
end $$;
