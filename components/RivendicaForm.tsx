"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { submitRivendicazione, type SubmitState } from "@/app/actions";
import { Turnstile } from "@/components/Turnstile";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("gestore");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-sea-500 px-5 py-2.5 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

export function RivendicaForm({
  beachId,
  beachName,
}: {
  beachId: string;
  beachName: string;
}) {
  const [state, formAction] = useFormState(submitRivendicazione, initial);
  const t = useTranslations("gestore");

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-sea-200 bg-sea-50 p-5">
        <p className="font-semibold text-sea-900">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-sea-700">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <input type="hidden" name="beach_id" value={beachId} />

      <div className="rounded-xl bg-sea-50 px-3 py-2 text-sm">
        <span className="text-sea-500">{t("selected")}: </span>
        <span className="font-semibold text-sea-900">{beachName}</span>
      </div>

      <div>
        <label htmlFor="nome" className="text-xs font-medium text-sea-700">
          {t("nomeLabel")}
        </label>
        <input
          id="nome"
          name="nome"
          required
          maxLength={120}
          className="mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="ruolo_dichiarato" className="text-xs font-medium text-sea-700">
          {t("ruoloLabel")}
        </label>
        <input
          id="ruolo_dichiarato"
          name="ruolo_dichiarato"
          maxLength={120}
          placeholder={t("ruoloPlaceholder")}
          className="mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="telefono" className="text-xs font-medium text-sea-700">
            {t("telLabel")}
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            maxLength={40}
            className="mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="email_contatto" className="text-xs font-medium text-sea-700">
            {t("emailLabel")}
          </label>
          <input
            id="email_contatto"
            name="email_contatto"
            type="email"
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="nota" className="text-xs font-medium text-sea-700">
          {t("notaLabel")}
        </label>
        <textarea
          id="nota"
          name="nota"
          rows={3}
          maxLength={1000}
          placeholder={t("notaPlaceholder")}
          className="mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm"
        />
      </div>

      <p className="rounded-lg bg-sea-50 px-3 py-2 text-[11px] text-sea-600">{t("noPaymentNote")}</p>
      <p className="text-[11px] text-sea-500">{t("privacyNote")}</p>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Turnstile />
      <SubmitButton />
    </form>
  );
}
