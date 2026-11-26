-- ============================================================
-- LidoRank — 0095: trovare un amico senza passare da WhatsApp
--
-- COSA C'ERA E PERCHÉ NON BASTAVA. La 0092 permetteva di cercare una persona
-- solo per soprannome esatto, dall'inizio. L'avevo scritto per una ragione
-- seria — non volevo che esistesse una rubrica sfogliabile di gente di cui
-- sappiamo dove va al mare e quando — ma il risultato pratico è che per
-- trovare qualcuno dovevi già sapere come si chiama qui, cioè te l'aveva
-- dovuto dire a voce. In pratica la funzione non si usava.
--
-- DOVE AVEVO SBAGLIATO LA MISURA. Il pericolo non è la ricerca: è la
-- rubrica. Un elenco che si sfoglia, o una ricerca che restituisce tutti
-- scrivendo due lettere, è una rubrica. Una ricerca che chiede almeno tre
-- caratteri, non elenca mai tutti e restituisce al massimo dieci risultati,
-- non lo è. E quello che si vede di una persona trovata è pochissimo:
-- soprannome, nome scelto da lei, e quanti bagni ha visitato. Le visite —
-- cioè la cronologia di dove si trovava — restano chiuse agli amici, e quella
-- è la protezione vera, che non si tocca.
--
-- Quindi si cerca anche per NOME, non solo per soprannome. E chi non vuole
-- essere trovato spegne un interruttore.
--
-- IN PIÙ, la ricerca ora dice anche che rapporto hai già con chi trovi:
-- proporre «chiedi l'amicizia» a una persona che è già tua amica, o a cui hai
-- già mandato una richiesta, è il genere di dettaglio che fa sembrare
-- l'applicazione sbadata.
--
-- Esegui DOPO 0094. Idempotente.
-- ============================================================

-- 1) Chi non vuole essere trovato ------------------------------------------
-- Predefinito: trovabile. Un profilo pubblico che non si può trovare non
-- serve a niente, e chi arriva fin qui ha appena scelto un soprannome
-- apposta per farsi aggiungere. L'interruttore c'è per chi cambia idea.
alter table public.profili
  add column if not exists trovabile boolean not null default true;

-- 2) Ricerca per soprannome o per nome --------------------------------------
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create index if not exists profili_nome_trgm_idx
  on public.profili using gin (nome gin_trgm_ops) where nome is not null;

drop function if exists public.cerca_profilo(text);
create or replace function public.cerca_profilo(_q text)
  returns table (
    handle   text,
    nome     text,
    visitati int,
    rapporto text
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  with chi as (select auth.uid() as io),
  termine as (
    select lower(unaccent(btrim(coalesce(_q, '')))) as q
  )
  select p.handle,
         p.nome,
         (select count(*)::int from public.liste_utente l
           where l.user_id = p.user_id and l.tipo = 'visitato'),
         case
           when public.sono_amici((select io from chi), p.user_id) then 'amici'
           when exists (select 1 from public.amicizie f
                         where f.richiedente = (select io from chi)
                           and f.destinatario = p.user_id and f.stato = 'in_attesa')
             then 'richiesta_inviata'
           when exists (select 1 from public.amicizie f
                         where f.richiedente = p.user_id
                           and f.destinatario = (select io from chi)
                           and f.stato = 'in_attesa')
             then 'richiesta_ricevuta'
           else 'estranei'
         end
    from public.profili p, termine t, chi
   where p.handle is not null
     and p.trovabile
     and length(t.q) >= 3
     and p.user_id <> chi.io
     and chi.io is not null
     -- Soprannome: dall'inizio, perché è un identificativo e si scrive
     -- intero. Nome: anche in mezzo, perché «Rossi» deve trovare «Anna
     -- Rossi» — ma mai a elenco, come garantisce il limite qui sotto.
     and (
       lower(p.handle) like t.q || '%'
       or lower(unaccent(coalesce(p.nome, ''))) like '%' || t.q || '%'
     )
     -- Chi mi ha bloccato non compare, e non sa di non comparire.
     and not exists (
       select 1 from public.amicizie f
        where f.stato = 'bloccata'
          and f.richiedente = p.user_id
          and f.destinatario = chi.io
     )
   order by
     -- Prima chi corrisponde esattamente, poi chi comincia così, poi il
     -- resto: chi cerca «anna» vuole Anna, non «Giovanna».
     case when lower(p.handle) = t.q or lower(unaccent(coalesce(p.nome, ''))) = t.q then 0
          when lower(p.handle) like t.q || '%' then 1
          else 2 end,
     length(coalesce(p.nome, p.handle)),
     p.handle
   limit 10;
$$;

revoke all on function public.cerca_profilo(text) from public;
grant execute on function public.cerca_profilo(text) to authenticated;

-- 3) L'interruttore, per chi vuole sparire dalla ricerca --------------------
create or replace function public.imposta_trovabile(_trovabile boolean)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'serve_accesso';
  end if;
  update public.profili set trovabile = coalesce(_trovabile, true)
   where user_id = auth.uid();
end;
$$;

revoke all on function public.imposta_trovabile(boolean) from public;
grant execute on function public.imposta_trovabile(boolean) to authenticated;

-- ============================================================
-- VERIFICA: supabase/prove/test_amici.sql, prove 17 e 20-23.
-- ============================================================
