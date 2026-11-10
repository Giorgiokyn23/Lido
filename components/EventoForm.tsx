"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { salvaEvento, type SubmitState } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("gestore");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-sea-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? t("salvataggio") : t("evSalva")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

/** Modulo per pubblicare un evento. Niente immagini in questa prima versione. */
export function EventoForm({ beachId }: { beachId: string }) {
  const [state, formAction] = useFormState(salvaEvento, initial);
  const t = useTranslations("gestore");

  const campo = "mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm";
  const etichetta = "text-xs font-medium text-sea-700";
  const oggi = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      key={state.ok ? "pulito" : "modifica"}
      className="space-y-3 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="beach_id" value={beachId} />
      <h2 className="text-sm font-semibold text-sea-800">{t("evNuovo")}</h2>

      <div>
        <label htmlFor="titolo" className={etichetta}>
          {t("evTitolo")}
        </label>
        <input
          id="titolo"
          name="titolo"
          required
          minLength={3}
          maxLength={120}
          placeholder={t("evTitoloPlaceholder")}
          className={campo}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="data_inizio" className={etichetta}>
            {t("evInizio")}
          </label>
          <input
            id="data_inizio"
            name="data_inizio"
            type="date"
            required
            min={oggi}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="data_fine" className={etichetta}>
            {t("evFine")}
          </label>
          <input id="data_fine" name="data_fine" type="date" min={oggi} className={campo} />
        </div>
      </div>

      <div>
        <label htmlFor="descrizione" className={etichetta}>
          {t("evDescrizione")}
        </label>
        <textarea
          id="descrizione"
          name="descrizione"
          rows={3}
          maxLength={1000}
          placeholder={t("evDescrizionePlaceholder")}
          className={campo}
        />
      </div>

      <p className="rounded-lg bg-sea-50 px-3 py-2 text-[11px] text-sea-600">{t("evNota")}</p>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t("evSalvato")}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
