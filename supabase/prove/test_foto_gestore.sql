-- ============================================================
-- PROVA della 0091 — le foto le carica solo il gestore
--
-- Si incolla nel SQL editor di Supabase. L'ultima riga solleva un errore di
-- proposito: serve ad annullare tutto. L'errore È il risultato.
--
-- A differenza della prova della 0089, questa verifica i PERMESSI, e i
-- permessi si vedono solo cambiando ruolo. Per questo il blocco passa da
-- `set local role` invece di limitarsi a cambiare l'utente: con il ruolo
-- postgres le policy non si applicano affatto, e la prova direbbe sempre sì.
-- ============================================================

do $$
declare
  v_admin    uuid;
  v_gestore  uuid;
  v_estraneo uuid;
  v_bagno    uuid;
  v_altro    uuid;
  v_rid      uuid;
  v_n        int;
  v_esiti    text := '';
  v_ok       boolean;
  v_mancanti text;
begin
  select user_id into v_admin from public.profili where ruolo = 'admin' limit 1;
  if v_admin is null then
    raise exception 'PROVA NON ESEGUITA: serve un profilo con ruolo admin.';
  end if;

  select id into v_bagno from public.beaches limit 1;
  select id into v_altro from public.beaches where id <> v_bagno limit 1;
  if v_altro is null then
    raise exception 'PROVA NON ESEGUITA: servono almeno due stabilimenti.';
  end if;

  v_gestore  := gen_random_uuid();
  v_estraneo := gen_random_uuid();
  insert into auth.users (id, email) values
    (v_gestore,  'prova_gestore_'  || v_gestore  || '@esempio.invalid'),
    (v_estraneo, 'prova_estraneo_' || v_estraneo || '@esempio.invalid');
  insert into public.profili (user_id, ruolo) values
    (v_gestore, 'cittadino'), (v_estraneo, 'cittadino');

  -- Se `rivendicazioni` acquista altre colonne obbligatorie, meglio dirlo
  -- chiaramente qui che far leggere un errore del database a chi esegue la
  -- prova. È già successo con `nome`.
  select string_agg(c.column_name, ', ') into v_mancanti
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name = 'rivendicazioni'
     and c.is_nullable = 'NO'
     and c.column_default is null
     and c.column_name not in ('id', 'user_id', 'beach_id', 'nome', 'stato');
  if v_mancanti is not null then
    raise exception 'PROVA DA AGGIORNARE: rivendicazioni ha nuove colonne obbligatorie (%). Aggiungile all''inserimento qui sotto.', v_mancanti;
  end if;

  -- Il gestore lo diventa con una rivendicazione approvata su quel bagno.
  insert into public.rivendicazioni (user_id, beach_id, nome, stato)
  values (v_gestore, v_bagno, 'Prova automatica 0091', 'approvata')
  returning id into v_rid;

  -- ---------------------------------------------------------------
  -- 1. La colonna fonte esiste e vale 'gestore' per difetto.
  -- ---------------------------------------------------------------
  insert into public.foto (beach_id, user_id, percorso)
  values (v_bagno, v_gestore, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
  select count(*) into v_n from public.foto
   where beach_id = v_bagno and user_id = v_gestore and fonte = 'gestore';
  v_esiti := v_esiti || format(E'\n 1. fonte «gestore» per difetto ............... %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 2. Una fonte inventata viene rifiutata.
  -- ---------------------------------------------------------------
  begin
    insert into public.foto (beach_id, user_id, percorso, fonte)
    values (v_bagno, v_gestore, gen_random_uuid() || '/x.webp', 'sponsor');
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;
  v_esiti := v_esiti || format(E'\n 2. fonte inventata rifiutata ................. %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 3. IL PUNTO DELLA MIGRAZIONE: un utente qualunque non carica.
  --    Questa è la prova che conta: togliere il pulsante dalla pagina non
  --    impedisce a nessuno di chiamare l'API a mano.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_estraneo, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.foto (beach_id, user_id, percorso)
    values (v_bagno, v_estraneo, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    v_ok := false;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 3. un estraneo NON può caricare .............. %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 4. Il gestore non può caricare su un bagno che non è suo.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_gestore, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.foto (beach_id, user_id, percorso)
    values (v_altro, v_gestore, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    v_ok := false;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 4. non carica sul bagno di un altro .......... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 5. Il gestore sul SUO bagno invece carica.
  --    Senza questa, le quattro prove sopra passerebbero anche con una
  --    policy che blocca tutti: dimostrare un divieto non basta.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_gestore, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.foto (beach_id, user_id, percorso)
    values (v_bagno, v_gestore, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    v_ok := true;
  exception when others then
    v_ok := false;
  end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 5. il gestore sul suo bagno carica ........... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 6. Il limite è dodici per scheda, non più sei a testa.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.foto where beach_id = v_bagno and fonte = 'gestore';
  while v_n < 12 loop
    insert into public.foto (beach_id, user_id, percorso)
    values (v_bagno, v_gestore, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    v_n := v_n + 1;
  end loop;

  begin
    insert into public.foto (beach_id, user_id, percorso)
    values (v_bagno, v_gestore, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%troppe_foto%');
  end;
  v_esiti := v_esiti || format(E'\n 6. la tredicesima è bloccata ................. %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 7. Le foto dei visitatori avranno un contatore loro: una foto di
  --    visitatore entra anche con dodici del gestore già presenti.
  -- ---------------------------------------------------------------
  begin
    insert into public.foto (beach_id, user_id, percorso, fonte)
    values (v_bagno, v_gestore, gen_random_uuid() || '/' || gen_random_uuid() || '.webp',
            'visitatore');
    v_ok := true;
  exception when others then
    v_ok := false;
  end;
  v_esiti := v_esiti || format(E'\n 7. i contatori sono separati per origine ..... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 8. LA REVOCA NASCONDE LE FOTO DEL GESTORE.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  perform public.revoca_rivendicazione(v_rid, 'prova automatica');
  perform set_config('request.jwt.claims', null, true);

  select count(*) into v_n from public.foto
   where beach_id = v_bagno and fonte = 'gestore' and stato = 'pubblicata';
  v_esiti := v_esiti || format(E'\n 8. la revoca nasconde le foto del gestore .... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ' ancora pubbliche)' end);

  -- ---------------------------------------------------------------
  -- 9. Ma NON cancella i file: devono restare recuperabili se la revoca
  --    viene contestata.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.foto
   where beach_id = v_bagno and fonte = 'gestore' and stato = 'nascosta';
  v_esiti := v_esiti || format(E'\n 9. nascoste, non rimosse .................... %s',
    case when v_n >= 12 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 10. E la foto di visitatore sopravvive alla revoca: non è sua.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.foto
   where beach_id = v_bagno and fonte = 'visitatore' and stato = 'pubblicata';
  v_esiti := v_esiti || format(E'\n10. le foto dei visitatori restano ........... %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 11. Il registro conserva traccia dell'azzeramento.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.eventi_audit
   where entita = 'foto' and entita_id = v_bagno::text and azione = 'nascoste_per_revoca';
  v_esiti := v_esiti || format(E'\n11. l''azzeramento finisce nel registro ....... %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 12. Niente di tutto questo tocca il punteggio.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  v_esiti := v_esiti || format(E'\n12. le foto fuori dal ranking ................ %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 13. L'ARCHIVIO ACCETTA UN PERCORSO COME QUELLI VERI.
  --
  --     Questa prova nasce da un errore già fatto: la regola della 0089
  --     usava `array_length(storage.foldername(name),1) = 2`, ma quella
  --     funzione di Supabase toglie il nome del file e restituisce solo le
  --     cartelle — quindi dava 1, la condizione era sempre falsa, e OGNI
  --     caricamento veniva rifiutato. Verificare la regola a mente non è
  --     bastato: bisogna provare a caricare davvero.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_gestore, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('foto', replace(gen_random_uuid()::text, '-', '') || '/' ||
                    replace(gen_random_uuid()::text, '-', '') || '.webp');
    v_ok := true;
  exception when others then
    v_ok := false;
  end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n13. l''archivio accetta un percorso vero ...... %s',
    case when v_ok then 'PASSA' else 'FALLISCE (la regola rifiuta tutto)' end);

  -- ---------------------------------------------------------------
  -- 14. E rifiuta un percorso senza cartella, o con cartella corta.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_gestore, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_ok := true;
  begin
    insert into storage.objects (bucket_id, name) values ('foto', 'senza-cartella.webp');
    v_ok := false;
  exception when others then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('foto', 'corta/x.webp');
    v_ok := false;
  exception when others then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n14. e rifiuta i percorsi indovinabili ......... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 15. CANCELLARE UNA FOTO TOGLIE ANCHE IL FILE.
  --
  --     Nell'ordine giusto: prima il file, poi la riga. Al contrario non
  --     funziona, e non per un dettaglio: il permesso di cancellare il file
  --     si basa sull'esistenza della riga, perché è lì che è scritto di chi
  --     è la foto (il percorso è casuale apposta per non dirlo). Tolta la
  --     riga per prima, l'archivio rifiuta in silenzio e il file resta
  --     scaricabile da chiunque abbia l'indirizzo: una cancellazione che
  --     non cancella.
  -- ---------------------------------------------------------------
  declare
    v_perc  text;
    v_idf   uuid;
    v_file  int;
    v_riga  int;
  begin
    v_perc := replace(gen_random_uuid()::text, '-', '') || '/' ||
              replace(gen_random_uuid()::text, '-', '') || '.webp';

    -- Di proposito su v_altro, cioè un bagno che NON gestisce: è il caso
    -- delle foto dei visitatori, e quello che la 0091 rendeva incancellabile.
    insert into public.foto (beach_id, user_id, percorso, fonte)
    values (v_altro, v_gestore, v_perc, 'visitatore')
    returning id into v_idf;
    insert into storage.objects (bucket_id, name) values ('foto', v_perc);

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_gestore, 'role', 'authenticated')::text, true);
    set local role authenticated;

    delete from storage.objects where bucket_id = 'foto' and name = v_perc;
    get diagnostics v_file = row_count;
    delete from public.foto where id = v_idf;
    get diagnostics v_riga = row_count;

    reset role;
    perform set_config('request.jwt.claims', null, true);

    v_esiti := v_esiti || format(E'\n15. cancellare toglie anche il file .......... %s',
      case when v_file = 1 and v_riga = 1 then 'PASSA'
           else 'FALLISCE (file ' || v_file || ', riga ' || v_riga || ')' end);
  end;

  raise exception E'\n\n=== PROVA 0091 — foto solo del gestore ===%\n\n(Questo errore è voluto: annulla tutto quello che la prova ha scritto.)\n', v_esiti;
end $$;
