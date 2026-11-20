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
 * Siccome è una decisione di prodotto e non mia, sta in una costante.
 * Francesco l'ha chiesta due volte e con l'uscita «continua senza profilo»
 * ben visibile, quindi è accesa: chi vuole solo scrivere lo fa in un clic in
 * più, non in dieci. Resta una riga da cambiare se i numeri dicessero il
 * contrario — e il modo di saperlo è contare le recensioni al giorno prima e
 * dopo questa modifica, non discuterne.
 */
const GATE_PRIMA_DELLA_RECENSIONE = true;

export function RichiamoRecensione({
  classe,
  etichetta,
  ancora = "scrivi-recensione",
}: {
  classe: string;
  etichetta: string;
  /** Dove portare chi sceglie di continuare senza profilo. In home non c'è
      ancora un bagno scelto, quindi si va alla ricerca invece che al modulo. */
  ancora?: string;
}) {
  const t = useTranslations("accesso");
  const [porta, setPorta] = useState(false);

  function vaiAvanti() {
    setPorta(false);
    const bersaglio = document.getElementById(ancora);
    if (bersaglio) bersaglio.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.hash = `#${ancora}`;
  }

  return (
    <>
      <a
        href={`#${ancora}`}
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
        onContinuaSenza={vaiAvanti}
        titolo={t("titoloRecensione")}
        sottotitolo={t("sottotitoloRecensione")}
      />
    </>
  );
}
