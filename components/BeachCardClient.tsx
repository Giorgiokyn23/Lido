"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { metricsForTipo, COUNTRIES, RANK_MIN, type BeachScore } from "@/lib/types";

const flagFor = (code: string | null) => COUNTRIES.find((c) => c.code === code)?.flag ?? "";
const metricValue = (b: BeachScore, key: string) =>
  (b as unknown as Record<string, number | null>)[`avg_${key}`] ?? null;

export function BeachCardClient({ beach }: { beach: BeachScore }) {
  const tm = useTranslations("metrics");
  const tc = useTranslations("card");
  const overall = beach.avg_overall;

  /**
   * SOTTO LE DIECI RECENSIONI NON SI MOSTRA UN PUNTEGGIO. Non è prudenza
   * estetica: è la regola del prodotto, scritta in chiaro sulla pagina delle
   * classifiche — «un lido entra in graduatoria solo dopo un numero minimo di
   * recensioni, e finché non lo raggiunge non gli assegniamo alcuna
   * posizione». La home faceva l'opposto, e mostrava 5,0 in grande su schede
   * con UNA recensione.
   *
   * Il danno è doppio. Verso chi legge, una pagina piena di cinque pieni su
   * una recensione sola si riconosce a vista come un punteggio che non vuol
   * dire niente, e porta a dubitare anche delle classifiche vere — che
   * invece sono costruite bene. Verso di noi, contraddiceva per iscritto la
   * cosa su cui il progetto fonda la propria credibilità.
   *
   * Al posto del voto c'è quanto manca. Che è anche l'unica informazione
   * davvero utile lì: dice perché vale la pena scrivere una recensione.
   */
  const soglia = RANK_MIN.comune;
  const inClassifica = beach.reviews_count >= soglia;

  return (
    <Link
      href={`/lido/${beach.id}`}
      className="group flex flex-col rounded-2xl border border-sea-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-tight text-sea-900 group-hover:text-sea-600">
            {beach.nome}
          </h3>
          <p className="text-sm text-sea-500">
            {flagFor(beach.paese)} {beach.localita} · {beach.regione}
          </p>
        </div>
        {inClassifica ? (
          <div className="shrink-0 rounded-xl bg-sea-500 px-2.5 py-1.5 text-center text-white">
            <div className="text-lg font-bold leading-none tabular-nums">
              {overall == null ? "—" : overall.toFixed(1)}
            </div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">/ 5</div>
          </div>
        ) : (
          <div className="shrink-0 rounded-xl border border-sea-200 bg-sea-50 px-2.5 py-1.5 text-center text-sea-600">
            <div className="text-lg font-bold leading-none tabular-nums">
              {beach.reviews_count}
              <span className="text-xs font-medium opacity-60">/{soglia}</span>
            </div>
            {/* Etichetta corta: «verso la classifica» era larga abbastanza da
                spingere il nome del bagno su due righe. Il perché sta nella
                riga sotto, che ha spazio per dirlo per esteso. */}
            <div className="text-[10px] uppercase tracking-wide opacity-70">{tc("verso")}</div>
          </div>
        )}
      </div>

      {inClassifica ? (
        // In classifica: la griglia completa dei criteri è il nostro tratto
        // distintivo, e su questi numeri si regge perché ci sono abbastanza
        // recensioni dietro.
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {metricsForTipo(beach.tipo).map((m) => {
            const val = metricValue(beach, m.key);
            const pct = Math.round(((val ?? 0) / 5) * 100);
            return (
              <div key={m.key}>
                <div className="flex justify-between text-[11px] text-sea-600">
                  <span className="truncate">{tm(m.key)}</span>
                  <span className="tabular-nums">{val == null ? "—" : val.toFixed(1)}</span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-sea-100">
                  <div className="h-full rounded-full bg-sea-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Sotto soglia: niente barre. Dieci medie calcolate su una recensione
        // sono dieci numeri che sembrano misure e non lo sono, e riempiono la
        // card di righe tutte uguali che non distinguono una scheda dall'altra.
        <p className="mt-4 text-xs text-sea-500">
          {beach.reviews_count === 0
            ? tc("noReviews")
            : tc("mancano", { n: soglia - beach.reviews_count })}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
        <span className="text-sea-400">
          {tc("reviews", { count: beach.reviews_count })}
          {beach.distanza_ombrelloni_metri != null && (
            <span> · {tc("umbrellas", { m: beach.distanza_ombrelloni_metri })}</span>
          )}
        </span>
        {/* piccolo invito: la card è la via per recensire */}
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition group-hover:bg-amber-100">
          ✍️ {tc("reviewShort")}
        </span>
      </div>
      {beach.id_concessione && (
        <div className="mt-1 font-mono text-[10px] text-sea-300">conc. {beach.id_concessione}</div>
      )}
    </Link>
  );
}
