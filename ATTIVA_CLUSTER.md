# Attivare un nuovo cluster di Paesi — runbook

Pipeline industrializzata: da qui in poi aggiungere un Paese (o un continente)
è sempre la stessa procedura, guidata dall'ISO. Niente più script su misura.

## 0 · Una volta sola — scarica i confini Natural Earth (~40 MB)
```bash
curl -sL -o ne_admin1.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
pip install shapely --break-system-packages   # se non presente
```

## 1 · Esporta i dati OSM (l'unico passaggio manuale)
Apri `QUERY_OVERPASS_AFRICA.txt`, e per ogni Paese del **Cluster 7** incolla la
query su https://overpass-turbo.eu → Run → Export → GeoJSON.
Salva ogni file come `exportXX.geojson` (XX = ISO, es. `exportMA.geojson`) in una
cartella di lavoro, es. `~/lido-export/`.

## 2 · Genera la migrazione (un comando)
```bash
python scripts/gen_country.py \
  --iso MA,DZ,TN,LY,EG \
  --label cluster7_nordafrica \
  --migration 0025 \
  --uploads ~/lido-export \
  --ne ne_admin1.geojson
```
Crea `supabase/migrations/0025_cluster7_nordafrica_partN.sql` (upsert idempotente
su `osm_id`, regioni reali assegnate). Stampa un riepilogo per Paese.

## 3 · Carica su Supabase
SQL Editor → esegui i file `0025_...` in ordine (vanno dopo la `0016`).

## 4 · Accendi i Paesi nel frontend
I nomi tradotti sono **già** in `messages/it.json` e `messages/en.json`.
Manca solo aggiungerli al filtro in `lib/types.ts` → array `COUNTRIES`:
```ts
  { code: "MA", flag: "🇲🇦" },
  { code: "DZ", flag: "🇩🇿" },
  { code: "TN", flag: "🇹🇳" },
  { code: "LY", flag: "🇱🇾" },
  { code: "EG", flag: "🇪🇬" },
```
`git add -A && git commit && git push` → Vercel fa il deploy e compaiono i chip
con le classifiche nazionali dei nuovi Paesi.

## Cluster successivi
Stessa procedura cambiando `--iso`, `--label`, `--migration`:
- **Cluster 8** (Africa orientale): `--iso KE,TZ,MZ,MU,SC,MG --label cluster8_africaest --migration 0026`
- **Cluster 9** (Africa australe/atlantica): `--iso ZA,NA,AO,GH,SN,CV --label cluster9_africaovest --migration 0027`

Il registro dei nomi Paese sta in `scripts/gen_country.py` (dizionario `REGISTRO`):
per un nuovo continente basta aggiungere gli ISO lì e in `messages/*.json`.
