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
 *
 * Stile volutamente identico alle recensioni: stessa card, stesso badge
 * quadrato a sinistra. Lì dentro c'è il voto, qui il giorno. Chi scorre la
 * pagina riconosce subito il ritmo e non deve imparare un linguaggio nuovo.
 *
 * Contenuto dichiarato dal gestore: etichettato come tale, ordinato per data,
 * senza alcun effetto su punteggio o posizione in classifica.
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

  const giorno = (iso: string) => new Date(iso).toLocaleDateString(fmt, { day: "numeric" });
  const mese = (iso: string) =>
    new Date(iso).toLocaleDateString(fmt, { month: "short" }).replace(".", "");

  const quando = (e: EventoPubblico) => {
    const base = new Date(e.data_inizio).toLocaleDateString(fmt, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!e.data_fine || e.data_fine === e.data_inizio) return base;
    const f = new Date(e.data_fine).toLocaleDateString(fmt, { day: "numeric", month: "long" });
    return `${base} – ${f}`;
  };

  // "Mancano N giorni", perché un calendario senza urgenza non si guarda.
  const fraQuanto = (iso: string) => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const d = Math.round((new Date(iso).getTime() - oggi.getTime()) / 86_400_000);
    if (d <= 0) return t("evOggi");
    if (d === 1) return t("evDomani");
    if (d <= 14) return t("evFraGiorni", { giorni: d });
    return null;
  };

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-sea-900">{t("evInProgramma")}</h2>
        <Link href="/eventi" className="text-sm text-sea-600 hover:underline">
          {t("calVediTutti")}
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {eventi.map((e) => {
          const manca = fraQuanto(e.data_inizio);
          return (
            <article
              key={e.id}
              className="flex gap-3 rounded-xl border border-sea-100 bg-white p-4 shadow-sm"
            >
              {/* stesso posto che nelle recensioni occupa il voto */}
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-sea-500 text-white">
                <span className="text-lg font-bold leading-none tabular-nums">
                  {giorno(e.data_inizio)}
                </span>
                <span className="text-[10px] font-medium uppercase leading-none opacity-90">
                  {mese(e.data_inizio)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-sea-900">{e.titolo}</h3>
                  {manca ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      {manca}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs capitalize text-sea-400">{quando(e)}</p>
                {e.descrizione ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-sea-700">
                    {e.descrizione}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-sea-400">{t("evEtichetta")}</p>
    </section>
  );
}
