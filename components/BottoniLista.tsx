"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { PortaAccesso } from "@/components/PortaAccesso";

/**
 * «Da provare» e «Ci sono stato», sulla scheda del bagno.
 *
 * Tutto lato browser, e non per pigrizia: la scheda è in cache condivisa fra
 * tutti i visitatori. Se lo stato di questi pulsanti finisse nell'HTML
 * generato, il primo che visita deciderebbe che cosa vedono gli altri — ci
 * ritroveremmo la lista di uno sconosciuto addosso. Quindi la pagina parte
 * neutra e lo stato lo chiede il browser dopo il caricamento, per sé.
 *
 * Un bagno sta in una lista sola: la chiave primaria è (utente, bagno), e
 * passare a «visitato» aggiorna la stessa riga. L'uscita da «da provare» non
 * è codice che qualcuno deve ricordarsi di scrivere: è la forma della tabella.
 */
export function BottoniLista({ beachId }: { beachId: string }) {
  const t = useTranslations("liste");
  const [stato, setStato] = useState<"da_provare" | "visitato" | null>(null);
  const [pronto, setPronto] = useState(false);
  const [loggato, setLoggato] = useState(false);
  const [attesa, setAttesa] = useState<string | null>(null);
  const [porta, setPorta] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!vivo) return;
      if (!user) {
        setLoggato(false);
        setPronto(true);
        return;
      }
      setLoggato(true);
      const { data } = await supabase.rpc("stato_bagno", { _beach: beachId });
      if (!vivo) return;
      setStato((data as "da_provare" | "visitato" | null) ?? null);
      setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, [beachId]);

  async function segna(tipo: "da_provare" | "visitato") {
    if (!loggato) {
      setPorta(true);
      return;
    }
    setAttesa(tipo);
    const supabase = createClient();
    // Premere di nuovo lo stesso pulsante toglie il bagno dalla lista: è il
    // comportamento che la gente si aspetta da un segnalibro.
    if (stato === tipo) {
      const { error } = await supabase.rpc("togli_bagno", { _beach: beachId });
      if (!error) setStato(null);
    } else {
      const { error } = await supabase.rpc("segna_bagno", { _beach: beachId, _tipo: tipo });
      if (!error) setStato(tipo);
    }
    setAttesa(null);
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-60";
  const spento = "border-sea-200 bg-white text-sea-600 hover:bg-sea-50";
  const acceso = "border-sea-500 bg-sea-500 text-white hover:bg-sea-600";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => segna("da_provare")}
          disabled={!pronto || attesa !== null}
          className={`${base} ${stato === "da_provare" ? acceso : spento}`}
        >
          <span aria-hidden="true">🔖</span>
          {stato === "da_provare" ? t("daProvareFatto") : t("daProvare")}
        </button>

        <button
          onClick={() => segna("visitato")}
          disabled={!pronto || attesa !== null}
          className={`${base} ${stato === "visitato" ? acceso : spento}`}
        >
          <span aria-hidden="true">✓</span>
          {stato === "visitato" ? t("visitatoFatto") : t("visitato")}
        </button>
      </div>

      <PortaAccesso
        aperto={porta}
        onChiudi={() => setPorta(false)}
        titolo={t("portaTitolo")}
        sottotitolo={t("portaSottotitolo")}
      />
    </>
  );
}
