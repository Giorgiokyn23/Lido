-- ============================================================
-- LidoRank — 0087: profilo utente, «Da provare» e «Ci sono stato»
--
-- Dai punti 4 e 5 di Francesco. È il primo mattone del lato social: un posto
-- dove un bagnante tiene traccia dei bagni dove è stato e di quelli che
-- vorrebbe provare, senza dover scrivere una recensione per farlo.
--
-- UNA RIGA PER BAGNO, NON UNA PER LISTA. La chiave primaria è (utente,
-- bagno): un bagno sta in «da provare» OPPURE in «visitati», mai in tutte e
-- due. Così la regola «se passa fra i visitati esce da da-provare» non è
-- codice da ricordarsi di scrivere, è la forma della tabella. Con due tabelle
-- separate, o con una riga per lista, prima o poi un bagno finisce in
-- entrambe e qualcuno deve accorgersene.
--
-- IL NOME DEL PROFILO NON COMPARE MAI ACCANTO A UNA RECENSIONE. Serve alla
-- persona per riconoscere la propria area, non a firmare quello che scrive.
-- Dopo la 0085 il collegamento fra chi scrive e che cosa ha scritto non è
-- leggibile da nessun ruolo pubblico, quindi questo nome non apre nessuna
-- porta: è una decisione di prodotto sorretta da un permesso di database,
-- non da una promessa.
--
-- LE LISTE SONO PRIVATE. Nessuna policy di lettura pubblica, in nessuna
-- forma: le vede solo chi le ha fatte. Se un domani vorremo i profili
-- pubblici sarà una scelta esplicita, non una dimenticanza di oggi.
--
-- Esegui DOPO 0086. Idempotente.
-- ============================================================

-- 1) Il nome del profilo ----------------------------------------------------
alter table public.profili
  add column if not exists nome text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profili_nome_lunghezza') then
    alter table public.profili
      add constraint profili_nome_lunghezza check (coalesce(length(nome), 0) <= 60);
  end if;
end $$;

-- La 0071 non prevedeva policy di scrittura su profili, perché il RUOLO non
-- deve essere modificabile dall'utente. Il nome sì: si concede l'aggiornamento
-- della sola riga propria, e il ruolo resta protetto dal trigger qui sotto.
drop policy if exists "profili_self_update" on public.profili;
create policy "profili_self_update" on public.profili
  for update using (user_id = auth.uid())
           with check (user_id = auth.uid());

drop policy if exists "profili_self_insert" on public.profili;
create policy "profili_self_insert" on public.profili
  for insert with check (user_id = auth.uid() and ruolo = 'cittadino');

-- Senza questo, la policy appena aperta permetterebbe a chiunque di
-- promuoversi amministratore con un update del proprio profilo. È il tipo di
-- buco che si apre allargando un permesso per un motivo innocuo.
create or replace function public.profili_ruolo_immutabile()
  returns trigger
  language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.ruolo is distinct from old.ruolo then
    raise exception 'il ruolo non è modificabile dall''utente';
  end if;
  return new;
end;
$$;

drop trigger if exists profili_ruolo_immutabile_trg on public.profili;
create trigger profili_ruolo_immutabile_trg
  before update on public.profili
  for each row execute function public.profili_ruolo_immutabile();

-- 2) Le liste ---------------------------------------------------------------
create table if not exists public.liste_utente (
  user_id   uuid not null references auth.users(id) on delete cascade,
  beach_id  uuid not null references public.beaches(id) on delete cascade,
  tipo      text not null,
  creato_il timestamptz not null default now(),
  primary key (user_id, beach_id),
  constraint liste_tipo_valori check (tipo in ('da_provare', 'visitato'))
);

create index if not exists liste_utente_tipo_idx
  on public.liste_utente (user_id, tipo, creato_il desc);

alter table public.liste_utente enable row level security;

-- Solo le proprie righe, in lettura e in scrittura. Nessuna eccezione per
-- l'amministratore: queste sono abitudini personali, non contenuti da moderare.
drop policy if exists "liste_self_read" on public.liste_utente;
create policy "liste_self_read" on public.liste_utente
  for select using (user_id = auth.uid());

drop policy if exists "liste_self_insert" on public.liste_utente;
create policy "liste_self_insert" on public.liste_utente
  for insert with check (user_id = auth.uid());

drop policy if exists "liste_self_update" on public.liste_utente;
create policy "liste_self_update" on public.liste_utente
  for update using (user_id = auth.uid())
           with check (user_id = auth.uid());

drop policy if exists "liste_self_delete" on public.liste_utente;
create policy "liste_self_delete" on public.liste_utente
  for delete using (user_id = auth.uid());

-- 3) Segnare un bagno -------------------------------------------------------
-- Una funzione sola per entrambe le liste: passare da «da provare» a
-- «visitato» è un aggiornamento della stessa riga, quindi l'uscita dalla
-- prima lista è automatica e non può essere dimenticata.
create or replace function public.segna_bagno(_beach uuid, _tipo text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'accesso_richiesto';
  end if;
  if _tipo not in ('da_provare', 'visitato') then
    raise exception 'tipo_non_valido';
  end if;
  if not exists (select 1 from public.beaches b where b.id = _beach) then
    raise exception 'stabilimento_non_trovato';
  end if;

  insert into public.liste_utente (user_id, beach_id, tipo)
  values (auth.uid(), _beach, _tipo)
  on conflict (user_id, beach_id) do update
    set tipo = excluded.tipo,
        creato_il = now();
end;
$$;

revoke all on function public.segna_bagno(uuid, text) from public;
grant execute on function public.segna_bagno(uuid, text) to authenticated;

create or replace function public.togli_bagno(_beach uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'accesso_richiesto';
  end if;
  delete from public.liste_utente where user_id = auth.uid() and beach_id = _beach;
end;
$$;

revoke all on function public.togli_bagno(uuid) from public;
grant execute on function public.togli_bagno(uuid) to authenticated;

-- 4) Le mie liste, con i nomi dei bagni -------------------------------------
-- Restituisce solo le righe di chi chiama. Fa la join su beaches qui invece
-- che nel browser: è una query sola al posto di due, e la pagina del profilo
-- è l'unica che la usa.
create or replace function public.mie_liste()
  returns table (
    beach_id  uuid,
    tipo      text,
    nome      text,
    localita  text,
    regione   text,
    creato_il timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select l.beach_id, l.tipo, b.nome, b.localita, b.regione, l.creato_il
    from public.liste_utente l
    join public.beaches b on b.id = l.beach_id
   where l.user_id = auth.uid()
     and auth.uid() is not null
   order by l.creato_il desc
   limit 500;
$$;

revoke all on function public.mie_liste() from public;
grant execute on function public.mie_liste() to authenticated;

-- Lo stato di UN solo bagno, per i due pulsanti sulla scheda. La scheda è in
-- cache condivisa fra tutti i visitatori, quindi questo stato non può entrare
-- nell'HTML generato: lo chiede il browser dopo il caricamento, uno per volta.
create or replace function public.stato_bagno(_beach uuid)
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select l.tipo
    from public.liste_utente l
   where l.user_id = auth.uid() and l.beach_id = _beach and auth.uid() is not null;
$$;

revoke all on function public.stato_bagno(uuid) from public;
grant execute on function public.stato_bagno(uuid) to authenticated;

-- ============================================================
-- NOTA sul punto 5 di Francesco: «le recensioni inviate senza profilo non
-- vanno associate automaticamente a un account creato dopo». Qui non c'è
-- niente da scrivere, ed è il punto: una recensione anonima ha user_id nullo
-- e NESSUNA funzione di questo progetto lo riempie a posteriori. La garanzia
-- sta nell'assenza di quel codice, e la prova ripetibile verifica che
-- l'assenza resti tale.
-- ============================================================
