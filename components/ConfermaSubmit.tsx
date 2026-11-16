"use client";

import { useFormStatus } from "react-dom";

/**
 * Un pulsante di invio che chiede conferma prima di procedere.
 *
 * Si inserisce dentro un form già esistente al posto del suo <button>, così
 * i campi del form restano dove sono. Serve dove l'azione non si può
 * disfare: dalla migrazione 0083 revocare o rinunciare AZZERA il profilo
 * dello stabilimento, e un pulsante che somiglia a un link non è un modo
 * onesto di presentare una cosa del genere.
 */
export function ConfermaSubmit({
  etichetta,
  conferma,
  tono = "rosso",
  classe,
}: {
  etichetta: string;
  conferma: string;
  tono?: "rosso" | "link";
  classe?: string;
}) {
  const { pending } = useFormStatus();

  const stile =
    classe ??
    (tono === "rosso"
      ? "rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      : "text-sm text-sea-400 underline underline-offset-2 transition hover:text-red-700 disabled:opacity-60");

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(conferma)) e.preventDefault();
      }}
      className={stile}
    >
      {pending ? "…" : etichetta}
    </button>
  );
}
