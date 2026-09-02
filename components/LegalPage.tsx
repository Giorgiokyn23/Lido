import { Link } from "@/i18n/navigation";

export type LegalSection = { h: string; body: string[] };

export type LegalContent = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
  draftNote?: string;
  backLabel: string;
};

/**
 * Impaginazione condivisa per le pagine legali (privacy, termini, ecc.).
 * Server component: nessuno stato, solo contenuto passato come props.
 */
export function LegalPage({ c }: { c: LegalContent }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-sea-500 hover:underline">
          {c.backLabel}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-sea-900">{c.title}</h1>
        <p className="mt-1 text-xs text-sea-400">{c.updated}</p>
      </div>

      {c.draftNote ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {c.draftNote}
        </div>
      ) : null}

      {c.intro ? <p className="text-sea-600">{c.intro}</p> : null}

      <div className="space-y-6 rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
        {c.sections.map((s, i) => (
          <section key={i} className="space-y-2">
            <h2 className="text-lg font-semibold text-sea-800">{s.h}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="text-sm leading-relaxed text-sea-600">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
