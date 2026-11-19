-- ============================================================
-- LidoRank — 0085: le recensioni diventano anonime davvero
--
-- IL PROBLEMA, IN UNA RIGA. Dalla migrazione 0001 la policy di lettura è
-- `reviews_read ... using (true)`: chiunque può leggere tutta la tabella,
-- colonne comprese. E la chiave anonima non è un segreto — è
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, spedita nel browser di ogni visitatore.
-- Quindi oggi chiunque può chiedere user_id e ip_hash di ogni recensione.
--
-- Il sito promette l'opposto, in tre punti diversi: «le recensioni sono
-- anonime», «il nome non appare accanto alle recensioni», «sulla pagina del
-- bagno la recensione resta anonima». Quella promessa oggi la mantiene solo
-- il sito perché sceglie di non mostrare il dato. Il database no.
--
-- Finché le recensioni con account sono quattro il danno è teorico. Con il
-- profilo utente — account diffusi, user_id popolato quasi ovunque, nome ed
-- email nel profilo — collegare autori e recensioni diventerebbe una query.
-- Per questo si chiude PRIMA di costruirci sopra, non dopo.
--
-- COME SI CHIUDE. La RLS lavora sulle righe, non sulle colonne: per togliere
-- due colonne servono i privilegi di colonna. In Supabase i ruoli anon e
-- authenticated hanno un GRANT SELECT su tutta la tabella, e un privilegio di
-- tabella copre ogni colonna: revocare la singola colonna non avrebbe effetto.
-- Quindi si revoca il permesso sulla tabella e si concede, colonna per
-- colonna, tutto tranne user_id e ip_hash.
--
-- Le liste di colonne si costruiscono da information_schema invece che a
-- mano: reviews ha decine di colonne aggiunte in venti migrazioni diverse, e
-- un elenco scritto a mano sarebbe sbagliato il giorno dopo.
--
-- ATTENZIONE PER IL FUTURO: una colonna aggiunta a reviews DOPO questa
-- migrazione non sarà leggibile da anon e non comparirà nella vista finché
-- non si riesegue questo file. È voluto: il valore predefinito diventa
-- «privato», e si apre solo di proposito.
--
-- Esegui DOPO 0084. Idempotente.
-- ============================================================

-- 1) Una funzione che rifà vista e permessi ---------------------------------
-- Sta in una funzione perché va rieseguita OGNI VOLTA che reviews cambia
-- forma. Le migrazioni che aggiungono una colonna alle recensioni la
-- chiamano in coda: così non esiste il caso «ho aggiunto una colonna e il
-- sito non la vede», che è il modo tipico in cui una protezione di questo
-- genere viene disattivata per sbaglio sei mesi dopo.
create or replace function public.ricostruisci_vista_recensioni()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'reviews'
     and column_name not in ('user_id', 'ip_hash');

  if v_cols is null then
    raise exception 'tabella reviews non trovata';
  end if;

  -- drop e create invece di «create or replace»: quest'ultimo rifiuta
  -- qualunque cambio nell'elenco delle colonne, che è proprio ciò che
  -- succede quando la tabella cresce.
  execute 'drop view if exists public.recensioni_pubbliche';
  execute format(
    'create view public.recensioni_pubbliche as select %s from public.reviews', v_cols
  );
  execute 'grant select on public.recensioni_pubbliche to anon, authenticated';

  -- Prima si toglie il permesso sull'intera tabella, poi si ridà colonna per
  -- colonna. L'ordine conta: finché esiste il GRANT di tabella, il privilegio
  -- di colonna è ininfluente.
  execute 'revoke select on public.reviews from anon, authenticated';
  execute format('grant select (%s) on public.reviews to anon, authenticated', v_cols);
end;
$$;

revoke all on function public.ricostruisci_vista_recensioni() from public;

-- 2) Applicata subito --------------------------------------------------------
select public.ricostruisci_vista_recensioni();

-- Le scritture non cambiano: le recensioni entrano solo da submit_review(),
-- che è security definer e gira con i privilegi del proprietario.

-- 3) Le proprie recensioni, per il profilo utente ---------------------------
-- Serve una funzione e non una query: dopo il punto 2 nemmeno il proprietario
-- può filtrare su user_id, perché in PostgreSQL per usare una colonna in un
-- WHERE serve il permesso di lettura su quella colonna. La funzione gira come
-- proprietario e restituisce soltanto le righe di chi la chiama.
create or replace function public.mie_recensioni()
  returns table (
    id uuid,
    beach_id uuid,
    stato text,
    commento text,
    visita_periodo text,   -- è text, non date: la 0036 la definisce così
    created_at timestamptz
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select r.id, r.beach_id, r.stato, r.commento, r.visita_periodo, r.created_at
    from public.reviews r
   where r.user_id = auth.uid()
     and auth.uid() is not null
   order by r.created_at desc
   limit 200;
$$;

revoke all on function public.mie_recensioni() from public;
grant execute on function public.mie_recensioni() to authenticated;

-- 4) La vista completa, per il solo amministratore --------------------------
-- La pagina /admin leggeva user_id e ip_hash con la chiave anonima: dopo il
-- punto 2 non può più, ed è giusto così. Qui passa da una funzione che
-- controlla il ruolo.
create or replace function public.recensioni_admin(_limite int default 50000)
  returns table (
    id uuid,
    beach_id uuid,
    user_id uuid,
    ip_hash text,
    stato text,
    peso numeric,
    commento text,
    created_at timestamptz
  )
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  return query
    select r.id, r.beach_id, r.user_id, r.ip_hash, r.stato, r.peso::numeric,
           r.commento, r.created_at
      from public.reviews r
     order by r.created_at desc
     limit greatest(1, least(_limite, 50000));
end;
$$;

revoke all on function public.recensioni_admin(int) from public;
grant execute on function public.recensioni_admin(int) to authenticated;

-- ============================================================
-- VERIFICA, dal SQL editor:
--
--   -- deve dare «permission denied for column user_id»
--   set role anon;
--   select user_id from public.reviews limit 1;
--   reset role;
--
--   -- e questa deve funzionare
--   set role anon;
--   select count(*) from public.recensioni_pubbliche;
--   reset role;
-- ============================================================
