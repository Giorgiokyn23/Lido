"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PortaAccesso } from "@/components/PortaAccesso";

/**
 * Il pulsante «Lascia una recensione».
 *
 * DOVE METTERE LA SOVRAIMPRESSIONE, e perché qui c'è un interruttore.
 *
 * Francesco la vuole al clic, prima della recensione. Il mio parere è che
 * vada dopo, e la ragione non è di gusto: oggi la cosa più scarsa che abbiamo
 * sono le recensioni — ne servono dieci per bagno solo per entrare in
 * classifica — mentre gli account sono un mezzo. Ogni schermata messa PRIMA
 * di un'azione ne perde una quota, ed è il risultato più solido che esista
 * sugli imbuti di conversione. In più il momento in cui una persona è più
 * disposta a creare un account non è prima di scrivere: è subito dopo aver
 * scritto, quando ha appena dato qualcosa e vuole che non si perda. Quel
 * momento è già coperto dal pannello che compare a recensione inviata.
 *
 * Siccome è una decisione di prodotto e non mia, sta in una costante: una
 * riga da cambiare, non una riscrittura. Se al confronto decidete per
 * l'ostacolo prima, mettete `true` e ricostruite — ma allora misuriamo le
 * recensioni al giorno prima e dopo, perché è una domanda a cui si può
 * rispondere con i numeri invece che con le opinioni.
 */
const GATE_PRIMA_DELLA_RECENSIONE = false;

export function RichiamoRecensione({
  classe,
  etichetta,
}: {
  classe: string;
  etichetta: string;
}) {
  const t = useTranslations("accesso");
  const [porta, setPorta] = useState(false);

  function vaiAlModulo() {
    setPorta(false);
    const modulo = document.getElementById("scrivi-recensione");
    if (modulo) modulo.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.hash = "#scrivi-recensione";
  }

  return (
    <>
      <a
        href="#scrivi-recensione"
        className={classe}
        onClick={(e) => {
          if (!GATE_PRIMA_DELLA_RECENSIONE) return;
          e.preventDefault();
          setPorta(true);
        }}
      >
        {etichetta}
      </a>

      <PortaAccesso
        aperto={porta}
        onChiudi={() => setPorta(false)}
        onContinuaSenza={vaiAlModulo}
        titolo={t("titoloRecensione")}
        sottotitolo={t("sottotitoloRecensione")}
      />
    </>
  );
}
