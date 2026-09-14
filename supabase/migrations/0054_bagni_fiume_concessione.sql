-- ============================================================
-- LidoRank - 0054: Bagni Fiume (Livorno) — unione col placeholder di concessione
--
-- Nel DB esistevano DUE schede dello stesso stabilimento:
--   - un placeholder (nome generico) CON id_concessione = 2015L004364, senza/quasi
--     recensioni;
--   - la scheda "Bagni Fiume" con TANTE recensioni ma SENZA concessione.
-- Un semplice UPDATE falliva per il vincolo UNIQUE su id_concessione (già usato
-- dal placeholder). Qui uniamo correttamente: spostiamo le recensioni/segnalazioni
-- dal placeholder ai Bagni Fiume, ELIMINIAMO il placeholder (così libera il numero)
-- e infine assegniamo la concessione ai Bagni Fiume. Ordine e transazione garantiti.
-- Idempotente. Esegui in Supabase.
-- ============================================================

do $$
declare
  _dup  uuid;
  _keep uuid;
begin
  -- placeholder = la riga che oggi detiene quel numero di concessione
  select id into _dup from public.beaches where id_concessione = '2015L004364' limit 1;

  -- keep = la scheda "Bagni Fiume" a Livorno con più recensioni (diversa dal placeholder)
  select b.id into _keep
  from public.beaches b
  where b.paese = 'IT'
    and (_dup is null or b.id <> _dup)
    and (lower(btrim(b.nome)) = 'bagni fiume' or b.nome ilike '%bagni fiume%')
    and b.localita ilike 'Livorno'
  order by (select count(*) from public.reviews r where r.beach_id = b.id) desc, b.created_at asc
  limit 1;

  if _keep is null then
    raise notice 'Scheda "Bagni Fiume" non trovata a Livorno: nulla da fare.';
    return;
  end if;

  -- se il placeholder esiste ed è un''altra riga: unisci e rimuovilo
  if _dup is not null and _dup <> _keep then
    -- evita conflitto "una recensione per utente per bagno"
    delete from public.reviews r
     where r.beach_id = _dup and r.user_id is not null
       and exists (select 1 from public.reviews k where k.beach_id = _keep and k.user_id = r.user_id);
    -- sposta recensioni e segnalazioni residue sul keep
    update public.reviews      set beach_id = _keep where beach_id = _dup;
    update public.segnalazioni set beach_id = _keep where beach_id = _dup;
    -- elimina il placeholder → libera il numero di concessione
    delete from public.beaches where id = _dup;
  end if;

  -- assegna la concessione alla scheda con le recensioni
  update public.beaches set id_concessione = '2015L004364' where id = _keep;

  raise notice 'Bagni Fiume unificati: keep=%, placeholder rimosso=%', _keep, _dup;
end $$;
