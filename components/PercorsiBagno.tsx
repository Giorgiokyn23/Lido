import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { numeroTappa } from "@/lib/percorsi";

type Riga = { slug: string; titolo: string; tema: string | null; ordine: number; tappe: number };

/**
 * «Questo stabilimento è tappa di N percorsi», sulla scheda del bagno.
 *
 * È IL PEZZO CHE VALE DI PIÙ PER NOI di tutta la faccenda dei percorsi. Su una
 * scheda non rivendicata — cioè quasi tutte — questa riga è l'argomento
 * migliore che abbiamo per convincere un gestore a prendersela: non «c'è una
 * pagina su di te», ma «ti stiamo già portando gente, e la pagina dove
 * arrivano non la curi tu».
 *
 * Non compare quando non c'è niente: un riquadro «fa parte di 0 percorsi»
 * sarebbe un modo di far notare un'assenza.
 */
export async function PercorsiBagno({ percorsi }: { percorsi: Riga[] }) {
  const t = await getTranslations("percorsi");
  if (percorsi.length === 0) return null;

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-sea-900">
        {t("tappaDi", { n: percorsi.length })}
      </h2>
      <ul className="mt-3 space-y-2">
        {percorsi.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/percorsi/${p.slug}`}
              className="flex items-center gap-3 rounded-xl border border-sea-100 px-3 py-2.5 transition hover:bg-sea-50"
            >
              <span className="shrink-0 font-mono text-sm font-semibold text-sea-400">
                {numeroTappa(p.ordine)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-sea-900">{p.titolo}</span>
                <span className="block text-xs text-sea-500">
                  {t("tappaSu", { ordine: p.ordine, tappe: p.tappe })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
