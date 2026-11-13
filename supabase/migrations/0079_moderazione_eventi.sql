-- ============================================================
-- LidoRank — 0079: moderazione degli eventi da parte dell'amministratore
--
-- Perché serve. Oggi un evento si può togliere solo dall'area del gestore che
-- l'ha pubblicato: la pagina controlla miei_stabilimenti() e risponde 404 a
-- chiunque altro, amministratore compreso. Se un gestore pubblica qualcosa di
-- offensivo o fuorviante, l'unico modo per intervenire è aprire il SQL editor
-- di Supabase e scrivere una delete a mano. Non è una cosa che si fa in fretta,
-- ed è proprio quando serve farla in fretta.
--
-- Perché due funzioni security definer e non una policy in più. La policy di
-- UPDATE della 0078 è `e_gestore_di(beach_id)` e NON contempla l'amministratore:
-- quindi oggi l'admin può cancellare un evento (la policy di DELETE lo prevede)
-- ma non può nasconderlo, cioè può fare solo la cosa irreversibile. Si potrebbe
-- allargare la policy, ma allora la moderazione passerebbe da una update
-- qualunque e non lascerebbe traccia. Con una funzione dedicata ogni intervento
-- finisce in eventi_audit, che è append-only: se domani il gestore chiede
-- «perché avete tolto il mio evento?», la risposta è scritta e non va cercata
-- a memoria. È lo stesso schema di decidi_rivendicazione() e revoca_rivendicazione().
--
-- NESSUNA riga qui tocca punteggi, pesi o classifiche. Nascondere un evento non
-- cambia il punteggio di uno stabilimento, e non esiste alcun modo di comprare
-- la ripubblicazione: la moderazione è una decisione, non un listino.
--
-- Solo DDL additivo. Esegui DOPO 0078. Idempotente.
-- ============================================================

-- 1) Nascondi o ripubblica --------------------------------------------------
-- Preferire questa alla cancellazione: con stato='nascosto' l'evento esce dal
-- calendario pubblico (la vista calendario_eventi filtra su 'pubblicato') ma
-- titolo, testo e date restano leggibili, quindi un equivoco si rimedia con un
-- clic invece di ricostruire a memoria quello che c'era scritto.
create or replace function public.modera_evento(
  _id       uuid,
  _nascondi boolean,
  _motivo   text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prima jsonb;
  v_nuovo text;
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  select to_jsonb(e) into v_prima
    from public.eventi_gestore e
   where e.id = _id;

  if v_prima is null then
    raise exception 'evento_non_trovato';
  end if;

  v_nuovo := case when _nascondi then 'nascosto' else 'pubblicato' end;

  update public.eventi_gestore
     set stato = v_nuovo
   where id = _id;

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values (
    'eventi_gestore',
    _id::text,
    case when _nascondi then 'evento_nascosto' else 'evento_ripubblicato' end,
    auth.uid(),
    v_prima,
    jsonb_build_object('stato', v_nuovo, 'motivo', nullif(btrim(coalesce(_motivo, '')), ''))
  );
end;
$$;

revoke all on function public.modera_evento(uuid, boolean, text) from public;
grant execute on function public.modera_evento(uuid, boolean, text) to authenticated;

-- 2) Elimina, conservando la traccia ----------------------------------------
-- La riga intera finisce in eventi_audit.prima PRIMA della cancellazione: il
-- contenuto rimosso resta ricostruibile anche quando la scheda non esiste più.
-- Serve per rispondere a un reclamo e per dimostrare cosa è stato tolto e quando.
create or replace function public.elimina_evento_admin(
  _id     uuid,
  _motivo text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prima jsonb;
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  select to_jsonb(e) into v_prima
    from public.eventi_gestore e
   where e.id = _id;

  if v_prima is null then
    raise exception 'evento_non_trovato';
  end if;

  -- L'audit si scrive prima: se la delete fallisce la transazione torna
  -- indietro tutta, quindi non resta una traccia di qualcosa che c'è ancora.
  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values (
    'eventi_gestore',
    _id::text,
    'evento_eliminato',
    auth.uid(),
    v_prima,
    jsonb_build_object('motivo', nullif(btrim(coalesce(_motivo, '')), ''))
  );

  delete from public.eventi_gestore where id = _id;
end;
$$;

revoke all on function public.elimina_evento_admin(uuid, text) from public;
grant execute on function public.elimina_evento_admin(uuid, text) to authenticated;

-- ============================================================
-- VERIFICA A MANO (facoltativa, nel SQL editor)
--
--   -- gli ultimi interventi di moderazione, con il motivo
--   select creato_il, azione, prima->>'titolo' as titolo, dopo->>'motivo' as motivo
--     from public.eventi_audit
--    where entita = 'eventi_gestore'
--    order by creato_il desc
--    limit 20;
--
-- Il limite di dieci eventi futuri per scheda conta tutte le righe future,
-- nascoste comprese: nascondere NON libera uno slot. È voluto, altrimenti
-- basterebbe nascondere per aggirare il limite.
-- ============================================================
