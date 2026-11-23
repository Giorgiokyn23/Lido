import { getTranslations } from "next-intl/server";
import { GalleriaFoto } from "@/components/GalleriaFoto";
import { CaricaFoto } from "@/components/CaricaFoto";
import type { FotoPubblica } from "@/lib/foto";

/**
 * Il blocco «Foto» della scheda: la griglia e il pulsante per aggiungerne.
 *
 * Resta un componente server perché la griglia la rende il server e finisce
 * nella pagina in cache — le foto pubblicate sono uguali per tutti. Solo il
 * pulsante è un componente client, perché deve sapere chi sta guardando.
 *
 * DOVE STA NELLA PAGINA. Sopra le recensioni e sotto il punteggio: chi apre la
 * scheda di un bagno che non conosce guarda prima com'è, poi legge cosa ne
 * dicono. Metterle in fondo significherebbe che quasi nessuno le vede, e
 * quindi che quasi nessuno ne carica.
 */
export async function SezioneFoto({
  beachId,
  nomeBagno,
  foto,
}: {
  beachId: string;
  nomeBagno: string;
  foto: FotoPubblica[];
}) {
  const t = await getTranslations("foto");

  return (
    <section id="foto" className="scroll-mt-24 rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-sea-900">
          {foto.length > 0 ? t("titoloConN", { n: foto.length }) : t("titolo")}
        </h2>
        {foto.length > 0 ? (
          <p className="text-xs text-sea-400">{t("daiBagnanti")}</p>
        ) : null}
      </div>

      {foto.length === 0 ? (
        <p className="mt-2 text-sm text-sea-500">{t("ancoraNessuna", { bagno: nomeBagno })}</p>
      ) : (
        <div className="mt-4">
          <GalleriaFoto foto={foto} nomeBagno={nomeBagno} />
        </div>
      )}

      <div className="mt-4 border-t border-sea-100 pt-4">
        <CaricaFoto beachId={beachId} />
      </div>
    </section>
  );
}
