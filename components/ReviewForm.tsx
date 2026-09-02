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
      className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
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
  const th = useTranslations("metricHints");
  const tf = useTranslations("facts");
  const tb = useTranslations("boolFacts");

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-sea-100 bg-sea-50 p-6 text-center">
        <p className="font-semibold text-sea-700">{tr("successTitle")}</p>
        <p className="mt-1 text-sm text-sea-500">{tr("successBody")}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-sea-100 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="beach_id" value={beachId} />
      {/* honeypot anti-bot: invisibile agli umani */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Non compilare</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sea-900">{tr("heading")}</h3>
        {isLoggedIn ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {tr("verifiedBadge")}
          </span>
        ) : (
          <span className="text-xs text-sea-400">
            {tr("anonPre")}
            <a href="/login" className="text-sea-600 underline">{tr("anonLink")}</a>
            {tr("anonPost")}
          </span>
        )}
      </div>

      {/* Criteri principali (obbligatori, scelta cosciente — nessun default) */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-sea-800">{tr("coreTitle")}</p>
          <p className="text-xs text-sea-400">{tr("coreHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {CORE_METRIC_KEYS.map((key) => (
            <StarRating key={key} name={key} label={tm(key)} hint={th(key)} />
          ))}
        </div>
      </div>

      {/* Criteri aggiuntivi (facoltativi, con N/D) */}
      <div className="space-y-4 rounded-xl bg-sea-50/60 p-4">
        <div>
          <p className="text-sm font-semibold text-sea-800">{tr("optionalTitle")}</p>
          <p className="text-xs text-sea-400">{tr("optionalHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {OPTIONAL_METRIC_KEYS.map((key) => (
            <StarRating key={key} name={key} label={tm(key)} hint={th(key)} allowNA />
          ))}
        </div>
      </div>

      {/* Fatti oggettivi (facoltativi) */}
      <div className="space-y-4 rounded-xl bg-sea-50/60 p-4">
        <p className="text-sm font-semibold text-sea-800">
          {tr("factsTitle")} <span className="font-normal text-sea-400">{tr("factsOptional")}</span>
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      {/* La tua visita: conferma + quando (anti-recensioni fantasma) */}
      <div className="space-y-3 rounded-xl border border-sea-100 bg-white p-4">
        <p className="text-sm font-semibold text-sea-800">{tr("visitTitle")}</p>
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
        <div>
          <label htmlFor="visita_periodo" className="text-xs font-medium text-sea-700">
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
    </form>
  );
}
