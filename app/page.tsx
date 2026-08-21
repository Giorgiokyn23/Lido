import { createClient } from "@/lib/supabase/server";
import { SearchFilters } from "@/components/SearchFilters";
import { BeachCard } from "@/components/BeachCard";
import { METRICS, type BeachScore } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();

  const q = (searchParams.q as string | undefined)?.trim() ?? "";

  let query = supabase
    .from("beach_scores")
    .select("*")
    .order("avg_overall", { ascending: false, nullsFirst: false })
    .limit(60);

  if (q) {
    // ricerca su nome / località / regione
    query = query.or(`nome.ilike.%${q}%,localita.ilike.%${q}%,regione.ilike.%${q}%`);
  }

  // filtri verticali: voto minimo per metrica (server-side sulle colonne aggregate)
  for (const m of METRICS) {
    const raw = searchParams[m.key];
    const min = typeof raw === "string" ? parseFloat(raw) : NaN;
    if (!Number.isNaN(min)) query = query.gte(`avg_${m.key}`, min);
  }

  const { data, error } = await query;
  const beaches = (data ?? []) as BeachScore[];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sea-400 via-sea-500 to-sea-700 px-6 pb-24 pt-14 text-center text-white shadow-xl sm:pt-16">
        {/* sole */}
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-amber-200/30 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-medium backdrop-blur">
            🏖️ 8.700+ lidi · 9 criteri verticali · tutta Italia
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Trova il lido giusto.<br className="hidden sm:block" /> Recensioni che contano davvero.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sea-50/90">
            Privacy, famiglie, accessibilità, fondale, animali, prezzi, sicurezza, rispetto delle
            regole e atmosfera: nove metriche verticali per scegliere lo stabilimento balneare
            perfetto — e segnalare gli illeciti agli enti.
          </p>
        </div>

        {/* onde */}
        <svg
          className="absolute inset-x-0 bottom-0 h-20 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="#ffffff" fillOpacity="0.18" d="M0,64 C240,120 480,0 720,40 C960,80 1200,120 1440,64 L1440,120 L0,120 Z" />
          <path fill="#ffffff" fillOpacity="0.35" d="M0,88 C240,40 480,120 720,88 C960,56 1200,24 1440,80 L1440,120 L0,120 Z" />
          <path fill="#f7f3ea" d="M0,104 C240,80 480,120 720,104 C960,88 1200,112 1440,100 L1440,120 L0,120 Z" />
        </svg>
      </section>

      <SearchFilters />

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Errore nel caricamento dei lidi: {error.message}
        </p>
      ) : beaches.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sea-500 shadow-sm">
          Nessun lido trovato con questi criteri. Prova ad azzerare i filtri.
        </p>
      ) : (
        <section>
          <p className="mb-3 text-sm text-sea-500">{beaches.length} lidi trovati</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beaches.map((b) => (
              <BeachCard key={b.id} beach={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
