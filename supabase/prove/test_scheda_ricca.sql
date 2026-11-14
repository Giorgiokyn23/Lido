-- ============================================================
-- LidoRank — prova ripetibile: la scheda ricca (migrazione 0081)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
--
-- NON LASCIA NIENTE NEL DATABASE. Finisce con un'eccezione deliberata che
-- porta con sé i risultati: PostgreSQL annulla l'intera transazione. Il
-- messaggio rosso contiene l'esito, ed è normale.
--
-- Prende in prestito uno stabilimento che non ha né profilo né rivendicazione
-- approvata, così non tocca dati veri e non va a sbattere contro gli indici
-- univoci.
-- ============================================================

do $$
declare
  v_beach    uuid;
  v_gestore  uuid;
  v_n        int;
  v_data     date;
  v_num      numeric;
  v_ok       boolean;
  v_esito    text := '';
  v_pass     int := 0;
  v_fail     int := 0;
begin
  select b.id into v_beach
    from public.beaches b
    left join public.profilo_stabilimento p on p.beach_id = b.id
   where p.beach_id is null
     and not exists (select 1 from public.rivendicazioni r
                      where r.beach_id = b.id and r.stato = 'approvata')
   order by b.id
   limit 1;

  if v_beach is null then
    raise exception 'PROVA NON ESEGUIBILE: nessuno stabilimento libero da profilo e rivendicazioni.';
  end if;

  ---------------------------------------------------------------
  -- A) Il profilo minimo
  ---------------------------------------------------------------
  v_n := coalesce(array_length(public.profilo_minimo_mancanti(v_beach), 1), 0);
  if v_n = 10 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  scheda senza profilo: mancano tutte e dieci le voci';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  voci mancanti attese 10, trovate ' || v_n;
  end if;

  insert into public.profilo_stabilimento
    (beach_id, descrizione, orari, telefono, ombrelloni_totali, tipo_fondo)
  values (v_beach, 'Prova', '9-19', '0586000000', 120, 'sabbia');

  v_n := coalesce(array_length(public.profilo_minimo_mancanti(v_beach), 1), 0);
  if v_n = 5 and not public.profilo_minimo_completo(v_beach) then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  profilo parziale: restano cinque voci, e non è completo';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  voci mancanti attese 5, trovate ' || v_n;
  end if;

  update public.profilo_stabilimento
     set prezzo_ombrellone_alta = 25.00,
         bagnino = true,
         parcheggio = 'privato_gratuito',
         gruppi_max = 50,
         accesso_senza_scalini = true
   where beach_id = v_beach;

  if public.profilo_minimo_completo(v_beach)
     and coalesce(array_length(public.profilo_minimo_mancanti(v_beach), 1), 0) = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  completate le dieci voci, il profilo minimo risulta completo';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  il profilo minimo non risulta completo';
  end if;

  ---------------------------------------------------------------
  -- B) Gli eventi dipendono dal profilo minimo
  ---------------------------------------------------------------
  insert into auth.users (id, email)
    values (gen_random_uuid(), 'prova-ricca@lidorank.invalid') returning id into v_gestore;
  insert into public.rivendicazioni (user_id, beach_id, nome, stato, decisa_il)
    values (v_gestore, v_beach, 'Prova', 'approvata', now());
  update public.beaches set profile_status = 'verificato' where id = v_beach;
  perform set_config('request.jwt.claims', json_build_object('sub', v_gestore)::text, true);

  if public.puo_pubblicare_eventi(v_beach) then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  con il profilo minimo completo gli eventi sono permessi';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  gli eventi restano bloccati pur avendo il profilo completo';
  end if;

  -- Tolgo una sola voce: il permesso deve cadere.
  update public.profilo_stabilimento set prezzo_ombrellone_alta = null where beach_id = v_beach;
  if not public.puo_pubblicare_eventi(v_beach) then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  togliendo una voce il permesso di pubblicare cade';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  il permesso resta anche con una voce mancante';
  end if;
  update public.profilo_stabilimento set prezzo_ombrellone_alta = 25.00 where beach_id = v_beach;

  ---------------------------------------------------------------
  -- C) La data dei prezzi si scrive e si muove solo per i prezzi
  ---------------------------------------------------------------
  select prezzi_aggiornati_il into v_data from public.profilo_stabilimento where beach_id = v_beach;
  if v_data = current_date then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  prezzi_aggiornati_il viene timbrata dal trigger';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  data dei prezzi: ' || coalesce(v_data::text, 'NULL');
  end if;

  update public.profilo_stabilimento set prezzi_aggiornati_il = current_date - 40 where beach_id = v_beach;
  update public.profilo_stabilimento set wifi = true where beach_id = v_beach;
  select prezzi_aggiornati_il into v_data from public.profilo_stabilimento where beach_id = v_beach;
  if v_data = current_date - 40 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  la data dei prezzi non si muove se cambio altro';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  la data si è mossa senza che cambiasse un prezzo';
  end if;

  update public.profilo_stabilimento set prezzo_lettino = 8.00 where beach_id = v_beach;
  select prezzi_aggiornati_il into v_data from public.profilo_stabilimento where beach_id = v_beach;
  if v_data = current_date then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  cambiando un prezzo la data si aggiorna';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  la data non si è aggiornata';
  end if;

  ---------------------------------------------------------------
  -- D) I vincoli: lo zero scivolato e i valori inventati
  ---------------------------------------------------------------
  begin
    update public.profilo_stabilimento set prezzo_ombrellone_alta = 9000 where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  9 FAIL  un ombrellone a 9000 euro è stato accettato';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  9 PASS  i prezzi fuori scala vengono rifiutati';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  9 FAIL  errore inatteso: ' || sqlerrm;
  end;

  v_ok := true;
  begin
    update public.profilo_stabilimento set tipo_fondo = 'moquette' where beach_id = v_beach;
    v_ok := false;
  exception when check_violation then null; end;
  begin
    update public.profilo_stabilimento set parcheggio = 'forse' where beach_id = v_beach;
    v_ok := false;
  exception when check_violation then null; end;
  begin
    update public.profilo_stabilimento set mese_apertura = 13 where beach_id = v_beach;
    v_ok := false;
  exception when check_violation then null; end;
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 10 PASS  fondo, parcheggio e mese rifiutano i valori inventati';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 10 FAIL  un valore fuori insieme è passato';
  end if;

  begin
    update public.profilo_stabilimento set prezzo_ingresso = 0 where beach_id = v_beach;
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 11 PASS  prezzo 0 ammesso: «ingresso gratuito» è una risposta';
  exception when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 11 FAIL  lo zero è stato rifiutato: ' || sqlerrm;
  end;

  ---------------------------------------------------------------
  -- E) La vista aggregata
  ---------------------------------------------------------------
  select count(*) into v_n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gruppi_per_localita'
     and column_name in ('beach_id','telefono','instagram','whatsapp','descrizione','nome');
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 12 PASS  la vista per località non espone dati individuali';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 12 FAIL  la vista espone ' || v_n || ' colonne individuali';
  end if;

  select prezzo_medio_alta into v_num
    from public.gruppi_per_localita g
    join public.beaches b on b.localita = g.localita and b.id = v_beach
   limit 1;
  if v_num is not null then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 13 PASS  la vista calcola il prezzo medio della località';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 13 FAIL  prezzo medio nullo';
  end if;

  ---------------------------------------------------------------
  -- F) La regola che non si tocca
  ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n 14 PASS  nessun riferimento vietato dentro punteggi e classifiche';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n 14 FAIL  ' || v_n || ' riferimenti vietati — esegui select * from public.verifica_separazione_ranking();';
  end if;

  raise exception E'\n================= ESITO PROVA 0081 =================%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n====================================================',
    v_esito, v_pass, v_fail;
end $$;
