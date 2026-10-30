-- ============================================================
-- LidoRank — 0074: unifica le schede doppie "Single Fin" a Livorno
--
-- Due card per lo stesso stabilimento. Si tiene la scheda con più recensioni
-- valide (a parità, quella con numero di concessione, poi la più vecchia) e vi
-- si spostano recensioni, segnalazioni, rivendicazioni e profilo. Le concessioni
-- della scheda eliminata vengono conservate in beaches.altre_concessioni.
--
-- Non usa ID fissi: trova le righe per nome e località, quindi è sicura anche
-- se gli UUID sono diversi dal previsto. Idempotente: se resta una sola scheda
-- non fa nulla. Esegui DOPO 0073.
--
-- ANTEPRIMA (esegui PRIMA, per vedere che cosa verrà unito):
--   select b.id, b.nome, b.localita, b.id_concessione,
--          (select count(*) from public.reviews r where r.beach_id = b.id) as recensioni
--     from public.beaches b
--    where b.paese = 'IT' and b.localita ilike '%livorno%'
--      and b.nome ilike '%single fin%'
--    order by recensioni desc;
-- ============================================================

do $$
declare
  v_tiene  uuid;
  v_altri  uuid[];
  v_sids   text[];
  v_quanti int;
begin
  -- 1) Le schede candidate
  select count(*) into v_quanti
    from public.beaches
   where paese = 'IT' and localita ilike '%livorno%' and nome ilike '%single fin%';

  if v_quanti < 2 then
    raise notice '0074: trovate % schede "Single Fin" a Livorno: niente da unire.', v_quanti;
    return;
  end if;

  -- 2) Quale si tiene: più recensioni, poi con concessione, poi la più vecchia
  select b.id into v_tiene
    from public.beaches b
   where b.paese = 'IT' and b.localita ilike '%livorno%' and b.nome ilike '%single fin%'
   order by (select count(*) from public.reviews r where r.beach_id = b.id) desc,
            (b.id_concessione is not null) desc,
            b.created_at asc
   limit 1;

  -- 3) Le altre
  select array_agg(b.id), array_agg(b.id_concessione) filter (where b.id_concessione is not null)
    into v_altri, v_sids
    from public.beaches b
   where b.paese = 'IT' and b.localita ilike '%livorno%' and b.nome ilike '%single fin%'
     and b.id <> v_tiene;

  raise notice '0074: tengo %, unisco % schede.', v_tiene, array_length(v_altri, 1);

  -- 4) Conserva i numeri di concessione delle schede che spariscono
  if v_sids is not null and array_length(v_sids, 1) > 0 then
    update public.beaches
       set altre_concessioni = (
             select array(select distinct e
                            from unnest(coalesce(altre_concessioni, '{}') || v_sids) e
                           order by e)
           )
     where id = v_tiene;
  end if;

  -- 5) Recensioni. Attenzione all'indice unico (user_id, beach_id): se la
  --    stessa persona ha recensito entrambe le schede, la copia sul duplicato
  --    verrebbe rifiutata. In quel caso si tiene quella sulla scheda che resta.
  delete from public.reviews r
   where r.beach_id = any(v_altri)
     and r.user_id is not null
     and exists (
       select 1 from public.reviews r2
        where r2.beach_id = v_tiene and r2.user_id = r.user_id
     );

  update public.reviews set beach_id = v_tiene where beach_id = any(v_altri);

  -- 6) Segnalazioni
  update public.segnalazioni set beach_id = v_tiene where beach_id = any(v_altri);

  -- 7) Rivendicazioni: si spostano solo se non creano conflitto con l'indice
  --    unico "un solo gestore approvato per stabilimento". Le altre restano
  --    sul duplicato e spariranno con esso (erano comunque doppie).
  update public.rivendicazioni riv
     set beach_id = v_tiene
   where riv.beach_id = any(v_altri)
     and not exists (
       select 1 from public.rivendicazioni r2
        where r2.beach_id = v_tiene
          and (r2.user_id = riv.user_id or (r2.stato = 'approvata' and riv.stato = 'approvata'))
     );

  -- 8) Profilo del gestore: si sposta solo se la scheda che resta non ne ha già uno
  update public.profilo_stabilimento p
     set beach_id = v_tiene
   where p.beach_id = any(v_altri)
     and not exists (
       select 1 from public.profilo_stabilimento p2 where p2.beach_id = v_tiene
     );

  -- 9) Elimina i duplicati ormai svuotati
  delete from public.beaches where id = any(v_altri);

  -- 10) Allinea lo stato del profilo alla realtà delle rivendicazioni
  update public.beaches b
     set profile_status = case
           when exists (select 1 from public.rivendicazioni r
                         where r.beach_id = b.id and r.stato = 'approvata') then 'verificato'
           when exists (select 1 from public.rivendicazioni r
                         where r.beach_id = b.id and r.stato = 'in_attesa') then 'in_attesa'
           else 'non_rivendicato'
         end
   where b.id = v_tiene;

  insert into public.eventi_audit (entita, entita_id, azione, prima, dopo)
  values ('beaches', v_tiene::text, 'merge_duplicati',
          jsonb_build_object('eliminate', to_jsonb(v_altri)),
          jsonb_build_object('tenuta', v_tiene, 'concessioni_salvate', to_jsonb(v_sids)));
end $$;

-- VERIFICA (dopo l'esecuzione deve restituire una sola riga):
--   select id, nome, localita, id_concessione, altre_concessioni, profile_status
--     from public.beaches
--    where paese = 'IT' and localita ilike '%livorno%' and nome ilike '%single fin%';
