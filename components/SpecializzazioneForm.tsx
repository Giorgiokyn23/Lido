"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { salvaSpecializzazione, type SubmitState } from "@/app/actions";
import { FREQUENZE, type Specializzazione } from "@/lib/specializzazioni";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("gestore");
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-sea-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
    >
      {pending ? t("salvataggio") : t("salva")}
    </button>
  );
}

const initial: SubmitState = { ok: false };

/**
 * La dichiarazione di una specializzazione, accanto al calendario.
 *
 * Sta qui e non nel modulo del profilo per un motivo preciso: l'etichetta
 * forte dipende dagli eventi pubblicati, quindi la domanda va fatta dove il
 * gestore vede il suo calendario. Chi dichiara di voler fare musica e ha la
 * lista vuota capisce da sé che manca un pezzo.
 */
export function SpecializzazioneForm({
  beachId,
  ambito,
  valori,
  confermata,
}: {
  beachId: string;
  ambito: string;
  valori: Specializzazione | null;
  confermata: boolean;
}) {
  const [state, formAction] = useFormState(salvaSpecializzazione, initial);
  const t = useTranslations("gestore");

  // Racconto e frequenza compaiono solo se la risposta è un sì: chiederli a
  // chi ha appena detto «per ora no» è un modo di non ascoltare.
  const [stato, setStato] = useState(valori?.stato ?? "");
  const apertoAlSi = stato === "attiva" || stato === "interessato";

  const campo =
    "mt-1 w-full rounded-lg border border-sea-200 px-3 py-2 text-sm text-sea-900 focus:border-sea-400 focus:outline-none";
  const etichetta = "text-xs font-medium text-sea-700";

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <input type="hidden" name="beach_id" value={beachId} />
      <input type="hidden" name="ambito" value={ambito} />

      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-sea-800">
          <span aria-hidden="true">♪</span>
          {t(`spec_${ambito}_titolo`)}
        </h2>
        <p className="mt-1 text-xs text-sea-500">{t(`spec_${ambito}_intro`)}</p>
      </div>

      <fieldset>
        <legend className={etichetta}>{t(`spec_${ambito}_domanda`)}</legend>
        <div className="mt-2 space-y-2">
          {(["attiva", "interessato", "non_ora"] as const).map((s) => (
            <label key={s} className="flex items-start gap-2 text-sm text-sea-800">
              <input
                type="radio"
                name="stato"
                value={s}
                required
                checked={stato === s}
                onChange={() => setStato(s)}
                className="mt-0.5 h-4 w-4 border-sea-300"
              />
              <span>{t(`spec_stato_${s}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {apertoAlSi ? (
        <>
          <div>
            <label htmlFor="racconto" className={etichetta}>
              {t(`spec_${ambito}_racconto`)}
            </label>
            <textarea
              id="racconto"
              name="racconto"
              rows={3}
              maxLength={600}
              defaultValue={valori?.racconto ?? ""}
              placeholder={t(`spec_${ambito}_raccontoPlaceholder`)}
              className={campo}
            />
            <p className="mt-1 text-[11px] text-sea-400">{t("spec_raccontoNota")}</p>
          </div>

          <div>
            <label htmlFor="frequenza" className={etichetta}>
              {t("spec_frequenza")}
            </label>
            <select
              id="frequenza"
              name="frequenza"
              defaultValue={valori?.frequenza ?? ""}
              className={campo}
            >
              <option value="">{t("nonIndicato")}</option>
              {FREQUENZE.map((f) => (
                <option key={f} value={f}>
                  {t(`spec_freq_${f}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Lo stato dichiarato non basta: lo diciamo prima, non dopo. */}
          <p
            className={`rounded-lg px-3 py-2 text-[11px] ${
              confermata
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {confermata ? t(`spec_${ambito}_confermata`) : t(`spec_${ambito}_daConfermare`)}
          </p>
        </>
      ) : null}

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
