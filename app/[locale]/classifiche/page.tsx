import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { COUNTRIES, CONTINENTS, CONTINENT_OF, FLAG_OF, type BeachRanking } from "@/lib/types";

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

  const paese = (searchParams.paese || "IT").toUpperCase();
  const isIT = paese === "IT";
  const flag = COUNTRIES.find((c) => c.code === paese)?.flag ?? "";

  // Solo l'Italia ha comunale/regionale (regioni + comuni curati).
  // Le altre nazioni mostrano la sola classifica nazionale.
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
  const rows = (data ?? []) as BeachRanking[];
  const rankKey =
    scope === "regione" ? "rank_regione" : scope === "comune" ? "rank_comune" : "rank_nazionale";

  // link tab (solo Italia): mantiene paese=IT + ambito
  const tabHref = (s: Scope) => {
    const sp = new URLSearchParams({ paese, scope: s });
    if (s === "regione") sp.set("regione", regione);
    if (s === "comune") sp.set("comune", comune);
    return `/classifiche?${sp.toString()}`;
  };
  // link Paese: reset pulito alla nazionale di quel Paese
  const countryHref = (code: string) => `/classifiche?paese=${code}`;

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-sea-600 text-white" : "bg-sea-50 text-sea-700 hover:bg-sea-100"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sea-900">🏆 Classifiche</h1>
        <p className="mt-1 text-sea-600">
          Punteggio pesato: i bagni salgono solo con recensioni vere e verificate. Ogni Paese ha la
          sua graduatoria.
        </p>
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
          <Link href={tabHref("comune")} className={chip(scope === "comune")}>Comunale</Link>
          <Link href={tabHref("regione")} className={chip(scope === "regione")}>Regionale</Link>
          <Link href={tabHref("nazionale")} className={chip(scope === "nazionale")}>Nazionale</Link>
        </div>
      ) : (
        <p className="text-sm text-sea-500">
          {flag} Classifica nazionale — {tc(paese)}. Le graduatorie comunali e regionali per questo
          Paese arriveranno con la mappatura di dettaglio.
        </p>
      )}

      {isIT && scope === "comune" && (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="scope" value="comune" />
          <input type="hidden" name="paese" value="IT" />
          <label className="text-sm text-sea-600">Comune:</label>
          <input name="comune" defaultValue={comune} placeholder="es. Livorno"
            className="rounded-lg border border-sea-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-sea-600 px-4 py-2 text-sm font-medium text-white">Mostra</button>
        </form>
      )}

      {isIT && scope === "regione" && (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="scope" value="regione" />
          <input type="hidden" name="paese" value="IT" />
          <label className="text-sm text-sea-600">Regione:</label>
          <select name="regione" defaultValue={regione} className="rounded-lg border border-sea-200 px-3 py-2 text-sm">
            {REGIONI.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="rounded-lg bg-sea-600 px-4 py-2 text-sm font-medium text-white">Mostra</button>
        </form>
      )}

      <p className="text-sm text-sea-500">
        {scope === "nazionale"
          ? `${flag} I migliori bagni — ${tc(paese)}`
          : scope === "regione"
          ? `I migliori bagni della ${regione}`
          : `I migliori bagni di ${comune}`}
      </p>

      {error && (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Errore nel caricamento della classifica: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-sea-200 bg-white p-8 text-center text-sea-500">
          Ancora nessun bagno recensito in questo ambito. Le classifiche si popolano man mano che
          arrivano le recensioni. <Link href="/" className="text-sea-700 underline">Lascia la prima →</Link>
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
                      {b.localita} · {b.regione} · {b.reviews_count} recensioni
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-bold text-sea-700">{b.weighted_score.toFixed(2)}</span>
                    <span className="block text-xs text-sea-400">punteggio pesato</span>
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
