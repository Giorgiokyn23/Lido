# LidoRank — Guida passo-passo: Sicurezza + Andare globale

Questa cartella contiene **solo i file nuovi o modificati**, già nei percorsi
giusti. Copiali dentro il tuo progetto `lido/` mantenendo le cartelle
(`app/`, `components/`, `lib/`, `messages/`, `supabase/migrations/`, `scripts/`),
sovrascrivendo quelli esistenti.

```
.env.example                                  ← aggiornato (nuove variabili)
ATTIVA_CLUSTER.md                             ← runbook per i nuovi Paesi
QUERY_OVERPASS_AFRICA.txt                     ← query OSM per l'Africa
app/actions.ts                                ← RPC atomica + Turnstile
components/ReviewForm.tsx                      ← widget anti-bot
components/SegnalazioneForm.tsx                ← widget anti-bot
components/Turnstile.tsx                        ← NUOVO componente
lib/types.ts                                   ← campi peso/stato sulle review
messages/it.json  /  messages/en.json          ← nomi Paesi Nord Africa
scripts/gen_country.py                         ← NUOVA pipeline ETL globale
supabase/migrations/0024_antifraud_hardening.sql  ← NUOVA migrazione sicurezza
```

---

## PARTE A — Sicurezza (falla subito, ~20 minuti)

### A1 · Copia i file e fai il deploy del codice
```bash
# dalla cartella del progetto, dopo aver copiato i file:
git add -A
git commit -m "Sicurezza P0: review pesate, RPC atomica, Turnstile"
git push
```
Vercel fa il deploy da solo. Il sito continua a funzionare anche **senza** le
chiavi Turnstile (la protezione è opt-in, non blocca finché non la colleghi).

### A2 · Esegui la migrazione database
Supabase → **SQL Editor** → apri `supabase/migrations/0024_antifraud_hardening.sql`
→ incolla tutto → **Run**. Va eseguita dopo la `0023` (già presente).
È idempotente: se la rilanci non rompe nulla.

Cosa cambia dopo la 0024:
- ogni recensione ha **peso** (0–1) e **stato** (pubblicata/ridotta/shadow/rifiutata);
- le classifiche usano la **somma dei pesi** invece del conteggio → una review
  falsa a peso basso sposta pochissimo il punteggio;
- l'inserimento passa da una **RPC atomica** con rate-limit, anti-brigading e
  damper anti-ondata (niente più race condition);
- il tasto "Segnala" mette in **quarantena automatica** una review a 3 segnalazioni.

### A3 · Variabili d'ambiente
Nel tuo `.env.local` (e su **Vercel → Settings → Environment Variables**) aggiungi:
```
IP_SALT=<stringa-casuale-lunga>          # es. output di:  openssl rand -hex 32
NEXT_PUBLIC_TURNSTILE_SITE_KEY=          # (vuoto per ora, vedi A4)
TURNSTILE_SECRET=                        # (vuoto per ora, vedi A4)
```
`IP_SALT` mettilo **subito**: rende l'hash dell'IP non reversibile.

### A4 · Cloudflare Turnstile (anti-bot, gratis)
1. Vai su https://dash.cloudflare.com → **Turnstile** → *Add widget*.
2. Dominio: `lidorank.com`. Ottieni **Site Key** (pubblica) e **Secret Key**.
3. Metti la Site Key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e la Secret in
   `TURNSTILE_SECRET` (sia in `.env.local` sia su Vercel), poi ridistribuisci.
4. Da quel momento il widget appare nei form e le richieste senza token valido
   vengono rifiutate.

### A5 · Cose da fare a mano (non posso farle io)
- **Ruota il PAT GitHub** che era stato incollato in chat (GitHub → Settings →
  Developer settings → Tokens → *Revoke*, poi generane uno nuovo).
- Supabase → **Database → Backups**: attiva il **Point-in-Time Recovery**.
- (Consigliato) metti **Cloudflare** come proxy davanti a `lidorank.com` (record
  DNS "arancione"): assorbe DDoS e ondate prima che tocchino Vercel/Supabase.

---

## PARTE B — Andare globale: si parte dall'Africa

Perché l'Africa e non un altro continente: partendo dalla **costa mediterranea**
(Marocco, Algeria, Tunisia, Libia, Egitto) LidoRank **chiude il bacino del
Mediterraneo** — la sua identità — il francese è già coperto, e sono mercati
balneari enormi alimentati dal turismo europeo.

### B0 · Una volta sola — confini + libreria
```bash
curl -sL -o ne_admin1.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
pip install shapely --break-system-packages
```

### B1 · Esporta i dati OSM (unico passaggio manuale)
Apri `QUERY_OVERPASS_AFRICA.txt`. Per ognuno dei 5 Paesi del **Cluster 7**:
https://overpass-turbo.eu → incolla la query → **Run** → **Export → GeoJSON**.
Salva come `exportMA.geojson`, `exportDZ.geojson`, ecc. in una cartella, es.
`~/lido-export/`.

### B2 · Genera la migrazione (un comando)
```bash
python scripts/gen_country.py \
  --iso MA,DZ,TN,LY,EG \
  --label cluster7_nordafrica \
  --migration 0025 \
  --uploads ~/lido-export \
  --ne ne_admin1.geojson
```
Crea `supabase/migrations/0025_cluster7_nordafrica_partN.sql`.

### B3 · Carica su Supabase
SQL Editor → esegui i file `0025_...` in ordine.

### B4 · Accendi i Paesi nel filtro
I nomi tradotti sono **già** nei `messages`. Aggiungi solo gli ISO in
`lib/types.ts` → array `COUNTRIES`:
```ts
  { code: "MA", flag: "🇲🇦" },
  { code: "DZ", flag: "🇩🇿" },
  { code: "TN", flag: "🇹🇳" },
  { code: "LY", flag: "🇱🇾" },
  { code: "EG", flag: "🇪🇬" },
```
`git commit && git push` → compaiono i chip con le classifiche nazionali.

### Cluster successivi (stessa procedura, cambia solo `--iso`)
- **Cluster 8** Africa orientale: `--iso KE,TZ,MZ,MU,SC,MG --label cluster8_africaest --migration 0026`
- **Cluster 9** Africa australe/atlantica: `--iso ZA,NA,AO,GH,SN,CV --label cluster9_africaovest --migration 0027`

*(In alternativa, caricami i file `exportXX.geojson` in chat e ti genero io la
migrazione, come per i cluster europei.)*

---

## Ordine consigliato
1. **A1–A3** oggi (deploy + migrazione 0024 + IP_SALT). Sei già più sicuro.
2. **A4–A5** quando puoi (Turnstile, PITR, rotazione PAT, Cloudflare).
3. **B** quando vuoi lanciare il Nord Africa.

Dati © OpenStreetMap (ODbL) · Confini © Natural Earth.
