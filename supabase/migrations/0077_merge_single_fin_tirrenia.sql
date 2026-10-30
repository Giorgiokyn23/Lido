-- ============================================================
-- LidoRank — 0077: unisce i doppioni "Single Fin" rimasti
--
-- La 0074 cercava solo dove localita somigliava a "Livorno" e quindi non ha
-- visto "Single Fin Tirrenia" e "Single Fin 2 Tirrenia", che hanno localita
-- "Tirrenia". Qui si cerca per NOME in qualunque località e si uniscono i
-- doppioni che stanno nella stessa località.
--
-- Scheda che resta: quella con più recensioni; a parità, quella col nome senza
-- numero progressivo ("Single Fin" batte "Single Fin 2"); poi quella con numero
-- di concessione; infine la più vecchia.
--
-- Idempotente: se in una località resta una sola scheda, non fa nulla.
-- Esegui DOPO 0076.
--
-- ANTEPRIMA (esegui PRIMA per vedere che cosa verrà unito):
--   select b.localita, b.id, b.nome, b.id_concessione,
--          (select count(*) from public.reviews r where r.beach_id = b.id) as recensioni
--     from public.beaches b
--    where b.nome ilike '%single fin%'
--    order by b.localita, recensioni desc;
-- ============================================================

do $$
declare
  grp     record;
  v_tiene uuid;
  v_altri uuid[];
  v_sids  text[];
begin
  for grp in
    select localita, count(*) as quante
      from public.beaches
     where nome ilike '%single fin%'
     group by localita
    having count(*) > 1
  loop
    -- 1) Quale si tiene
    select b.id into v_tiene
      from public.beaches b
     where b.nome ilike '%single fin%' and b.localita = grp.localita
     order by (select count(*) from public.reviews r where r.beach_id = b.id) desc,
              (b.nome ~ '\m[0-9]+\M') asc,          -- senza numero progressivo prima
              (b.id_concessione is not null) desc,
              b.created_at asc
     limit 1;

    -- 2) Le altre
    select array_agg(b.id),
           array_agg(b.id_concessione) filter (where b.id_concessione is not null)
      into v_altri, v_sids
      from public.beaches b
     where b.nome ilike '%single fin%' and b.localita = grp.localita and b.id <> v_tiene;

    if v_altri is null then continue; end if;

    raise notice '0077: % — tengo %, unisco % schede.', grp.localita, v_tiene, array_length(v_altri, 1);

    -- 3) Conserva le concessioni delle schede che spariscono
    if v_sids is not null and array_length(v_sids, 1) > 0 then
      update public.beaches
         set altre_concessioni = (
               select array(select distinct e
                              from unnest(coalesce(altre_concessioni, '{}') || v_sids) e
                             order by e))
       where id = v_tiene;
    end if;

    -- 4) Recensioni: prima tolgo i doppi dello stesso utente (indice unico),
    --    poi sposto il resto.
    delete from public.reviews r
     where r.beach_id = any(v_altri)
       and r.user_id is not null
       and exists (select 1 from public.reviews r2
                    where r2.beach_id = v_tiene and r2.user_id = r.user_id);

    update public.reviews set beach_id = v_tiene where beach_id = any(v_altri);

    -- 5) Segnalazioni
    update public.segnalazioni set beach_id = v_tiene where beach_id = any(v_altri);

    -- 6) Rivendicazioni, solo se non creano conflitto
    update public.rivendicazioni riv
       set beach_id = v_tiene
     where riv.beach_id = any(v_altri)
       and not exists (
         select 1 from public.rivendicazioni r2
          where r2.beach_id = v_tiene
            and (r2.user_id = riv.user_id
                 or (r2.stato = 'approvata' and riv.stato = 'approvata')));

    -- 7) Profilo del gestore, solo se la scheda che resta non ne ha già uno
    update public.profilo_stabilimento p
       set beach_id = v_tiene
     where p.beach_id = any(v_altri)
       and not exists (select 1 from public.profilo_stabilimento p2 where p2.beach_id = v_tiene);

    -- 8) Via i duplicati
    delete from public.beaches where id = any(v_altri);

    -- 9) Riallinea lo stato del profilo alle rivendiche effettive
    perform public.ricalcola_profile_status(v_tiene);

    insert into public.eventi_audit (entita, entita_id, azione, prima, dopo)
    values ('beaches', v_tiene::text, 'merge_duplicati',
            jsonb_build_object('eliminate', to_jsonb(v_altri), 'localita', grp.localita),
            jsonb_build_object('tenuta', v_tiene, 'concessioni_salvate', to_jsonb(v_sids)));
  end loop;
end $$;

-- VERIFICA: dopo l'esecuzione deve restare una sola riga per località.
--   select localita, count(*), string_agg(nome, ' | ')
--     from public.beaches where nome ilike '%single fin%'
--    group by localita;
