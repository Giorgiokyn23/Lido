"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * La sovraimpressione di accesso: crea profilo, accedi, oppure continua senza.
 *
 * Perché non c'è il campo password, che nel prototipo c'era. LidoRank non ha
 * password: l'accesso è un codice a sei cifre via email. Aggiungerne una qui
 * significherebbe introdurre la cosa più rubata del web per guadagnare zero —
 * chi entra una volta al mese la dimenticherebbe comunque. Il nome invece c'è:
 * serve alla persona per riconoscere la propria area.
 *
 * Il nome NON compare mai accanto a una recensione. Dopo la migrazione 0085
 * questa non è una promessa dell'interfaccia: il collegamento fra chi scrive
 * e che cosa ha scritto non è leggibile da nessun ruolo pubblico.
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
  const [modo, setModo] = useState<"scelta" | "crea" | "entra" | "codice">("scelta");
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

  // Chiusura con Esc e blocco dello scorrimento dietro: senza, su telefono si
  // scorre la pagina sotto la sovraimpressione e si perde il filo.
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
    if (aperto && (modo === "crea" || modo === "entra")) primoCampo.current?.focus();
  }, [aperto, modo]);

  if (!aperto) return null;

  async function inviaCodice() {
    setAttesa(true);
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        // Il nome viaggia con la richiesta e finisce nei metadati
        // dell'utente: lo recupera la pagina del profilo al primo accesso.
        data: nome.trim() ? { nome: nome.trim().slice(0, 60) } : undefined,
      },
    });
    setAttesa(false);
    if (error) {
      const rate = (error as { status?: number }).status === 429 || /rate/i.test(error.message);
      setErrore(rate ? t("errRate") : t("errGeneric"));
      return;
    }
    setModo("codice");
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
    // Ricarica: la pagina deve rigenerarsi con la sessione, altrimenti i
    // pulsanti delle liste e l'area gestore continuano a vedere un anonimo.
    window.location.reload();
  }

  const campo =
    "mt-1 w-full rounded-xl border border-sea-200 px-4 py-3 text-sea-900 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titolo ?? t("titolo")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-sea-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onChiudi();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-sea-900">{titolo ?? t("titolo")}</h2>
            <p className="mt-1 text-sm text-sea-500">{sottotitolo ?? t("sottotitolo")}</p>
          </div>
          <button
            onClick={onChiudi}
            aria-label={t("chiudi")}
            className="shrink-0 rounded-full p-1 text-sea-400 hover:bg-sea-50"
          >
            ✕
          </button>
        </div>

        {modo === "scelta" ? (
          <div className="mt-6 space-y-3">
            <button
              onClick={() => setModo("crea")}
              className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600"
            >
              {t("creaProfilo")}
            </button>
            <button
              onClick={() => setModo("entra")}
              className="w-full rounded-xl border border-sea-300 px-5 py-3 font-semibold text-sea-700 transition hover:bg-sea-50"
            >
              {t("accedi")}
            </button>

            {/* Terza via, non nascosta: chi vuole solo scrivere deve poterlo
                fare in un clic. Le recensioni sono la cosa più scarsa che
                abbiamo, gli account sono un mezzo. */}
            {onContinuaSenza ? (
              <button
                onClick={onContinuaSenza}
                className="w-full rounded-xl px-5 py-3 text-sm font-medium text-sea-600 underline underline-offset-2 transition hover:bg-sea-50"
              >
                {t("senzaProfilo")}
              </button>
            ) : null}

            <p className="pt-1 text-center text-[11px] text-sea-400">{t("notaAnonimato")}</p>
          </div>
        ) : null}

        {modo === "crea" || modo === "entra" ? (
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              inviaCodice();
            }}
          >
            {modo === "crea" ? (
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
                ref={modo === "entra" ? primoCampo : undefined}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={campo}
              />
            </div>

            {errore ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
            ) : null}

            <button
              type="submit"
              disabled={attesa}
              className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
            >
              {attesa ? t("invio") : t("mandaCodice")}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("scelta");
                setErrore(null);
              }}
              className="w-full text-xs text-sea-500 underline underline-offset-2"
            >
              {t("indietro")}
            </button>
          </form>
        ) : null}

        {modo === "codice" ? (
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
              onClick={() => setModo("scelta")}
              className="w-full text-xs text-sea-500 underline underline-offset-2"
            >
              {t("indietro")}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
