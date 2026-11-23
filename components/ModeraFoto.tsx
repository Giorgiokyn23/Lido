"use client";

import { useState } from "react";
import { moderaFoto } from "@/app/actions";

/**
 * I pulsanti di moderazione sotto una foto.
 *
 * NASCONDI È A UN CLIC, RIMUOVI NE CHIEDE DUE. Non è simmetria mancata:
 * nascondere si disfa, rimuovere cancella il file e non torna. Il motivo è
 * obbligatorio solo per la rimozione, perché è l'unico caso in cui qualcuno
 * potrebbe contestare la decisione e quella riga di testo è tutto ciò che
 * resterà per rispondergli.
 */
export function ModeraFoto({
  id,
  beachId,
  percorso,
  stato,
}: {
  id: string;
  beachId: string;
  percorso: string;
  stato: string;
}) {
  const [conferma, setConferma] = useState(false);
  const [motivo, setMotivo] = useState("");

  const bottone =
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50";

  if (conferma) {
    return (
      <form action={moderaFoto} className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="beach_id" value={beachId} />
        <input type="hidden" name="percorso" value={percorso} />
        <input type="hidden" name="stato" value="rimossa" />
        <p className="text-xs font-semibold text-red-900">
          Il file viene cancellato dall&apos;archivio e non si recupera.
        </p>
        <input
          name="motivo"
          required
          maxLength={300}
          placeholder="Perché (resta nel registro interno)"
          className="mt-2 w-full rounded-lg border border-red-200 px-3 py-2 text-xs"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className={`${bottone} border-red-300 bg-red-600 text-white hover:bg-red-700`}
          >
            Rimuovi davvero
          </button>
          <button
            type="button"
            onClick={() => setConferma(false)}
            className={`${bottone} border-sea-200 bg-white text-sea-600 hover:bg-sea-50`}
          >
            Annulla
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={300}
        placeholder="Motivo (facoltativo per nascondere)"
        className="w-full rounded-lg border border-sea-200 px-3 py-2 text-xs"
      />
      <div className="flex flex-wrap gap-2">
        {stato === "pubblicata" ? (
          <form action={moderaFoto}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="beach_id" value={beachId} />
            <input type="hidden" name="stato" value="nascosta" />
            <input type="hidden" name="motivo" value={motivo} />
            <button
              type="submit"
              className={`${bottone} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`}
            >
              Nascondi
            </button>
          </form>
        ) : (
          <form action={moderaFoto}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="beach_id" value={beachId} />
            <input type="hidden" name="stato" value="pubblicata" />
            <button
              type="submit"
              className={`${bottone} border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`}
            >
              Ripubblica
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setConferma(true)}
          className={`${bottone} border-red-200 bg-white text-red-700 hover:bg-red-50`}
        >
          Rimuovi
        </button>
      </div>
    </div>
  );
}
