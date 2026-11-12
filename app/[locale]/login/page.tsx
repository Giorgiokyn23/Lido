"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Accesso in due passi con CODICE a sei cifre.
 *
 * Perché il codice e non il link. Il collegamento magico si rompe in tre modi
 * che non dipendono dall'utente: gli scanner di sicurezza della posta aziendale
 * lo aprono per controllarlo e così lo consumano prima che arrivi la persona;
 * se apri l'email sul telefono ma avevi iniziato dal computer, la verifica
 * fallisce perché la sessione è nata altrove; e se il link scade non si capisce
 * perché. Un codice da copiare non ha nessuno di questi problemi: funziona anche
 * leggendo l'email su un altro dispositivo.
 *
 * Il collegamento resta valido come alternativa: chi clicca entra lo stesso,
 * ora che /auth/confirm non dipende più dal dispositivo di partenza.
 */

// Il passo e l'indirizzo sopravvivono a un ricaricamento. Senza, bastava
// cliccare il link nell'email, tornare indietro, o lasciar riaddormentare il
// telefono per ritrovarsi al punto di partenza con un codice in mano e
// nessuna casella dove scriverlo.
const CHIAVE = "lidorank_accesso";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();

  const [passo, setPasso] = useState<"email" | "codice">("email");
  const [email, setEmail] = useState("");
  const [codice, setCodice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attesa, setAttesa] = useState(0);

  // Ripristino all'apertura. Leggiamo anche l'esito del collegamento:
  // /auth/confirm rimanda qui con ?errore=link quando la verifica non riesce.
  useEffect(() => {
    try {
      const salvato = sessionStorage.getItem(CHIAVE);
      if (salvato) {
        const d = JSON.parse(salvato) as { email?: string; passo?: string };
        if (d.email) setEmail(d.email);
        if (d.passo === "codice") setPasso("codice");
      }
    } catch {
      // Navigazione privata o storage bloccato: si riparte dal primo passo.
    }
    if (new URLSearchParams(window.location.search).get("errore") === "link") {
      setError(t("errLink"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvataggio a ogni cambio di passo.
  useEffect(() => {
    try {
      if (passo === "codice" && email) {
        sessionStorage.setItem(CHIAVE, JSON.stringify({ email, passo }));
      } else if (passo === "email") {
        sessionStorage.removeItem(CHIAVE);
      }
    } catch {
      // Lo storage è un comodo in più, non una dipendenza.
    }
  }, [passo, email]);

  // Supabase accetta una nuova richiesta per lo stesso indirizzo ogni 60
  // secondi: mostriamo il conto alla rovescia invece di far sbattere l'utente
  // contro un errore.
  useEffect(() => {
    if (attesa <= 0) return;
    const id = setInterval(() => setAttesa((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [attesa]);

  function messaggio(e: { status?: number; message?: string } | null): string {
    const msg = e?.message ?? "";
    if (e?.status === 429 || /rate/i.test(msg)) return t("errRate");
    if (/expired|invalid/i.test(msg)) return t("errCodice");
    return t("errGeneric");
  }

  async function inviaCodice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setLoading(false);
    if (error) {
      setError(messaggio(error as { status?: number; message?: string }));
      return;
    }
    setPasso("codice");
    setAttesa(60);
  }

  async function verificaCodice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codice.replace(/\D/g, ""),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(messaggio(error as { status?: number; message?: string }));
      return;
    }
    try {
      sessionStorage.removeItem(CHIAVE);
    } catch {
      // ignorabile
    }
    router.push("/area-gestore");
    router.refresh();
  }

  const campo =
    "w-full rounded-xl border border-sea-200 px-4 py-3 text-sea-900 focus:border-sea-400 focus:outline-none focus:ring-2 focus:ring-sea-200";

  return (
    <div className="mx-auto max-w-md">
      <Link href="/" className="text-sm text-sea-500 hover:underline">
        ← Home
      </Link>
      <div className="mt-4 rounded-2xl border border-sea-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-sea-900">{t("title")}</h1>

        {passo === "email" ? (
          <>
            <p className="mt-1 text-sm text-sea-500">{t("introCodice")}</p>
            <form onSubmit={inviaCodice} className="mt-6 space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className={campo}
              />
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
              >
                {loading ? t("submitting") : t("submitCodice")}
              </button>
            </form>

            {/* Via di ritorno per chi un codice ce l'ha già: ha chiuso la
                scheda, ha cliccato il link e si è ritrovato qui, o ha chiesto
                il codice dal telefono e lo scrive dal computer. */}
            <button
              onClick={() => {
                if (!email.trim()) {
                  setError(t("errEmailPrima"));
                  return;
                }
                setError(null);
                setPasso("codice");
              }}
              className="mt-4 text-xs text-sea-500 underline underline-offset-2"
            >
              {t("giaCodice")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-sea-500">{t("codiceIntro", { email })}</p>
            <form onSubmit={verificaCodice} className="mt-6 space-y-3">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={codice}
                onChange={(e) => setCodice(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                aria-label={t("codiceLabel")}
                className={`${campo} text-center text-2xl font-bold tracking-[0.4em]`}
              />
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={loading || codice.length < 6}
                className="w-full rounded-xl bg-sea-500 px-5 py-3 font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
              >
                {loading ? t("submitting") : t("verifica")}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                onClick={() => {
                  setPasso("email");
                  setCodice("");
                  setError(null);
                }}
                className="text-sea-500 underline underline-offset-2"
              >
                {t("cambiaEmail")}
              </button>
              <button
                onClick={(e) => (attesa > 0 ? undefined : inviaCodice(e))}
                disabled={attesa > 0 || loading}
                className="text-sea-500 underline underline-offset-2 disabled:no-underline disabled:opacity-60"
              >
                {attesa > 0 ? t("reinviaFra", { secondi: attesa }) : t("reinvia")}
              </button>
            </div>

            <p className="mt-4 rounded-lg bg-sea-50 px-3 py-2 text-xs text-sea-600">
              {t("ancheLink")}
            </p>
          </>
        )}

        <p className="mt-4 text-xs text-sea-400">{t("anonNote")}</p>
      </div>
    </div>
  );
}
