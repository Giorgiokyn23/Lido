import { getTranslations } from "next-intl/server";
import { GalleriaFoto } from "@/components/GalleriaFoto";
import type { FotoPubblica } from "@/lib/foto";

/**
 * Il blocco «Foto» della scheda pubblica: solo la galleria.
 *
 * QUI NON SI CARICA NIENTE, e la ragione non è di spazio. Le foto di uno
 * stabilimento le pubblica il gestore dalla sua area, che è l'unico posto in
 * cui sappiamo con certezza chi sta caricando: una rivendicazione approvata,
 * cioè un'impresa con un nome. Se una fotografia finisce dove non doveva, dall
 * altra parte c'è qualcuno a cui rispondere.
 *
 * Resta un componente server: queste foto sono uguali per tutti e viaggiano
 * nella pagina in cache. L'unica parte client è la galleria, perché
 * ingrandire e segnalare richiedono il browser.
 *
 * DOVE STA NELLA PAGINA. Sopra le recensioni e sotto il punteggio: chi apre
 * la scheda di un bagno che non conosce guarda prima com'è, poi legge cosa ne
 * dicono.
 */
export async function SezioneFoto({
  nomeBagno,
  foto,
}: {
  nomeBagno: string;
  foto: FotoPubblica[];
}) {
  const t = await getTranslations("foto");

  // Senza foto non si mostra un riquadro vuoto: un blocco «Foto» con dentro
  // «non ce ne sono» occupa spazio per dire niente, e su una scheda non
  // rivendicata — cioè quasi tutte, oggi — sarebbe la norma e non l'eccezione.
  if (foto.length === 0) return null;

  return (
    <section
      id="foto"
      className="scroll-mt-24 rounded-2xl border border-sea-100 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-sea-900">
          {t("titoloConN", { n: foto.length })}
        </h2>
        <p className="text-xs text-sea-400">{t("dalGestore")}</p>
      </div>

      <div className="mt-4">
        <GalleriaFoto foto={foto} nomeBagno={nomeBagno} />
      </div>
    </section>
  );
}
