-- ============================================================
-- LidoRank — prova ripetibile: destagionalizzazione, sport e gruppi (0082)
--
-- COME SI ESEGUE: incolla tutto nel SQL editor di Supabase e premi Run.
-- NON LASCIA NIENTE: finisce con un'eccezione deliberata che annulla tutto.
-- Il messaggio rosso contiene l'esito, ed è normale.
-- ============================================================

do $$
declare
  v_beach uuid;
  v_n     int;
  v_ok    boolean;
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
  -- 1) I valori previsti passano
  ---------------------------------------------------------------
  begin
    insert into public.profilo_stabilimento
      (beach_id, posti_ristorante, tipi_evento, tipi_gruppi, sport,
       tornei_organizzati, mesi_attivita, destagionalizzazione)
    values (v_beach, 80,
            array['dj_set','degustazioni','cinema'],
            array['croceristi','scolaresche'],
            array['beach_volley','padel','sup'],
            true, array[11,12,1]::smallint[],
            'Rassegna cinematografica a ottobre e tornei di padel d''inverno.');
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  1 PASS  i valori previsti vengono accettati';
  exception when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  1 FAIL  ' || sqlerrm;
  end;

  ---------------------------------------------------------------
  -- 2..4) Gli insiemi chiusi tengono.
  -- Senza, lo stesso sport arriva come "beach volley", "beachvolley",
  -- "pallavolo da spiaggia" e "BV": quattro righe che il database non sa
  -- essere la stessa cosa, e nessun conteggio è più possibile.
  ---------------------------------------------------------------
  begin
    update public.profilo_stabilimento set sport = array['curling'] where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  uno sport inventato è stato accettato';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  2 PASS  gli sport fuori insieme vengono rifiutati';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  2 FAIL  errore inatteso: ' || sqlerrm;
  end;

  begin
    update public.profilo_stabilimento set tipi_evento = array['sagra_del_cinghiale']
     where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  un tipo di evento inventato è stato accettato';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  3 PASS  i tipi di evento fuori insieme vengono rifiutati';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  3 FAIL  errore inatteso: ' || sqlerrm;
  end;

  begin
    update public.profilo_stabilimento set mesi_attivita = array[13]::smallint[]
     where beach_id = v_beach;
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  il mese 13 è stato accettato';
  exception when check_violation then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  4 PASS  i mesi fuori calendario vengono rifiutati';
  when others then
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  4 FAIL  errore inatteso: ' || sqlerrm;
  end;

  ---------------------------------------------------------------
  -- 5) Fuori stagione = da ottobre a marzo, in un posto solo
  ---------------------------------------------------------------
  v_ok := public.attivo_fuori_stagione(array[11,12,1]::smallint[])
      and not public.attivo_fuori_stagione(array[7,8]::smallint[])
      and not public.attivo_fuori_stagione(null);
  if v_ok then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  5 PASS  attivo_fuori_stagione distingue novembre da luglio, e il nulla da un no';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  5 FAIL  la definizione di fuori stagione non regge';
  end if;

  ---------------------------------------------------------------
  -- 6) La vista conta chi è attivo fuori stagione
  ---------------------------------------------------------------
  update public.beaches set profile_status = 'verificato' where id = v_beach;
  select g.attivi_fuori_stagione into v_n
    from public.gruppi_per_localita g
    join public.beaches b on b.localita = g.localita and b.id = v_beach
   limit 1;
  if coalesce(v_n, 0) >= 1 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  6 PASS  la vista per località conta gli attivi fuori stagione';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  6 FAIL  conteggio fuori stagione: ' || coalesce(v_n::text, 'NULL');
  end if;

  ---------------------------------------------------------------
  -- 7) La vista resta aggregata: nessun dato di una singola scheda
  ---------------------------------------------------------------
  select count(*) into v_n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gruppi_per_localita'
     and column_name in ('beach_id','telefono','instagram','whatsapp','descrizione',
                         'nome','destagionalizzazione');
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  7 PASS  la vista non espone dati individuali, nemmeno il testo sulla destagionalizzazione';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  7 FAIL  la vista espone ' || v_n || ' colonne individuali';
  end if;

  ---------------------------------------------------------------
  -- 8) La regola che non si tocca: organizzare tornei non fa salire nessuno
  ---------------------------------------------------------------
  select count(*) into v_n from public.verifica_separazione_ranking();
  if v_n = 0 then
    v_pass := v_pass + 1; v_esito := v_esito || E'\n  8 PASS  nessun riferimento vietato dentro punteggi e classifiche';
  else
    v_fail := v_fail + 1; v_esito := v_esito || E'\n  8 FAIL  ' || v_n || ' riferimenti vietati — esegui select * from public.verifica_separazione_ranking();';
  end if;

  raise exception E'\n================= ESITO PROVA 0082 =================%\n\n  PASS: %   FAIL: %\n\nTutto annullato: nel database non resta niente di questa prova.\n====================================================',
    v_esito, v_pass, v_fail;
end $$;
