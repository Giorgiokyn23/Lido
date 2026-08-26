#!/usr/bin/env python3
"""
LidoRank — ETL geografico industrializzato (qualsiasi Paese, dato l'ISO).

Sostituisce gli script per-cluster: uno strumento solo, guidato dall'ISO.
Per ogni Paese: legge l'export OSM (GeoJSON da overpass-turbo), assegna la
regione reale via point-in-polygon su Natural Earth admin-1, deduplica per
osm_id, preferisce i nomi in alfabeto latino, e genera una migrazione SQL
idempotente (upsert su osm_id).

USO
  python scripts/gen_country.py \
      --iso MA,DZ,TN,LY,EG \
      --label cluster7_nordafrica \
      --migration 0025 \
      --uploads /percorso/agli/export \
      --ne ne_admin1.geojson \
      --out supabase/migrations

Trova automaticamente i file che finiscono con "export<ISO>.geojson"
(es. exportMA.geojson). Stampa un riepilogo per Paese.
"""
import json, os, re, argparse, glob

# Registro Paesi: ISO-2 -> nome italiano. Esteso man mano che si aggiungono continenti.
REGISTRO = {
    # Europa (già in produzione)
    "IT":"Italia","ES":"Spagna","FR":"Francia","PT":"Portogallo","MT":"Malta","MC":"Monaco",
    "HR":"Croazia","GR":"Grecia","SI":"Slovenia","ME":"Montenegro","AL":"Albania",
    "CY":"Cipro","IL":"Israele","TR":"Turchia","GB":"Regno Unito","IE":"Irlanda",
    "NL":"Paesi Bassi","BE":"Belgio","DE":"Germania","DK":"Danimarca","SE":"Svezia",
    "PL":"Polonia","FI":"Finlandia","NO":"Norvegia","RO":"Romania","BG":"Bulgaria",
    # Africa — costa mediterranea e atlantica
    "MA":"Marocco","DZ":"Algeria","TN":"Tunisia","LY":"Libia","EG":"Egitto",
    "MR":"Mauritania","SN":"Senegal","GM":"Gambia","GW":"Guinea-Bissau","GN":"Guinea",
    "SL":"Sierra Leone","LR":"Liberia","CI":"Costa d'Avorio","GH":"Ghana","TG":"Togo",
    "BJ":"Benin","NG":"Nigeria","CM":"Camerun","GA":"Gabon","CG":"Congo","AO":"Angola",
    "NA":"Namibia","ZA":"Sudafrica","MZ":"Mozambico","TZ":"Tanzania","KE":"Kenya",
    "SO":"Somalia","DJ":"Gibuti","ER":"Eritrea","SD":"Sudan","MG":"Madagascar",
    "MU":"Mauritius","SC":"Seychelles","CV":"Capo Verde",
    # Americhe — Messico, Caraibi, Sud e Nord America
    "MX":"Messico","DO":"Rep. Dominicana","CU":"Cuba","JM":"Giamaica","BS":"Bahamas",
    "PR":"Porto Rico","BB":"Barbados","AW":"Aruba","TT":"Trinidad e Tobago","KY":"Isole Cayman",
    "BR":"Brasile","AR":"Argentina","UY":"Uruguay","CL":"Cile","CO":"Colombia",
    "EC":"Ecuador","PE":"Perù","VE":"Venezuela","US":"Stati Uniti","CA":"Canada",
    # Asia-Pacifico
    "TH":"Thailandia","ID":"Indonesia","VN":"Vietnam","PH":"Filippine","MY":"Malaysia",
    "KH":"Cambogia","SG":"Singapore","MM":"Myanmar","BN":"Brunei","LK":"Sri Lanka",
    "MV":"Maldive","IN":"India","BD":"Bangladesh","JP":"Giappone","KR":"Corea del Sud",
    "TW":"Taiwan","CN":"Cina","HK":"Hong Kong","AU":"Australia","NZ":"Nuova Zelanda",
    "FJ":"Figi","NC":"Nuova Caledonia","PF":"Polinesia Francese","GU":"Guam",
}

LAT = re.compile(r"[A-Za-zÀ-ÿ]")

def pick_name(p):
    prim = p.get("name")
    if prim and LAT.search(prim):
        return prim
    for k in ("name:en","name:fr","name:it","int_name","name:latin"):
        v = p.get(k)
        if v and LAT.search(v):
            return v
    return prim  # può restare non-latino: dato OSM reale, non si inventa

def q(s):
    return "'" + s.replace("'", "''") + "'"

def iter_points(d):
    """Normalizza due formati: GeoJSON di overpass-turbo (features) e
    JSON grezzo dell'API Overpass (elements). Restituisce (props, lon, lat, osmid)."""
    if isinstance(d.get("features"), list):           # overpass-turbo GeoJSON
        for ft in d["features"]:
            p = ft.get("properties") or {}
            g = ft.get("geometry") or {}
            c = g.get("coordinates")
            if not c or len(c) != 2:
                continue
            osmid = p.get("@id") or ft.get("id")
            yield p, float(c[0]), float(c[1]), osmid
    elif isinstance(d.get("elements"), list):         # API Overpass grezza (out center tags)
        for el in d["elements"]:
            p = el.get("tags") or {}
            if "lat" in el and "lon" in el:
                lat, lon = el["lat"], el["lon"]
            elif isinstance(el.get("center"), dict):
                lat, lon = el["center"].get("lat"), el["center"].get("lon")
            else:
                continue
            if lat is None or lon is None:
                continue
            osmid = f"{el.get('type')}/{el.get('id')}"
            yield p, float(lon), float(lat), osmid

def load_regions(ne_path, iso_set):
    from shapely.geometry import shape
    ne = json.load(open(ne_path))
    geoms, names = [], []
    for ft in ne["features"]:
        pr = ft["properties"]
        if pr.get("iso_a2") in iso_set and ft.get("geometry"):
            try:
                geoms.append(shape(ft["geometry"]))
            except Exception:
                continue
            names.append(pr.get("name") or pr.get("iso_3166_2") or "")
    return geoms, names

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--iso", required=True, help="lista ISO-2 separata da virgola, es: MA,DZ,TN")
    ap.add_argument("--label", required=True, help="es: cluster7_nordafrica")
    ap.add_argument("--migration", required=True, help="prefisso numerico, es: 0025")
    ap.add_argument("--uploads", required=True, help="cartella con gli export GeoJSON")
    ap.add_argument("--ne", default="ne_admin1.geojson", help="Natural Earth admin-1 geojson")
    ap.add_argument("--out", default="supabase/migrations")
    ap.add_argument("--chunk", type=int, default=1500)
    ap.add_argument("--snap", type=float, default=0.12, help="soglia snap alla provincia più vicina (gradi)")
    args = ap.parse_args()

    from shapely.geometry import Point
    from shapely.strtree import STRtree

    isos = [x.strip().upper() for x in args.iso.split(",") if x.strip()]
    iso_set = set(isos)
    geoms, names = load_regions(args.ne, iso_set)
    tree = STRtree(geoms)
    print(f"province Natural Earth nei Paesi richiesti: {len(geoms)}")

    def region_of(lon, lat):
        pt = Point(lon, lat)
        for i in tree.query(pt):
            if geoms[i].contains(pt):
                return names[i]
        try:
            j = tree.nearest(pt)
            if pt.distance(geoms[j]) < args.snap:
                return names[j]
        except Exception:
            pass
        return None

    # trova TUTTI i file export per un ISO (supporta il tiling: exportUS.geojson + exportUS-1.geojson…)
    def find_files(iso):
        hits = set()
        for pat in (f"*export{iso}.geojson", f"*export{iso}-*.geojson", f"*export_{iso}.geojson"):
            hits.update(glob.glob(os.path.join(args.uploads, pat)))
        return sorted(hits)

    seen, rows, nreg = set(), [], 0
    per_paese = {}
    for iso in isos:
        files = find_files(iso)
        itname = REGISTRO.get(iso, iso)
        if not files:
            print(f"  [!] {iso} ({itname}): nessun file trovato in {args.uploads} — salto")
            continue
        st = ma = 0
        pts = []
        for f in files:
            pts.extend(iter_points(json.load(open(f, encoding="utf-8"))))
        for p, lon, lat, osmid in pts:
            nm = pick_name(p)
            if not nm:
                continue
            if not osmid or osmid in seen:
                continue
            seen.add(osmid)
            reg = region_of(lon, lat)
            if reg: nreg += 1
            regione = reg or itname
            loc = (p.get("addr:city") or p.get("addr:town") or p.get("is_in") or reg or itname).strip()
            leis = p.get("leisure")
            tipo = "stabilimento" if leis == "beach_resort" else "marina"
            cat = "Stabilimento balneare" if leis == "beach_resort" else "Marina / Punto di ormeggio"
            if tipo == "stabilimento": st += 1
            else: ma += 1
            rows.append((q(osmid), q(nm.strip()), q(loc), q(regione), str(lat), str(lon),
                         q(cat), "'"+tipo+"'", "'OSM'", "'"+iso+"'"))
        per_paese[iso] = (itname, st, ma)
        srcs = f"{len(files)} file" if len(files) > 1 else os.path.basename(files[0])
        print(f"  {iso} ({itname}): stabilimenti={st} marine={ma}  [{srcs}]")

    if not rows:
        print("Nessuna riga generata. Controlla che i file siano nella cartella --uploads.")
        return
    pct = 100*nreg/len(rows)
    print(f"TOTALE righe: {len(rows)}  |  con regione reale: {nreg} ({pct:.0f}%)")

    HEAD = ("insert into public.beaches\n"
            "  (osm_id, nome, localita, regione, lat, lng, categoria, tipo, fonte, paese)\nvalues\n")
    TAIL = ("\non conflict (osm_id) do update set\n"
            "  nome=excluded.nome, localita=excluded.localita, regione=excluded.regione,\n"
            "  lat=excluded.lat, lng=excluded.lng, categoria=excluded.categoria,\n"
            "  tipo=excluded.tipo, fonte=excluded.fonte, paese=excluded.paese;\n")
    os.makedirs(args.out, exist_ok=True)
    parts = [rows[i:i+args.chunk] for i in range(0, len(rows), args.chunk)]
    for idx, ch in enumerate(parts, 1):
        body = ",\n".join("  (" + ", ".join(r) + ")" for r in ch)
        head = (f"-- LidoRank - {args.label} (OSM + regioni reali Natural Earth)\n"
                f"-- Paesi: {', '.join(isos)}. Esegui DOPO 0016 (osm_id). Idempotente (upsert su osm_id).\n"
                ) if idx == 1 else f"-- {args.label} parte {idx}/{len(parts)}\n"
        fn = os.path.join(args.out, f"{args.migration}_{args.label}_part{idx}.sql")
        open(fn, "w").write(head + HEAD + body + TAIL)
        print(f"  scritto {fn}  ({len(ch)} righe, {os.path.getsize(fn)//1024} KB)")

if __name__ == "__main__":
    main()
