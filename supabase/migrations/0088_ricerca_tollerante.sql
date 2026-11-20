-- ============================================================
-- LidoRank — 0088: la ricerca perdona gli errori di ortografia
--
-- IL PRIMO DIFETTO, quello che ha trovato Francesco, sta nel sito e non qui:
-- la ricerca confrontava l'INTERA frase con il nome dello stabilimento, così
-- «Bagni Lido Livorno» non trovava niente perché nessun bagno si chiama così
-- — si chiama «Bagni Lido» e sta a Livorno. Quello è già corretto spezzando
-- la frase in parole.
--
-- RESTA IL SECONDO CASO: l'ortografia sbagliata. «Bagni Lidoo», «Bagno Rexx»,
-- un accento al posto sbagliato. Lì non c'è tokenizzazione che tenga, perché
-- la parola non compare da nessuna parte. Serve la somiglianza fra stringhe,
-- che PostgreSQL sa calcolare con pg_trgm: confronta i gruppi di tre lettere
-- e dice quanto due testi si assomigliano.
--
-- QUANDO SI USA, E QUANDO NO. La ricerca esatta resta la prima: è precisa e
-- veloce. La somiglianza entra in gioco SOLO quando la prima non trova
-- niente, cioè nel momento esatto in cui la persona sta per concludere che il
-- bagno non c'è. Usarla sempre sarebbe peggio: restituirebbe risultati
-- vagamente simili anche quando quelli giusti esistono.
--
-- La soglia è bassa di proposito (0.22 su 1). Chi ha già visto zero risultati
-- preferisce tre proposte di cui due sbagliate a una pagina vuota: le due
-- sbagliate le scarta con un'occhiata, la pagina vuota lo manda via.
--
-- Esegui DOPO 0087. Idempotente.
-- ============================================================

-- 1) L'estensione e gli indici -----------------------------------------------
create extension if not exists pg_trgm;

-- Senza indice, la somiglianza costringe a leggere tutta la tabella a ogni
-- ricerca a vuoto. Con decine di migliaia di schede si sentirebbe.
create index if not exists beaches_nome_trgm_idx
  on public.beaches using gin (nome gin_trgm_ops);

create index if not exists beaches_localita_trgm_idx
  on public.beaches using gin (localita gin_trgm_ops);

-- 2) I bagni che assomigliano a quello che hai scritto ----------------------
-- Restituisce le stesse colonne che l'elenco dei suggerimenti si aspetta, per
-- poterle mostrare senza una seconda query.
create or replace function public.bagni_simili(
  _q      text,
  _limite int default 6,
  _paese  text default null
)
  returns table (
    id       uuid,
    nome     text,
    localita text,
    regione  text,
    paese    text
  )
  language sql
  stable
  security definer
  set search_path = public
as $$
  select b.id, b.nome, b.localita, b.regione, b.paese
    from public.beaches b
   where length(btrim(coalesce(_q, ''))) >= 3
     and (_paese is null or b.paese = _paese)
     -- La somiglianza si misura su nome E località insieme: chi scrive
     -- «bagni lido livornoo» sbaglia la città, non il nome, e deve trovarlo
     -- lo stesso.
     and (
       similarity(b.nome, _q) > 0.22
       or similarity(b.nome || ' ' || b.localita, _q) > 0.22
       or similarity(b.localita, _q) > 0.30
     )
   order by greatest(
              similarity(b.nome, _q),
              similarity(b.nome || ' ' || b.localita, _q)
            ) desc,
            b.nome
   limit greatest(1, least(coalesce(_limite, 6), 20));
$$;

revoke all on function public.bagni_simili(text, int, text) from public;
grant execute on function public.bagni_simili(text, int, text) to anon, authenticated;

-- ============================================================
-- PROVA A MANO, nel SQL editor. Scrivi male il nome di un bagno che esiste:
--
--   select nome, localita from public.bagni_simili('bagnio lido livorno', 5);
--
-- Deve proporti qualcosa di sensato. Se non propone niente, abbassa la
-- soglia nella funzione — ma di poco: sotto 0.15 comincia a proporre
-- qualunque cosa, e un elenco di risposte a caso è peggio di nessuna
-- risposta, perché fa perdere fiducia nello strumento.
-- ============================================================
