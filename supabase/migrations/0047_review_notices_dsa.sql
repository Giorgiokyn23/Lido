-- ============================================================
-- LidoRank - 0047: segnalazione di una RECENSIONE come contenuto illecito (DSA art. 16)
--
-- Il DSA (artt. 14/16/17) riguarda il CONTENUTO ospitato sulla piattaforma, cioè
-- le recensioni. Questa tabella raccoglie una segnalazione "sufficientemente
-- motivata": motivo dell'illiceità, spiegazione, contatto (facoltativo) del
-- segnalante e dichiarazione di buona fede. Quando il segnalante lascia l'email,
-- potremo inviargli conferma di ricezione e comunicazione della decisione
-- (artt. 16/17) — l'invio email arriverà col collegamento SMTP (Resend).
--
-- NB: è cosa diversa dalla "segnalazione illeciti" del bagno (tabella
-- public.segnalazioni), che riguarda la condotta reale dello stabilimento e NON
-- è governata dall'art. 16 DSA.
--
-- Idempotente. Esegui in Supabase.
-- ============================================================

create table if not exists public.review_notices (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references public.reviews(id) on delete cascade,
  motivo           text not null,                      -- categoria di illiceità
  spiegazione      text,                               -- perché è illecita (art. 16)
  email_segnalante text,                               -- facoltativa: conferma/decisione (artt. 16/17)
  buona_fede       boolean not null default false,     -- dichiarazione di buona fede (art. 16)
  stato            text not null default 'ricevuta'
                     check (stato in ('ricevuta','in_revisione','accolta','respinta')),
  decisione        text,                               -- motivazione della decisione (art. 17)
  created_at       timestamptz not null default now(),
  decided_at       timestamptz
);

create index if not exists review_notices_review_idx on public.review_notices (review_id);
create index if not exists review_notices_stato_idx  on public.review_notices (stato);

-- RLS: come per le segnalazioni, nessuna lettura con chiave anon.
-- L'inserimento avviene solo tramite la RPC security-definer qui sotto.
alter table public.review_notices enable row level security;

-- RPC: registra la segnalazione (art. 16) e applica la quarantena automatica
-- alla terza segnalazione, esattamente come flag_review. Richiede la
-- dichiarazione di buona fede e un motivo.
create or replace function public.submit_review_notice(
  _rid uuid, _motivo text, _spiegazione text, _email text, _buonafede boolean
) returns uuid
  language plpgsql security definer set search_path = public
as $$
declare _uid uuid := auth.uid(); _id uuid; _c int;
begin
  if _rid is null then raise exception 'review_missing'; end if;
  if coalesce(_buonafede, false) = false then raise exception 'good_faith_required'; end if;
  if _motivo is null or length(btrim(_motivo)) = 0 then raise exception 'reason_required'; end if;

  insert into public.review_notices(review_id, motivo, spiegazione, email_segnalante, buona_fede)
    values (_rid, btrim(_motivo), nullif(btrim(_spiegazione),''), nullif(btrim(_email),''), true)
    returning id into _id;

  -- contabilizza come flag (dedup per utente autenticato) e quarantena a soglia 3
  if _uid is not null then
    insert into public.review_flags(review_id, flagger_uid) values (_rid, _uid) on conflict do nothing;
    if not found then
      return _id; -- questo utente aveva già flaggato: la notice resta, ma non ricontiamo il flag
    end if;
  else
    insert into public.review_flags(review_id, flagger_uid) values (_rid, null);
  end if;

  update public.reviews set flags_count = flags_count + 1, segnalata = segnalata + 1
   where id = _rid
   returning flags_count into _c;

  if _c >= 3 then
    update public.reviews set stato = 'shadow', peso = 0 where id = _rid and stato <> 'rifiutata';
  end if;

  return _id;
end $$;

revoke all on function public.submit_review_notice(uuid,text,text,text,boolean) from public;
grant execute on function public.submit_review_notice(uuid,text,text,text,boolean) to anon, authenticated;
