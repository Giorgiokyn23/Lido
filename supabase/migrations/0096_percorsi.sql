-- ============================================================
-- LidoRank — 0096: i percorsi lungo la costa
--
-- DA DOVE NASCE. Francesco vuole una sezione «Experiences»: itinerari sulla
-- costa, pensati anche per i croceristi che sbarcano a Livorno, con gli
-- stabilimenti come tappe. Nel prototipo quella sezione è fatta di PDF da
-- caricare.
--
-- PERCHÉ NON IL PDF. Un allegato non si cerca, non si modera, non si apre
-- volentieri da telefono, e soprattutto non si collega a niente: resta un
-- file morto accanto al prodotto. Un percorso fatto di dati invece si cerca,
-- ogni tappa porta alla scheda vera del bagno, e — questa è la parte che
-- conta per noi — ogni scheda può dire «questo stabilimento è tappa di due
-- percorsi». Che è l'argomento migliore che abbiamo per convincere un
-- gestore a rivendicare la propria pagina. Il PDF, se serve, si genera da
-- qui; il contrario non si può fare.
--
-- E L'IDEA SOTTO È CONFERMATA DA FUORI. Sul sito della Biennale del Mare di
-- Livorno, nel filtro «per luogo» del programma, fra l'Acquario e
-- l'Accademia Navale compaiono i Bagni Nettuno e i Bagni Tirreno. Uno
-- stabilimento è già una tappa nel programma culturale di una città: noi
-- abbiamo l'elenco completo di quelle tappe e nessun altro ce l'ha.
--
-- TRE DECISIONI.
--
-- 1. UNA TAPPA NON È PER FORZA UN BAGNO. Un itinerario vero passa dal
--    Cisternone, dal mercato, da un museo. Se le tappe potessero essere solo
--    le nostre schede, i percorsi sarebbero cataloghi di noi stessi e
--    nessuno li leggerebbe. Quindi una tappa ha o un `beach_id`, o un titolo
--    libero — mai tutti e due, mai nessuno dei due.
--
-- 2. I PERCORSI LI SCRIVE L'AMMINISTRAZIONE, non i gestori. Un itinerario
--    coinvolge le attività di altri: lasciarlo comporre a un bagnino
--    significherebbe lasciargli decidere chi mettere e chi no, e trasformare
--    i percorsi in un favore da chiedere. Resta una cosa redazionale.
--
-- 3. NON TOCCANO IL PUNTEGGIO. Essere tappa di un percorso non fa salire
--    nessuno in classifica: sarebbe una posizione assegnata a tavolino, cioè
--    esattamente quello che il progetto rifiuta. Il controllo di separazione
--    lo verifica.
--
-- Esegui DOPO 0095. Idempotente.
-- ============================================================

-- 1) Il percorso -------------------------------------------------------------
create table if not exists public.percorsi (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  titolo        text not null,
  sottotitolo   text,
  descrizione   text,
  tema          text,
  localita      text,
  durata_ore    numeric(4, 1),
  periodo       text,
  foto_percorso text,
  stato         text not null default 'bozza',
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  creato_da     uuid references auth.users(id) on delete set null,
  constraint percorsi_stato_valori check (stato in ('bozza', 'pubblicato', 'archiviato')),
  constraint percorsi_slug_forma check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint percorsi_tema_valori check (
    tema is null or tema in ('mare', 'cultura', 'sapori', 'sport', 'natura', 'famiglie')
  )
);

create index if not exists percorsi_pubblici_idx
  on public.percorsi (localita, titolo) where stato = 'pubblicato';

-- 2) Le tappe ---------------------------------------------------------------
create table if not exists public.percorso_tappe (
  percorso_id uuid not null references public.percorsi(id) on delete cascade,
  ordine      int  not null,
  -- Se la tappa è una nostra scheda si cancella con lei: una tappa che punta
  -- a un bagno sparito è un collegamento rotto dentro un itinerario.
  beach_id    uuid references public.beaches(id) on delete cascade,
  titolo      text,
  nota        text,
  durata_min  int,
  primary key (percorso_id, ordine),
  constraint tappe_ordine_positivo check (ordine >= 1),
  -- O una scheda nostra, o un luogo descritto a mano. Mai entrambi: due nomi
  -- per la stessa tappa diventano due nomi diversi appena uno dei due cambia.
  constraint tappe_bagno_oppure_luogo check (
    (beach_id is not null and titolo is null)
    or (beach_id is null and titolo is not null)
  )
);

create index if not exists tappe_beach_idx on public.percorso_tappe (beach_id)
  where beach_id is not null;

alter table public.percorsi enable row level security;
alter table public.percorso_tappe enable row level security;

-- Lettura pubblica solo di quelli pubblicati; l'amministratore vede anche le
-- bozze, altrimenti non potrebbe rileggerle prima di pubblicare.
drop policy if exists "percorsi_lettura" on public.percorsi;
create policy "percorsi_lettura" on public.percorsi
  for select using (stato = 'pubblicato' or public.e_admin());

drop policy if exists "percorsi_scrittura" on public.percorsi;
create policy "percorsi_scrittura" on public.percorsi
  for all using (public.e_admin()) with check (public.e_admin());

drop policy if exists "tappe_lettura" on public.percorso_tappe;
create policy "tappe_lettura" on public.percorso_tappe
  for select using (
    exists (
      select 1 from public.percorsi p
       where p.id = percorso_id and (p.stato = 'pubblicato' or public.e_admin())
    )
  );

drop policy if exists "tappe_scrittura" on public.percorso_tappe;
create policy "tappe_scrittura" on public.percorso_tappe
  for all using (public.e_admin()) with check (public.e_admin());

revoke all on public.percorsi from anon, authenticated;
revoke all on public.percorso_tappe from anon, authenticated;
grant select on public.percorsi to anon, authenticated;
grant select on public.percorso_tappe to anon, authenticated;
grant insert, update, delete on public.percorsi to authenticated;
grant insert, update, delete on public.percorso_tappe to authenticated;

-- 3) L'elenco pubblico ------------------------------------------------------
create or replace function public.percorsi_pubblici(_localita text default null)
  returns table (
    slug          text,
    titolo        text,
    sottotitolo   text,
    tema          text,
    localita      text,
    durata_ore    numeric,
    periodo       text,
    foto_percorso text,
    tappe         int,
    bagni         int
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.slug, p.titolo, p.sottotitolo, p.tema, p.localita, p.durata_ore,
         p.periodo, p.foto_percorso,
         (select count(*)::int from public.percorso_tappe t where t.percorso_id = p.id),
         (select count(*)::int from public.percorso_tappe t
           where t.percorso_id = p.id and t.beach_id is not null)
    from public.percorsi p
   where p.stato = 'pubblicato'
     and (_localita is null or p.localita = _localita)
   order by p.localita nulls last, p.titolo;
$$;

revoke all on function public.percorsi_pubblici(text) from public;
grant execute on function public.percorsi_pubblici(text) to anon, authenticated;

-- 4) Un percorso con le sue tappe -------------------------------------------
-- Una chiamata sola: il nome del bagno, la località e se la scheda è
-- verificata arrivano già uniti, così la pagina non deve fare una query per
-- tappa. Per le tappe che non sono nostre, `beach_id` è nullo e vale il
-- titolo scritto a mano.
create or replace function public.percorso_con_tappe(_slug text)
  returns table (
    titolo       text,
    sottotitolo  text,
    descrizione  text,
    tema         text,
    localita     text,
    durata_ore   numeric,
    periodo      text,
    foto_percorso text,
    ordine       int,
    beach_id     uuid,
    tappa_titolo text,
    nota         text,
    durata_min   int,
    bagno_nome   text,
    bagno_localita text,
    bagno_foto   text
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.titolo, p.sottotitolo, p.descrizione, p.tema, p.localita,
         p.durata_ore, p.periodo, p.foto_percorso,
         t.ordine, t.beach_id,
         coalesce(t.titolo, b.nome) as tappa_titolo,
         t.nota, t.durata_min,
         b.nome, b.localita,
         (select f.percorso from public.foto f
           where f.beach_id = b.id and f.stato = 'pubblicata'
           order by f.creato_il desc limit 1)
    from public.percorsi p
    left join public.percorso_tappe t on t.percorso_id = p.id
    left join public.beaches b on b.id = t.beach_id
   where p.slug = lower(btrim(_slug))
     and p.stato = 'pubblicato'
   order by t.ordine nulls first;
$$;

revoke all on function public.percorso_con_tappe(text) from public;
grant execute on function public.percorso_con_tappe(text) to anon, authenticated;

-- 5) I percorsi che passano da un bagno -------------------------------------
-- È la funzione che serve a noi più di tutte: su una scheda non rivendicata,
-- «questo stabilimento è tappa di 2 percorsi» è l'argomento migliore che
-- abbiamo per convincere il gestore a rivendicarla.
create or replace function public.percorsi_del_bagno(_beach uuid)
  returns table (slug text, titolo text, tema text, ordine int, tappe int)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select p.slug, p.titolo, p.tema, t.ordine,
         (select count(*)::int from public.percorso_tappe x where x.percorso_id = p.id)
    from public.percorso_tappe t
    join public.percorsi p on p.id = t.percorso_id
   where t.beach_id = _beach
     and p.stato = 'pubblicato'
   order by p.titolo;
$$;

revoke all on function public.percorsi_del_bagno(uuid) from public;
grant execute on function public.percorsi_del_bagno(uuid) to anon, authenticated;

-- 6) La data di modifica si aggiorna da sola --------------------------------
create or replace function public.percorsi_tocca()
  returns trigger
  language plpgsql
as $$
begin
  new.aggiornato_il := now();
  return new;
end;
$$;

drop trigger if exists percorsi_tocca_trg on public.percorsi;
create trigger percorsi_tocca_trg
  before update on public.percorsi
  for each row execute function public.percorsi_tocca();

-- 7) I percorsi non entrano nel ranking -------------------------------------
create or replace function public.verifica_separazione_ranking()
  returns table (oggetto text, problema text)
  language sql
  stable
as $$
  with definizioni as (
    select c.relname::text as nome, pg_get_viewdef(c.oid) as corpo
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
    union all
    select p.proname::text, pg_get_functiondef(p.oid)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  ),
  vietati(parola) as (
    values ('rivendicazioni'), ('profile_status'), ('partner'),
           ('entitlement'), ('abbonament'), ('membership'), ('fonte'),
           ('eventi_gestore'), ('calendario_eventi'),
           ('profilo_stabilimento'), ('gruppi'), ('crocier'), ('esperienze'),
           ('specializzazion'), ('music'), ('abbonato'),
           ('public.foto'), ('storage.'),
           ('amicizie'), ('liste_utente'), ('handle'),
           ('percors'), ('tappe')
  )
  select d.nome, 'riferimento vietato: ' || v.parola
    from definizioni d
    cross join vietati v
   where (d.nome ilike '%rank%' or d.nome ilike '%score%')
     and d.nome <> 'verifica_separazione_ranking'
     and d.corpo ilike '%' || v.parola || '%';
$$;

-- ============================================================
-- DOPO L'ESECUZIONE: supabase/prove/test_percorsi.sql.
-- Per creare il primo percorso c'è supabase/prove/percorso_esempio.sql,
-- che ne scrive uno vero su Livorno da usare nella presentazione.
-- ============================================================
