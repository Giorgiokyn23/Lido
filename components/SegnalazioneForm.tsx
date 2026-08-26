"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { submitSegnalazione, type SubmitState } from "@/app/actions";
import { SEGNALAZIONE_TIPI } from "@/lib/types";
import { Turnstile } from "@/components/Turnstile";

function SubmitButton() {
  const { pending } = useFormStatus();
  const ts = useTranslations("segnalazione");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-amber-600 px-5 py-2.5 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
    >
      {pending ? ts("submitting") : ts("submit")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

export function SegnalazioneForm({ beachId }: { beachId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitSegnalazione, initial);
  const ts = useTranslations("segnalazione");
  const tt = useTranslations("segTipi");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800"
      >
        {ts("openButton")}
      </button>
    );
  }

  if (state.ok) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {ts("successBody")}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <input type="hidden" name="beach_id" value={beachId} />
      <p className="text-sm font-semibold text-amber-900">{ts("title")}</p>
      <p className="text-xs text-amber-700">{ts("intro")}</p>

      <div>
        <label htmlFor="tipo" className="text-xs font-medium text-amber-900">{ts("typeLabel")}</label>
        <select
          id="tipo"
          name="tipo"
          defaultValue=""
          required
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm"
        >
          <option value="" disabled>{ts("typeSelect")}</option>
          {SEGNALAZIONE_TIPI.map((t) => (
            <option key={t.value} value={t.value}>{tt(t.value)}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="descrizione" className="text-xs font-medium text-amber-900">{ts("descLabel")}</label>
        <textarea
          id="descrizione"
          name="descrizione"
          rows={3}
          maxLength={2000}
          placeholder={ts("descPlaceholder")}
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="email_contatto" className="text-xs font-medium text-amber-900">{ts("emailLabel")}</label>
        <input
          id="email_contatto"
          name="email_contatto"
          type="email"
          placeholder={ts("emailPlaceholder")}
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <Turnstile />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm text-amber-800"
        >
          {ts("cancel")}
        </button>
        <div className="flex-1">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
