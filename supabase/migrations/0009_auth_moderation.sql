-- ============================================================
-- Lido - 0009: autenticazione, verifica recensioni, anti-frode
-- Esegui DOPO 0008. Idempotente.
-- ============================================================

-- 1) Campi anti-frode sulle recensioni --------------------------------------
alter table public.reviews
  add column if not exists verified  boolean not null default false,  -- true = utente autenticato
  add column if not exists ip_hash   text,                            -- hash (con salt) per rate-limit
  add column if not exists segnalata integer not null default 0;       -- flag di sospetta falsità

-- una sola recensione per utente autenticato per bagno (gli anonimi restano possibili)
create unique index if not exists reviews_one_per_user_beach
  on public.reviews (user_id, beach_id) where user_id is not null;

create index if not exists reviews_iphash_idx on public.reviews (ip_hash, created_at desc);

-- 2) RLS recensioni: anon puo' inserire solo anonime; autenticato solo a suo nome
drop policy if exists "reviews_write" on public.reviews;
create policy "reviews_write" on public.reviews
  for insert
  with check ( user_id is null or user_id = auth.uid() );

-- 3) Segnalazione recensione falsa: funzione RPC (incrementa contatore) -------
--    Chiamabile da anon senza dare permessi di UPDATE diretti sulla tabella.
create or replace function public.flag_review(rid uuid)
  returns void
  language sql
  security definer
  set search_path = public
as $$
  update public.reviews set segnalata = segnalata + 1 where id = rid;
$$;

revoke all on function public.flag_review(uuid) from public;
grant execute on function public.flag_review(uuid) to anon, authenticated;
