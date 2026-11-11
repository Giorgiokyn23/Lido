import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * La porta d'ingresso dei gestori, in fondo alla home.
 *
 * Serve a poter dire a un balneare una frase sola: «vai su lidorank.com e
 * scorri in fondo». Senza questo, l'unico modo per arrivare all'area gestore
 * era digitare un indirizzo a memoria.
 *
 * Cambia a seconda di chi guarda: a chi è già dentro propone il pannello,
 * a tutti gli altri spiega di cosa si tratta.
 */
export async function PortaGestori() {
  const t = await getTranslations("gestore");

  // Lettura leggera: serve solo a scegliere il testo del pulsante.
  let haStabilimenti = false;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.rpc("miei_stabilimenti");
      haStabilimenti = Array.isArray(data) && data.length > 0;
    }
  } catch {
    // Se la sessione non è leggibile mostriamo la versione pubblica.
  }

  return (
    <section className="rounded-3xl border border-sea-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold text-sea-900 sm:text-2xl">{t("portaTitolo")}</h2>
          <p className="mt-2 text-sea-600">{t("portaTesto")}</p>
          <p className="mt-2 text-xs text-sea-400">{t("portaGratis")}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {haStabilimenti ? (
            <Link
              href="/area-gestore"
              className="rounded-xl bg-sea-500 px-5 py-3 text-center text-sm font-semibold text-white shadow transition hover:bg-sea-600"
            >
              {t("portaEntra")}
            </Link>
          ) : (
            <Link
              href="/area-gestore/rivendica"
              className="rounded-xl bg-sea-500 px-5 py-3 text-center text-sm font-semibold text-white shadow transition hover:bg-sea-600"
            >
              {t("portaRivendica")}
            </Link>
          )}
          <Link
            href="/per-i-gestori"
            className="text-center text-sm text-sea-600 hover:underline"
          >
            {t("portaScopri")}
          </Link>
        </div>
      </div>
    </section>
  );
}
