"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * Il pulsante sul profilo di qualcun altro.
 *
 * CINQUE STATI, non due, perché «amici sì / amici no» non basta a descrivere
 * la situazione: fra i due c'è una richiesta che può essere stata mandata da
 * me o ricevuta da lui, e sono due cose diverse da fare. Lo stato lo decide
 * il database (`profilo_di` restituisce `rapporto`), non questo componente:
 * qui si sceglie solo che parola scriverci sopra.
 */
export function BottoneAmicizia({ handle, rapporto }: { handle: string; rapporto: string }) {
  const t = useTranslations("social");
  const router = useRouter();
  const [stato, setStato] = useState(rapporto);
  const [attesa, setAttesa] = useState(false);

  async function chiama(funzione: string, argomenti: Record<string, unknown>, nuovo: string) {
    setAttesa(true);
    const supabase = createClient();
    const { error } = await supabase.rpc(funzione, argomenti);
    setAttesa(false);
    if (!error) {
      setStato(nuovo);
      router.refresh();
    }
  }

  const primario =
    "rounded-xl bg-sea-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60";
  const secondario =
    "rounded-xl border border-sea-200 px-4 py-2 text-sm font-medium text-sea-600 transition hover:bg-sea-50 disabled:opacity-60";

  if (stato === "io") {
    return (
      <a href="/profilo" className={secondario}>
        {t("vaiAlTuoProfilo")}
      </a>
    );
  }

  if (stato === "anonimo") {
    return (
      <a href="/login" className={primario}>
        {t("accediPerAggiungere")}
      </a>
    );
  }

  if (stato === "amici") {
    return (
      <button
        onClick={() => chiama("togli_amicizia", { _handle: handle }, "estranei")}
        disabled={attesa}
        className={secondario}
      >
        {t("sieteAmici")}
      </button>
    );
  }

  if (stato === "richiesta_inviata") {
    // Non è un pulsante: non c'è niente da fare se non aspettare. Un pulsante
    // che non fa niente si clicca comunque, e poi ci si chiede perché.
    return (
      <span className="rounded-xl border border-sea-200 bg-sea-50 px-4 py-2 text-sm text-sea-500">
        {t("richiestaInAttesa")}
      </span>
    );
  }

  if (stato === "richiesta_ricevuta") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() =>
            chiama("rispondi_amicizia", { _handle: handle, _accetta: true }, "amici")
          }
          disabled={attesa}
          className={primario}
        >
          {t("accetta")}
        </button>
        <button
          onClick={() =>
            chiama("rispondi_amicizia", { _handle: handle, _accetta: false }, "estranei")
          }
          disabled={attesa}
          className={secondario}
        >
          {t("rifiuta")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => chiama("richiedi_amicizia", { _handle: handle }, "richiesta_inviata")}
      disabled={attesa}
      className={primario}
    >
      {t("chiediAmicizia")}
    </button>
  );
}
