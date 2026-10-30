-- ============================================================
-- LidoRank — SUITE DI TEST DEI FLUSSI GESTORE
--
-- COME SI USA: incolla TUTTO questo file nel SQL editor di Supabase ed esegui.
-- Alla fine vedi una tabella con una riga per controllo e l'esito PASS/FAIL,
-- con i FAIL in cima. Devono essere tutti PASS.
--
-- È SICURA ANCHE IN PRODUZIONE: tutto gira dentro una transazione che termina
-- con ROLLBACK. I dati di prova che crea non restano, e nulla di esistente
-- viene modificato. Se interrompi a metà, la transazione si annulla da sola.
--
-- Rilanciala dopo ogni modifica al lato gestori: è la rete di sicurezza che
-- dice se qualcosa si è rotto.
--
-- Richiede le migrazioni da 0071 a 0075.
-- ============================================================

begin;

create temp table risultati (
  n       serial,
  gruppo  text,
  test    text,
  atteso  text,
  ottenuto text,
  esito   text
) on commit drop;

do $$
declare
  u_admin    uuid := '00000000-dead-0000-0000-00000000a001';
  u_gestore  uuid := '00000000-dead-0000-0000-00000000a002';
  u_estraneo uuid := '00000000-dead-0000-0000-00000000a003';
  b_test     uuid := '00000000-dead-0000-0000-0000000000b1';
  r1 uuid; r2 uuid; r3 uuid;
  v_txt text; v_n int; v_rec_prima int; v_rec_dopo int;
begin
  -- ─── Preparazione ───────────────────────────────────────
  begin
    insert into auth.users (id, email) values
      (u_admin, 'test-admin@lidorank.invalid'),
      (u_gestore, 'test-gestore@lidorank.invalid'),
      (u_estraneo, 'test-estraneo@lidorank.invalid');
  exception when others then
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('SETUP', 'creazione degli utenti di prova', 'riuscita', sqlerrm, 'FAIL');
    raise notice 'SETUP FALLITO: % — la suite si ferma qui.', sqlerrm;
    return;
  end;

  insert into public.profili (user_id, ruolo) values (u_admin, 'admin');

  insert into public.beaches (id, nome, localita)
  values (b_test, 'ZZ Bagno di Prova Automatica', 'Livorno Test');

  select count(*) into v_rec_prima from public.reviews;

  -- ─── GRUPPO A · richiesta e ritiro ──────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);

  insert into public.rivendicazioni (user_id, beach_id, nome)
  values (u_gestore, b_test, 'Gestore di Prova') returning id into r1;

  select profile_status into v_txt from public.beaches where id = b_test;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('A · richiesta', 'la scheda passa in attesa', 'in_attesa', v_txt,
     case when v_txt = 'in_attesa' then 'PASS' else 'FAIL' end);

  select count(*) into v_n from public.eventi_audit
   where entita = 'rivendicazione' and entita_id = r1::text and azione = 'creata';
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('A · richiesta', 'la richiesta finisce nel registro', '1', v_n::text,
     case when v_n = 1 then 'PASS' else 'FAIL' end);

  perform public.rinuncia_rivendicazione(r1);
  select r.stato || ' / ' || b.profile_status into v_txt
    from public.rivendicazioni r, public.beaches b where r.id = r1 and b.id = b_test;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('A · ritiro', 'il richiedente ritira e la scheda si libera',
     'annullata / non_rivendicato', v_txt,
     case when v_txt = 'annullata / non_rivendicato' then 'PASS' else 'FAIL' end);

  -- ─── GRUPPO B · approvazione ────────────────────────────
  insert into public.rivendicazioni (user_id, beach_id, nome)
  values (u_gestore, b_test, 'Gestore di Prova') returning id into r2;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
    perform public.decidi_rivendicazione(r2, true);
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('B · permessi', 'un non-admin NON può approvare', 'rifiutato', 'approvato!', 'FAIL');
  exception when others then
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('B · permessi', 'un non-admin NON può approvare', 'rifiutato', sqlerrm,
       case when sqlerrm like '%non_autorizzato%' then 'PASS' else 'FAIL' end);
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin)::text, true);
  perform public.decidi_rivendicazione(r2, true);

  select r.stato || ' / ' || b.profile_status into v_txt
    from public.rivendicazioni r, public.beaches b where r.id = r2 and b.id = b_test;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('B · approvazione', 'l''admin approva e la scheda è verificata',
     'approvata / verificato', v_txt,
     case when v_txt = 'approvata / verificato' then 'PASS' else 'FAIL' end);

  select ruolo into v_txt from public.profili where user_id = u_gestore;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('B · approvazione', 'il richiedente diventa gestore', 'gestore', coalesce(v_txt, '(nessun profilo)'),
     case when v_txt = 'gestore' then 'PASS' else 'FAIL' end);

  begin
    insert into public.rivendicazioni (user_id, beach_id, nome, stato)
    values (u_estraneo, b_test, 'Finto Gestore', 'approvata');
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('B · unicità', 'un solo gestore approvato per scheda', 'rifiutato', 'accettato!', 'FAIL');
  exception when others then
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('B · unicità', 'un solo gestore approvato per scheda', 'rifiutato', 'rifiutato', 'PASS');
  end;

  -- ─── GRUPPO C · profilo pubblico ────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
  insert into public.profilo_stabilimento (beach_id, descrizione, orari)
  values (b_test, 'Descrizione di prova automatica.', '9-19');

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_estraneo)::text, true);
    execute 'set local role authenticated';
    update public.profilo_stabilimento set descrizione = 'MANOMESSO' where beach_id = b_test;
    execute 'reset role';
    select descrizione into v_txt from public.profilo_stabilimento where beach_id = b_test;
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('C · profilo', 'un estraneo NON può modificare il profilo', 'invariato',
       case when v_txt = 'MANOMESSO' then 'modificato!' else 'invariato' end,
       case when v_txt = 'MANOMESSO' then 'FAIL' else 'PASS' end);
  exception when others then
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('C · profilo', 'un estraneo NON può modificare il profilo', 'invariato', 'bloccato', 'PASS');
  end;

  begin
    execute 'set local role anon';
    select count(*) into v_n from public.profilo_stabilimento where beach_id = b_test;
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('C · profilo', 'il profilo è pubblico quando la scheda è verificata', '1', v_n::text,
       case when v_n = 1 then 'PASS' else 'FAIL' end);
  exception when others then
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('C · profilo', 'il profilo è pubblico quando la scheda è verificata', '1', sqlerrm, 'FAIL');
  end;

  -- ─── GRUPPO D · rinuncia e revoca ───────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', u_gestore)::text, true);
  perform public.rinuncia_rivendicazione(r2);

  select r.stato || ' / ' || b.profile_status || ' / ' || coalesce(p.ruolo, '?') into v_txt
    from public.rivendicazioni r, public.beaches b, public.profili p
   where r.id = r2 and b.id = b_test and p.user_id = u_gestore;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('D · rinuncia', 'il gestore rinuncia: scheda libera e ruolo declassato',
     'revocata / non_rivendicato / cittadino', v_txt,
     case when v_txt = 'revocata / non_rivendicato / cittadino' then 'PASS' else 'FAIL' end);

  select count(*) into v_n from public.profilo_stabilimento where beach_id = b_test;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('D · rinuncia', 'i dati del profilo NON vengono cancellati', '1', v_n::text,
     case when v_n = 1 then 'PASS' else 'FAIL' end);

  begin
    execute 'set local role anon';
    select count(*) into v_n from public.profilo_stabilimento where beach_id = b_test;
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · rinuncia', 'ma smettono di essere pubblici', '0', v_n::text,
       case when v_n = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · rinuncia', 'ma smettono di essere pubblici', '0', sqlerrm, 'FAIL');
  end;

  -- riapprovazione: il profilo deve tornare visibile com'era
  insert into public.rivendicazioni (user_id, beach_id, nome)
  values (u_gestore, b_test, 'Gestore di Prova') returning id into r3;
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin)::text, true);
  perform public.decidi_rivendicazione(r3, true);

  begin
    execute 'set local role anon';
    select descrizione into v_txt from public.profilo_stabilimento where beach_id = b_test;
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · ripristino', 'riapprovando, il profilo torna visibile com''era',
       'Descrizione di prova automatica.', coalesce(v_txt, '(niente)'),
       case when v_txt = 'Descrizione di prova automatica.' then 'PASS' else 'FAIL' end);
  exception when others then
    execute 'reset role';
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · ripristino', 'riapprovando, il profilo torna visibile com''era', 'testo', sqlerrm, 'FAIL');
  end;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_estraneo)::text, true);
    perform public.revoca_rivendicazione(r3);
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · permessi', 'un non-admin NON può revocare', 'rifiutato', 'revocato!', 'FAIL');
  exception when others then
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · permessi', 'un non-admin NON può revocare', 'rifiutato', sqlerrm,
       case when sqlerrm like '%non_autorizzato%' then 'PASS' else 'FAIL' end);
  end;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', u_estraneo)::text, true);
    perform public.rinuncia_rivendicazione(r3);
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · permessi', 'non si può rinunciare per conto di un altro', 'rifiutato', 'riuscito!', 'FAIL');
  exception when others then
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('D · permessi', 'non si può rinunciare per conto di un altro', 'rifiutato', sqlerrm,
       case when sqlerrm like '%non_trovata%' then 'PASS' else 'FAIL' end);
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', u_admin)::text, true);
  perform public.revoca_rivendicazione(r3, 'motivo di prova');
  select r.stato || ' / ' || b.profile_status into v_txt
    from public.rivendicazioni r, public.beaches b where r.id = r3 and b.id = b_test;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('D · revoca', 'l''admin revoca e la scheda si libera', 'revocata / non_rivendicato', v_txt,
     case when v_txt = 'revocata / non_rivendicato' then 'PASS' else 'FAIL' end);

  -- ─── GRUPPO E · integrità generale ──────────────────────
  select count(*) into v_n from public.beaches b
   where b.profile_status = 'verificato'
     and not exists (select 1 from public.rivendicazioni r
                      where r.beach_id = b.id and r.stato = 'approvata');
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('E · integrità', 'nessuna scheda verificata senza rivendica approvata', '0', v_n::text,
     case when v_n = 0 then 'PASS' else 'FAIL' end);

  select count(*) into v_n from public.profili p
   where p.ruolo = 'gestore'
     and not exists (select 1 from public.rivendicazioni r
                      where r.user_id = p.user_id and r.stato = 'approvata');
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('E · integrità', 'nessun gestore rimasto senza schede', '0', v_n::text,
     case when v_n = 0 then 'PASS' else 'FAIL' end);

  select count(*) into v_n from public.verifica_separazione_ranking();
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('E · integrità', 'il lato gestori non entra nel ranking', '0', v_n::text,
     case when v_n = 0 then 'PASS' else 'FAIL' end);

  select count(*) into v_rec_dopo from public.reviews;
  insert into risultati (gruppo, test, atteso, ottenuto, esito) values
    ('E · integrità', 'nessuna recensione toccata da tutto questo',
     v_rec_prima::text, v_rec_dopo::text,
     case when v_rec_prima = v_rec_dopo then 'PASS' else 'FAIL' end);

  begin
    update public.eventi_audit set azione = 'manomesso'
     where entita_id = r3::text;
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('E · integrità', 'il registro è immodificabile', 'rifiutato', 'modificato!', 'FAIL');
  exception when others then
    insert into risultati (gruppo, test, atteso, ottenuto, esito) values
      ('E · integrità', 'il registro è immodificabile', 'rifiutato', 'rifiutato', 'PASS');
  end;
end $$;

-- ─── ESITO ──────────────────────────────────────────────
-- I FAIL compaiono in cima. Devono essere zero.
select
  case when esito = 'PASS' then '✅ PASS' else '❌ FAIL' end as esito,
  gruppo, test, atteso, ottenuto
from risultati
order by (esito <> 'PASS') desc, n;

rollback;

-- ============================================================
-- Dopo il ROLLBACK il database è esattamente com'era prima.
-- Se vuoi la conferma, questa deve restituire 0 righe:
--   select * from public.beaches where nome like 'ZZ Bagno di Prova%';
-- ============================================================
