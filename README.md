# LidoRank 🏖️

Il *Trustpilot dei beach club* — recensioni verticali e strutturate di lidi, stabilimenti balneari e porti **in tutto il mondo**. Nove criteri, punteggi aggregati trasparenti e un canale riservato per segnalare gli illeciti agli enti.

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase (PostgreSQL) · next-intl (IT/EN) · PWA · deploy su Vercel.

Sito live: **[lidorank.com](https://lidorank.com)**

---

## Caratteristiche

- **9 criteri verticali** di voto (con mezzo voto), definiti una sola volta in `lib/types.ts`.
- **Classifiche bayesiane a soglia**: un lido entra in classifica solo dopo un numero minimo di recensioni; niente "migliore" eletto su pochi dati. Metodo spiegato nella pagina `/metodologia`.
- **Anti-frode**: ogni recensione ha un peso e uno stato; rate-limit atomici, freno anti-ondata, verifica anti-bot (Cloudflare Turnstile), hash dell'IP con salt e pulsante di segnalazione con quarantena a soglia.
- **Nessuna recensione finta** pre-caricata. I gestori potranno rivendicare la scheda e rispondere, ma non modificare/eliminare recensioni né alterare le classifiche (modello Trustpilot).
- **Segnalazioni di illeciti** in coda privata, separate dalle recensioni pubbliche.
- **Bilingue** IT/EN via next-intl, **installabile come PWA** (manifest + service worker).
- **Pagine legali**: privacy, termini, linee guida, moderazione, contatti.

---

## Avvio rapido

### 1. Supabase
1. Crea un progetto su [supabase.com](https://supabase.com).
2. **SQL Editor** → esegui le migrazioni in `supabase/migrations/` **in ordine numerico** (`0001_…` → `0036_…`). Creano tabelle, viste aggregate (`beach_scores`, `beach_rankings`), RLS, la RPC di inserimento e i dati di base.
3. **Settings → API** → copia `Project URL` e `anon public key`.

### 2. App in locale
```bash
npm install
cp .env.example .env.local     # incolla URL + anon key (vedi sotto)
npm run dev                    # http://localhost:3000
```
In sviluppo la PWA è disattivata (nessuna cache aggressiva).

### 3. Deploy su Vercel
1. Push del repo su GitHub → [vercel.com](https://vercel.com) → *Import Project*.
2. Aggiungi le variabili d'ambiente (vedi sotto).
3. **Deploy.**

---

## Variabili d'ambiente

Vedi `.env.example`. Le essenziali:

```
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
NEXT_PUBLIC_SITE_URL=https://lidorank.com
IP_SALT=…                 # salt per l'hash dell'IP (rate-limit)
TURNSTILE_SECRET=…        # opzionale: se assente, la verifica anti-bot non blocca
```

---

## Struttura

```
app/[locale]/                 Pagine (App Router, bilingue)
  page.tsx                    Home: ricerca + filtri verticali + griglia
  lido/[id]/page.tsx          Dettaglio lido: profilo, punteggi, recensioni, form
  classifiche/page.tsx        Classifiche per Paese/regione/comune (a soglia)
  metodologia/page.tsx        Come funzionano punteggi e classifiche
  privacy · termini · linee-guida · moderazione · contatti   Pagine legali
app/actions.ts                Server Action: invio recensione e segnalazione
components/                   ReviewForm · StarRating · ScoreBar · Segnalazione · …
lib/types.ts                  Tipi condivisi + le 9 metriche + soglie classifiche
lib/supabase/{server,client}  Client Supabase (SSR + browser)
messages/{it,en}.json         Traduzioni (parità di chiavi)
supabase/migrations/          Schema, viste, RPC, anti-frode (eseguire in ordine)
public/                       Logo, icone PWA, favicon, manifest
```

Le 9 metriche sono definite **una sola volta** in `lib/types.ts` (`METRICS`). Aggiungerne/rinominarne una = modifica lì + colonna in SQL + `avg_` nelle viste.

---

## Come sono stati raccolti i dati

I lidi provengono da **OpenStreetMap** (Overpass API, `leisure=beach_resort` + `natural=beach`, licenza ODbL) normalizzati su comuni/regioni, e — dove disponibile — dal **SID (Sistema Informativo Demanio)** per il numero di concessione. L'import è un'operazione una-tantum e i relativi script/query non fanno parte dell'applicazione.

---

## Licenza

Vedi `LICENSE`. Il marchio, i contenuti e la struttura dei dati di LidoRank sono protetti.
