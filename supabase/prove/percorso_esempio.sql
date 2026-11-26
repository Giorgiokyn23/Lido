-- ============================================================
-- Un primo percorso vero su Livorno, da usare nella presentazione.
--
-- NON È UNA PROVA: questo script SCRIVE, e quello che scrive resta. Si
-- esegue una volta sola, dopo la 0096. Rieseguirlo non duplica niente —
-- riscrive lo stesso percorso da capo.
--
-- COME SONO SCELTE LE TAPPE. Non sono scritte a mano: lo script cerca nel
-- database i bagni di Livorno che hanno abbastanza recensioni per essere in
-- classifica, e prende i primi tre. Così il percorso parla di posti veri, con
-- un punteggio vero dietro, e se domani la classifica cambia basta rieseguire
-- questo file per riallinearlo. Un itinerario con dentro nomi inventati si
-- riconosce subito, e in una presentazione è la cosa peggiore che possa
-- capitare.
--
-- Fra i bagni ci sono due tappe che NON sono nostre schede — il Cisternone e
-- il mercato — ed è voluto: un itinerario fatto solo dei nostri stabilimenti
-- sarebbe un catalogo di noi stessi, e nessuno lo leggerebbe.
-- ============================================================

do $$
declare
  v_admin uuid;
  v_pid   uuid;
  v_bagni uuid[];
  v_n     int;
begin
  select user_id into v_admin from public.profili where ruolo = 'admin' limit 1;

  -- I primi tre di Livorno che sono davvero in classifica.
  select array_agg(id order by rank_comune)
    into v_bagni
    from (
      select id, rank_comune
        from public.beach_rankings
       where localita = 'Livorno'
         and reviews_count >= 10
       order by rank_comune
       limit 3
    ) z;

  if v_bagni is null or array_length(v_bagni, 1) < 2 then
    raise exception 'Servono almeno due stabilimenti di Livorno in classifica: trovati %',
      coalesce(array_length(v_bagni, 1), 0);
  end if;

  insert into public.percorsi (
    slug, titolo, sottotitolo, descrizione, tema, localita,
    durata_ore, periodo, stato, creato_da
  )
  values (
    'livorno-mare-e-acqua',
    'Livorno fra il mare e l''acqua dolce',
    'Una giornata lungo la costa livornese, dai bagni storici alle cisterne che hanno dato da bere alla città.',
    E'Livorno è una città che si è costruita intorno all''acqua due volte: quella salata del porto e dei bagni, e quella dolce che arriva dall''acquedotto ottocentesco.\n\n'
    'Questo percorso le mette in fila in una giornata sola. Si comincia dal mare la mattina presto, quando gli stabilimenti aprono e la luce è ancora bassa, si risale in città nelle ore calde, e si torna verso la costa per il tramonto.\n\n'
    'Le tappe negli stabilimenti sono scelte fra quelli meglio giudicati dai bagnanti su LidoRank — non fra quelli che hanno pagato, perché non esiste modo di pagare per entrarci.',
    'mare',
    'Livorno',
    7,
    'Da maggio a settembre; le tappe in città tutto l''anno.',
    'pubblicato',
    v_admin
  )
  on conflict (slug) do update
    set titolo = excluded.titolo,
        sottotitolo = excluded.sottotitolo,
        descrizione = excluded.descrizione,
        stato = 'pubblicato'
  returning id into v_pid;

  -- Si riscrivono tutte: più semplice e più sicuro che cercare di aggiornarle
  -- una per una, e le tappe non hanno niente da conservare.
  delete from public.percorso_tappe where percorso_id = v_pid;

  insert into public.percorso_tappe (percorso_id, ordine, beach_id, durata_min)
  values (v_pid, 1, v_bagni[1], 120);

  insert into public.percorso_tappe (percorso_id, ordine, titolo, nota, durata_min)
  values (v_pid, 2, 'Il Cisternone',
          'La cisterna monumentale dell''acquedotto di Colognole, aperta al pubblico. Dieci minuti a piedi dal centro, e un salto di temperatura che a luglio si apprezza.',
          45);

  insert into public.percorso_tappe (percorso_id, ordine, beach_id, durata_min)
  values (v_pid, 3, v_bagni[2], 120);

  insert into public.percorso_tappe (percorso_id, ordine, titolo, nota, durata_min)
  values (v_pid, 4, 'Mercato Centrale',
          'Pesce, cacciucco e banchi storici sotto una struttura in ghisa di fine Ottocento. Chiude nel primo pomeriggio.',
          60);

  if array_length(v_bagni, 1) >= 3 then
    insert into public.percorso_tappe (percorso_id, ordine, beach_id, durata_min)
    values (v_pid, 5, v_bagni[3], 90);
  end if;

  select count(*) into v_n from public.percorso_tappe where percorso_id = v_pid;

  raise notice 'Percorso creato: /percorsi/livorno-mare-e-acqua — % tappe, % stabilimenti veri',
    v_n, array_length(v_bagni, 1);
end $$;

-- Controllo: deve stampare il percorso con le sue tappe in ordine.
select ordine, coalesce(tappa_titolo, '—') as tappa, bagno_localita, durata_min
  from public.percorso_con_tappe('livorno-mare-e-acqua')
 order by ordine;
