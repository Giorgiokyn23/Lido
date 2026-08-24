-- ============================================================
-- LidoRank - 0012: preparazione multi-Paese (Europa + Israele + Cipro)
-- Aggiunge il Paese a ogni luogo. Le concessioni restano opzionali
-- (esistono solo dove il Paese pubblica open data; l'Italia le ha).
-- Idempotente.
-- ============================================================

-- codice Paese ISO-3166-1 alpha-2 (IT, ES, GR, FR, HR, CY, IL, ...)
alter table public.beaches
  add column if not exists paese char(2);

-- tutto ciò che c'è ora è Italia
update public.beaches set paese = 'IT' where paese is null;

alter table public.beaches
  alter column paese set default 'IT',
  alter column paese set not null;

create index if not exists beaches_paese_idx on public.beaches (paese);
create index if not exists beaches_paese_localita_idx on public.beaches (paese, localita);
