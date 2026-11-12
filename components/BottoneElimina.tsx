"use client";

import { useFormStatus } from "react-dom";
import { eliminaEvento } from "@/app/actions";

function Conferma({ etichetta, conferma }: { etichetta: string; conferma: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        // Un evento cancellato non si recupera: meglio una domanda in più.
        if (!window.confirm(conferma)) e.preventDefault();
      }}
      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
    >
      {etichetta}
    </button>
  );
}

/** Elimina un evento, chiedendo conferma. La RLS consente solo i propri. */
export function BottoneElimina({
  eventoId,
  beachId,
  etichetta,
  conferma,
}: {
  eventoId: string;
  beachId: string;
  titolo?: string;
  etichetta: string;
  conferma: string;
}) {
  return (
    <form action={eliminaEvento} className="shrink-0">
      <input type="hidden" name="id" value={eventoId} />
      <input type="hidden" name="beach_id" value={beachId} />
      <Conferma etichetta={etichetta} conferma={conferma} />
    </form>
  );
}
