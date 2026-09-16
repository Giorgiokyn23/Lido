-- ============================================================
-- LidoRank - 0055: concessioni Bagni Paolieri (Livorno) e Soleluna (Albissola)
--
--   2008L001653  ->  Bagni Paolieri, Livorno
--   2004L000676  ->  Soleluna Beach Village/Club, Albissola Marina
--
-- Come per i Bagni Fiume: se un placeholder detiene già il numero, va unito alla
-- scheda commerciale (spostando recensioni/segnalazioni ed eliminando il placeholder)
-- PRIMA di assegnare il numero — così si evita l'errore di chiave duplicata sul
-- vincolo UNIQUE(id_concessione). Se non c'è placeholder, assegna e basta.
-- Idempotente. Esegui in Supabase.
-- ============================================================

do $$
declare
  rec   record;
  _dup  uuid;
  _keep uuid;
begin
  for rec in
    select * from (values
      ('2008L001653', '%paolieri%', 'Livorno'),
      ('2004L000676', '%soleluna%', 'Albissola%')
    ) as t(numero, kw, loc)
  loop
    -- placeholder che detiene attualmente il numero (se esiste)
    select id into _dup from public.beaches where id_concessione = rec.numero limit 1;

    -- scheda commerciale con più recensioni (diversa dal placeholder)
    select b.id into _keep
    from public.beaches b
    where b.paese = 'IT'
      and (_dup is null or b.id <> _dup)
      and b.nome ilike rec.kw
      and b.localita ilike rec.loc
    order by (select count(*) from public.reviews r where r.beach_id = b.id) desc, b.created_at asc
    limit 1;

    if _keep is null then
      raise notice 'Scheda non trovata per % (kw=%, loc=%) — salto.', rec.numero, rec.kw, rec.loc;
      continue;
    end if;

    -- unisci l''eventuale placeholder e rimuovilo (libera il numero)
    if _dup is not null and _dup <> _keep then
      delete from public.reviews r
       where r.beach_id = _dup and r.user_id is not null
         and exists (select 1 from public.reviews k where k.beach_id = _keep and k.user_id = r.user_id);
      update public.reviews      set beach_id = _keep where beach_id = _dup;
      update public.segnalazioni set beach_id = _keep where beach_id = _dup;
      delete from public.beaches where id = _dup;
    end if;

    -- assegna la concessione alla scheda commerciale
    update public.beaches set id_concessione = rec.numero where id = _keep;
    raise notice 'OK %: keep=%, placeholder rimosso=%', rec.numero, _keep, _dup;
  end loop;
end $$;
