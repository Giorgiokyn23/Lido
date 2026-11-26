"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

/**
 * La scelta del soprannome pubblico.
 *
 * PERCHÉ UN SOPRANNOME E NON IL NOME VERO. Il profilo pubblico serve a farsi
 * trovare dagli amici, non a farsi identificare da chiunque. Su LidoRank le
 * recensioni sono anonime per scelta, e un profilo con nome e cognome
 * accanto a un elenco di bagni visitati con le date renderebbe quella scelta
 * una finzione: basterebbe incrociare le due cose.
 *
 * NON È OBBLIGATORIO, ed è la ragione per cui questo riquadro si può
 * ignorare. Chi non sceglie un soprannome continua a usare il sito esattamente
 * come prima: salva i suoi bagni, scrive recensioni, e non ha un profilo
 * pubblico. Il lato social è un'aggiunta, non un pedaggio.
 */
export function SoprannomeForm({ handle }: { handle: string | null }) {
  const t = useTranslations("social");
  const router = useRouter();
  const [copiato, setCopiato] = useState(false);
  const [valore, setValore] = useState(handle ?? "");
  const [attesa, setAttesa] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const [apri, setApri] = useState(handle == null);

  const [indirizzo, setIndirizzo] = useState("");
  useEffect(() => {
    if (handle) setIndirizzo(`${window.location.origin}/u/${handle}`);
  }, [handle]);

  function spiega(messaggio: string): string {
    if (messaggio.includes("handle_occupato")) return t("errOccupato");
    if (messaggio.includes("handle_riservato")) return t("errRiservato");
    if (messaggio.includes("handle_non_valido")) return t("errForma");
    return t("errGenerico");
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setAttesa(true);
    setErrore(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("imposta_handle", {
      _handle: valore.trim().toLowerCase(),
    });
    setAttesa(false);
    if (error) {
      setErrore(spiega(error.message || ""));
      return;
    }
    setFatto(true);
    router.refresh();
  }

  if (handle && !apri) {
    return (
      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-sea-800">{t("ilTuoSoprannome")}</h2>
            <p className="mt-0.5 font-mono text-sea-900">@{handle}</p>
          </div>
          <button
            onClick={() => setApri(true)}
            className="text-xs text-sea-500 underline underline-offset-2"
          >
            {t("cambia")}
          </button>
        </div>
        {/* IL LINK È IL MODO VERO DI FARSI AGGIUNGERE, e senza questo pezzo
            la funzione non si usava: cercare per soprannome presuppone che
            qualcuno te l'abbia già detto a voce, e nessuno lo fa. Si manda
            il link su WhatsApp, l'altro apre e clicca. Non costa niente in
            riservatezza — chi riceve il link lo riceve da te, che è
            esattamente la regola che volevamo. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-sea-50 p-3">
          <code className="min-w-0 flex-1 truncate text-xs text-sea-700">
            {indirizzo || `lidorank.com/u/${handle}`}
          </code>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(indirizzo);
                setCopiato(true);
                setTimeout(() => setCopiato(false), 2500);
              } catch {
                // Senza permesso per gli appunti resta il testo da copiare
                // a mano: è lì, visibile, e non serve dire niente.
              }
            }}
            className="shrink-0 rounded-lg bg-sea-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sea-600"
          >
            {copiato ? t("copiato") : t("copiaLink")}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(t("invito", { link: indirizzo }))}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-sea-300 px-3 py-1.5 text-xs font-medium text-sea-700 transition hover:bg-white"
          >
            {t("invia")}
          </a>
        </div>

        <p className="mt-2 text-xs text-sea-500">{t("comeTiTrovano")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sea-800">
        {handle ? t("cambiaSoprannome") : t("scegliSoprannome")}
      </h2>
      <p className="mt-0.5 text-xs text-sea-500">{t("soprannomeIntro")}</p>

      <form onSubmit={salva} className="mt-3 flex flex-wrap gap-2">
        <div className="flex min-w-[12rem] flex-1 items-center rounded-xl border border-sea-200 px-3 focus-within:border-sea-400 focus-within:ring-2 focus-within:ring-sea-200">
          <span className="text-sea-400">@</span>
          <input
            value={valore}
            // Si normalizza mentre si scrive invece di rifiutare dopo: il
            // database accetta solo minuscole, e far sbagliare una persona
            // per poi dirle «no» è un modo gratuito di irritarla.
            onChange={(e) =>
              setValore(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
            }
            placeholder={t("soprannomeEsempio")}
            className="w-full bg-transparent py-2.5 font-mono text-sea-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={attesa || valore.length < 3}
          className="rounded-xl bg-sea-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-600 disabled:opacity-60"
        >
          {attesa ? t("salvo") : t("salva")}
        </button>
      </form>

      {errore ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errore}</p>
      ) : null}
      {fatto ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("salvato")}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] text-sea-400">{t("soprannomeRegole")}</p>
    </section>
  );
}
