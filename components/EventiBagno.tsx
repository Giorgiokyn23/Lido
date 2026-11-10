import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type EventoPubblico = {
  id: string;
  titolo: string;
  descrizione: string | null;
  data_inizio: string;
  data_fine: string | null;
};

/**
 * Eventi in programma sulla scheda dello stabilimento.
 * Contenuto dichiarato dal gestore: etichettato come tale, ordinato per data,
 * e senza alcun effetto su punteggio o posizione in classifica.
 */
export async function EventiBagno({
  eventi,
  locale,
}: {
  eventi: EventoPubblico[];
  locale: string;
}) {
  if (!eventi || eventi.length === 0) return null;
  const t = await getTranslations("gestore");
  const fmt = locale === "en" ? "en-GB" : "it-IT";

  const quando = (e: EventoPubblico) => {
    const i = new Date(e.data_inizio).toLocaleDateString(fmt, {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
    if (!e.data_fine || e.data_fine === e.data_inizio) return i;
    const f = new Date(e.data_fine).toLocaleDateString(fmt, { day: "numeric", month: "long" });
    return `${i} – ${f}`;
  };

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sea-900">{t("evInProgramma")}</h2>
        <Link href="/eventi" className="text-sm text-sea-600 hover:underline">
          {t("calVediTutti")}
        </Link>
      </div>

      <ul className="mt-3 space-y-3">
        {eventi.map((e) => (
          <li key={e.id} className="border-l-2 border-sea-200 pl-3">
            <div className="text-xs font-medium uppercase tracking-wide text-sea-400">
              {quando(e)}
            </div>
            <div className="font-medium text-sea-900">{e.titolo}</div>
            {e.descrizione ? (
              <p className="mt-0.5 text-sm text-sea-600">{e.descrizione}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] text-sea-400">{t("evEtichetta")}</p>
    </section>
  );
}
