#!/usr/bin/env bash
# LidoRank — scarica in un colpo solo i dati OSM di più Paesi dall'API Overpass.
# Niente più copia/incolla/export a mano su overpass-turbo.
#
# USO:
#   ./scripts/fetch_osm.sh "KE,TZ,MZ,MU,SC,MG"            # salva in ./lido-export
#   ./scripts/fetch_osm.sh "KE,TZ,MZ,MU,SC,MG" ~/Desktop/lido-export
#
# - Ritenta automaticamente su timeout / "server too busy" / rate-limit,
#   ruotando tra più server Overpass e con attesa crescente.
# - È idempotente: se un file è già stato scaricato bene, lo salta.
#   Quindi se qualcosa fallisce, RILANCIA lo stesso comando: riprende solo i mancanti.
#
# Poi: carica i file exportXX.geojson qui in chat e ti genero la migrazione SQL.

set -u
ISOS="${1:?Uso: ./fetch_osm.sh \"KE,TZ,MZ\" [cartella]}"
OUT="${2:-./lido-export}"
mkdir -p "$OUT"

# server Overpass (si ruota tra questi a ogni tentativo)
ENDPOINTS=(
  "https://overpass-api.de/api/interpreter"
  "https://overpass-api.de/api/interpreter"
  "https://overpass.kumi.systems/api/interpreter"
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
  "https://overpass.private.coffee/api/interpreter"
  "https://overpass-api.de/api/interpreter"
)
MAX_TRIES=6          # tentativi per Paese
TIMEOUT=600          # secondi per singola richiesta (fallisce prima, niente attese lunghe)

fetch_one() {
  local iso="$1"
  local dest="$OUT/export${iso}.geojson"

  # già scaricato e valido? salta.
  if [ -s "$dest" ] && grep -q '"elements"' "$dest" && ! grep -qiE 'runtime error|rate_limited|too many requests' "$dest"; then
    echo "  ✓ ${iso}: già presente, salto ($(wc -c < "$dest" | tr -d ' ') byte)"
    return 0
  fi

  local query="[out:json][timeout:${TIMEOUT}];area[\"ISO3166-1\"=\"${iso}\"][admin_level=2]->.a;(nwr[\"leisure\"=\"beach_resort\"](area.a);nwr[\"leisure\"=\"marina\"](area.a););out center tags;"
  local tmp; tmp="$(mktemp)"

  local try
  for (( try=1; try<=MAX_TRIES; try++ )); do
    local ep="${ENDPOINTS[$(( (try-1) % ${#ENDPOINTS[@]} ))]}"
    echo "  → ${iso}: tentativo ${try}/${MAX_TRIES} su ${ep#https://}"
    local code
    code="$(curl -sS --max-time "$TIMEOUT" -o "$tmp" -w '%{http_code}' \
             --data-urlencode "data=${query}" "$ep" 2>/dev/null || echo 000)"

    if [ "$code" = "200" ] && grep -q '"elements"' "$tmp" \
       && ! grep -qiE 'runtime error|rate_limited|too many requests|dispatcher' "$tmp"; then
      mv "$tmp" "$dest"
      local n; n="$(grep -o '"type"' "$dest" | wc -l | tr -d ' ')"
      echo "  ✓ ${iso}: OK (~${n} elementi) → ${dest}"
      return 0
    fi

    # fallito: attesa FISSA breve prima di riprovare (niente più backoff lungo)
    echo "    …non riuscito (http ${code}); riprovo tra 8s"
    sleep 8
  done

  rm -f "$tmp"
  echo "  ✗ ${iso}: FALLITO dopo ${MAX_TRIES} tentativi — rilancia il comando più tardi."
  return 1
}

echo "Scarico: ${ISOS}  →  ${OUT}"
IFS=',' read -ra LIST <<< "$ISOS"
fail=0
for raw in "${LIST[@]}"; do
  iso="$(echo "$raw" | tr '[:lower:]' '[:upper:]' | tr -d ' ')"
  [ -z "$iso" ] && continue
  fetch_one "$iso" || fail=1
  sleep 3            # pausa gentile tra un Paese e l'altro
done

echo ""
if [ "$fail" = "0" ]; then
  echo "FATTO ✓  Tutti i file sono in: ${OUT}"
else
  echo "ALCUNI PAESI NON SCARICATI. Rilancia lo stesso comando: riprende solo i mancanti."
fi
echo "Ora carica i file ${OUT}/export*.geojson qui in chat."
