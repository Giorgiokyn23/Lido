# Lidò 🏖️

Il *Trustpilot dei bagni* — recensioni verticali e strutturate degli stabilimenti balneari italiani.
Sei metriche core, punteggi aggregati, dati conformi ai criteri dei bandi **Bolkestein**.

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase (PostgreSQL) · deploy su Vercel.

---

## Online in ~10 minuti

### 1. Supabase
1. Crea un progetto su [supabase.com](https://supabase.com) (piano free).
2. **SQL Editor** → incolla ed esegui `supabase/migrations/0001_init.sql`.
   Crea tabelle, view aggregata, RLS e dati demo.
3. **Settings → API** → copia `Project URL` e `anon public key`.

### 2. App in locale
```bash
npm install
cp .env.example .env.local     # incolla URL + anon key
npm run dev                    # http://localhost:3000
```

### 3. Deploy su Vercel
1. Push del repo su GitHub.
2. [vercel.com](https://vercel.com) → *Import Project*.
3. Aggiungi le due env var (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. **Deploy.** Online.

---

## Struttura

```
supabase/migrations/0001_init.sql   Schema + view beach_scores + RLS + seed
lib/types.ts                        Tipi condivisi + definizione delle 6 metriche
lib/supabase/{server,client}.ts     Client Supabase (SSR + browser)
app/page.tsx                        Homepage: ricerca + filtri verticali + griglia
app/lido/[id]/page.tsx              Dettaglio lido: profilo, progress bar, recensioni
app/actions.ts                      Server Action: invio recensione
components/                         SearchFilters · BeachCard · ScoreBar · ReviewForm
```

Le 6 metriche core sono definite **una sola volta** in `lib/types.ts` (`METRICS`).
Aggiungerne/rinominarne una = modifica lì + colonna in SQL + `avg_` nella view. Fine.

---

## Dati inclusi

`0002_seed_beaches_nazionale.sql` carica **712 località balneari costiere italiane** (tutte le 15
regioni marittime), rilevate automaticamente da coordinate ISTAT + linea di costa Natural Earth.
Copertura nazionale già al primo avvio. Nessuna recensione finta pre-caricata.

Per arricchire con i singoli stabilimenti (dato Bolkestein/SID) vedi `GUIDA_DEPLOY.md → Parte 5`.

## Popolare il DB con tutti i bagni d'Italia (approfondimento)

Per l'import massivo dei singoli stabilimenti (copertura per-concessione):

1. **OpenStreetMap / Overpass API** — query `leisure=beach_resort` + `natural=beach` con nome, comune, coordinate. Copertura ottima e licenza ODbL.
2. **Open data regionali / SID (Sistema Informativo Demanio)** — le concessioni demaniali marittime sono il dataset "ufficiale" richiesto dai bandi Bolkestein (numero concessione, distanza ombrelloni, superficie).
3. **ISTAT** — anagrafica comuni per normalizzare `localita`/`regione`.

Flusso consigliato: scarica → normalizza in CSV con le colonne di `beaches` → importa via
**Supabase Table Editor → Import CSV**, oppure `COPY public.beaches (...) FROM ...`.
Aggiungi un vincolo di unicità per evitare duplicati negli import ripetuti, es.:

```sql
alter table public.beaches
  add constraint beaches_unique_nome_localita unique (nome, localita);
```

---

## Scalare a milioni di utenti

Tutto già impostato per crescere senza riscrivere:

- **`beach_scores` è una VIEW** (sempre coerente). Sopra ~100k recensioni con traffico alto,
  convertila in **materialized view** con refresh schedulato (pg_cron) *oppure* denormalizza i
  punteggi medi in colonne su `beaches`, aggiornate da un trigger. Zero cambi lato frontend.
- **Indici** già presenti su ricerca full-text, regione, località e `(beach_id, created_at)`.
- **Connection pooling**: usa la connection string *pooler* di Supabase (Supavisor) in produzione.
- **Vercel Edge/CDN** serve le pagine `force-dynamic` con caching a livello di data layer quando vorrai.

---

## Note privacy / Bolkestein
- Le recensioni sono anonime per default (`user_id` nullable). Per richiedere il login:
  in `0001_init.sql` sostituisci la policy `reviews_write` con
  `for insert to authenticated with check (auth.uid() = user_id)` e abilita Supabase Auth.
- `distanza_ombrelloni_metri` è una metrica strutturata pensata per i requisiti dei bandi:
  esportabile e vendibile ai Comuni in forma aggregata e anonima.
