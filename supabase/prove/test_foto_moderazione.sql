-- ============================================================
-- PROVA della 0089 — foto e moderazione
--
-- Si incolla nel SQL editor di Supabase e si esegue. Non lascia niente:
-- l'ultima riga solleva un errore di proposito, così tutto quello che il test
-- ha scritto viene annullato. L'errore che vedrai È il risultato: leggilo.
--
-- Serve un amministratore vero nel database. Il test lo cerca da solo; se non
-- ne trova, te lo dice e si fermerà lì.
-- ============================================================

do $$
declare
  v_admin   uuid;
  v_anna    uuid := gen_random_uuid();
  v_bruno   uuid := gen_random_uuid();
  v_bagno   uuid;
  v_bagno2  uuid;
  v_foto    uuid;
  v_altra   uuid;
  v_n       int;
  v_stato   text;
  v_segn    int;
  v_testo   text;
  v_esiti   text := '';
  v_ok      boolean;
begin
  -- Chi fa da amministratore.
  select user_id into v_admin from public.profili where ruolo = 'admin' limit 1;
  if v_admin is null then
    raise exception 'PROVA NON ESEGUITA: non c''è nessun profilo con ruolo admin.';
  end if;

  -- Due bagni di appoggio.
  select id into v_bagno from public.beaches limit 1;
  select id into v_bagno2 from public.beaches where id <> v_bagno limit 1;
  if v_bagno is null or v_bagno2 is null then
    raise exception 'PROVA NON ESEGUITA: servono almeno due stabilimenti in beaches.';
  end if;

  -- Due utenti finti.
  insert into auth.users (id, email) values
    (v_anna,  'prova_anna_'  || v_anna  || '@esempio.invalid'),
    (v_bruno, 'prova_bruno_' || v_bruno || '@esempio.invalid');
  insert into public.profili (user_id, ruolo) values
    (v_anna, 'cittadino'), (v_bruno, 'cittadino');

  -- ---------------------------------------------------------------
  -- 1. Una foto si inserisce e nasce pubblicata.
  -- ---------------------------------------------------------------
  insert into public.foto (beach_id, user_id, percorso, larghezza, altezza, didascalia)
  values (v_bagno, v_anna, gen_random_uuid() || '/' || gen_random_uuid() || '.webp',
          1600, 1200, 'La spiaggia al mattino')
  returning id into v_foto;

  select stato into v_stato from public.foto where id = v_foto;
  v_esiti := v_esiti || format(E'\n 1. nasce pubblicata ......................... %s',
    case when v_stato = 'pubblicata' then 'PASSA' else 'FALLISCE (' || v_stato || ')' end);

  -- ---------------------------------------------------------------
  -- 2. La didascalia lunga viene rifiutata (140 caratteri).
  -- ---------------------------------------------------------------
  begin
    insert into public.foto (beach_id, user_id, percorso, didascalia)
    values (v_bagno, v_anna, gen_random_uuid() || '/x.webp', repeat('a', 141));
    v_ok := false;
  exception when check_violation then
    v_ok := true;
  end;
  v_esiti := v_esiti || format(E'\n 2. didascalia oltre 140 rifiutata ........... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 3. Esiste un tetto al numero di foto, qualunque esso sia.
  --
  --    QUI NON SI SCRIVE IL NUMERO, di proposito. La 0089 lo fissava a sei
  --    per persona, la 0091 l'ha portato a dodici per scheda: una prova che
  --    conta fino a sei comincerebbe a fallire dopo la 0091 accusando codice
  --    corretto, ed è il modo migliore per far smettere di guardare le prove.
  --    Il numero esatto lo verifica test_foto_gestore.sql, che è della stessa
  --    migrazione che lo decide. Qui basta sapere che un tetto c'è.
  -- ---------------------------------------------------------------
  v_n := 0;
  v_ok := false;
  while v_n < 60 loop
    begin
      insert into public.foto (beach_id, user_id, percorso)
      values (v_bagno, v_anna, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    exception when others then
      v_ok := (sqlerrm like '%troppe_foto%');
      exit;
    end;
    v_n := v_n + 1;
  end loop;
  v_esiti := v_esiti || format(E'\n 3. c''è un tetto al numero di foto ........... %s',
    case when v_ok then 'PASSA (al numero ' || (v_n + 1) || ')' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 4. Il tetto è PER SCHEDA, non complessivo: su un altro bagno si riparte.
  --    Se fosse complessivo, chi gira la costa smetterebbe di poter caricare.
  -- ---------------------------------------------------------------
  begin
    insert into public.foto (beach_id, user_id, percorso)
    values (v_bagno2, v_anna, gen_random_uuid() || '/' || gen_random_uuid() || '.webp');
    v_ok := true;
  exception when others then
    v_ok := false;
  end;
  v_esiti := v_esiti || format(E'\n 4. su un altro bagno si riparte da zero ...... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 5. Segnalare NON nasconde: alza il contatore e basta.
  --    È la differenza fra moderare e dare a un concorrente il telecomando.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_bruno)::text, true);
  perform public.segnala_foto(v_foto);
  perform set_config('request.jwt.claims', null, true);

  select stato, segnalazioni into v_stato, v_segn from public.foto where id = v_foto;
  v_esiti := v_esiti || format(E'\n 5. segnalare alza il contatore, non nasconde . %s',
    case when v_stato = 'pubblicata' and v_segn = 1
         then 'PASSA' else 'FALLISCE (' || v_stato || ', ' || v_segn || ')' end);

  -- ---------------------------------------------------------------
  -- 6. Un utente qualunque NON può moderare.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_bruno)::text, true);
  begin
    perform public.modera_foto(v_foto, 'rimossa', 'non mi piace');
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%non_autorizzato%');
  end;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 6. un utente non può moderare ................ %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 7. Nemmeno l'autore può moderare la propria foto.
  --    Sembra innocuo, ma «ripubblica» sulla propria foto segnalata
  --    azzererebbe il contatore e cancellerebbe la segnalazione.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_anna)::text, true);
  begin
    perform public.modera_foto(v_foto, 'pubblicata', null);
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%non_autorizzato%');
  end;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 7. l''autore non si auto-assolve ............. %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 8. L'amministratore nasconde, e resta la traccia nel registro.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  perform public.modera_foto(v_foto, 'nascosta', 'persone riconoscibili');
  perform set_config('request.jwt.claims', null, true);

  select stato, motivo into v_stato, v_testo from public.foto where id = v_foto;
  select count(*) into v_n from public.eventi_audit
   where entita = 'foto' and entita_id = v_foto::text and azione = 'moderata_nascosta';
  v_esiti := v_esiti || format(E'\n 8. nasconde e registra ....................... %s',
    case when v_stato = 'nascosta' and v_testo = 'persone riconoscibili' and v_n = 1
         then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 9. Il registro conserva i dati della foto, ma NON chi l'ha caricata.
  -- ---------------------------------------------------------------
  select (prima ? 'percorso') and not (prima ? 'user_id') into v_ok
    from public.eventi_audit
   where entita = 'foto' and entita_id = v_foto::text and azione = 'moderata_nascosta';
  v_esiti := v_esiti || format(E'\n 9. il registro tiene i dati, non l''autore .... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 10. Una foto nascosta non si segnala più (è già fuori).
  -- ---------------------------------------------------------------
  select segnalazioni into v_segn from public.foto where id = v_foto;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_bruno)::text, true);
  perform public.segnala_foto(v_foto);
  perform set_config('request.jwt.claims', null, true);
  select segnalazioni into v_n from public.foto where id = v_foto;
  v_esiti := v_esiti || format(E'\n10. la nascosta non si segnala più ............ %s',
    case when v_n = v_segn then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 11. Ripubblicare azzera il contatore delle segnalazioni.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  perform public.modera_foto(v_foto, 'pubblicata', null);
  perform set_config('request.jwt.claims', null, true);
  select stato, segnalazioni into v_stato, v_segn from public.foto where id = v_foto;
  v_esiti := v_esiti || format(E'\n11. ripubblicare azzera le segnalazioni ....... %s',
    case when v_stato = 'pubblicata' and v_segn = 0
         then 'PASSA' else 'FALLISCE (' || v_stato || ', ' || v_segn || ')' end);

  -- ---------------------------------------------------------------
  -- 12. Lo stato ammesso è solo quello previsto.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  begin
    perform public.modera_foto(v_foto, 'cancellata_forse', null);
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%stato_non_valido%');
  end;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n12. stato inventato rifiutato ................. %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 13. La coda mette in cima le segnalate, e la chiede solo un admin.
  -- ---------------------------------------------------------------
  insert into public.foto (beach_id, user_id, percorso)
  values (v_bagno, v_bruno, gen_random_uuid() || '/' || gen_random_uuid() || '.webp')
  returning id into v_altra;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_anna)::text, true);
  perform public.segnala_foto(v_altra);
  perform public.segnala_foto(v_altra);
  begin
    perform public.foto_da_moderare(10);
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%non_autorizzato%');
  end;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n13. la coda è solo per l''amministratore ....... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  select id into v_foto from public.foto_da_moderare(50) limit 1;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n14. in cima alla coda c''è la più segnalata .... %s',
    case when v_foto = v_altra then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 15. Rimuovere l'autore (cancellazione account) non cancella la foto,
  --     ma la slega: il contenuto resta, la persona no.
  -- ---------------------------------------------------------------
  delete from auth.users where id = v_bruno;
  select count(*) into v_n from public.foto where id = v_altra and user_id is null;
  v_esiti := v_esiti || format(E'\n15. account cancellato: foto orfana, non persa . %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 16. Le foto non sono entrate nel calcolo del punteggio.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  v_esiti := v_esiti || format(E'\n16. le foto fuori dal ranking ................. %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ' riferimenti)' end);

  -- ---------------------------------------------------------------
  -- 17. Il secchio dello storage esiste, è pubblico e accetta solo immagini.
  -- ---------------------------------------------------------------
  select count(*) into v_n from storage.buckets
   where id = 'foto' and public
     and file_size_limit = 3145728
     and allowed_mime_types @> array['image/jpeg','image/png','image/webp'];
  v_esiti := v_esiti || format(E'\n17. il secchio «foto» è configurato ........... %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 18. NON esiste una policy di UPDATE sullo storage: è quella assenza
  --     che impedisce di sovrascrivere il file di un altro.
  -- ---------------------------------------------------------------
  select count(*) into v_n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'foto%' and cmd = 'UPDATE';
  v_esiti := v_esiti || format(E'\n18. nessuna sovrascrittura possibile .......... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ' policy di UPDATE)' end);

  -- ---------------------------------------------------------------
  -- 19. Nessuno, nemmeno un admin, può aggiornare la tabella foto a mano:
  --     il privilegio di UPDATE non c'è.
  -- ---------------------------------------------------------------
  v_ok := not has_table_privilege('authenticated', 'public.foto', 'UPDATE')
      and not has_table_privilege('anon', 'public.foto', 'UPDATE')
      and not has_table_privilege('anon', 'public.foto', 'INSERT');
  v_esiti := v_esiti || format(E'\n19. niente UPDATE a mano sulla tabella ........ %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  raise exception E'\n\n=== PROVA 0089 — foto e moderazione ===%\n\n(Questo errore è voluto: serve ad annullare tutto quello che la prova ha scritto.)\n', v_esiti;
end $$;
