"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useFormState } from "react-dom";
import { submitReview, type SubmitState } from "@/app/actions";
import { METRICS, FACTS, BOOL_FACTS } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? "Invio in corso…" : "Pubblica recensione"}
    </button>
  );
}

function Slider({ metric }: { metric: (typeof METRICS)[number] }) {
  const [value, setValue] = useState(3);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={metric.key} className="text-sm font-medium text-sea-800">
          {metric.label}
        </label>
        <span className="text-sm font-bold tabular-nums text-sea-600">{value}/5</span>
      </div>
      <input
        id={metric.key}
        name={metric.key}
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="lido-range mt-2 w-full"
      />
      <p className="mt-1 text-xs text-sea-400">{metric.hint}</p>
    </div>
  );
}

const initial: SubmitState = { ok: false };

export function ReviewForm({ beachId, isLoggedIn = false }: { beachId: string; isLoggedIn?: boolean }) {
  const [state, formAction] = useFormState(submitReview, initial);

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-sea-100 bg-sea-50 p-6 text-center">
        <p className="font-semibold text-sea-700">Grazie! La tua recensione è stata pubblicata.</p>
        <p className="mt-1 text-sm text-sea-500">I punteggi aggregati sono già aggiornati.</p>
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
        <h3 className="text-lg font-semibold text-sea-900">Lascia la tua recensione</h3>
        {isLoggedIn ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            ✓ Verificata
          </span>
        ) : (
          <span className="text-xs text-sea-400">
            Anonima —{" "}
            <a href="/login" className="text-sea-600 underline">accedi</a> per verificarla
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {METRICS.map((m) => (
          <Slider key={m.key} metric={m} />
        ))}
      </div>

      {/* Fatti oggettivi (facoltativi) */}
      <div className="space-y-4 rounded-xl bg-sea-50/60 p-4">
        <p className="text-sm font-semibold text-sea-800">Fatti oggettivi <span className="font-normal text-sea-400">(facoltativi)</span></p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FACTS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="text-xs font-medium text-sea-700">{f.label}</label>
              <select
                id={f.key}
                name={f.key}
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-sea-200 bg-white px-2 py-2 text-sm text-sea-900"
              >
                <option value="">— non so —</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {f.hint ? <p className="mt-1 text-[11px] text-sea-400">{f.hint}</p> : null}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BOOL_FACTS.map((bf) => (
            <div key={bf.key}>
              <label htmlFor={bf.key} className="text-xs font-medium text-sea-700">{bf.label}</label>
              <select
                id={bf.key}
                name={bf.key}
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-sea-200 bg-white px-2 py-2 text-sm text-sea-900"
              >
                <option value="">— non so —</option>
                <option value="si">Sì</option>
                <option value="no">No</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="commento" className="text-sm font-medium text-sea-800">
          Commento (opzionale)
        </label>
        <textarea
          id="commento"
          name="commento"
          rows={4}
          maxLength={2000}
          placeholder="Com'è stata la tua esperienza al lido?"
          className="mt-2 w-full rounded-xl border border-sea-200 px-4 py-2.5 text-sea-900 placeholder:text-sea-300 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
        />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
