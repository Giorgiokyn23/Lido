-- ============================================================
-- LidoRank — 0091: le foto le carica il gestore
--
-- COSA CAMBIA. La 0089 lasciava caricare una foto a chiunque avesse un
-- account. Ora può farlo soltanto il gestore della scheda (o un
-- amministratore). È una decisione di prodotto, non tecnica, e vale la pena
-- scrivere qui che cosa comporta, perché non è neutra.
--
-- QUELLO CHE SI GUADAGNA. Le foto diventano poche, riconducibili a
-- un'impresa verificata e difendibili: se arriva una contestazione, dall'altra
-- parte c'è una partita IVA e non un anonimo. Il carico di moderazione crolla
-- quasi a zero. E — ragione più pratica di tutte — a novembre sulla costa non
-- c'è nessuno: se le foto possono caricarle solo i visitatori, le gallerie
-- restano vuote fino a giugno, e una galleria vuota è peggio di nessuna
-- galleria.
--
-- QUELLO CHE SI PERDE, e va detto chiaro. Una foto caricata dal gestore è
-- materiale promozionale: inquadra il bello, non la giornata com'era. È
-- l'unica cosa sulla scheda che il gestore controlla, su un sito costruito
-- apposta perché la pagina non sia la sua voce. E soprattutto: le foto dei
-- visitatori erano la materia prima del lato social — senza, non c'è niente
-- da seguire e niente da guardare che non sia pubblicità.
--
-- PER QUESTO LA PORTA RESTA SOCCHIUSA. La colonna `fonte` distingue le due
-- origini fin da oggi, anche se oggi ce n'è una sola. Aprire alle foto dei
-- visitatori in futuro sarà cambiare una policy e un'etichetta, non rifare la
-- tabella — e soprattutto le foto già caricate resteranno distinguibili da
-- quelle nuove, che è l'unica cosa che non si può recuperare dopo.
--
-- Esegui DOPO 0090. Idempotente.
-- ============================================================

-- 1) Da dove viene la foto ---------------------------------------------------
alter table public.foto
  add column if not exists fonte text not null default 'gestore';

alter table public.foto drop constraint if exists foto_fonte_valori;
alter table public.foto
  add constraint foto_fonte_valori check (fonte in ('gestore', 'visitatore'));

-- 2) Carica solo il gestore della scheda ------------------------------------
-- `e_gestore_di` esiste dalla 0071 e controlla che ci sia una rivendicazione
-- approvata per QUELLA scheda: non basta essere un gestore, bisogna essere il
-- gestore di questo bagno.
-- Due drop e non uno: il primo toglie la policy della 0089, il secondo serve
-- perché questo file possa essere rieseguito. Quando una migrazione RINOMINA
-- una policy, alla seconda esecuzione il vecchio nome non esiste più e il
-- nuovo sì: senza il secondo drop si ferma qui.
drop policy if exists "foto_self_insert" on public.foto;
drop policy if exists "foto_gestore_insert" on public.foto;
create policy "foto_gestore_insert" on public.foto
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and stato = 'pubblicata'
    and segnalazioni = 0
    and (public.e_gestore_di(beach_id) or public.e_admin())
  );

-- La cancellazione segue la stessa logica: la propria foto, finché è
-- pubblicata. Un gestore che perde la concessione smette di poter cancellare,
-- ed è giusto — a quel punto quelle foto le azzera la revoca (punto 4).
drop policy if exists "foto_self_delete" on public.foto;
create policy "foto_self_delete" on public.foto
  for delete using (
    stato = 'pubblicata'
    and (
      (user_id = auth.uid() and public.e_gestore_di(beach_id))
      or public.e_admin()
    )
  );

-- 3) Il limite diventa per scheda, non per persona --------------------------
-- Con un solo caricatore, «sei a testa» voleva dire «sei in tutto»: troppo
-- poche per raccontare uno stabilimento. Dodici è quanto basta per una
-- galleria vera senza che la pagina diventi pesante da scaricare.
create or replace function public.foto_limite()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  n int;
begin
  select count(*) into n
    from public.foto f
   where f.beach_id = new.beach_id
     and f.fonte = new.fonte
     and f.stato <> 'rimossa';

  -- Il conteggio è per origine: quando si apriranno le foto dei visitatori,
  -- le loro non dovranno rubare il posto a quelle dello stabilimento.
  if n >= (case when new.fonte = 'gestore' then 12 else 30 end) then
    raise exception 'troppe_foto';
  end if;

  return new;
end;
$$;

-- 4) La revoca si porta via anche le foto -----------------------------------
-- La 0083 azzera il profilo quando una concessione viene revocata, perché il
-- gestore nuovo non deve ereditare i prezzi del vecchio. Le foto del gestore
-- sono la stessa cosa, anzi peggio: un prezzo vecchio è un numero sbagliato,
-- una foto vecchia è l'immagine di un posto che non esiste più così.
--
-- Si NASCONDONO, non si cancellano: se la revoca viene contestata e annullata,
-- il pulsante «ripubblica» della coda di moderazione le rimette in piedi.
create or replace function public.azzera_foto_gestore(_beach uuid)
  returns int
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  n int;
begin
  with spente as (
    update public.foto
       set stato = 'nascosta',
           moderata_il = now(),
           motivo = 'concessione revocata'
     where beach_id = _beach
       and fonte = 'gestore'
       and stato = 'pubblicata'
    returning id
  )
  select count(*) into n from spente;

  if n > 0 then
    insert into public.eventi_audit (entita, entita_id, azione, attore, dopo)
    values ('foto', _beach::text, 'nascoste_per_revoca', auth.uid(),
            jsonb_build_object('quante', n));
  end if;

  return n;
end;
$$;

revoke all on function public.azzera_foto_gestore(uuid) from public;

-- 5) L'azzeramento della 0083 comprende ora anche le foto -------------------
-- La funzione viene RIDEFINITA con la stessa firma e con il corpo della 0083
-- ricopiato tale e quale, più una riga. È il modo meno rischioso: chi la
-- chiama — revoca, rinuncia, azzeramento da amministratore — non cambia, e il
-- comportamento esistente non si tocca per sbaglio.
create or replace function public.azzera_profilo_interno(_beach uuid, _motivo text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prima jsonb;
begin
  select public.senza_contatti(to_jsonb(p)) into v_prima
    from public.profilo_stabilimento p
   where p.beach_id = _beach;

  -- Gli eventi della vecchia gestione si nascondono, non si cancellano: se
  -- la scheda torna verificata non devono ricomparire, ma restano leggibili
  -- in moderazione se qualcuno contesta una rimozione.
  update public.eventi_gestore
     set stato = 'nascosto'
   where beach_id = _beach and stato <> 'nascosto';

  -- LA RIGA NUOVA (0091): stessa sorte per le foto dello stabilimento.
  perform public.azzera_foto_gestore(_beach);

  delete from public.profilo_stabilimento where beach_id = _beach;

  if v_prima is not null then
    insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
    values ('profilo_stabilimento', _beach::text, 'azzerato', auth.uid(), v_prima,
            jsonb_build_object('motivo', nullif(btrim(coalesce(_motivo, '')), '')));
  end if;
end;
$$;

revoke all on function public.azzera_profilo_interno(uuid, text) from public;

-- ============================================================
-- DOPO L'ESECUZIONE:
--     select * from public.verifica_separazione_ranking();   -- 0 righe
-- e la prova supabase/prove/test_foto_gestore.sql.
-- ============================================================
