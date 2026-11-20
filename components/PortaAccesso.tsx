"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * La sovraimpressione di accesso.
 *
 * PERCHÉ C'È UN PORTALE, e perché prima non funzionava. La versione
 * precedente si disegnava dentro il componente che la apriva. Quando il
 * componente era la barra in alto — che ha `backdrop-blur` — la
 * sovraimpressione finiva incollata all'intestazione e tagliata, invece che
 * centrata sullo schermo. Non è un capriccio del browser: un elemento con
 * `backdrop-filter` diventa il riferimento per i figli in `position: fixed`,
 * esattamente come farebbe un `transform`. Finché la finestra nasce dentro
 * quell'elemento, nessuna classe CSS può salvarla. Il portale la sposta in
 * fondo a `document.body`, dove nessun antenato può più catturarla.
 *
 * DUE VARIANTI, come chiede Francesco:
 *   - senza `onContinuaSenza` → «serve un profilo»: è il caso di «Da provare»
 *     e «Ci sono stato», dove senza un account non c'è proprio dove salvare.
 *   - con `onContinuaSenza` → «puoi anche continuare senza»: è il caso della
 *     recensione, dove il profilo è un vantaggio e non un requisito.
 *
 * NIENTE CAMPO PASSWORD, che nel prototipo c'è. LidoRank non ha password:
 * l'accesso è un codice via email. Aggiungerla significherebbe introdurre la
 * cosa più rubata del web per guadagnare zero — chi entra una volta al mese
 * la dimentica comunque, e ci ritroveremmo a gestire reimpostazioni.
 */
export function PortaAccesso({
  aperto,
  onChiudi,
  onContinuaSenza,
  titolo,
  sottotitolo,
}: {
  aperto: boolean;
  onChiudi: () => void;
  onContinuaSenza?: () => void;
  titolo?: string;
  sottotitolo?: string;
}) {
  const t = useTranslations("accesso");
  const [montato, setMontato] = useState(false);
  const [scheda, setScheda] = useState<"crea" | "entra">("crea");
  const [passo, setPasso] = useState<"dati" | "codice">("dati");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [codice, setCodice] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [attesa, setAttesa] = useState(false);
  const primoCampo = useRef<HTMLInputElement>(null);

  const LUNGHEZZA = Math.min(
    10,
    Math.max(6, Number(process.env.NEXT_PUBLIC_LUNGHEZZA_CODICE) || 8)
  );

  // Il portale esiste solo nel browser: durante la resa sul server
  // `document` non c'è.
  useEffect(() => setMontato(true), []);

  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    document.addEventListener("keydown", esc);
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = precedente;
    };
  }, [aperto, onChiudi]);

  useEffect(() => {
    if (aperto && passo === "dati") primoCampo.current?.focus();
  }, [aperto, passo, scheda]);

  if (!aperto || !montato) return null;

  async function inviaCodice() {
    setAttesa(true);
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: nome.trim() ? { nome: nome.trim().slice(0, 60) } : undefined,
      },
    });
    setAttesa(false);
    if (error) {
      const rate = (error as { status?: number }).status === 429 || /rate/i.test(error.message);
      setErrore(rate ? t("errRate") : t("errGeneric"));
      return;
    }
    setPasso("codice");
  }

  async function verifica() {
    setAttesa(true);
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codice.replace(/\D/g, ""),
      type: "email",
    });
    setAttesa(false);
    if (error) {
      setErrore(t("errCodice"));
      return;
    }
    // Ricarica: senza, i pulsanti delle liste e l'area gestore continuano a
    // vedere un anonimo finché non si cambia pagina.
    window.location.reload();
  }

  const campo =
    "mt-1 w-full rounded-xl border border-sea-200 px-4 py-3 text-sea-900 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200";

  const linguetta = (attiva: boolean) =>
    `flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      attiva ? "bg-white text-sea-900 shadow-sm" : "text-sea-600 hover:text-sea-800"
    }`;

  const finestra = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titolo ?? t("titolo")}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-sea-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onChiudi();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-sea-400">
              {t("occhiello")}
            </div>
            <h2 className="mt-0.5 text-xl font-bold text-sea-900">{titolo ?? t("titolo")}</h2>
            <p className="mt-1 text-sm text-sea-600">{sottotitolo ?? t("sottotitolo")}</p>
          </div>
          <button
            onClick={onChiudi}
            aria-label={t("chiudi")}
            className="shrink-0 rounded-full p-1 text-sea-400 hover:bg-sea-50"
          >
            ✕
          </button>
        </div>

        {passo === "dati" ? (
          <>
            <div className="mt-5 flex gap-1 rounded-2xl bg-sea-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setScheda("crea");
                  setErrore(null);
                }}
                className={linguetta(scheda === "crea")}
              >
                {t("creaProfilo")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScheda("entra");
                  setErrore(null);
                }}
                className={linguetta(scheda === "entra")}
              >
                {t("accedi")}
              </button>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                inviaCodice();
              }}
            >
              {scheda === "crea" ? (
                <div>
                  <label htmlFor="pa_nome" className="text-xs font-medium text-sea-700">
                    {t("nome")}
                  </label>
                  <input
                    id="pa_nome"
                    ref={primoCampo}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={60}
                    autoComplete="nickname"
                    placeholder={t("nomePlaceholder")}
                    className={campo}
                  />
                  <p className="mt-1 text-[11px] text-sea-400">{t("nomeNota")}</p>
                </div>
              ) : null}

              <div>
                <label htmlFor="pa_email" className="text-xs font-medium text-sea-700">
                  {t("email")}
                </label>
                <input
                  id="pa_email"
                  ref={scheda === "entra" ? primoCampo : undefined}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  className={campo}
                />
                <p className="mt-1 text-[11px] text-sea-400">{t("senzaPassword")}</p>
              </div>

              {errore ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
              ) : null}

              <button
                type="submit"
                disabled={attesa}
                className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
              >
                {attesa
                  ? t("invio")
                  : scheda === "crea"
                    ? t("creaEContinua")
                    : t("mandaCodice")}
              </button>
            </form>

            {/* Che cosa ci si porta a casa. Tre cose concrete, non una
                promessa generica: chi sta per dare la sua email vuole sapere
                in cambio di cosa. */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-sea-100 pt-4">
              <span className="rounded-full bg-sea-50 px-2.5 py-1 text-[11px] text-sea-700">
                ✓ {t("vantaggioVisitati")}
              </span>
              <span className="rounded-full bg-sea-50 px-2.5 py-1 text-[11px] text-sea-700">
                🔖 {t("vantaggioDaProvare")}
              </span>
              <span className="rounded-full bg-sea-50 px-2.5 py-1 text-[11px] text-sea-700">
                ✍ {t("vantaggioPeso")}
              </span>
            </div>

            {onContinuaSenza ? (
              <button
                onClick={onContinuaSenza}
                className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-medium text-sea-600 underline underline-offset-2 transition hover:bg-sea-50"
              >
                {t("senzaProfilo")}
              </button>
            ) : null}

            <p className="mt-3 text-center text-[11px] text-sea-400">{t("notaAnonimato")}</p>
          </>
        ) : (
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              verifica();
            }}
          >
            <p className="text-sm text-sea-600">{t("codiceIntro", { email })}</p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={LUNGHEZZA}
              value={codice}
              onChange={(e) => setCodice(e.target.value.replace(/\D/g, "").slice(0, LUNGHEZZA))}
              placeholder={"0".repeat(LUNGHEZZA)}
              aria-label={t("codiceLabel")}
              className={`${campo} text-center text-2xl font-bold tracking-[0.25em]`}
            />
            {errore ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
            ) : null}
            <button
              type="submit"
              disabled={attesa || codice.length < LUNGHEZZA}
              className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
            >
              {attesa ? t("invio") : t("entra")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPasso("dati");
                setErrore(null);
              }}
              className="w-full text-xs text-sea-500 underline underline-offset-2"
            >
              {t("indietro")}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  // Fuori da qualunque antenato: è questo che la rende una finestra vera.
  return createPortal(finestra, document.body);
}
