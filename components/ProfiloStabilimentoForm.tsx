"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { salvaProfiloStabilimento, type SubmitState } from "@/app/actions";

export type ProfiloValori = {
  descrizione: string | null;
  orari: string | null;
  telefono: string | null;
  email_pubblica: string | null;
  sito: string | null;
  link_prenotazione: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("gestore");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-sea-500 px-5 py-2.5 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? t("salvataggio") : t("salva")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

export function ProfiloStabilimentoForm({
  beachId,
  valori,
}: {
  beachId: string;
  valori: ProfiloValori | null;
}) {
  const [state, formAction] = useFormState(salvaProfiloStabilimento, initial);
  const t = useTranslations("gestore");

  const campo = "mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm";
  const etichetta = "text-xs font-medium text-sea-700";

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <input type="hidden" name="beach_id" value={beachId} />

      <div>
        <label htmlFor="descrizione" className={etichetta}>
          {t("descrizioneLabel")}
        </label>
        <textarea
          id="descrizione"
          name="descrizione"
          rows={4}
          maxLength={2000}
          defaultValue={valori?.descrizione ?? ""}
          placeholder={t("descrizionePlaceholder")}
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="orari" className={etichetta}>
          {t("orariLabel")}
        </label>
        <textarea
          id="orari"
          name="orari"
          rows={2}
          maxLength={500}
          defaultValue={valori?.orari ?? ""}
          placeholder={t("orariPlaceholder")}
          className={campo}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="telefono" className={etichetta}>
            {t("telefonoLabel")}
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            maxLength={40}
            defaultValue={valori?.telefono ?? ""}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="email_pubblica" className={etichetta}>
            {t("emailPubblicaLabel")}
          </label>
          <input
            id="email_pubblica"
            name="email_pubblica"
            type="email"
            maxLength={200}
            defaultValue={valori?.email_pubblica ?? ""}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="sito" className={etichetta}>
            {t("sitoLabel")}
          </label>
          <input
            id="sito"
            name="sito"
            maxLength={300}
            defaultValue={valori?.sito ?? ""}
            placeholder="https://..."
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="link_prenotazione" className={etichetta}>
            {t("prenotazioneLabel")}
          </label>
          <input
            id="link_prenotazione"
            name="link_prenotazione"
            maxLength={300}
            defaultValue={valori?.link_prenotazione ?? ""}
            placeholder="https://..."
            className={campo}
          />
        </div>
      </div>

      <p className="rounded-lg bg-sea-50 px-3 py-2 text-[11px] text-sea-600">{t("profiloNota")}</p>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("salvato")}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
