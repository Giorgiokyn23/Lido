# 🏖️ Lidò — Guida al deploy dalla A alla Z

Dal computer vuoto al sito online, con **~8.700 luoghi balneari italiani già caricati**
(712 località + 7.119 stabilimenti balneari con canone/scadenza + 876 marine/porti).
Tempo stimato: **15–25 minuti**. Non serve saper programmare: si copia e si incolla.

> Ti servono 3 account gratuiti: **GitHub**, **Supabase**, **Vercel**.
> Puoi crearli tutti loggandoti con Google/email. Nessuna carta di credito richiesta.

---

## PARTE 0 — Prerequisiti (una tantum, ~5 min)

1. **Node.js** — scarica la versione LTS da <https://nodejs.org> e installala.
   Verifica aprendo il Terminale (macOS) o PowerShell (Windows):
   ```bash
   node -v      # deve stampare v18.x o superiore
   ```
2. **Git** — scarica da <https://git-scm.com/downloads> e installa (su macOS spesso è già presente).
   ```bash
   git --version
   ```
3. **Account GitHub** — registrati su <https://github.com> (username + email).
4. **Account Supabase** — <https://supabase.com> → *Start your project* (login con GitHub).
5. **Account Vercel** — <https://vercel.com> → *Sign Up* (login con GitHub: più comodo).

---

## PARTE 1 — Il database su Supabase (~5 min)

1. Vai su <https://supabase.com/dashboard> → **New project**.
2. Compila:
   - **Name:** `lido`
   - **Database Password:** scegline una robusta e **salvala** (ti servirà solo se userai il DB da fuori).
   - **Region:** `West EU (Ireland)` o `Central EU (Frankfurt)` — le più vicine all'Italia.
3. **Create new project** e aspetta ~2 minuti che diventi verde (*Active*).

### 1a. Crea le tabelle
4. Menu a sinistra → **SQL Editor** → **+ New query**.
5. Apri il file `supabase/migrations/0001_init.sql` (dalla cartella del progetto), **copia tutto**, incolla nell'editor, premi **Run** (o `Ctrl/Cmd + Invio`).
   Deve comparire *Success. No rows returned*. ✅

### 1b. Carica i dati (4 script, sempre in quest'ordine)
Per ciascun file: **+ New query**, apri il file dalla cartella `supabase/migrations/`, **copia tutto**,
incolla, **Run** (deve dire *Success*). Esegui nell'ordine esatto:

6. `0002_seed_beaches_nazionale.sql` → 712 località costiere.
7. `0003_concessioni_schema.sql` → aggiunge le colonne concessione (canone, scadenza, `tipo`…).
8. `0005_seed_concessioni_nazionale.sql` → 7.119 stabilimenti balneari (2.383 con nome reale OSM,
   gli altri con etichetta provvisoria + id concessione). È il file più grande: attendi qualche secondo.
9. `0006_seed_marine.sql` → 876 marine / punti d'imbarco con nome.

> **Ordine importante:** `0003` prima di `0005`/`0006` (crea le colonne che loro riempiono).
> Sono tutti idempotenti: se sbagli puoi rilanciarli senza creare duplicati.

10. Verifica: menu → **Table Editor** → tabella `beaches`. Devi vedere ~8.700 righe; nella colonna
    `tipo` trovi `spiaggia`, `stabilimento`, `marina`.

### 1c. Prendi le chiavi API
11. Menu → **Project Settings** (ingranaggio) → **API**.
12. Tieni aperta questa pagina: ti servono due valori
    - **Project URL** (es. `https://abcd1234.supabase.co`)
    - **anon public** key (una stringa lunga sotto *Project API keys*).

---

## PARTE 2 — Il codice sul tuo computer (~3 min)

1. Scompatta lo zip `lido-mvp.zip` in una cartella, es. `Documenti/lido`.
2. Apri il Terminale **dentro** quella cartella:
   - **macOS:** tasto destro sulla cartella → *Nuovo Terminale nella cartella*.
   - **Windows:** apri la cartella, clicca sulla barra dell'indirizzo, scrivi `powershell` e Invio.
3. Installa le dipendenze:
   ```bash
   npm install
   ```
4. Crea il file delle chiavi. Copia l'esempio:
   ```bash
   cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
   ```
5. Apri `.env.local` con un editor di testo e incolla i due valori della Parte 1c:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-anon-key
   ```
6. Avvia in locale per provare:
   ```bash
   npm run dev
   ```
   Apri <http://localhost:3000> nel browser: devi vedere la homepage con le località e i filtri.
   Premi `Ctrl + C` nel Terminale per fermarlo quando hai finito di provare.

---

## PARTE 3 — Metti il codice su GitHub (~5 min)

### Modo A — da Terminale (consigliato)

1. Nella cartella del progetto, inizializza il repository:
   ```bash
   git init
   git add .
   git commit -m "Lidò MVP: primo commit"
   ```
2. Crea il repository **vuoto** su GitHub: vai su <https://github.com/new>
   - **Repository name:** `lido`
   - Visibilità: **Private** (o Public, come preferisci)
   - **NON** spuntare "Add a README" (la cartella ne ha già uno)
   - **Create repository**
3. GitHub ti mostra una schermata "…or push an existing repository". Copia i comandi che ti dà,
   simili a questi (sostituisci `TUO-USERNAME`):
   ```bash
   git branch -M main
   git remote add origin https://github.com/TUO-USERNAME/lido.git
   git push -u origin main
   ```
4. Al `push` ti chiede le credenziali GitHub: usa username + un **Personal Access Token**
   (GitHub non accetta più la password). Crealo al volo su
   <https://github.com/settings/tokens> → *Generate new token (classic)* → spunta `repo` → genera →
   copia il token e incollalo come password.
5. Ricarica la pagina del repo su GitHub: vedrai tutti i file. ✅

### Modo B — senza Terminale (GitHub Desktop)
Se preferisci l'interfaccia grafica: installa **GitHub Desktop** (<https://desktop.github.com>),
*File → Add Local Repository* → scegli la cartella `lido` → *Publish repository*. Fatto.

> Il file `.gitignore` incluso esclude già `node_modules`, `.next` e `.env.local`:
> **le tue chiavi non finiscono su GitHub.** 👍

---

## PARTE 4 — Vai online con Vercel (~4 min)

1. Vai su <https://vercel.com/new>.
2. **Import Git Repository** → autorizza Vercel su GitHub se richiesto → scegli il repo `lido` → **Import**.
3. Vercel riconosce Next.js da solo. Prima di premere Deploy, apri **Environment Variables** e aggiungi
   le stesse due variabili del file `.env.local`:
   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://abcd1234.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `la-tua-anon-key` |
4. **Deploy**. Aspetta ~1–2 minuti.
5. Vercel ti dà un indirizzo tipo `https://lido-xxxx.vercel.app`. **Aprilo: sei online.** 🎉

### Aggiornamenti futuri
Ogni volta che fai `git push`, Vercel ri-pubblica il sito **da solo**. Nessun passaggio manuale.

### Dominio personalizzato (facoltativo)
In Vercel → progetto → **Settings → Domains** → aggiungi il tuo dominio (es. `lido.it`) e segui le
istruzioni DNS.

---

## PARTE 5 — Alzare la copertura dei nomi reali (dopo il go-live)

I dati ci sono già tutti: **712 località + 7.119 stabilimenti (con canone e scadenza dal SID/MIT) + 876
marine**. Degli stabilimenti, **2.383 hanno l'insegna reale** presa da OpenStreetMap; gli altri hanno
un'etichetta provvisoria (`Stabilimento balneare <comune> · conc. <id>`) + il numero di concessione reale.
Il limite non è il metodo ma quanti bagni sono mappati con nome su OSM.

Tre leve per portare i nomi verso il 100%, in ordine di efficacia:

1. **Correzione dai gestori/utenti** (la più solida): dalla scheda del bagno, chi lo conosce corregge
   l'insegna. È già il flusso naturale di una piattaforma di recensioni — sono loro a sapere il nome esatto.
2. **Re-import OSM periodico:** la mappatura cresce nel tempo. Rilancia l'export Overpass
   (`leisure=beach_resort`+`marina` in Italia), ricarica il GeoJSON e rigenera il join: le righe si
   aggiornano da sole grazie a `on conflict (id_concessione) do update`.
3. **Registri regionali/SUAP:** alcune Regioni pubblicano la denominazione dello stabilimento; dove
   disponibile, si mappa per comune/coordinate.

> La colonna `tipo` (`spiaggia` / `stabilimento` / `marina`) ti permette di filtrare e trattare i tre
> livelli separatamente nel frontend senza toccare il modello dati.

---

## Problemi comuni

| Sintomo | Causa / soluzione |
|--------|-------------------|
| Homepage vuota, "Nessun lido trovato" | Env var mancanti o SQL non eseguito. Controlla Parte 1b e le variabili su Vercel. |
| `Invalid API key` | Hai copiato la chiave `service_role` invece di `anon public`. Usa la **anon**. |
| `git push` chiede la password e la rifiuta | Serve un **Personal Access Token**, non la password (Parte 3, punto 4). |
| Build fallita su Vercel | Quasi sempre env var non aggiunte. Settings → Environment Variables → poi *Redeploy*. |
| Le recensioni non si salvano | In Supabase, SQL Editor: verifica che le policy RLS di `0001_init.sql` siano state create. |

---

Fatto. Hai un sito di recensioni balneari online, con copertura nazionale, aggiornabile con un `git push`.
