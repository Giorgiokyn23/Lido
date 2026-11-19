"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { salvaNomeProfilo, type SubmitState } from "@/app/actions";

function Bottone() {
  const { pending } = useFormStatus();
  const t = useTranslations("profilo");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-sea-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? t("salvataggio") : t("salvaNome")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

/** Il nome del profilo. Non compare mai accanto a una recensione. */
export function NomeProfiloForm({ nome }: { nome: string }) {
  const [state, formAction] = useFormState(salvaNomeProfilo, initial);
  const t = useTranslations("profilo");

  return (
    <form action={formAction} className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <label htmlFor="nome" className="text-sm font-semibold text-sea-800">
        {t("nomeTitolo")}
      </label>
      <p className="mt-0.5 text-xs text-sea-500">{t("nomeNota")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id="nome"
          name="nome"
          maxLength={60}
          defaultValue={nome}
          placeholder={t("nomePlaceholder")}
          className="min-w-[200px] flex-1 rounded-lg border border-sea-200 px-3 py-2 text-sm text-sea-900"
        />
        <Bottone />
      </div>
      {state.error ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("nomeSalvato")}
        </p>
      ) : null}
    </form>
  );
}
