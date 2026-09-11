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
      h: "2. Segnalare una recensione come contenuto illecito (DSA art. 16)",
      body: [
        "Sotto ogni recensione c'è un pulsante «Segnala» che apre un modulo strutturato: scegli il motivo dell'illiceità (recensione falsa, diffamatoria, con dati personali di terzi, ecc.), puoi aggiungere una spiegazione, lasciare un'email di contatto e confermare una dichiarazione di buona fede. Il contenuto segnalato è la recensione stessa, che identifichiamo in modo univoco.",
        "Se lasci l'email, ti confermiamo la ricezione e, presa la decisione, te ne comunichiamo l'esito. Oltre una certa soglia di segnalazioni, la recensione viene automaticamente messa in quarantena in attesa di verifica umana.",
      ],
    },
    {
      h: "3. Sei un gestore? Come chiedere una correzione o replicare",
      body: [
        "Se un'informazione sulla scheda del tuo stabilimento è errata, puoi scriverci a info@lidorank.com indicando il nome del lido e l'informazione da correggere; valuteremo la richiesta.",
        "In linea con il nostro modello di moderazione indipendente, potrai rivendicare la scheda e rispondere pubblicamente alle recensioni, ma non modificarle o eliminarle né alterare le classifiche.",
      ],
    },
    {
      h: "4. Decisione e motivazione (DSA art. 17)",
      body: [
        "Valutiamo ogni segnalazione motivata. Se rimuoviamo o declassiamo una recensione e conosciamo l'autore, gli forniamo una motivazione specifica della decisione e l'indicazione dei rimedi disponibili (contestazione). Allo stesso modo comunichiamo l'esito al segnalante che ci ha lasciato un contatto.",
        "Puoi inviare o contestare una segnalazione anche via email all'indirizzo indicato nella pagina Contatti. Le decisioni automatiche (quarantena a soglia, freno anti-ondata) sono sempre riesaminabili da una persona.",
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
      h: "2. Reporting a review as unlawful content (DSA Art. 16)",
      body: [
        "Under each review there's a “Report” button that opens a structured form: pick the ground of unlawfulness (fake, defamatory, containing third parties' personal data, etc.), optionally add an explanation, leave a contact email and confirm a good-faith declaration. The reported content is the review itself, which we identify uniquely.",
        "If you leave your email, we confirm receipt and, once a decision is made, we tell you the outcome. Above a certain flag threshold, the review is automatically quarantined pending human review.",
      ],
    },
    {
      h: "3. Are you an operator? Requesting a correction or replying",
      body: [
        "If information on your establishment's page is wrong, write to info@lidorank.com with the club name and the item to correct; we'll assess the request.",
        "In line with our independent moderation model, you'll be able to claim the page and reply publicly to reviews, but not edit or delete them or alter rankings.",
      ],
    },
    {
      h: "4. Decision and statement of reasons (DSA Art. 17)",
      body: [
        "We assess every reasoned report. If we remove or down-weight a review and we know its author, we give them a specific statement of reasons for the decision and information on the available remedies (how to contest it). Likewise we tell the reporter the outcome where they left a contact.",
        "You can also send or contest a report by email at the address on the Contact page. Automatic decisions (threshold quarantine, anti-surge damper) can always be reviewed by a human.",
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
