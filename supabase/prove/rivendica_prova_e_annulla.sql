-- ============================================================
-- LidoRank — PROVA DEL FLUSSO DI RIVENDICA, E COME ANNULLARLA
--
-- Questo file NON è una migrazione: non eseguirlo tutto insieme.
-- Sono blocchi da copiare uno alla volta nel SQL editor di Supabase,
-- per provare il flusso in locale e poi riportare tutto com'era.
--
-- Ricorda: la rivendica NON tocca voti, punteggi e classifica. Anche se
-- sbagli qualcosa qui, le recensioni non si toccano.
-- ============================================================


-- ─── 1. GUARDARE SENZA TOCCARE ──────────────────────────────
-- Stato attuale delle schede che ti interessano (sostituisci il nome).

select id, nome, localita, profile_status
  from public.beaches
 where localita ilike '%livorno%'
 order by nome;

-- Tutte le richieste presenti, con il nome dello stabilimento.
select r.id, b.nome, r.nome as richiedente, r.stato, r.creata_il
  from public.rivendicazioni r
  join public.beaches b on b.id = r.beach_id
 order by r.creata_il desc;


-- ─── 2. ANNULLARE UNA RIVENDICA DI PROVA ────────────────────
-- Riporta una singola scheda allo stato iniziale: cancella le richieste,
-- rimette profile_status a 'non_rivendicato' e toglie il profilo scritto
-- dal gestore. Il ruolo dell'utente viene riportato a 'cittadino' SOLO se
-- non gestisce nessun altro stabilimento.
--
-- Sostituisci il nome dello stabilimento nella prima riga.

do $$
declare
  v_beach uuid;
  v_users uuid[];
begin
  select id into v_beach
    from public.beaches
   where nome ilike '%SOSTITUISCI QUI IL NOME%'    -- <<< cambia questo
     and localita ilike '%livorno%'
   limit 1;

  if v_beach is null then
    raise notice 'Nessuno stabilimento trovato: controlla il nome.';
    return;
  end if;

  select array_agg(distinct user_id) into v_users
    from public.rivendicazioni where beach_id = v_beach;

  delete from public.profilo_stabilimento where beach_id = v_beach;
  delete from public.rivendicazioni       where beach_id = v_beach;

  update public.beaches set profile_status = 'non_rivendicato' where id = v_beach;

  -- Declassa a cittadino solo chi non gestisce più nulla (e non è admin).
  update public.profili p
     set ruolo = 'cittadino'
   where p.user_id = any(coalesce(v_users, '{}'))
     and p.ruolo = 'gestore'
     and not exists (
       select 1 from public.rivendicazioni r
        where r.user_id = p.user_id and r.stato = 'approvata'
     );

  raise notice 'Rivendica annullata per la scheda %. Recensioni e punteggi non toccati.', v_beach;
end $$;


-- ─── 3. AZZERARE TUTTE LE PROVE ─────────────────────────────
-- Da usare solo in sviluppo, quando vuoi ripulire del tutto.
-- ATTENZIONE: cancella TUTTE le rivendicazioni e TUTTI i profili gestore.
-- Lascia intatte recensioni, segnalazioni e classifiche.

-- delete from public.profilo_stabilimento;
-- delete from public.rivendicazioni;
-- update public.beaches set profile_status = 'non_rivendicato'
--  where profile_status <> 'non_rivendicato';
-- update public.profili set ruolo = 'cittadino' where ruolo = 'gestore';


-- ─── 4. CONTROLLI DI SANITÀ ─────────────────────────────────
-- Dopo le prove, questi devono tornare come indicato.

-- Nessuna scheda "verificata" senza una rivendica approvata (atteso: 0)
select count(*) as incoerenze
  from public.beaches b
 where b.profile_status = 'verificato'
   and not exists (select 1 from public.rivendicazioni r
                    where r.beach_id = b.id and r.stato = 'approvata');

-- Il lato gestori non è entrato nel ranking (atteso: 0 righe)
select * from public.verifica_separazione_ranking();

-- Il registro conserva la storia di quello che hai fatto (append-only)
select entita, azione, creato_il
  from public.eventi_audit
 order by creato_il desc
 limit 20;
