"use client";

import { useFormStatus } from "react-dom";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { submitReview, type SubmitState } from "@/app/actions";
import {
  FACTS,
  BOOL_FACTS,
  CORE_METRIC_KEYS,
  OPTIONAL_METRIC_KEYS,
} from "@/lib/types";
import { StarRating } from "@/components/StarRating";
import { Turnstile } from "@/components/Turnstile";

function SubmitButton() {
  const { pending } = useFormStatus();
  const tr = useTranslations("review");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-sea-500 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? tr("submitting") : tr("submit")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

export function ReviewForm({ beachId, isLoggedIn = false }: { beachId: string; isLoggedIn?: boolean }) {
  const [state, formAction] = useFormState(submitReview, initial);
  const tr = useTranslations("review");
  const tm = useTranslations("metrics");
  const tf = useTranslations("facts");
  const tb = useTranslations("boolFacts");

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-sea-100 bg-gradient-to-br from-sea-50 to-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <p className="mt-3 text-lg font-semibold text-sea-800">{tr("successTitle")}</p>
        <p className="mt-1 text-sm text-sea-500">{tr("successBody")}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-2xl border border-sea-100 bg-white shadow-sm"
    >
      <input type="hidden" name="beach_id" value={beachId} />
      {/* honeypot anti-bot: invisibile agli umani */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Non compilare</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Intestazione prominente */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sea-100 bg-gradient-to-r from-sea-500 to-sea-600 px-6 py-5">
        <div>
          <h3 className="text-xl font-bold text-white">{tr("heading")}</h3>
          <p className="mt-0.5 text-sm text-sea-50/90">{tr("subtitle")}</p>
        </div>
        {isLoggedIn ? (
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
            {tr("verifiedBadge")}
          </span>
        ) : (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white/90">
            {tr("anonPre")}
            <a href="/login" className="font-semibold underline">{tr("anonLink")}</a>
            {tr("anonPost")}
          </span>
        )}
      </div>

      <div className="space-y-6 p-6">
        {/* Criteri principali (obbligatori, scelta cosciente — nessun default) */}
        <fieldset>
          <legend className="text-sm font-semibold text-sea-800">{tr("coreTitle")}</legend>
          <p className="mb-2 text-xs text-sea-400">{tr("coreHint")}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            {CORE_METRIC_KEYS.map((key) => (
              <StarRating key={key} name={key} label={tm(key)} />
            ))}
          </div>
        </fieldset>

        {/* Criteri aggiuntivi (facoltativi, con N/D) */}
        <fieldset className="rounded-xl bg-sea-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-sea-800">{tr("optionalTitle")}</legend>
          <p className="mb-2 text-xs text-sea-400">{tr("optionalHint")}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
            {OPTIONAL_METRIC_KEYS.map((key) => (
              <StarRating key={key} name={key} label={tm(key)} allowNA />
            ))}
          </div>
        </fieldset>

        {/* Fatti oggettivi (facoltativi) */}
        <fieldset className="rounded-xl bg-sea-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-sea-800">
            {tr("factsTitle")} <span className="font-normal text-sea-400">{tr("factsOptional")}</span>
          </legend>
          <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FACTS.map((f) => {
              const hint = tf(`${f.key}.hint`);
              return (
                <div key={f.key}>
                  <label htmlFor={f.key} className="text-xs font-medium text-sea-700">{tf(`${f.key}.label`)}</label>
                  <select
                    id={f.key}
                    name={f.key}
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-sea-200 bg-white px-2 py-2 text-sm text-sea-900"
                  >
                    <option value="">{tr("unknown")}</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>{tf(`${f.key}.opt.${o.value}`)}</option>
                    ))}
                  </select>
                  {hint ? <p className="mt-1 text-[11px] text-sea-400">{hint}</p> : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BOOL_FACTS.map((bf) => (
              <div key={bf.key}>
                <label htmlFor={bf.key} className="text-xs font-medium text-sea-700">{tb(bf.key)}</label>
                <select
                  id={bf.key}
                  name={bf.key}
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-sea-200 bg-white px-2 py-2 text-sm text-sea-900"
                >
                  <option value="">{tr("unknown")}</option>
                  <option value="si">{tr("yes")}</option>
                  <option value="no">{tr("no")}</option>
                </select>
              </div>
            ))}
          </div>
        </fieldset>

        {/* La tua visita: conferma + quando (anti-recensioni fantasma) */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-sea-100 p-4 sm:grid-cols-2 sm:items-center">
          <label className="flex items-start gap-2 text-sm text-sea-700">
            <input
              type="checkbox"
              name="visitato"
              value="1"
              required
              className="mt-0.5 h-4 w-4 rounded border-sea-300 text-sea-600"
            />
            <span>{tr("visitConfirm")}</span>
          </label>
          <div className="sm:justify-self-end">
            <label htmlFor="visita_periodo" className="text-xs font-medium text-sea-500">
              {tr("visitWhen")}
            </label>
            <input
              id="visita_periodo"
              name="visita_periodo"
              type="month"
              className="mt-1 block rounded-lg border border-sea-200 bg-white px-3 py-2 text-sm text-sea-900"
            />
          </div>
        </div>

        {/* Commento */}
        <div>
          <label htmlFor="commento" className="text-sm font-medium text-sea-800">
            {tr("commentLabel")}
          </label>
          <textarea
            id="commento"
            name="commento"
            rows={4}
            maxLength={2000}
            placeholder={tr("commentPlaceholder")}
            className="mt-2 w-full rounded-xl border border-sea-200 px-4 py-2.5 text-sea-900 placeholder:text-sea-300 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
          />
        </div>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <Turnstile />
        <SubmitButton />
      </div>
    </form>
  );
}
