"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { indirizzoFoto } from "@/lib/foto";

export type MiaFoto = {
  id: string;
  beach_id: string;
  percorso: string;
  didascalia: string | null;
  stato: string;
  creato_il: string;
};

/**
 * Le foto che ho caricato, con la possibilità di cancellarle.
 *
 * ESISTE PERCHÉ L'ABBIAMO PROMESSO. La sovraimpressione di accesso dice «le
 * foto restano tue: puoi cancellarle quando vuoi», e una frase così senza il
 * pulsante che la realizza è una bugia. È anche la risposta più semplice a chi
 * chiede la cancellazione dei propri dati: la fa da sé, in due clic.
 *
 * L'ORDINE: prima la riga, poi il file. Al contrario, se la cancellazione
 * della riga fallisse dopo quella del file, sulla scheda resterebbe
 * un'immagine rotta. Così il peggio è un file che nessuno nomina più.
 *
 * UNA FOTO NASCOSTA DALLA MODERAZIONE NON SI CANCELLA, e il database lo impone
 * (la policy della 0089 ammette la cancellazione solo sulle pubblicate). Non è
 * un dispetto: se bastasse cancellare la propria riga per far sparire una foto
 * sotto esame, chi carica qualcosa che non doveva potrebbe far perdere il filo
 * a chi sta valutando la segnalazione. Dalla scheda è già fuori comunque.
 */
export function MieFoto({ foto, nomi }: { foto: MiaFoto[]; nomi: Record<string, string> }) {
  const t = useTranslations("mieFoto");
  const router = useRouter();
  const [chiedo, setChiedo] = useState<string | null>(null);
  const [attesa, setAttesa] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function cancella(f: MiaFoto) {
    setAttesa(f.id);
    setErrore(null);
    const supabase = createClient();

    const { error } = await supabase.from("foto").delete().eq("id", f.id);
    if (error) {
      setAttesa(null);
      setErrore(t("errore"));
      return;
    }
    await supabase.storage.from("foto").remove([f.percorso]);

    setAttesa(null);
    setChiedo(null);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sea-800">{t("titolo")}</h2>
      <p className="mt-0.5 text-xs text-sea-500">{t("intro")}</p>

      {foto.length === 0 ? (
        <p className="mt-3 text-sm text-sea-400">{t("vuoto")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {foto.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-sea-100 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={indirizzoFoto(f.percorso)}
                alt=""
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <a
                  href={`/lido/${f.beach_id}#foto`}
                  className="truncate text-sm font-medium text-sea-900 hover:underline"
                >
                  {nomi[f.beach_id] ?? f.beach_id}
                </a>
                {f.didascalia ? (
                  <div className="truncate text-xs text-sea-500">{f.didascalia}</div>
                ) : null}
                {f.stato !== "pubblicata" ? (
                  <span className="mt-1 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                    {t("nascosta")}
                  </span>
                ) : null}
              </div>

              {f.stato === "pubblicata" ? (
                chiedo === f.id ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => cancella(f)}
                      disabled={attesa === f.id}
                      className="rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {attesa === f.id ? t("cancello") : t("confermaCancella")}
                    </button>
                    <button
                      onClick={() => setChiedo(null)}
                      className="rounded-lg border border-sea-200 px-3 py-1.5 text-xs text-sea-600 hover:bg-sea-50"
                    >
                      {t("annulla")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setChiedo(f.id)}
                    className="shrink-0 text-xs text-sea-500 underline underline-offset-2 hover:text-red-700"
                  >
                    {t("cancella")}
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {errore ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
      ) : null}
    </section>
  );
}
