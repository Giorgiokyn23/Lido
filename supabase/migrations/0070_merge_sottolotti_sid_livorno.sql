-- ============================================================
-- LidoRank - 0070: consolida i sotto-lotti concessori "Stabilimento balneare"
-- I placeholder "Stabilimento balneare Livorno · conc. X" sono in realtà
-- sotto-lotti (cabine, specchio acqueo, arenile, pontili) di stabilimenti reali
-- già presenti. Un stabilimento = una card, con TUTTE le sue concessioni salvate.
-- Per ogni gruppo: sposta recensioni/segnalazioni sul parent, salva i SID in
-- beaches.altre_concessioni (niente dati persi), elimina i placeholder.
-- Mapping fornito dal gestore (CSV SID→stabilimento). Idempotente. Esegui DOPO 0068.
--
-- ANTEPRIMA (esegui prima, per controllare cosa verrà eliminato):
--   select id, nome, localita, id_concessione from public.beaches
--   where nome ilike 'stabilimento balneare%'
--     and id_concessione in ('2009K003271','2009S001956','2009J001722','2009O000872',
--       '2009T002659','2009K001462','2010C000931','2008N001394','2009P000891',
--       '2010A001145','2009X001997');
-- ============================================================

alter table public.beaches add column if not exists altre_concessioni text[];

do $$
declare
  grp record;
  parent_id uuid;
begin
  for grp in
    select token, array_agg(sid) as sids from (values
      ('Bagni Lido','2009K003271'),('Bagni Lido','2009S001956'),('Bagni Lido','2009J001722'),
      ('Bagni Lido','2009O000872'),('Bagni Lido','2009T002659'),
      ('Onde del Tirreno','2009K001462'),('Onde del Tirreno','2010C000931'),('Onde del Tirreno','2008N001394'),
      ('Bagni Roma','2009P000891'),('Bagni Roma','2010A001145'),
      ('Pancaldi','2009X001997')
    ) as t(token,sid)
    group by token
  loop
    -- parent = la card reale (col token nel nome), non un placeholder
    select id into parent_id from public.beaches
      where paese='IT' and nome ilike '%'||grp.token||'%'
        and nome not ilike 'stabilimento balneare%'
      order by (id_concessione is not null) desc limit 1;
    if parent_id is null then continue; end if;

    -- salva tutte le concessioni del gruppo sul parent (dedup, ordinate)
    update public.beaches
      set altre_concessioni = (
        select array(select distinct e from unnest(coalesce(altre_concessioni,'{}') || grp.sids) e order by e)
      )
      where id = parent_id;

    -- sposta recensioni e segnalazioni dai placeholder verso il parent
    update public.reviews set beach_id = parent_id
      where beach_id in (select id from public.beaches
        where id_concessione = any(grp.sids) and id <> parent_id and nome ilike 'stabilimento balneare%');
    update public.segnalazioni set beach_id = parent_id
      where beach_id in (select id from public.beaches
        where id_concessione = any(grp.sids) and id <> parent_id and nome ilike 'stabilimento balneare%');

    -- elimina i placeholder ormai svuotati
    delete from public.beaches
      where id_concessione = any(grp.sids) and id <> parent_id and nome ilike 'stabilimento balneare%';
  end loop;
end $$;
