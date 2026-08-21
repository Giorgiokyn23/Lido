import Link from "next/link";
import type { BeachScore } from "@/lib/types";
import { METRICS } from "@/lib/types";

const metricValue = (b: BeachScore, key: string) =>
  (b as unknown as Record<string, number | null>)[`avg_${key}`] ?? null;

export function BeachCard({ beach }: { beach: BeachScore }) {
  const overall = beach.avg_overall;
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
            {beach.localita} · {beach.regione}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-sea-500 px-2.5 py-1.5 text-center text-white">
          <div className="text-lg font-bold leading-none tabular-nums">
            {overall == null ? "—" : overall.toFixed(1)}
          </div>
          <div className="text-[10px] uppercase tracking-wide opacity-80">/ 5</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {METRICS.map((m) => {
          const val = metricValue(beach, m.key);
          const pct = Math.round(((val ?? 0) / 5) * 100);
          return (
            <div key={m.key}>
              <div className="flex justify-between text-[11px] text-sea-600">
                <span className="truncate">{m.label}</span>
                <span className="tabular-nums">{val == null ? "—" : val.toFixed(1)}</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-sea-100">
                <div className="h-full rounded-full bg-sea-400" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-sea-400">
        <span>{beach.reviews_count} recensioni</span>
        {beach.distanza_ombrelloni_metri != null && (
          <span>{beach.distanza_ombrelloni_metri} m tra ombrelloni</span>
        )}
      </div>
    </Link>
  );
}
