import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Moderazione e reclami",
  alternates: { canonical: "/moderazione" },
};

const IT: LegalContent = {
  title: "Moderazione e reclami",
  updated: "Ultimo aggiornamento: settembre 2026",
  backLabel: "← Torna alla home",
  intro:
    "Spieghiamo come teniamo affidabili le recensioni, come si contesta un contenuto e come un gestore può chiedere una correzione o rispondere.",
  sections: [
    {
      h: "1. Come pesiamo le recensioni",
      body: [
        "Ogni recensione ha un peso e uno stato. Le recensioni con account verificato pesano più di quelle anonime. Il punteggio in classifica usa una media pesata di tipo bayesiano descritta nella pagina Metodologia.",
        "Controlli automatici (limiti di frequenza e freno anti-ondata) riducono il rischio di manipolazioni.",
      ],
    },
    {
      h: "2. Segnalare una recensione",
      body: [
        "Sotto ogni recensione c'è un pulsante per segnalarla. Oltre una certa soglia di segnalazioni, la recensione viene automaticamente messa in quarantena in attesa di verifica.",
      ],
    },
    {
      h: "3. Sei un gestore? Come chiedere una correzione o replicare",
      body: [
        "Se un'informazione sulla scheda del tuo stabilimento è errata, puoi scriverci a info@lidorank.com indicando il nome del lido e l'informazione da correggere; valuteremo la richiesta.",
        "In linea con il modello Trustpilot, potrai rivendicare la scheda e rispondere pubblicamente alle recensioni, ma non modificarle o eliminarle né alterare le classifiche.",
      ],
    },
    {
      h: "4. Rimozione di contenuti illeciti (notice and takedown)",
      body: [
        "Su segnalazione motivata rimuoviamo i contenuti manifestamente illeciti (diffamatori, offensivi, che violano diritti di terzi). Puoi inviare la richiesta all'indirizzo indicato nella pagina Contatti.",
      ],
    },
    {
      h: "5. Segnalazioni di illeciti agli enti",
      body: [
        "Le segnalazioni di possibili irregolarità restano private e non costituiscono una denuncia formale. Ove appropriato e nel rispetto dell'informativa privacy, possono essere verificate e trasmesse agli enti competenti. Non promettiamo sopralluoghi.",
      ],
    },
    {
      h: "6. Tempi e contatti",
      body: [
        "Cerchiamo di rispondere alle richieste in tempi ragionevoli. Per ogni questione di moderazione scrivi a info@lidorank.com.",
      ],
    },
  ],
};

const EN: LegalContent = {
  title: "Moderation and complaints",
  updated: "Last updated: September 2026",
  backLabel: "← Back to home",
  intro:
    "Here's how we keep reviews reliable, how to contest content, and how an operator can request a correction or reply.",
  sections: [
    {
      h: "1. How we weight reviews",
      body: [
        "Every review has a weight and a status. Verified-account reviews count more than anonymous ones. Ranking scores use a Bayesian weighted average described on the Methodology page.",
        "Automatic checks (rate limits and an anti-surge damper) reduce the risk of manipulation.",
      ],
    },
    {
      h: "2. Flagging a review",
      body: [
        "Under each review there's a button to flag it. Above a certain flag threshold, the review is automatically quarantined pending verification.",
      ],
    },
    {
      h: "3. Are you an operator? Requesting a correction or replying",
      body: [
        "If information on your establishment's page is wrong, write to info@lidorank.com with the club name and the item to correct; we'll assess the request.",
        "In line with the Trustpilot model, you'll be able to claim the page and reply publicly to reviews, but not edit or delete them or alter rankings.",
      ],
    },
    {
      h: "4. Removal of unlawful content (notice and takedown)",
      body: [
        "Upon a reasoned report we remove manifestly unlawful content (defamatory, offensive, infringing third-party rights). You can send the request to the address on the Contact page.",
      ],
    },
    {
      h: "5. Reports of violations to authorities",
      body: [
        "Reports of possible irregularities stay private and are not a formal complaint. Where appropriate and in line with the privacy policy, they may be verified and forwarded to the competent authorities. We do not promise inspections.",
      ],
    },
    {
      h: "6. Timing and contact",
      body: [
        "We aim to respond to requests within a reasonable time. For any moderation matter, write to info@lidorank.com.",
      ],
    },
  ],
};

export default function ModerazionePage({ params }: { params: { locale: string } }) {
  return <LegalPage c={params.locale === "en" ? EN : IT} />;
}
