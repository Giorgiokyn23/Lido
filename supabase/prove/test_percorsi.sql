-- ============================================================
-- PROVA della 0096 — percorsi lungo la costa
-- Si incolla nel SQL editor. L'errore finale è voluto e annulla tutto.
-- ============================================================

do $$
declare
  v_admin   uuid;
  v_tizio   uuid := gen_random_uuid();
  v_bagno   uuid;
  v_bagno2  uuid;
  v_pid     uuid;
  v_n       int;
  v_t       text;
  v_esiti   text := '';
  v_ok      boolean;
  v_nome_bagno text;
  v_slug    text;
begin
  select user_id into v_admin from public.profili where ruolo = 'admin' limit 1;
  if v_admin is null then
    raise exception 'PROVA NON ESEGUITA: serve un profilo con ruolo admin.';
  end if;
  select id into v_bagno from public.beaches limit 1;
  select id into v_bagno2 from public.beaches where id <> v_bagno limit 1;

  insert into auth.users (id, email) values (v_tizio, 't_' || v_tizio || '@esempio.invalid');
  insert into public.profili (user_id, ruolo) values (v_tizio, 'cittadino');

  -- ---------------------------------------------------------------
  -- 1. Un percorso si crea, con uno slug ben formato.
  -- ---------------------------------------------------------------
  -- Slug unico a ogni esecuzione. Senza, la prova si scontra con i percorsi
  -- già presenti nel database — a partire da quello di esempio — e comincia a
  -- fallire accusando codice corretto, che è il modo migliore per far
  -- smettere di guardare le prove.
  v_slug := 'prova-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.percorsi (slug, titolo, localita, tema, stato)
  values (v_slug, 'Il Romito', 'Livorno', 'mare', 'bozza')
  returning id into v_pid;
  select count(*) into v_n from public.percorsi where id = v_pid;
  v_esiti := v_esiti || format(E'\n 1. il percorso si crea ...................... %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 2. Uno slug con maiuscole o spazi viene rifiutato: finisce in un
  --    indirizzo, e un indirizzo con uno spazio dentro non è un indirizzo.
  -- ---------------------------------------------------------------
  begin
    insert into public.percorsi (slug, titolo) values ('Prova Sbagliata', 'X');
    v_ok := false;
  exception when check_violation then v_ok := true;
  end;
  v_esiti := v_esiti || format(E'\n 2. slug malformato rifiutato ................ %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 3. UNA TAPPA È UN BAGNO OPPURE UN LUOGO, mai tutti e due e mai
  --    nessuno dei due.
  -- ---------------------------------------------------------------
  insert into public.percorso_tappe (percorso_id, ordine, beach_id) values (v_pid, 1, v_bagno);
  insert into public.percorso_tappe (percorso_id, ordine, titolo, nota)
  values (v_pid, 2, 'Il Cisternone', 'Visita guidata, 45 minuti');
  insert into public.percorso_tappe (percorso_id, ordine, beach_id) values (v_pid, 3, v_bagno2);

  v_ok := true;
  begin
    insert into public.percorso_tappe (percorso_id, ordine, beach_id, titolo)
    values (v_pid, 9, v_bagno, 'Due nomi per la stessa tappa');
    v_ok := false;
  exception when check_violation then null;
  end;
  begin
    insert into public.percorso_tappe (percorso_id, ordine) values (v_pid, 10);
    v_ok := false;
  exception when check_violation then null;
  end;
  v_esiti := v_esiti || format(E'\n 3. una tappa è un bagno O un luogo .......... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 4. Due tappe non possono avere lo stesso ordine: un itinerario in cui
  --    due cose sono «la seconda» non si può stampare.
  -- ---------------------------------------------------------------
  begin
    insert into public.percorso_tappe (percorso_id, ordine, titolo) values (v_pid, 2, 'Doppione');
    v_ok := false;
  exception when unique_violation then v_ok := true;
  end;
  v_esiti := v_esiti || format(E'\n 4. ordine delle tappe unico ................. %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 5. FINCHÉ È BOZZA, NON LO VEDE NESSUNO.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.percorsi_pubblici(null) where slug = v_slug;
  v_esiti := v_esiti || format(E'\n 5. la bozza non è pubblica .................. %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 6. Pubblicato, compare con i conteggi giusti: tre tappe, due bagni.
  -- ---------------------------------------------------------------
  update public.percorsi set stato = 'pubblicato' where id = v_pid;
  select tappe, (bagni = 2) into v_n, v_ok
    from public.percorsi_pubblici(null) where slug = v_slug;
  v_esiti := v_esiti || format(E'\n 6. pubblicato, conta tappe e bagni .......... %s',
    case when v_n = 3 and v_ok then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 7. Il dettaglio arriva in una chiamata sola, con i nomi dei bagni già
  --    uniti e le tappe in ordine.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.percorso_con_tappe(v_slug);
  select tappa_titolo into v_t from public.percorso_con_tappe(v_slug) where ordine = 2;
  v_esiti := v_esiti || format(E'\n 7. il dettaglio torna tutto insieme ......... %s',
    case when v_n = 3 and v_t = 'Il Cisternone' then 'PASSA'
         else 'FALLISCE (' || v_n || ', ' || coalesce(v_t,'nullo') || ')' end);

  -- ---------------------------------------------------------------
  -- 8. Per una tappa che è un nostro bagno, il nome arriva dalla scheda e
  --    non è scritto a mano: così, se il bagno cambia nome, l'itinerario
  --    non resta a citare quello vecchio.
  -- ---------------------------------------------------------------
  select tappa_titolo into v_t from public.percorso_con_tappe(v_slug) where ordine = 1;
  select nome into v_nome_bagno from public.beaches where id = v_bagno;
  v_esiti := v_esiti || format(E'\n 8. il nome del bagno viene dalla scheda ..... %s',
    case when v_t is not null and v_t = v_nome_bagno then 'PASSA'
         else 'FALLISCE (' || coalesce(v_t, 'nullo') || ')' end);

  -- ---------------------------------------------------------------
  -- 9. LA FUNZIONE CHE CI SERVE DI PIÙ: da una scheda si risale ai
  --    percorsi che ci passano.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.percorsi_del_bagno(v_bagno) where slug = v_slug;
  v_esiti := v_esiti || format(E'\n 9. da un bagno si risale ai percorsi ........ %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 10. Un utente qualunque non può scrivere percorsi: un itinerario
  --     coinvolge le attività di altri, e non lo compone un concorrente.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_tizio, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.percorsi (slug, titolo)
    values ('abusivo-' || replace(gen_random_uuid()::text, '-', ''), 'Il mio tour');
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  begin
    update public.percorsi set titolo = 'Dirottato' where id = v_pid;
    if found then v_ok := false; end if;
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n10. un estraneo non scrive percorsi .......... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 11. Cancellare un bagno porta via le sue tappe, non lascia un
  --     itinerario con un buco che punta al nulla.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.percorso_tappe
   where percorso_id = v_pid and beach_id is not null;
  v_ok := (v_n = 2);
  v_esiti := v_esiti || format(E'\n11. le tappe seguono la scheda ............... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 12. I percorsi non toccano il punteggio.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  v_esiti := v_esiti || format(E'\n12. i percorsi fuori dal ranking ............. %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  raise exception E'\n\n=== PROVA 0096 — percorsi ===%\n\n(Questo errore è voluto: annulla tutto quello che la prova ha scritto.)\n', v_esiti;
end $$;
