"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useFormState } from "react-dom";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { submitReview, type SubmitState } from "@/app/actions";
import {
  FACTS,
  BOOL_FACTS,
  CIVIC_FACTS,
  SUBPOINTS,
} from "@/lib/types";
import { StarRating } from "@/components/StarRating";
import { Turnstile } from "@/components/Turnstile";
import { PortaAccesso } from "@/components/PortaAccesso";

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

// Pannello mostrato dopo l'invio. Per gli anonimi è il momento di massimo
// coinvolgimento: proponiamo l'accesso senza password (magic-link) così le
// PROSSIME recensioni saranno verificate e legate al profilo — è questo che
// rende misurabile il tasso di ritorno.
/**
 * Pannello mostrato dopo l'invio.
 *
 * Qui c'era anche un modulo per lasciare l'email e ricevere un collegamento
 * di accesso. L'ho tolto: adesso, per chi è anonimo, subito dopo la
 * pubblicazione si apre la finestra di creazione profilo, e due richieste
 * della stessa email nello stesso istante — una nella finestra, una sotto —
 * non sono il doppio di convincenti: sono confuse.
 */
function SuccessPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  const tr = useTranslations("review");
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <p className="text-lg font-semibold text-emerald-900">{tr("successTitle")}</p>
      <p className="mt-1 text-sm text-emerald-800">{tr("successBody")}</p>
      {!isLoggedIn ? (
        <p className="mt-3 text-xs text-emerald-700">{tr("ctaBody")}</p>
      ) : null}
    </div>
  );
}

const initial: SubmitState = { ok: false };

export function ReviewForm({
  beachId,
  coreKeys,
  showBeachFacts = true,
}: {
  beachId: string;
  coreKeys: string[];
  showBeachFacts?: boolean;
}) {
  const [state, formAction] = useFormState(submitReview, initial);
  // login rilevato lato client, così la scheda resta cache-abile (ISR)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [porta, setPorta] = useState(false);
  const [portaDopo, setPortaDopo] = useState(false);
  // Da dove arriva chi sta scrivendo: il link del gestore porta ?via=qr|wa|mail.
  // Leggo da window invece che con useSearchParams per non forzare il rendering
  // dinamico della scheda, che è servita da cache.
  const [fonte, setFonte] = useState("");
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("via") ?? "";
    if (["qr", "wa", "mail", "link"].includes(v)) setFonte(v);
  }, []);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);
  const tr = useTranslations("review");
  const tm = useTranslations("metrics");
  const th = useTranslations("metricHints");
  const tf = useTranslations("facts");
  const tb = useTranslations("boolFacts");
  const ts = useTranslations("subpoints");

  // Si apre da sola a recensione pubblicata, e solo per chi è anonimo.
  useEffect(() => {
    if (state.ok && !isLoggedIn) setPortaDopo(true);
  }, [state.ok, isLoggedIn]);

  if (state.ok) {
    // Il momento migliore per proporre un profilo non è prima di scrivere: è
    // adesso, quando la persona ha appena dato qualcosa e vuole che non si
    // perda. Chi ha già un account non vede niente.
    return (
      <>
        <SuccessPanel isLoggedIn={isLoggedIn} />
        {!isLoggedIn ? (
          <PortaAccesso
            aperto={portaDopo}
            onChiudi={() => setPortaDopo(false)}
            onContinuaSenza={() => setPortaDopo(false)}
            titolo={tr("dopoTitolo")}
            sottotitolo={tr("dopoSottotitolo")}
          />
        ) : null}
      </>
    );
  }

  // Le tre famiglie chieste da Francesco. Sono SOLO un raggruppamento visivo:
  // i criteri, i loro pesi e il calcolo del punteggio non cambiano di una
  // virgola. I porti hanno criteri diversi e non compaiono qui: finiscono nel
  // blocco senza intestazione, invece di sparire perché nessuno li ha mappati.
  const GRUPPI_CRITERI = [
    {
      titolo: "groupDay",
      chiavi: ["seabed_quality", "pulizia_igiene", "space_privacy", "sicurezza"],
    },
    {
      titolo: "groupServices",
      chiavi: ["family_services", "accessibility", "price_transparency", "impianti_sportivi"],
    },
    { titolo: "groupPeople", chiavi: ["atmosfera", "eventi_comunita"] },
  ];
  const raggruppate = new Set(GRUPPI_CRITERI.flatMap((g) => g.chiavi));
  const restanti = coreKeys.filter((k) => !raggruppate.has(k));

  // Un criterio con i suoi sottopunti. Estratto in un componente perché ora
  // viene reso da due punti diversi: se restasse scritto due volte, la
  // prossima modifica ne aggiornerebbe uno solo.
  const CriterioConSottopunti = ({ chiave }: { chiave: string }) => {
    const subs = (SUBPOINTS as Record<string, string[]>)[chiave];
    return (
      <div>
        <StarRating name={chiave} label={tm(chiave)} hint={th(chiave)} />
        {subs?.length ? (
          <details className="mt-1 rounded-lg bg-sea-50/60 px-3 py-2">
            <summary className="cursor-pointer text-[11px] font-medium text-sea-600">
              {tr("subpointsToggle")}
            </summary>
            <p className="mt-1 text-[10px] italic text-sea-400">{tr("subpointsHint")}</p>
            <div className="mt-2 space-y-2">
              {subs.map((sk) => (
                <div key={sk} className="flex items-center justify-between gap-2">
                  <label htmlFor={sk} className="text-[11px] text-sea-700">
                    {ts(sk)}
                  </label>
                  <select
                    id={sk}
                    name={sk}
                    defaultValue=""
                    className="shrink-0 rounded-md border border-sea-200 bg-white px-2 py-1 text-[11px] text-sea-900"
                  >
                    <option value="">{tr("unknown")}</option>
                    <option value="si">{tr("yes")}</option>
                    <option value="no">{tr("no")}</option>
                    <option value="na">{tr("na")}</option>
                  </select>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    );
  };

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-2xl border border-sea-100 bg-white shadow-sm"
    >
      <input type="hidden" name="beach_id" value={beachId} />
      <input type="hidden" name="fonte" value={fonte} />
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
            {/* Apriva /login con il vecchio modulo, lasciando a metà chi stava
                già scrivendo. Ora apre la stessa finestra di tutto il resto. */}
            <button
              type="button"
              onClick={() => setPorta(true)}
              className="font-semibold underline underline-offset-2"
            >
              {tr("anonLink")}
            </button>
            {tr("anonPost")}
          </span>
        )}
      </div>

      <div className="space-y-6 p-6">
        {/* Criteri principali (obbligatori, scelta cosciente — nessun default).
            Restano tutti e dieci sulla stessa pagina: le tre intestazioni
            servono a far capire a colpo d'occhio di che cosa si sta parlando,
            non a spezzare il modulo in passaggi. Un criterio che non rientra
            in nessun gruppo — i porti ne hanno altri — finisce nell'ultimo
            blocco senza intestazione, invece di sparire. */}
        {GRUPPI_CRITERI.map(({ titolo, chiavi }) => {
          const presenti = coreKeys.filter((k) => chiavi.includes(k));
          if (presenti.length === 0) return null;
          return (
            <fieldset key={titolo}>
              {/* Più grandi delle singole voci: se l'intestazione di una
                  sezione è più piccola di ciò che contiene, smette di essere
                  un'intestazione e diventa rumore. */}
              <legend className="text-lg font-bold text-sea-900">{tr(titolo)}</legend>
              <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                {presenti.map((key) => (
                  <CriterioConSottopunti key={key} chiave={key} />
                ))}
              </div>
            </fieldset>
          );
        })}

        <fieldset className={restanti.length === 0 ? "hidden" : undefined}>
          <legend className="text-sm font-semibold text-sea-800">{tr("coreTitle")}</legend>
          <p className="mb-2 text-xs text-sea-400">{tr("coreHint")}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
            {restanti.map((key) => (
              <CriterioConSottopunti key={key} chiave={key} />
            ))}
          </div>
        </fieldset>

        {/* Fatti oggettivi (facoltativi) */}
        {showBeachFacts && (
        <fieldset className="rounded-xl bg-sea-50/60 p-4">
          <legend className="px-1 text-sm font-semibold text-sea-800">
            {tr("factsTitle")} <span className="font-normal text-sea-400">{tr("factsOptional")}</span>
          </legend>
          <p className="mt-1 px-1 text-[11px] italic text-sea-400">{tr("factsDisclaimer")}</p>
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
        )}

        {/* Uso del demanio e valore civico (fatti, non voti) */}
        {showBeachFacts && CIVIC_FACTS.length > 0 && (
        <fieldset className="rounded-xl border border-sea-100 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-sea-800">
            {tr("civicTitle")} <span className="font-normal text-sea-400">{tr("factsOptional")}</span>
          </legend>
          <p className="mt-1 px-1 text-[11px] italic text-sea-400">{tr("civicHint")}</p>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CIVIC_FACTS.map((cf) => (
              <div key={cf.key}>
                <label htmlFor={cf.key} className="text-xs font-medium text-sea-700">{tb(cf.key)}</label>
                <select
                  id={cf.key}
                  name={cf.key}
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
        )}

        {/* Racconta la tua esperienza.
            Via la casella «confermo di aver visitato»: era obbligatoria e
            bloccava l'invio, cioè era attrito messo davanti alla cosa più
            scarsa che abbiamo, le recensioni. La dichiarazione però non
            sparisce: resta nella riga sotto il pulsante. Una delle due si
            poteva togliere, tutte e due no — quando un gestore contesta una
            recensione, «chi ha scritto ha dichiarato di esserci stato» è
            un'altra cosa rispetto a «un anonimo ha scritto questo». */}
        <fieldset className="rounded-xl border border-sea-100 p-4">
          <legend className="px-1 text-sm font-semibold text-sea-800">{tr("tellTitle")}</legend>

          <label htmlFor="commento" className="mt-1 block text-sm text-sea-700">
            {tr("tellQuestion")}
          </label>
          <textarea
            id="commento"
            name="commento"
            rows={4}
            maxLength={2000}
            placeholder={tr("commentPlaceholder")}
            className="mt-2 w-full rounded-xl border border-sea-200 px-4 py-2.5 text-sea-900 placeholder:text-sea-300 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <div>
              <label
                htmlFor="visita_periodo"
                className="flex items-center gap-2 text-sm text-sea-700"
              >
                <span aria-hidden="true">🗓</span>
                {tr("visitDateAdd")}
              </label>
              <input
                id="visita_periodo"
                name="visita_periodo"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1 block rounded-lg border border-sea-200 bg-white px-3 py-2 text-sm text-sea-900"
              />
            </div>

            {/* Dichiarazione di chi scrive, non una verifica: per questo non
                tocca il peso della recensione. Vale come contesto per chi
                legge — un abbonato conosce il posto in un altro modo. */}
            <label className="flex items-start gap-2 text-sm text-sea-700">
              <input
                type="checkbox"
                name="abbonato"
                value="1"
                className="mt-0.5 h-4 w-4 rounded border-sea-300 text-sea-600"
              />
              <span>{tr("abbonatoLabel")}</span>
            </label>
          </div>
        </fieldset>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <Turnstile />
        <SubmitButton />
        <p className="text-center text-[11px] text-sea-400">{tr("declaration")}</p>

        <PortaAccesso
          aperto={porta}
          onChiudi={() => setPorta(false)}
          onContinuaSenza={() => setPorta(false)}
          titolo={tr("primaTitolo")}
          sottotitolo={tr("primaSottotitolo")}
        />
      </div>
    </form>
  );
}
