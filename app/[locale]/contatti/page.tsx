import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Contatti",
  alternates: { canonical: "/contatti" },
};

const IT: LegalContent = {
  title: "Contatti",
  updated: "Ultimo aggiornamento: settembre 2026 · Bozza",
  backLabel: "← Torna alla home",
  draftNote:
    "Completa gli indirizzi email reali prima della pubblicazione: i campi tra [ ] sono da configurare.",
  intro: "Come raggiungerci per domande, correzioni o questioni legali e privacy.",
  sections: [
    {
      h: "Richieste generali",
      body: ["Per informazioni generali sul progetto: [indirizzo email da configurare]."],
    },
    {
      h: "Gestori — correzioni e replica",
      body: [
        "Sei il gestore di uno stabilimento e un'informazione è errata? Scrivi a [indirizzo email da configurare] indicando il nome del lido e cosa correggere. Vedi anche la pagina Moderazione e reclami.",
      ],
    },
    {
      h: "Privacy e dati personali",
      body: [
        "Per esercitare i tuoi diritti sui dati (accesso, rettifica, cancellazione…): [indirizzo email da configurare]. Vedi l'Informativa privacy.",
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
  updated: "Last updated: September 2026 · Draft",
  backLabel: "← Back to home",
  draftNote:
    "Fill in the real email addresses before publication: fields in [ ] must be configured.",
  intro: "How to reach us for questions, corrections or legal and privacy matters.",
  sections: [
    {
      h: "General enquiries",
      body: ["For general information about the project: [email to be configured]."],
    },
    {
      h: "Operators — corrections and replies",
      body: [
        "Are you the operator of an establishment and something is wrong? Write to [email to be configured] with the club name and what to correct. See also the Moderation and complaints page.",
      ],
    },
    {
      h: "Privacy and personal data",
      body: [
        "To exercise your data rights (access, rectification, erasure…): [email to be configured]. See the Privacy policy.",
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
