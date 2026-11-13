"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { moderaEvento, eliminaEventoAdmin } from "@/app/actions";

/**
 * I comandi di moderazione di un singolo evento, per la coda in /admin/eventi.
 *
 * Il motivo è UNO per tutta la riga, anche se i pulsanti sono due: sta in uno
 * stato di React e viene copiato in entrambi i form come campo nascosto. Due
 * caselle identiche una accanto all'altra sarebbero solo un modo di far
 * sbagliare chi ha fretta.
 *
 * Nascondere non chiede conferma, perché si annulla con un clic. Eliminare
 * sì: la riga non torna più, anche se il testo resta nel registro.
 */

function Bottone({
  etichetta,
  conferma,
  tono,
}: {
  etichetta: string;
  conferma?: string;
  tono: "neutro" | "rosso";
}) {
  const { pending } = useFormStatus();
  const stile =
    tono === "rosso"
      ? "border-red-200 text-red-700 hover:bg-red-50"
      : "border-sea-200 text-sea-700 hover:bg-sea-50";
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (conferma && !window.confirm(conferma)) e.preventDefault();
      }}
      className={`rounded-lg border px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${stile}`}
    >
      {pending ? "…" : etichetta}
    </button>
  );
}

export function ModeraEvento({
  eventoId,
  beachId,
  titolo,
  nascosto,
}: {
  eventoId: string;
  beachId: string;
  titolo: string;
  nascosto: boolean;
}) {
  const [motivo, setMotivo] = useState("");

  const campi = (
    <>
      <input type="hidden" name="id" value={eventoId} />
      <input type="hidden" name="beach_id" value={beachId} />
      <input type="hidden" name="motivo" value={motivo} />
    </>
  );

  return (
    <div className="mt-3 border-t border-sea-100 pt-3">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={300}
        placeholder="Motivo — resta nel registro interno, non lo vede nessun altro"
        className="w-full rounded-lg border border-sea-200 px-3 py-1.5 text-xs text-sea-900 placeholder:text-sea-400 focus:border-sea-400 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <form action={moderaEvento}>
          {campi}
          <input type="hidden" name="nascondi" value={nascosto ? "0" : "1"} />
          <Bottone etichetta={nascosto ? "Ripubblica" : "Nascondi"} tono="neutro" />
        </form>

        <form action={eliminaEventoAdmin}>
          {campi}
          <Bottone
            etichetta="Elimina"
            tono="rosso"
            conferma={`Eliminare «${titolo}»?\n\nLa riga non si recupera. Il titolo, il testo e la data restano nel registro interno, così puoi rispondere al gestore se te lo chiede.`}
          />
        </form>

        <span className="text-[11px] text-sea-400">
          Nascondere si annulla con un clic: preferiscilo quando hai un dubbio.
        </span>
      </div>
    </div>
  );
}
