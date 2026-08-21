# ✅ Lidò — Passo-passo pronto all'uso

Segui i blocchi in ordine. Dove vedi **`⟪...⟫`** sostituisci con il tuo valore. Nient'altro da capire.

---

## 0) Apri il Terminale nella cartella del progetto

Scompatta `lido-mvp.zip`, poi apri il Terminale **dentro** la cartella `lido`:
- **macOS:** tasto destro sulla cartella → *Nuovo Terminale nella cartella*
- **Windows:** apri la cartella → clic sulla barra dell'indirizzo → scrivi `powershell` → Invio

Verifica di essere nel posto giusto (deve elencare `package.json`):
```bash
ls
```

---

## 1) Installa e configura le chiavi

```bash
npm install
```

Crea il file delle chiavi:
```bash
cp .env.example .env.local        # Windows: copy .env.example .env.local
```

Apri `.env.local` e incolla i valori da **Supabase → Project Settings → API**:
```
NEXT_PUBLIC_SUPABASE_URL=⟪https://tuo-progetto.supabase.co⟫
NEXT_PUBLIC_SUPABASE_ANON_KEY=⟪tua-anon-public-key⟫
```
> Usa la chiave **anon public**, NON la `service_role`.

---

## 2) Carica i dati in Supabase (SQL Editor)

In **Supabase → SQL Editor**, per ogni file: *+ New query* → incolla il contenuto → **Run**.
**Ordine esatto** (li trovi in `supabase/migrations/`):

1. `0001_init.sql`  ← *(già fatto, salta se hai già visto "Success")*
2. `0002_seed_beaches_nazionale.sql`
3. `0003_concessioni_schema.sql`
4. `0005_seed_concessioni_nazionale.sql`  ← il più grande, aspetta qualche secondo
5. `0006_seed_marine.sql`

Verifica in *Table Editor → beaches*: ~8.700 righe, colonna `tipo` piena.

---

## 3) Prova in locale

```bash
npm run dev
```
Apri <http://localhost:3000>. Se vedi i lidi e i filtri, è tutto ok.
Ferma con `Ctrl + C`.

---

## 4) Metti su GitHub

Prima crea l'identità git (solo la prima volta sul tuo PC):
```bash
git config --global user.name  "⟪Il Tuo Nome⟫"
git config --global user.email "⟪tua@email.com⟫"
```

Poi, nella cartella del progetto:
```bash
git init
git add .
git commit -m "Lido MVP: primo commit"
git branch -M main
```

### Scegli UNA delle due strade per pubblicare il repo:

**Strada A — con GitHub CLI (la più veloce, zero password):**
Se hai `gh` installato (verifica con `gh --version`; altrimenti <https://cli.github.com>):
```bash
gh auth login          # segui le istruzioni una volta sola
gh repo create lido --private --source=. --push
```
Fatto: repo creato e caricato in un colpo. ✅

**Strada B — manuale:**
1. Vai su <https://github.com/new> → **Repository name:** `lido` → **Private** → **NON** aggiungere README → *Create repository*.
2. Poi:
```bash
git remote add origin https://github.com/⟪TUO-USERNAME⟫/lido.git
git push -u origin main
```
3. Se ti chiede la password: NON è la password dell'account, è un **token**.
   Crealo su <https://github.com/settings/tokens> → *Generate new token (classic)* → spunta `repo` →
   *Generate* → copia il token e incollalo come password.

---

## 5) Vai online con Vercel

1. <https://vercel.com/new> → **Import Git Repository** → scegli `lido` → **Import**.
2. Apri **Environment Variables** e aggiungi le stesse due del punto 1:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `⟪https://tuo-progetto.supabase.co⟫` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `⟪tua-anon-public-key⟫` |

3. **Deploy** → aspetta ~2 minuti → apri l'URL `⟪...⟫.vercel.app`. **Sei online.** 🎉

> Da qui in poi ogni `git push` ripubblica il sito da solo.

---

## Se qualcosa non va

| Sintomo | Soluzione |
|--------|-----------|
| Homepage vuota / "Nessun lido trovato" | Env var mancanti su Vercel, oppure SQL non eseguiti (punto 2). |
| `Invalid API key` | Hai usato `service_role`. Metti la **anon public**. |
| `git push` rifiuta la password | Serve il **token** (punto 4B.3), non la password. |
| Build fallita su Vercel | Env var non aggiunte → aggiungile → *Redeploy*. |
| Recensioni non si salvano | In SQL Editor controlla che le policy RLS di `0001` esistano. |

Se ti si blocca qualcosa, incollami qui l'errore esatto e lo risolvo al volo.
