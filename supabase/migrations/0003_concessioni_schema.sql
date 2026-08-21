-- ============================================================
-- Lidò — estensione schema per granularità CONCESSIONI (Bolkestein)
-- Ogni bagno = una concessione demaniale (fonte: SID/MIT), con nome
-- da OpenStreetMap dove disponibile. Idempotente.
-- ============================================================

alter table public.beaches
  add column if not exists id_concessione       text,
  add column if not exists categoria            text,          -- es. "Stabilimento Balneare Privato"
  add column if not exists tipo                  text,          -- 'stabilimento' | 'marina' | 'spiaggia'
  add column if not exists canone_annuo          numeric(12,2), -- canone concessorio annuo (€)
  add column if not exists scadenza_concessione  date,          -- scadenza titolo (rilevante Bolkestein)
  add column if not exists fonte                 text;          -- provenienza dato (es. "SID-MIT+OSM")

-- le righe gia' presenti (localita seed 0002 + demo 0001) sono spiagge/localita
update public.beaches set tipo = 'spiaggia' where tipo is null;

-- una concessione = una riga (import ripetibile, nome aggiornabile via ON CONFLICT)
do $$ begin
  if not exists (select 1 from pg_constraint where conname='beaches_id_concessione_key') then
    alter table public.beaches add constraint beaches_id_concessione_key unique (id_concessione);
  end if;
end $$;

create index if not exists beaches_categoria_idx on public.beaches (categoria);
create index if not exists beaches_scadenza_idx  on public.beaches (scadenza_concessione);
