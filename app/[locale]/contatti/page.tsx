import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Contatti",
  alternates: { canonical: "/contatti" },
};

const IT: LegalContent = {
  title: "Contatti",
  updated: "Ultimo aggiornamento: settembre 2026",
  backLabel: "← Torna alla home",
  intro: "Come raggiungerci per domande, correzioni o questioni legali e privacy.",
  sections: [
    {
      h: "Richieste generali",
      body: ["Per informazioni generali sul progetto: info@lidorank.com."],
    },
    {
      h: "Gestori — correzioni e replica",
      body: [
        "Sei il gestore di uno stabilimento e un'informazione è errata? Scrivi a info@lidorank.com indicando il nome del lido e cosa correggere. Vedi anche la pagina Moderazione e reclami.",
      ],
    },
    {
      h: "Privacy e dati personali",
      body: [
        "Per esercitare i tuoi diritti sui dati (accesso, rettifica, cancellazione…): info@lidorank.com. Vedi l'Informativa privacy.",
      ],
    },
    {
      h: "Chi siamo",
      body: [
        "LidoRank è co-fondato da Giorgio Menicagli Pirina (prodotto e sviluppo) e Francesco Mancuso (analisi delle politiche e relazioni istituzionali).",
      ],
    },
  ],
};

const EN: LegalContent = {
  title: "Contact",
  updated: "Last updated: September 2026",
  backLabel: "← Back to home",
  intro: "How to reach us for questions, corrections or legal and privacy matters.",
  sections: [
    {
      h: "General enquiries",
      body: ["For general information about the project: info@lidorank.com."],
    },
    {
      h: "Operators — corrections and replies",
      body: [
        "Are you the operator of an establishment and something is wrong? Write to info@lidorank.com with the club name and what to correct. See also the Moderation and complaints page.",
      ],
    },
    {
      h: "Privacy and personal data",
      body: [
        "To exercise your data rights (access, rectification, erasure…): info@lidorank.com. See the Privacy policy.",
      ],
    },
    {
      h: "About us",
      body: [
        "LidoRank is co-founded by Giorgio Menicagli Pirina (product and engineering) and Francesco Mancuso (policy analysis and institutional relations).",
      ],
    },
  ],
};

export default function ContattiPage({ params }: { params: { locale: string } }) {
  return <LegalPage c={params.locale === "en" ? EN : IT} />;
}
