-- ============================================================
-- LidoRank — 0071: ruolo gestore e rivendicazione delle schede
-- Fondamenta del lato gestori. Esegui DOPO 0070. Idempotente.
--
-- Principio: il ruolo NON è scrivibile dall'utente. Si ottiene solo
-- quando un amministratore approva una rivendicazione, tramite la
-- funzione security definer in fondo a questo file.
--
-- NESSUNA tabella qui tocca punteggi, pesi o classifiche: il lato
-- gestori resta separato dal calcolo del ranking.
-- ============================================================

-- 1) Profili ---------------------------------------------------------------
create table if not exists public.profili (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  ruolo     text not null default 'cittadino'
            check (ruolo in ('cittadino', 'gestore', 'admin')),
  creato_il timestamptz not null default now()
);

alter table public.profili enable row level security;

-- L'utente legge solo il proprio profilo. Non esistono policy di INSERT,
-- UPDATE o DELETE: il ruolo si assegna esclusivamente via funzione.
drop policy if exists "profili_self_read" on public.profili;
create policy "profili_self_read" on public.profili
  for select using (user_id = auth.uid());

-- 2) Chi è amministratore --------------------------------------------------
-- security definer: legge profili ignorando la RLS, evitando ricorsione.
create or replace function public.e_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.profili
    where user_id = auth.uid() and ruolo = 'admin'
  );
$$;

revoke all on function public.e_admin() from public;
grant execute on function public.e_admin() to authenticated;

-- 3) Rivendicazioni --------------------------------------------------------
create table if not exists public.rivendicazioni (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  beach_id         uuid not null references public.beaches(id) on delete cascade,
  nome             text not null,
  ruolo_dichiarato text,
  telefono         text,
  email_contatto   text,
  nota             text,
  stato            text not null default 'in_attesa'
                   check (stato in ('in_attesa', 'approvata', 'respinta')),
  motivo_rifiuto   text,
  creata_il        timestamptz not null default now(),
  decisa_il        timestamptz,
  decisa_da        uuid references auth.users(id)
);

create index if not exists rivendicazioni_user_idx
  on public.rivendicazioni (user_id, creata_il desc);
create index if not exists rivendicazioni_stato_idx
  on public.rivendicazioni (stato, creata_il desc);

-- Una sola richiesta aperta per utente e stabilimento.
create unique index if not exists rivendicazioni_una_aperta
  on public.rivendicazioni (user_id, beach_id) where stato = 'in_attesa';

-- Un solo gestore approvato per stabilimento.
create unique index if not exists rivendicazioni_un_gestore_per_bagno
  on public.rivendicazioni (beach_id) where stato = 'approvata';

alter table public.rivendicazioni enable row level security;

-- L'utente vede e crea solo le proprie richieste; non può modificarle.
drop policy if exists "riv_self_read" on public.rivendicazioni;
create policy "riv_self_read" on public.rivendicazioni
  for select using (user_id = auth.uid() or public.e_admin());

drop policy if exists "riv_self_insert" on public.rivendicazioni;
create policy "riv_self_insert" on public.rivendicazioni
  for insert with check (user_id = auth.uid() and stato = 'in_attesa');

-- 4) Gli stabilimenti che l'utente gestisce --------------------------------
create or replace function public.miei_stabilimenti()
  returns table (beach_id uuid, nome text, localita text, approvata_il timestamptz)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select r.beach_id, b.nome, b.localita, r.decisa_il
  from public.rivendicazioni r
  join public.beaches b on b.id = r.beach_id
  where r.user_id = auth.uid() and r.stato = 'approvata'
  order by b.nome;
$$;

revoke all on function public.miei_stabilimenti() from public;
grant execute on function public.miei_stabilimenti() to authenticated;

-- 5) Decisione sulla rivendicazione (solo admin) ---------------------------
create or replace function public.decidi_rivendicazione(
  _rid uuid,
  _approva boolean,
  _motivo text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.e_admin() then
    raise exception 'non_autorizzato';
  end if;

  update public.rivendicazioni
     set stato          = case when _approva then 'approvata' else 'respinta' end,
         motivo_rifiuto = case when _approva then null else _motivo end,
         decisa_il      = now(),
         decisa_da      = auth.uid()
   where id = _rid and stato = 'in_attesa'
  returning user_id into v_user;

  if v_user is null then
    raise exception 'richiesta_non_trovata';
  end if;

  -- L'approvazione promuove a gestore. Un admin resta admin.
  if _approva then
    insert into public.profili (user_id, ruolo)
    values (v_user, 'gestore')
    on conflict (user_id) do update
      set ruolo = 'gestore'
      where public.profili.ruolo <> 'admin';
  end if;
end;
$$;

revoke all on function public.decidi_rivendicazione(uuid, boolean, text) from public;
grant execute on function public.decidi_rivendicazione(uuid, boolean, text) to authenticated;

-- ============================================================
-- BOOTSTRAP — da eseguire UNA VOLTA, a mano, nel SQL editor.
-- Senza questo passaggio nessuno può approvare le rivendicazioni,
-- perché non esiste ancora un amministratore nella tabella profili.
-- Sostituisci l'indirizzo con quello con cui accedi a LidoRank:
--
--   insert into public.profili (user_id, ruolo)
--   select id, 'admin' from auth.users where email = 'tua@email.it'
--   on conflict (user_id) do update set ruolo = 'admin';
--
-- ============================================================
