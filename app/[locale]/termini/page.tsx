import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Termini d'uso",
  alternates: { canonical: "/termini" },
};

const IT: LegalContent = {
  title: "Termini d'uso",
  updated: "Ultimo aggiornamento: settembre 2026 · Bozza",
  backLabel: "← Torna alla home",
  draftNote:
    "Bozza operativa da sottoporre a revisione legale prima della pubblicazione.",
  intro:
    "Usando LidoRank accetti questi termini. LidoRank è un progetto indipendente che raccoglie recensioni strutturate di lidi e beach club.",
  sections: [
    {
      h: "1. Oggetto del servizio",
      body: [
        "LidoRank è una piattaforma che consente agli utenti di recensire stabilimenti balneari su nove criteri e di consultare classifiche e dati aggregati. Le informazioni hanno finalità informative e non sostituiscono verifiche ufficiali.",
      ],
    },
    {
      h: "2. Uso corretto",
      body: [
        "Puoi pubblicare solo recensioni veritiere di luoghi che hai effettivamente visitato. Sono vietati contenuti falsi, ingannevoli, diffamatori, offensivi, discriminatori, spam o che violino diritti di terzi.",
        "È vietato manipolare i punteggi con recensioni multiple, account falsi o strumenti automatici.",
      ],
    },
    {
      h: "3. Recensioni e classifiche (modello Trustpilot)",
      body: [
        "I gestori potranno rivendicare la scheda del proprio stabilimento e rispondere pubblicamente alle recensioni, ma non possono modificare o eliminare le recensioni degli utenti né alterare le classifiche.",
        "Le classifiche sono calcolate con un metodo automatico e trasparente descritto nella pagina Metodologia; un lido entra in classifica solo dopo un numero minimo di recensioni.",
      ],
    },
    {
      h: "4. Contenuti e proprietà intellettuale",
      body: [
        "I contenuti che pubblichi restano tuoi, ma concedi a LidoRank una licenza non esclusiva e gratuita per ospitarli, mostrarli e includerli nei dati aggregati.",
        "Il marchio «LidoRank», il codice, la struttura dei dati e i contenuti editoriali sono protetti e non possono essere riprodotti senza autorizzazione.",
      ],
    },
    {
      h: "5. Limitazione di responsabilità",
      body: [
        "Le recensioni riflettono opinioni ed esperienze personali degli utenti. LidoRank non garantisce l'accuratezza di ogni singolo contenuto pubblicato dagli utenti e agisce come intermediario: interveniamo sui contenuti illeciti dietro segnalazione motivata (notice and takedown).",
        "Nei limiti di legge, LidoRank non è responsabile per decisioni prese sulla base delle informazioni del sito.",
      ],
    },
    {
      h: "6. Sospensione e rimozione",
      body: [
        "Possiamo ridurre il peso, sospendere o rimuovere contenuti che violano questi termini o le linee guida sulle recensioni, e sospendere gli account che ne abusano.",
      ],
    },
    {
      h: "7. Legge applicabile",
      body: [
        "Questi termini sono regolati dalla legge italiana. Per le controversie è competente il Foro di [__], salvo le tutele inderogabili previste per i consumatori.",
      ],
    },
  ],
};

const EN: LegalContent = {
  title: "Terms of use",
  updated: "Last updated: September 2026 · Draft",
  backLabel: "← Back to home",
  draftNote: "Working draft to be reviewed by a lawyer before publication.",
  intro:
    "By using LidoRank you accept these terms. LidoRank is an independent project that collects structured reviews of beach clubs.",
  sections: [
    {
      h: "1. The service",
      body: [
        "LidoRank lets users review beach clubs across nine criteria and browse rankings and aggregate data. The information is for informational purposes and does not replace official checks.",
      ],
    },
    {
      h: "2. Acceptable use",
      body: [
        "You may only publish truthful reviews of places you have actually visited. Content that is false, misleading, defamatory, offensive, discriminatory, spam or that infringes third-party rights is prohibited.",
        "Manipulating scores with multiple reviews, fake accounts or automated tools is prohibited.",
      ],
    },
    {
      h: "3. Reviews and rankings (Trustpilot model)",
      body: [
        "Operators will be able to claim their establishment's page and reply publicly to reviews, but they cannot edit or delete users' reviews or alter the rankings.",
        "Rankings are computed with an automatic, transparent method described on the Methodology page; a club enters a ranking only after a minimum number of reviews.",
      ],
    },
    {
      h: "4. Content and intellectual property",
      body: [
        "Content you post remains yours, but you grant LidoRank a non-exclusive, royalty-free licence to host, display and include it in aggregate data.",
        "The “LidoRank” trademark, the code, the data structure and editorial content are protected and may not be reproduced without authorisation.",
      ],
    },
    {
      h: "5. Limitation of liability",
      body: [
        "Reviews reflect users' personal opinions and experiences. LidoRank does not guarantee the accuracy of every user-published item and acts as an intermediary: we act on unlawful content upon a reasoned report (notice and takedown).",
        "To the extent permitted by law, LidoRank is not liable for decisions made on the basis of information on the site.",
      ],
    },
    {
      h: "6. Suspension and removal",
      body: [
        "We may down-weight, suspend or remove content that breaches these terms or the review guidelines, and suspend accounts that abuse them.",
      ],
    },
    {
      h: "7. Governing law",
      body: [
        "These terms are governed by Italian law. The court of [__] has jurisdiction, without prejudice to mandatory consumer protections.",
      ],
    },
  ],
};

export default function TerminiPage({ params }: { params: { locale: string } }) {
  return <LegalPage c={params.locale === "en" ? EN : IT} />;
}
