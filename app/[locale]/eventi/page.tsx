import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/public";
import { TIPI_EVENTO } from "@/lib/profilo";
import { FiltriEventi, type EventoCalendario } from "@/components/FiltriEventi";

export const metadata: Metadata = {
  title: "LidoRank — Eventi sulla costa",
  alternates: { canonical: "/eventi" },
};

/**
 * Il calendario degli eventi della costa.
 *
 * PERCHÉ NON LEGGE PIÙ searchParams. La versione precedente filtrava per
 * località con un parametro nell'indirizzo, e questo bastava a rendere la
 * pagina dinamica: ogni combinazione di filtri la faceva ricalcolare da capo.
 * Ora il server manda l'elenco intero — poche centinaia di righe — e i filtri
 * lavorano nel browser. La pagina torna a essere una sola, in cache per tutti,
 * e in cambio i filtri non ricaricano più niente.
 */
export const revalidate = 7200;

export default async function EventiPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("eventi");
  // I nomi dei tipi di evento esistono già, sotto «gestore», perché li usano
  // il modulo di pubblicazione e la scheda del bagno. Riusarli invece di
  // ricrearli evita il caso peggiore: due traduzioni della stessa cosa che
  // col tempo divergono, e lo stesso evento chiamato in due modi diversi su
  // due pagine.
  const tg = await getTranslations("gestore");

  const supabase = createPublicClient();
  const { data } = await supabase.from("calendario_eventi").select("*").limit(300);
  const eventi = (data ?? []) as EventoCalendario[];

  // Si traducono qui, una volta sola: il componente client riceve un
  // dizionario e non ha bisogno del suo traduttore.
  const etichette = Object.fromEntries(TIPI_EVENTO.map((v) => [v, tg(`evento_${v}`)]));

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold text-sea-900">{t("titolo")}</h1>
        <p className="mt-1 text-sea-600">{t("sottotitolo")}</p>
      </div>

      <FiltriEventi eventi={eventi} locale={locale} etichette={etichette} />

      <p className="text-[11px] text-sea-400">{t("nota")}</p>
    </div>
  );
}
