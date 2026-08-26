#!/usr/bin/env bash
# LidoRank — scarica i Paesi GIGANTI (US, BR) a riquadri (bounding box) sulle coste.
# La query sull'intera area del Paese fa andare Overpass in timeout; i bbox no.
# I tasselli si sovrappongono un po': va bene, la pipeline deduplica per osm_id.
#
# USO:
#   bash scripts/fetch_tiles.sh US ~/Desktop/lido-export
#   bash scripts/fetch_tiles.sh BR ~/Desktop/lido-export
#
# Salva exportUS-1.geojson, exportUS-2.geojson, …  (gen_country.py li unisce).
# Idempotente: rilancia e riprende SOLO i tasselli mancanti (quelli già presi si saltano).

set -u
ISO="$(echo "${1:?Uso: bash fetch_tiles.sh US [cartella]}" | tr '[:lower:]' '[:upper:]')"
OUT="${2:-./lido-export}"
mkdir -p "$OUT"

# Server affidabili PER PRIMI (overpass-api.de due volte), poi i più lenti come riserva.
ENDPOINTS=(
  "https://overpass-api.de/api/interpreter"
  "https://overpass-api.de/api/interpreter"
  "https://overpass.kumi.systems/api/interpreter"
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
  "https://overpass.private.coffee/api/interpreter"
  "https://overpass-api.de/api/interpreter"
)
MAX_TRIES=6
QTIMEOUT=300     # timeout DENTRO la query: un tassello pesante fallisce presto, non si appende
WAIT=8           # attesa FISSA fra i tentativi (niente più backoff che sale a 96s)

# Tasselli costieri "SUD,OVEST,NORD,EST". La numerazione 1-9 resta stabile
# (così i tasselli già scaricati vengono saltati); il 5 è spezzato + il 10 nuovo.
case "$ISO" in
  US) TILES="32,-125,49,-116  32,-122,36,-114  25,-98,31,-88  24,-88,31,-79  30.5,-82,33.5,-78.5  37,-77,45,-66  41,-93,48,-76  18,-161,23,-154  55,-168,61,-129  33.5,-79.5,37,-75" ;;
  BR) TILES="-34,-54,-23,-46  -24,-49,-18,-39  -19,-44,-8,-34  -9,-42,-2,-34  -3,-52,6,-44" ;;
  AU) TILES="-44,144,-40,149  -39,140,-33,151  -34,150,-28,154  -29,151,-24,154  -25,145,-15,154  -16,129,-11,137  -36,113,-25,116.5  -25,112,-13,124  -38,128,-31,141" ;;
  CN) TILES="18,108,21,111  20,108,25,113  21,111,24,117  23,116,28,121  27,120,31,123  31,119,35,123  35,119,41,123  38,117,41,122" ;;
  IN) TILES="8,72,16,76  16,72,23,73.5  20,68,24,73  8,77,16,81  15,80,22,88" ;;
  ID) TILES="-9,105,-5,115  -9,114,-8,117  -1,98,6,107  -11,119,-8,131  -6,116,3,120" ;;
  JP) TILES="24,122,31,131  31,129,35,141  34,138,38,142  37,138,42,146  41,139,46,146" ;;
  *) echo "Nessun set di tasselli per ${ISO}. Usa fetch_osm.sh, o aggiungi un case."; exit 1 ;;
esac

fetch_tile() {
  local n="$1" bbox="$2"
  local dest="$OUT/export${ISO}-${n}.geojson"
  if [ -s "$dest" ] && grep -q '"elements"' "$dest" && ! grep -qiE 'runtime error|rate_limited|too many requests|dispatcher' "$dest"; then
    echo "  ✓ ${ISO} tassello ${n}: già presente, salto"
    return 0
  fi
  local query="[out:json][timeout:${QTIMEOUT}];(nwr[\"leisure\"=\"beach_resort\"](${bbox});nwr[\"leisure\"=\"marina\"](${bbox}););out center tags;"
  local tmp; tmp="$(mktemp)"
  local try
  for (( try=1; try<=MAX_TRIES; try++ )); do
    local ep="${ENDPOINTS[$(( (try-1) % ${#ENDPOINTS[@]} ))]}"
    echo "  → ${ISO} tassello ${n}: tentativo ${try}/${MAX_TRIES} su ${ep#https://}"
    local code
    code="$(curl -sS --max-time $(( QTIMEOUT + 60 )) -o "$tmp" -w '%{http_code}' \
             --data-urlencode "data=${query}" "$ep" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ] && grep -q '"elements"' "$tmp" \
       && ! grep -qiE 'runtime error|rate_limited|too many requests|dispatcher' "$tmp"; then
      mv "$tmp" "$dest"
      local c; c="$(grep -o '"type"' "$dest" | wc -l | tr -d ' ')"
      echo "  ✓ ${ISO} tassello ${n}: OK (~${c} elementi)"
      return 0
    fi
    echo "    …non riuscito (http ${code}); riprovo tra ${WAIT}s"
    sleep "$WAIT"
  done
  rm -f "$tmp"
  echo "  ✗ ${ISO} tassello ${n}: FALLITO — rilancia il comando per riprenderlo."
  return 1
}

echo "Scarico ${ISO} a tasselli → ${OUT}"
i=0; fail=0
for bbox in $TILES; do
  i=$(( i + 1 ))
  fetch_tile "$i" "$bbox" || fail=1
  sleep 1
done
echo ""
if [ "$fail" = "0" ]; then
  echo "FATTO ✓  ${ISO} completo in ${OUT} (${i} tasselli). Li unisco io."
else
  echo "Alcuni tasselli mancano. Rilancia lo stesso comando: riprende solo quelli."
fi
