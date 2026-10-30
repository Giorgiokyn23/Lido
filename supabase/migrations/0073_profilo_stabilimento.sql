-- ============================================================
-- LidoRank — 0073: profilo pubblico curato dal gestore (gratuito)
--
-- Primo pezzo del prodotto gratuito: chi ha rivendicato la scheda può
-- descriverla e tenerne aggiornati contatti e orari. È il "premio" che
-- giustifica la rivendica e alimenta i dati.
--
-- REGOLA: nulla di qui entra nel punteggio o nella classifica. Sono dati
-- descrittivi dichiarati dal gestore, non valutazioni.
--
-- Esegui DOPO 0072. Idempotente.
-- ============================================================

-- 1) Chi è il gestore approvato di una scheda --------------------------------
create or replace function public.e_gestore_di(_beach uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.rivendicazioni
     where beach_id = _beach
       and user_id = auth.uid()
       and stato = 'approvata'
  );
$$;

revoke all on function public.e_gestore_di(uuid) from public;
-- Anche ad anon: la funzione compare in una policy di SELECT, che Postgres
-- valuta per QUALUNQUE ruolo legga la tabella. Senza questo grant la lettura
-- pubblica del profilo fallisce con "permission denied for function".
-- È sicura: per un utente non autenticato auth.uid() è null e restituisce false.
grant execute on function public.e_gestore_di(uuid) to anon, authenticated;

-- Stesso motivo per e_admin (la 0071 la concedeva solo a authenticated, ma
-- compare nelle policy di SELECT di rivendicazioni ed eventi_audit).
grant execute on function public.e_admin() to anon;

-- 2) Il profilo -------------------------------------------------------------
create table if not exists public.profilo_stabilimento (
  beach_id          uuid primary key references public.beaches(id) on delete cascade,
  descrizione       text,
  orari             text,
  telefono          text,
  email_pubblica    text,
  sito              text,
  link_prenotazione text,
  aggiornato_il     timestamptz not null default now(),
  aggiornato_da     uuid references auth.users(id),
  constraint profilo_lunghezze check (
    coalesce(length(descrizione), 0)       <= 2000 and
    coalesce(length(orari), 0)             <= 500  and
    coalesce(length(telefono), 0)          <= 40   and
    coalesce(length(email_pubblica), 0)    <= 200  and
    coalesce(length(sito), 0)              <= 300  and
    coalesce(length(link_prenotazione), 0) <= 300
  )
);

alter table public.profilo_stabilimento enable row level security;

-- Lettura pubblica SOLO se la scheda è verificata: se la rivendica viene
-- revocata o sospesa, il profilo sparisce dal sito senza cancellare nulla.
drop policy if exists "profilo_public_read" on public.profilo_stabilimento;
create policy "profilo_public_read" on public.profilo_stabilimento
  for select using (
    exists (
      select 1 from public.beaches b
       where b.id = beach_id and b.profile_status = 'verificato'
    )
  );

-- Scrittura: solo il gestore approvato di quella scheda.
drop policy if exists "profilo_gestore_insert" on public.profilo_stabilimento;
create policy "profilo_gestore_insert" on public.profilo_stabilimento
  for insert with check (public.e_gestore_di(beach_id));

drop policy if exists "profilo_gestore_update" on public.profilo_stabilimento;
create policy "profilo_gestore_update" on public.profilo_stabilimento
  for update using (public.e_gestore_di(beach_id))
           with check (public.e_gestore_di(beach_id));

-- Il gestore vede sempre il proprio profilo, anche se non ancora pubblico.
drop policy if exists "profilo_gestore_read" on public.profilo_stabilimento;
create policy "profilo_gestore_read" on public.profilo_stabilimento
  for select using (public.e_gestore_di(beach_id));

-- 3) Tracciamento delle modifiche ------------------------------------------
create or replace function public.profilo_audit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  new.aggiornato_il := now();
  new.aggiornato_da := auth.uid();

  insert into public.eventi_audit (entita, entita_id, azione, attore, prima, dopo)
  values ('profilo_stabilimento', new.beach_id::text,
          case when tg_op = 'INSERT' then 'creato' else 'modificato' end,
          auth.uid(),
          case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
          to_jsonb(new));

  return new;
end;
$$;

drop trigger if exists profilo_stabilimento_audit on public.profilo_stabilimento;
create trigger profilo_stabilimento_audit
  before insert or update on public.profilo_stabilimento
  for each row execute function public.profilo_audit();

-- ============================================================
-- NOTA
-- profilo_stabilimento NON deve comparire in nessuna vista o funzione di
-- ranking. Dopo questa migrazione il controllo deve restare a zero righe:
--     select * from public.verifica_separazione_ranking();
-- ============================================================
