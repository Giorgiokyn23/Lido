"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { submitReviewNotice, type SubmitState } from "@/app/actions";
import { NOTICE_TIPI } from "@/lib/types";

const initial: SubmitState = { ok: false };

function SendButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("flag");
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
    >
      {pending ? t("sending") : t("send")}
    </button>
  );
}

// Segnalazione di una RECENSIONE come contenuto illecito (DSA art. 16):
// motivo, spiegazione, contatto facoltativo e dichiarazione di buona fede.
export function FlagButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("flag");
  const tn = useTranslations("noticeTipi");
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitReviewNotice, initial);

  if (state.ok) {
    return <span className="text-[11px] text-emerald-600">{t("received")}</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={t("tooltip")}
        className="text-[11px] text-sea-400 hover:text-amber-600"
      >
        {t("flag")}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-2 rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-xl"
      >
        <input type="hidden" name="review_id" value={reviewId} />
        <p className="text-sm font-semibold text-amber-900">{t("formTitle")}</p>
        <p className="text-[11px] text-amber-700">{t("formIntro")}</p>

        <select
          name="motivo"
          defaultValue=""
          required
          className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
        >
          <option value="" disabled>
            {t("reasonSelect")}
          </option>
          {NOTICE_TIPI.map((n) => (
            <option key={n.value} value={n.value}>
              {tn(n.value)}
            </option>
          ))}
        </select>

        <textarea
          name="spiegazione"
          rows={2}
          maxLength={2000}
          placeholder={t("explainPlaceholder")}
          className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
        />

        <input
          type="email"
          name="email"
          placeholder={t("emailPlaceholder")}
          className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
        />
        <p className="text-[10px] text-amber-600">{t("emailNote")}</p>

        <label className="flex items-start gap-2 text-[11px] text-amber-800">
          <input type="checkbox" name="buona_fede" required className="mt-0.5" />
          <span>{t("goodFaith")}</span>
        </label>

        {state.error && <p className="text-[11px] text-red-700">{state.error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-[11px] text-amber-800"
          >
            {t("cancel")}
          </button>
          <SendButton />
        </div>
      </form>
    </div>
  );
}
