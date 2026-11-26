-- ============================================================
-- PROVA della 0092 — soprannomi e amicizie
--
-- Si incolla nel SQL editor di Supabase. L'ultima riga solleva un errore di
-- proposito per annullare tutto: quell'errore È il risultato.
--
-- Il grosso delle prove riguarda CHI VEDE COSA, perché è lì che un errore fa
-- danno vero: una lista di visite che trapela è la cronologia di dove si
-- trovava una persona.
-- ============================================================

do $$
declare
  v_anna    uuid := gen_random_uuid();
  v_bruno   uuid := gen_random_uuid();
  v_carla   uuid := gen_random_uuid();
  v_bagno   uuid;
  v_bagno2  uuid;
  v_n       int;
  v_t       text;
  v_b       boolean;
  v_esiti   text := '';
  v_ok      boolean;
begin
  select id into v_bagno from public.beaches limit 1;
  select id into v_bagno2 from public.beaches where id <> v_bagno limit 1;
  if v_bagno2 is null then
    raise exception 'PROVA NON ESEGUITA: servono almeno due stabilimenti.';
  end if;

  insert into auth.users (id, email) values
    (v_anna,  'prova_anna_'  || v_anna  || '@esempio.invalid'),
    (v_bruno, 'prova_bruno_' || v_bruno || '@esempio.invalid'),
    (v_carla, 'prova_carla_' || v_carla || '@esempio.invalid');

  -- ---------------------------------------------------------------
  -- 1. Il soprannome si prende, e vale la forma.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_anna)::text, true);
  perform public.imposta_handle('anna_livorno', 'Anna');
  perform set_config('request.jwt.claims', null, true);
  select handle into v_t from public.profili where user_id = v_anna;
  v_esiti := v_esiti || format(E'\n 1. il soprannome si imposta ................. %s',
    case when v_t = 'anna_livorno' then 'PASSA' else 'FALLISCE (' || coalesce(v_t,'nullo') || ')' end);

  -- ---------------------------------------------------------------
  -- 2. Forme non ammesse: maiuscole, spazi, troppo corto, punti.
  -- ---------------------------------------------------------------
  v_ok := not public.handle_valido('Anna')
      and not public.handle_valido('an')
      and not public.handle_valido('anna livorno')
      and not public.handle_valido('anna.livorno')
      and not public.handle_valido('_anna')
      and not public.handle_valido('anna_')
      and public.handle_valido('anna_livorno')
      and public.handle_valido('a1_b');
  v_esiti := v_esiti || format(E'\n 2. la forma del soprannome è controllata .... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 3. Nessuno può chiamarsi «admin».
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  begin
    perform public.imposta_handle('admin', 'Bruno');
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%handle_riservato%');
  end;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 3. i soprannomi del sito sono riservati ..... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 4. Due persone non possono avere lo stesso soprannome, nemmeno
  --    cambiando le maiuscole.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  begin
    perform public.imposta_handle('ANNA_LIVORNO', 'Bruno');
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%handle_occupato%' or sqlerrm like '%handle_non_valido%');
  end;
  perform public.imposta_handle('bruno_pisa', 'Bruno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 4. il soprannome è unico ..................... %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  perform set_config('request.jwt.claims', json_build_object('sub', v_carla)::text, true);
  perform public.imposta_handle('carla_mare', 'Carla');
  perform set_config('request.jwt.claims', null, true);

  -- Qualche visita, che è l'oggetto social.
  insert into public.liste_utente (user_id, beach_id, tipo) values
    (v_anna, v_bagno, 'visitato'),
    (v_anna, v_bagno2, 'da_provare'),
    (v_bruno, v_bagno, 'visitato');

  -- ---------------------------------------------------------------
  -- 5. Un estraneo NON vede le liste di Anna.
  --    È la prova più importante del file.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  select count(*) into v_n from public.liste_di('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 5. un estraneo non vede le tue visite ....... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ' righe)' end);

  -- ---------------------------------------------------------------
  -- 6. Nemmeno un anonimo le vede.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.liste_di('anna_livorno');
  v_esiti := v_esiti || format(E'\n 6. nemmeno un anonimo le vede ............... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 6-bis. E un anonimo non vede nemmeno il rapporto sul profilo.
  --        Stessa logica a tre valori della 6: va provata anche qui.
  -- ---------------------------------------------------------------
  select rapporto, liste_viste into v_t, v_b from public.profilo_di('anna_livorno');
  v_esiti := v_esiti || format(E'\n 6b. l''anonimo vede il profilo ma non le liste %s',
    case when v_t = 'anonimo' and v_b = false then 'PASSA'
         else 'FALLISCE (' || coalesce(v_t,'nullo') || ', ' || coalesce(v_b::text,'nullo') || ')' end);

  -- ---------------------------------------------------------------
  -- 6-ter. Ma se Anna APRE le sue liste, allora sì: il divieto deve essere
  --        una scelta, non un muro che non si può abbassare.
  -- ---------------------------------------------------------------
  update public.profili set liste_pubbliche = true where user_id = v_anna;
  select count(*) into v_n from public.liste_di('anna_livorno');
  update public.profili set liste_pubbliche = false where user_id = v_anna;
  v_esiti := v_esiti || format(E'\n 6c. se le apre, si vedono .................... %s',
    case when v_n = 2 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 7. Una richiesta sola non basta: serve l'accettazione.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  select public.richiedi_amicizia('anna_livorno') into v_t;
  select count(*) into v_n from public.liste_di('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 7. la richiesta da sola non apre niente ..... %s',
    case when v_t = 'in_attesa' and v_n = 0 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 8. Il richiedente non può accettarsi da solo.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  begin
    perform public.rispondi_amicizia('anna_livorno', true);
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%nessuna_richiesta%');
  end;
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 8. non ci si accetta da soli ................ %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 9. Accettata: ora Bruno vede le visite di Anna.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_anna)::text, true);
  perform public.rispondi_amicizia('bruno_pisa', true);
  perform set_config('request.jwt.claims', null, true);

  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  select count(*) into v_n from public.liste_di('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n 9. accettata, l''amico vede le visite ........ %s',
    case when v_n = 2 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 10. L'amicizia vale nei due versi: anche Anna vede Bruno.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_anna)::text, true);
  select count(*) into v_n from public.liste_di('bruno_pisa');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n10. vale nei due versi ....................... %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 11. Carla, che non c'entra, continua a non vedere niente.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_carla)::text, true);
  select count(*) into v_n from public.liste_di('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n11. l''amicizia non è transitiva .............. %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 12. Una sola riga per coppia: richieste incrociate non si sdoppiano.
  --     Chiedere a chi ti ha già chiesto equivale ad accettare.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_carla)::text, true);
  perform public.richiedi_amicizia('anna_livorno');
  perform set_config('request.jwt.claims', null, true);

  perform set_config('request.jwt.claims', json_build_object('sub', v_anna)::text, true);
  select public.richiedi_amicizia('carla_mare') into v_t;
  perform set_config('request.jwt.claims', null, true);

  select count(*) into v_n from public.amicizie
   where (richiedente = v_anna and destinatario = v_carla)
      or (richiedente = v_carla and destinatario = v_anna);
  v_esiti := v_esiti || format(E'\n12. le richieste incrociate si fondono ....... %s',
    case when v_t = 'accettata' and v_n = 1 then 'PASSA' else 'FALLISCE (' || v_t || ', ' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 13. Il diario mostra le visite degli amici, e solo quelle.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  select count(*) into v_n from public.diario_amici(50);
  perform set_config('request.jwt.claims', null, true);
  -- Bruno è amico della sola Anna, che ha due righe in lista.
  v_esiti := v_esiti || format(E'\n13. il diario mostra solo gli amici .......... %s',
    case when v_n = 2 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 14. Togliere l'amicizia richiude tutto.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_anna)::text, true);
  perform public.togli_amicizia('bruno_pisa');
  perform set_config('request.jwt.claims', null, true);

  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  select count(*) into v_n from public.liste_di('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n14. togliere l''amicizia richiude ............. %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 15. Il blocco impedisce nuove richieste, e si comporta come se il
  --     profilo non esistesse — senza dire «ti ho bloccato».
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_anna)::text, true);
  perform public.blocca_profilo('bruno_pisa');
  perform set_config('request.jwt.claims', null, true);

  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  begin
    perform public.richiedi_amicizia('anna_livorno');
    v_ok := false;
  exception when others then
    v_ok := (sqlerrm like '%profilo_non_trovato%');
  end;
  select count(*) into v_n from public.profilo_di('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n15. il blocco fa sparire il profilo .......... %s',
    case when v_ok and v_n = 0 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 16. Il bloccato non compare nemmeno nella ricerca.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_bruno)::text, true);
  select count(*) into v_n from public.cerca_profilo('anna');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n16. né nella ricerca ......................... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 17. Si cerca per soprannome, ma da almeno tre caratteri: due lettere
  --     restituirebbero mezza rubrica, ed è la rubrica il pericolo, non la
  --     ricerca.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_carla)::text, true);
  select count(*) into v_n from public.cerca_profilo('an');
  v_b := (v_n = 0);
  select count(*) into v_n from public.cerca_profilo('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n17. si cerca per soprannome, da 3 caratteri .. %s',
    case when v_b and v_n = 1 then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 17b. E ANCHE PER NOME, che è il punto della 0095: senza, per trovare
  --      qualcuno dovevi già sapere il suo soprannome, cioè te l'aveva
  --      dovuto dire a voce.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_carla)::text, true);
  select count(*) into v_n from public.cerca_profilo('Anna');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n17b. e anche per nome ........................ %s',
    case when v_n = 1 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 17c. La ricerca dice già che rapporto hai con chi trovi: proporre
  --      «chiedi l'amicizia» a chi è già tuo amico è sciatto.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_carla)::text, true);
  select rapporto into v_t from public.cerca_profilo('anna_livorno');
  perform set_config('request.jwt.claims', null, true);
  v_esiti := v_esiti || format(E'\n17c. e dice che rapporto hai già ............. %s',
    case when v_t = 'amici' then 'PASSA' else 'FALLISCE (' || coalesce(v_t,'nullo') || ')' end);

  -- ---------------------------------------------------------------
  -- 17d. Chi spegne l'interruttore sparisce dalla ricerca.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_anna)::text, true);
  perform public.imposta_trovabile(false);
  perform set_config('request.jwt.claims', null, true);

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_carla)::text, true);
  select count(*) into v_n from public.cerca_profilo('anna');
  perform set_config('request.jwt.claims', null, true);

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_anna)::text, true);
  perform public.imposta_trovabile(true);
  perform set_config('request.jwt.claims', null, true);

  v_esiti := v_esiti || format(E'\n17d. chi non vuole essere trovato sparisce ... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 17e. Un anonimo non può cercare NESSUNO: senza questo, la ricerca
  --      diventerebbe un modo per enumerare gli iscritti dall'esterno.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.cerca_profilo('anna');
  v_esiti := v_esiti || format(E'\n17e. un anonimo non cerca nessuno ............ %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  -- ---------------------------------------------------------------
  -- 18. Il profilo di un altro NON dice quante recensioni ha scritto:
  --     visite più recensioni permetterebbero di indovinare quali sono.
  -- ---------------------------------------------------------------
  v_ok := not exists (
    select 1 from information_schema.routines r
      join information_schema.parameters p on p.specific_name = r.specific_name
     where r.routine_schema = 'public' and r.routine_name = 'profilo_di'
       and p.parameter_name ilike '%recension%'
  );
  v_esiti := v_esiti || format(E'\n18. il profilo altrui non conta le recensioni . %s',
    case when v_ok then 'PASSA' else 'FALLISCE' end);

  -- ---------------------------------------------------------------
  -- 19. Niente di tutto questo tocca il punteggio.
  -- ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  v_esiti := v_esiti || format(E'\n19. amicizie fuori dal ranking ............... %s',
    case when v_n = 0 then 'PASSA' else 'FALLISCE (' || v_n || ')' end);

  raise exception E'\n\n=== PROVA 0092 — soprannomi e amicizie ===%\n\n(Questo errore è voluto: annulla tutto quello che la prova ha scritto.)\n', v_esiti;
end $$;
