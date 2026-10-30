import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Stato della scheda: rivendicata dal gestore oppure no.
 *
 * REGOLA DI PRESENTAZIONE (dalla guida tecnica, sezione 07): la differenza fra
 * verificato e non rivendicato deve passare da gerarchia, contenuto e sigillo,
 * NON da colori che suggeriscano una superiorità qualitativa. Una scheda non
 * rivendicata non è peggiore: semplicemente nessuno ne ha ancora preso in
 * carico i dati. Nessuno dei due stati tocca punteggio o classifica.
 */

export function SigilloProfilo({ stato, etichetta }: { stato: string; etichetta: string }) {
  if (stato === "verificato") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sea-50 px-2.5 py-0.5 text-[11px] font-medium text-sea-700 ring-1 ring-inset ring-sea-200">
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="currentColor">
          <path d="M6.3 11.3 3.5 8.5l1-1 1.8 1.8 4.2-4.2 1 1z" />
          <path
            d="M8 1.5 9.8 3h2.4v2.4L14 7.2v1.6L12.2 10.6V13H9.8L8 14.5 6.2 13H3.8v-2.4L2 8.8V7.2L3.8 5.4V3h2.4z"
            fillOpacity="0.18"
          />
        </svg>
        {etichetta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sea-50/60 px-2.5 py-0.5 text-[11px] font-medium text-sea-500 ring-1 ring-inset ring-sea-100">
      {etichetta}
    </span>
  );
}

/**
 * Invito al gestore, mostrato solo sulle schede non ancora rivendicate.
 * È l'ingresso gratuito del prodotto per i gestori: nessun prezzo, nessun
 * vantaggio in classifica, solo il controllo dei propri dati.
 */
export async function RivendicaCta({ beachId, stato }: { beachId: string; stato: string }) {
  if (stato === "verificato" || stato === "sospeso") return null;
  const t = await getTranslations("gestore");
  const inCorso = stato === "in_attesa";

  return (
    <section className="rounded-2xl border border-dashed border-sea-200 bg-sea-50/40 p-5">
      <h2 className="text-base font-semibold text-sea-900">{t("ctaTitolo")}</h2>
      <p className="mt-1 text-sm text-sea-600">{inCorso ? t("ctaInCorso") : t("ctaCorpo")}</p>
      {!inCorso ? (
        <Link
          href={`/area-gestore/rivendica?beach=${beachId}`}
          className="mt-3 inline-block rounded-full bg-sea-500 px-4 py-2 text-sm font-medium text-white hover:bg-sea-600"
        >
          {t("ctaBottone")}
        </Link>
      ) : null}
      <p className="mt-3 text-[11px] text-sea-400">{t("ctaNota")}</p>
    </section>
  );
}
