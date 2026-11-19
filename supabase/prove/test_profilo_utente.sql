-- ============================================================
-- LidoRank — prova ripetibile: anonimato e profilo utente (0085, 0086, 0087)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
-- NON LASCIA NIENTE: finisce con un'eccezione deliberata che annulla tutto.
-- Il messaggio rosso contiene l'esito, ed è normale.
--
-- Copre i quattro percorsi chiesti da Francesco — recensione senza profilo,
-- recensione con profilo, passaggio da «da provare» a «visitati», recensione
-- che compare nel profilo personale — più la garanzia che li tiene insieme:
-- che da fuori non si risalga all'autore.
-- ============================================================

do $$
declare
  v_u1     uuid;
  v_u2     uuid;
  v_b1     uuid;
  v_b2     uuid;
  v_rid    uuid;
  v_n      int;
  v_txt    text;
  v_ok     boolean;
  v_voti   jsonb;
  v_peso   numeric;
  v_esito  text := '';
  v_pass   int := 0;
  v_fail   int := 0;
begin
  select b.id into v_b1 from public.beaches b order by b.id limit 1;
  select b.id into v_b2 from public.beaches b order by b.id desc limit 1;
  if v_b1 is null or v_b1 = v_b2 then
    raise exception 'PROVA NON ESEGUIBILE: servono almeno due stabilimenti.';
  end if;

-- I dieci criteri sono NOT NULL nel database: una recensione senza voti non
  -- esiste, ed è giusto così. La prova deve quindi mandarli tutti, come fa il
  -- modulo vero.
  v_voti := jsonb_build_object(
    'space_privacy', 4, 'family_services', 4, 'accessibility', 3,
    'seabed_quality', 5, 'price_transparency', 3, 'sicurezza', 4,
    'atmosfera', 5, 'eventi_comunita', 3, 'pulizia_igiene', 4,
    'impianti_sportivi', 3
  );

  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-utente1@lidorank.invalid') returning id into v_u1;
  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-utente2@lidorank.invalid') returning id into v_u2;

  ---------------------------------------------------------------
  -- A) L'anonimato è nel database, non solo nelle pagine
  ---------------------------------------------------------------
  v_ok := false;
  begin
    execute 'set role anon';
    execute 'select user_id::text from public.reviews limit 1' into v_txt;
    execute 'reset role';
  exception when others then
    execute 'reset role';
    v_ok := sqlerrm ilike '%permission denied%';
  end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  con la chiave pubblica non si legge chi ha scritto una recensione';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  user_id è ancora leggibile da anon — l''anonimato è solo una promessa';
  end if;

  v_ok := false;
  begin
    execute 'set role anon';
    execute 'select ip_hash from public.reviews limit 1' into v_txt;
    execute 'reset role';
  exception when others then
    execute 'reset role';
    v_ok := sqlerrm ilike '%permission denied%';
  end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  nemmeno l''impronta dell''indirizzo IP è leggibile';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  ip_hash leggibile da anon';
  end if;

  select count(*) into v_n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'recensioni_pubbliche'
     and column_name in ('user_id', 'ip_hash');
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  la vista pubblica non contiene colonne che identificano';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  la vista espone ' || v_n || ' colonne identificanti';
  end if;

  ---------------------------------------------------------------
  -- B) Recensione senza profilo
  ---------------------------------------------------------------
  v_rid := public.submit_review(v_b1, null, 'prova-ip-anon',
    v_voti || jsonb_build_object('commento', 'recensione senza profilo'));
  select user_id is null into v_ok from public.reviews where id = v_rid;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  una recensione senza profilo resta senza autore';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  una recensione anonima ha un autore';
  end if;

  ---------------------------------------------------------------
  -- C) Recensione con profilo, e la lista che si popola da sola
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_u1)::text, true);
  perform public.segna_bagno(v_b2, 'da_provare');
  if public.stato_bagno(v_b2) = 'da_provare' then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  «da provare» si segna';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  «da provare» non risulta segnato';
  end if;

  -- È quello che fa l'azione dopo una recensione riuscita.
  perform public.submit_review(v_b2, v_u1, 'prova-ip-u1',
    v_voti || jsonb_build_object('commento', 'recensione con profilo', 'abbonato', 'true'));
  perform public.segna_bagno(v_b2, 'visitato');

  select count(*) into v_n from public.liste_utente where user_id = v_u1 and beach_id = v_b2;
  if v_n = 1 and public.stato_bagno(v_b2) = 'visitato' then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  il bagno passa a «visitati» e lascia «da provare»: una riga sola, mai due';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  righe trovate: ' || v_n || ', stato: ' || coalesce(public.stato_bagno(v_b2), 'nullo');
  end if;

  select count(*) into v_n from public.mie_recensioni();
  if v_n = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  la recensione compare in «le mie recensioni»';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  recensioni proprie trovate: ' || v_n;
  end if;

  ---------------------------------------------------------------
  -- D) Le recensioni anonime non diventano di nessuno, mai
  --    Questa non è una funzione da provare: è l'ASSENZA di una funzione.
  --    La prova verifica che resti assente.
  ---------------------------------------------------------------
  select count(*) into v_n
    from public.reviews
   where ip_hash = 'prova-ip-anon' and user_id is not null;
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  la recensione anonima non si è attaccata a un account creato dopo';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  una recensione anonima ha acquisito un autore';
  end if;

  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'   -- pg_get_functiondef non si applica agli aggregati
     and pg_get_functiondef(p.oid) ilike '%update public.reviews%set%user_id%';
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  9 PASS  nessuna funzione nel database scrive user_id su una recensione esistente';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  9 FAIL  ' || v_n || ' funzioni possono riassegnare l''autore di una recensione';
  end if;

  ---------------------------------------------------------------
  -- E) Le liste sono private
  ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_u2)::text, true);
  select count(*) into v_n from public.mie_liste();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 10 PASS  un altro utente non vede le mie liste';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 10 FAIL  un altro utente vede ' || v_n || ' mie righe';
  end if;

  select count(*) into v_n from public.mie_recensioni();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 11 PASS  un altro utente non vede le mie recensioni';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 11 FAIL  un altro utente vede ' || v_n || ' mie recensioni';
  end if;

  ---------------------------------------------------------------
  -- F) Il permesso di scrivere il proprio nome non apre altre porte
  ---------------------------------------------------------------
  insert into public.profili (user_id, ruolo) values (v_u2, 'cittadino')
    on conflict (user_id) do nothing;
  v_ok := false;
  begin
    update public.profili set ruolo = 'admin' where user_id = v_u2;
  exception when others then v_ok := true;
  end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 12 PASS  nessuno si promuove amministratore cambiando il proprio profilo';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 12 FAIL  un utente può farsi amministratore — BUCO GRAVE';
  end if;

  ---------------------------------------------------------------
  -- G) L'abbonamento dichiarato non sposta un punteggio
  ---------------------------------------------------------------
  select peso into v_peso from public.reviews where ip_hash = 'prova-ip-u1';
  if v_peso = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 13 PASS  l''abbonamento è contesto, non peso: il peso resta quello dell''account';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 13 FAIL  peso inatteso: ' || v_peso;
  end if;

  select count(*) into v_n from public.verifica_separazione_ranking();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 14 PASS  nessun riferimento vietato dentro punteggi e classifiche';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 14 FAIL  ' || v_n || ' riferimenti vietati';
  end if;

  raise exception E'\n============ ESITO PROVA 0085-0087 ============%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n===============================================',
    v_esito, v_pass, v_fail;
end $$;
