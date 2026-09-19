import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

// Dashboard interna KPI — storica (legge dal DB, dalla prima recensione a oggi).
// Accesso: utente loggato con email in ADMIN_EMAILS (variabile d'ambiente,
// separata da virgole). Se non impostata → 404 (default sicuro).
export const dynamic = "force-dynamic";

type Row = {
  id: string; beach_id: string; user_id: string | null; ip_hash: string | null;
  stato: string; peso: number | null; commento: string | null; created_at: string;
};

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-sea-100 bg-white p-4 shadow-sm">
    <div className="text-xs font-medium uppercase tracking-wide text-sea-400">{label}</div>
    <div className="mt-1 text-3xl font-bold tabular-nums text-sea-900">{value}</div>
    {sub ? <div className="mt-0.5 text-xs text-sea-500">{sub}</div> : null}
  </div>
);

export default async function AdminPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);

  // --- gate ---
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const supaAuth = createClient();
  const { data: { user } } = await supaAuth.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  if (!email || allow.length === 0 || !allow.includes(email)) notFound();

  // --- dati (storici) ---
  const supa = createPublicClient();
  const [{ data: revData }, { count: schedeTotali }, { count: notices }] = await Promise.all([
    supa.from("reviews").select("id,beach_id,user_id,ip_hash,stato,peso,commento,created_at").limit(50000),
    supa.from("beaches").select("*", { count: "exact", head: true }),
    supa.from("review_notices").select("*", { count: "exact", head: true }),
  ]);
  const rows = (revData ?? []) as Row[];
  const valid = rows.filter((r) => (r.stato === "pubblicata" || r.stato === "ridotta") && (r.peso ?? 0) > 0);

  // per bagno
  const perBeach = new Map<string, number>();
  for (const r of valid) perBeach.set(r.beach_id, (perBeach.get(r.beach_id) ?? 0) + 1);
  const bagniRecensiti = perBeach.size;
  const inClassifica = [...perBeach.values()].filter((n) => n >= 10).length;
  const avgPerBeach = bagniRecensiti ? (valid.length / bagniRecensiti).toFixed(1) : "0";

  // qualità
  const verificate = valid.filter((r) => r.user_id).length;
  const conCommento = valid.filter((r) => r.commento).length;
  const pctVer = valid.length ? Math.round((verificate / valid.length) * 100) : 0;
  const pctComm = valid.length ? Math.round((conCommento / valid.length) * 100) : 0;

  // ripetuti
  const byUser = new Map<string, number>(), byIp = new Map<string, number>();
  for (const r of valid) {
    if (r.user_id) byUser.set(r.user_id, (byUser.get(r.user_id) ?? 0) + 1);
    else if (r.ip_hash) byIp.set(r.ip_hash, (byIp.get(r.ip_hash) ?? 0) + 1);
  }
  const ripetutiReg = [...byUser.values()].filter((n) => n > 1).length;

  // moderazione
  const shadow = rows.filter((r) => r.stato === "shadow").length;
  const pctQuar = rows.length ? Math.round((shadow / rows.length) * 100) : 0;

  // crescita settimanale (dalla prima recensione)
  const weekKey = (d: Date) => { const x = new Date(d); const day = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - day); return x.toISOString().slice(0, 10); };
  const weeks = new Map<string, number>();
  for (const r of valid) { const k = weekKey(new Date(r.created_at)); weeks.set(k, (weeks.get(k) ?? 0) + 1); }
  const wk = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxWk = Math.max(1, ...wk.map((w) => w[1]));

  // top località (solo bagni recensiti → poche righe)
  const ids = [...perBeach.keys()];
  let topLoc: { localita: string; n: number }[] = [];
  if (ids.length) {
    const { data: bs } = await supa.from("beaches").select("id,localita").in("id", ids);
    const locByBeach = new Map((bs ?? []).map((b: { id: string; localita: string }) => [b.id, b.localita]));
    const loc = new Map<string, number>();
    for (const [bid, n] of perBeach) { const l = locByBeach.get(bid) ?? "—"; loc.set(l, (loc.get(l) ?? 0) + n); }
    topLoc = [...loc.entries()].map(([localita, n]) => ({ localita, n })).sort((a, b) => b.n - a.n).slice(0, 12);
  }

  const first = valid.length ? new Date(Math.min(...valid.map((r) => +new Date(r.created_at)))).toLocaleDateString("it-IT") : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">Dashboard KPI</h1>
        <p className="text-sm text-sea-500">Dati storici dal {first} a oggi · uso interno</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Recensioni valide" value={valid.length.toLocaleString("it-IT")} sub={`${rows.length.toLocaleString("it-IT")} totali (incl. moderate)`} />
        <Tile label="Bagni recensiti" value={bagniRecensiti.toLocaleString("it-IT")} sub={`su ${(schedeTotali ?? 0).toLocaleString("it-IT")} schede`} />
        <Tile label="In classifica (≥10)" value={inClassifica.toLocaleString("it-IT")} sub={`${avgPerBeach} recensioni/bagno`} />
        <Tile label="Da account" value={`${pctVer}%`} sub={`${verificate.toLocaleString("it-IT")} verificate`} />
        <Tile label="Con commento" value={`${pctComm}%`} />
        <Tile label="Recensori ripetuti" value={ripetutiReg.toLocaleString("it-IT")} sub={`registrati con >1 recensione`} />
        <Tile label="In quarantena" value={`${pctQuar}%`} sub={`${shadow} recensioni`} />
        <Tile label="Segnalazioni DSA" value={(notices ?? 0).toLocaleString("it-IT")} />
      </div>

      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">Crescita settimanale (recensioni valide)</h2>
        <div className="mt-4 flex h-40 items-end gap-1 overflow-x-auto">
          {wk.map(([w, n]) => (
            <div key={w} className="flex min-w-[10px] flex-1 flex-col items-center justify-end" title={`${w}: ${n}`}>
              <div className="w-full rounded-t bg-sea-400" style={{ height: `${Math.round((n / maxWk) * 100)}%` }} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-sea-400">{wk.length} settimane · picco {maxWk}/settimana</p>
      </section>

      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">Top località per recensioni</h2>
        <div className="mt-3 space-y-1.5">
          {topLoc.map((l) => (
            <div key={l.localita} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate text-sea-700">{l.localita}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-sea-100">
                <div className="h-full rounded-full bg-sea-500" style={{ width: `${Math.round((l.n / topLoc[0].n) * 100)}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-sea-600">{l.n}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
