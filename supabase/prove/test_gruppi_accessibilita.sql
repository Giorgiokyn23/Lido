-- ============================================================
-- LidoRank — prova ripetibile: gruppi e accessibilità (migrazione 0080)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
--
-- NON LASCIA NIENTE NEL DATABASE. Finisce con un'eccezione deliberata che
-- porta con sé i risultati: PostgreSQL annulla l'intera transazione. Il
-- messaggio rosso contiene l'esito, ed è normale.
--
-- Prende in prestito uno stabilimento che non ha ancora un profilo, così non
-- tocca dati veri e non va a sbattere sulla chiave primaria.
-- ============================================================

do $$
declare
  v_beach uuid;
  v_n     int;
  v_esito text := '';
  v_pass  int := 0;
  v_fail  int := 0;
begin
  select b.id into v_beach
    from public.beaches b
    left join public.profilo_stabilimento p on p.beach_id = b.id
   where p.beach_id is null
   order by b.id
   limit 1;

  if v_beach is null then
    raise exception 'PROVA NON ESEGUIBILE: tutti gli stabilimenti hanno già un profilo.';
  end if;

  ---------------------------------------------------------------
  -- 1) I valori ammessi passano
  ---------------------------------------------------------------
  begin
    insert into public.profilo_stabilimento
      (beach_id, gruppi_max, gruppi_preavviso_giorni, pranzo_gruppi, discesa_pullman,
       accesso_senza_scalini, passerella_fino_al_mare, sedia_mare, bagno_accessibile,
       lingue, pagamenti_carte, ombra_garantita)
    values (v_beach, 60, 3, 'su_prenotazione', 'al_cancello',
            true, true, false, true, array['en','de'], true, true);
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  i valori ammessi vengono accettati';
  exception when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  ' || sqlerrm;
  end;

  ---------------------------------------------------------------
  -- 2..4) Gli insiemi chiusi tengono
  -- Senza questi vincoli il campo si riempirebbe di "forse", "chiamare",
  -- "EN", "inglese" e nessun conteggio sarebbe più possibile.
  ---------------------------------------------------------------
  begin
    update public.profilo_stabilimento set pranzo_gruppi = 'forse' where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  pranzo_gruppi ha accettato un valore inventato';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  pranzo_gruppi rifiuta i valori fuori lista';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  errore inatteso: ' || sqlerrm;
  end;

  begin
    update public.profilo_stabilimento set lingue = array['en','klingon'] where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  lingue ha accettato un codice inventato';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  lingue accetta solo i codici previsti';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  errore inatteso: ' || sqlerrm;
  end;

  begin
    update public.profilo_stabilimento set gruppi_max = 5000 where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  gruppi_max ha accettato 5000';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  gruppi_max rifiuta i numeri assurdi';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  errore inatteso: ' || sqlerrm;
  end;

  ---------------------------------------------------------------
  -- 5) Zero è una risposta, non un'assenza
  ---------------------------------------------------------------
  update public.profilo_stabilimento set gruppi_max = 0 where beach_id = v_beach;
  select count(*) into v_n
    from public.profilo_stabilimento
   where beach_id = v_beach and gruppi_max = 0;
  if v_n = 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  gruppi_max = 0 («non accettiamo gruppi») è ammesso e distinto da null';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  lo zero non viene conservato';
  end if;

  ---------------------------------------------------------------
  -- 6) La vista aggregata non espone dati di una singola scheda
  ---------------------------------------------------------------
  select count(*) into v_n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gruppi_per_localita'
     and column_name in ('beach_id', 'telefono', 'email_pubblica', 'descrizione', 'nome');
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  gruppi_per_localita contiene solo conteggi, nessun dato individuale';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  la vista espone ' || v_n || ' colonne individuali';
  end if;

  ---------------------------------------------------------------
  -- 7) La vista si limita alle schede verificate, cioè a quelle che
  --    chiunque può già vedere sul sito
  ---------------------------------------------------------------
  if pg_get_viewdef('public.gruppi_per_localita'::regclass) ilike '%verificato%' then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  la vista legge solo schede verificate';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  la vista non filtra sulle schede verificate';
  end if;

  ---------------------------------------------------------------
  -- 8) La regola che non si tocca: niente di tutto questo nel ranking
  ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  nessun riferimento vietato dentro punteggi e classifiche';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  ' || v_n || ' riferimenti vietati: esegui select * from public.verifica_separazione_ranking();';
  end if;

  raise exception E'\n================= ESITO PROVA 0080 =================%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n====================================================',
    v_esito, v_pass, v_fail;
end $$;
