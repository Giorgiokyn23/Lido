import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { COUNTRIES, CONTINENTS, CONTINENT_OF, FLAG_OF, RANK_MIN, type BeachRanking } from "@/lib/types";

export const dynamic = "force-dynamic";

const REGIONI = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Marche", "Molise",
  "Puglia", "Sardegna", "Sicilia", "Toscana", "Veneto",
];

type Scope = "nazionale" | "regione" | "comune";

const medal = (n: number) => (n === 1 ? "🥇" : n === 2 ? "🥈" : n === 3 ? "🥉" : `#${n}`);

export default async function ClassifichePage({
  searchParams,
}: {
  searchParams: { scope?: string; regione?: string; comune?: string; paese?: string };
}) {
  const tc = await getTranslations("countries");
  const tcont = await getTranslations("continents");
  const tr = await getTranslations("rankings");

  const paese = (searchParams.paese || "IT").toUpperCase();
  const isIT = paese === "IT";
  const flag = COUNTRIES.find((c) => c.code === paese)?.flag ?? "";

  // Solo l'Italia ha comunale/regionale (regioni + comuni curati).
  const scope: Scope = isIT
    ? searchParams.scope === "regione" || searchParams.scope === "comune"
      ? (searchParams.scope as Scope)
      : "nazionale"
    : "nazionale";
  const regione = searchParams.regione || "Toscana";
  const comune = searchParams.comune || "Livorno";

  const supabase = createClient();
  let query = supabase.from("beach_rankings").select("*").eq("paese", paese);

  if (scope === "regione") {
    query = query.eq("regione", regione).order("rank_regione").limit(50);
  } else if (scope === "comune") {
    query = query.eq("localita", comune).order("rank_comune").limit(50);
  } else {
    query = query.order("rank_nazionale").limit(100);
  }

  const { data, error } = await query;
  const allRows = (data ?? []) as BeachRanking[];
  // soglia minima di recensioni per l'ambito selezionato:
  // un lido entra in classifica solo con abbastanza recensioni (niente "migliore" da pochi dati)
  const minReviews =
    scope === "regione" ? RANK_MIN.regione : scope === "comune" ? RANK_MIN.comune : RANK_MIN.nazionale;
  const rows = allRows.filter((r) => (r.reviews_count ?? 0) >= minReviews);
  const rankKey =
    scope === "regione" ? "rank_regione" : scope === "comune" ? "rank_comune" : "rank_nazionale";

  const tabHref = (s: Scope) => {
    const sp = new URLSearchParams({ paese, scope: s });
    if (s === "regione") sp.set("regione", regione);
    if (s === "comune") sp.set("comune", comune);
    return `/classifiche?${sp.toString()}`;
  };
  const countryHref = (code: string) => `/classifiche?paese=${code}`;

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-sea-600 text-white" : "bg-sea-50 text-sea-700 hover:bg-sea-100"
    }`;

  const caption =
    scope === "nazionale"
      ? tr("capNational", { flag, country: tc(paese) })
      : scope === "regione"
      ? tr("capRegion", { region: regione })
      : tr("capTown", { town: comune });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sea-900">{tr("title")}</h1>
        <p className="mt-1 text-sea-600">{tr("intro")}</p>
        <Link href="/metodologia" className="mt-1 inline-block text-sm text-sea-500 underline hover:text-sea-700">
          {tr("methodologyLink")}
        </Link>
      </div>

      {/* selettore: continenti → bandiere */}
      <div className="space-y-2">
        {CONTINENTS.map((cont) => {
          const isOpen = CONTINENT_OF[paese] === cont.key;
          return (
            <details key={cont.key} open={isOpen} className="rounded-2xl border border-sea-100 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-sea-800">
                <span>{cont.emoji}</span>
                <span>{tcont(cont.key)}</span>
                <span className="text-xs text-sea-400">{cont.codes.length}</span>
                {isOpen && <span className="ml-auto text-xs text-sea-500">{flag} {tc(paese)}</span>}
              </summary>
              <div className="flex flex-wrap gap-2 border-t border-sea-100 p-3">
                {cont.codes.map((code) => (
                  <Link key={code} href={countryHref(code)} className={chip(paese === code)}>
                    {FLAG_OF[code]} {tc(code)}
                  </Link>
                ))}
              </div>
            </details>
          );
        })}
      </div>

      {/* ambito: comunale/regionale solo per l'Italia */}
      {isIT ? (
        <div className="flex flex-wrap gap-2">
          <Link href={tabHref("comune")} className={chip(scope === "comune")}>{tr("tabComune")}</Link>
          <Link href={tabHref("regione")} className={chip(scope === "regione")}>{tr("tabRegione")}</Link>
          <Link href={tabHref("nazionale")} className={chip(scope === "nazionale")}>{tr("tabNazionale")}</Link>
        </div>
      ) : (
        <p className="text-sm text-sea-500">{tr("nationalOnly", { flag, country: tc(paese) })}</p>
      )}

      {isIT && scope === "comune" && (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="scope" value="comune" />
          <input type="hidden" name="paese" value="IT" />
          <label className="text-sm text-sea-600">{tr("townLabel")}</label>
          <input name="comune" defaultValue={comune} placeholder={tr("townPlaceholder")}
            className="rounded-lg border border-sea-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-sea-600 px-4 py-2 text-sm font-medium text-white">{tr("show")}</button>
        </form>
      )}

      {isIT && scope === "regione" && (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="scope" value="regione" />
          <input type="hidden" name="paese" value="IT" />
          <label className="text-sm text-sea-600">{tr("regionLabel")}</label>
          <select name="regione" defaultValue={regione} className="rounded-lg border border-sea-200 px-3 py-2 text-sm">
            {REGIONI.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="rounded-lg bg-sea-600 px-4 py-2 text-sm font-medium text-white">{tr("show")}</button>
        </form>
      )}

      <p className="text-sm text-sea-500">{caption}</p>

      {error && (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          {tr("errorLoad", { msg: error.message })}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-sea-200 bg-white p-8 text-center text-sea-500">
          <p className="font-medium text-sea-700">{tr("buildingTitle")}</p>
          <p className="mx-auto mt-1 max-w-xl text-sm">{tr("buildingBody", { n: minReviews })}</p>
          <p className="mt-3 text-sm">
            <Link href="/metodologia" className="text-sea-700 underline">{tr("methodologyLink")}</Link>
            {" · "}
            <Link href="/" className="text-sea-700 underline">{tr("emptyLink")}</Link>
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <ol className="space-y-2">
          {rows.map((b) => {
            const pos = b[rankKey as keyof BeachRanking] as number;
            return (
              <li key={b.id}>
                <Link href={`/lido/${b.id}`}
                  className="flex items-center gap-4 rounded-xl border border-sea-100 bg-white p-4 shadow-sm transition hover:border-sea-300">
                  <span className="w-10 shrink-0 text-center text-lg font-bold text-sea-700">{medal(pos)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-sea-900">{b.nome}</span>
                    <span className="block truncate text-sm text-sea-500">
                      {b.localita} · {b.regione} · {tr("reviews", { n: b.reviews_count })}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-bold text-sea-700">{b.weighted_score.toFixed(2)}</span>
                    <span className="block text-xs text-sea-400">{tr("weightedScore")}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
