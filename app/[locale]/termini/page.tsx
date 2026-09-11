import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Termini d'uso",
  alternates: { canonical: "/termini" },
};

const IT: LegalContent = {
  title: "Termini d'uso",
  updated: "Ultimo aggiornamento: settembre 2026",
  backLabel: "← Torna alla home",
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
      h: "3. Recensioni e classifiche (moderazione indipendente)",
      body: [
        "I gestori potranno rivendicare la scheda del proprio stabilimento e rispondere pubblicamente alle recensioni, ma non possono modificare o eliminare le recensioni degli utenti né alterare le classifiche.",
        "Le classifiche sono calcolate con un metodo automatico e trasparente descritto nella pagina Metodologia; un lido entra in classifica solo dopo un numero minimo di recensioni.",
      ],
    },
    {
      h: "4. Contenuti e proprietà intellettuale",
      body: [
        "I contenuti che pubblichi restano tuoi, ma concedi a LidoRank una licenza non esclusiva e gratuita per ospitarli, mostrarli e includerli nei dati aggregati.",
        "I contenuti editoriali, il software e la banca dati di LidoRank sono protetti dalle leggi sulla proprietà intellettuale applicabili; la riproduzione o l'estrazione/riutilizzo non autorizzati sono vietati, nei limiti di legge.",
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
      h: "6. Moderazione: restrizioni, strumenti e come contestare",
      body: [
        "Possiamo applicare tre tipi di misura a una recensione o a un account: riduzione del peso (la recensione resta visibile ma incide meno sul punteggio), sospensione/quarantena (la recensione viene temporaneamente esclusa dal punteggio in attesa di verifica) e rimozione (per contenuti illeciti o in palese violazione di questi termini o delle linee guida).",
        "Alcune misure sono automatiche: limiti di frequenza, un freno anti-ondata che mette in quarantena i picchi sospetti, e la quarantena automatica di una recensione che supera una certa soglia di segnalazioni. Le decisioni di rimozione di contenuti illeciti e i casi dubbi sono riesaminati da una persona.",
        "Se sei l'autore di una recensione rimossa o declassata e ci hai lasciato un contatto, ti comunichiamo la decisione con una motivazione e puoi contestarla scrivendo a info@lidorank.com.",
        "LidoRank è un piccolo servizio di hosting: questo ci esenta da alcuni obblighi aggiuntivi previsti per le grandi piattaforme, ma non dagli obblighi di base sui contenuti illeciti (artt. 14, 16 e 17 del Regolamento UE 2022/2065 – DSA), che continuiamo a rispettare. I dettagli operativi sono nella pagina Moderazione e reclami.",
      ],
    },
    {
      h: "7. Legge applicabile",
      body: [
        "Questi termini sono regolati dalla legge italiana, salvo le tutele inderogabili previste per i consumatori.",
      ],
    },
  ],
};

const EN: LegalContent = {
  title: "Terms of use",
  updated: "Last updated: September 2026",
  backLabel: "← Back to home",
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
      h: "3. Reviews and rankings (independent moderation)",
      body: [
        "Operators will be able to claim their establishment's page and reply publicly to reviews, but they cannot edit or delete users' reviews or alter the rankings.",
        "Rankings are computed with an automatic, transparent method described on the Methodology page; a club enters a ranking only after a minimum number of reviews.",
      ],
    },
    {
      h: "4. Content and intellectual property",
      body: [
        "Content you post remains yours, but you grant LidoRank a non-exclusive, royalty-free licence to host, display and include it in aggregate data.",
        "LidoRank's editorial content, software and database are protected under applicable intellectual-property laws; unauthorized reproduction or substantial extraction/reuse is prohibited, subject to applicable law.",
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
      h: "6. Moderation: restrictions, tools and how to contest",
      body: [
        "We may apply three kinds of measure to a review or an account: down-weighting (the review stays visible but affects the score less), suspension/quarantine (the review is temporarily excluded from the score pending checks) and removal (for unlawful content or clear breaches of these terms or the guidelines).",
        "Some measures are automatic: rate limits, an anti-surge damper that quarantines suspicious spikes, and automatic quarantine of a review that passes a certain flag threshold. Decisions to remove unlawful content and any doubtful cases are reviewed by a human.",
        "If you are the author of a removed or down-weighted review and you left us a contact, we notify you of the decision with a statement of reasons and you can contest it by writing to info@lidorank.com.",
        "LidoRank is a small hosting service: this exempts us from some additional obligations that apply to large platforms, but not from the core obligations on unlawful content (Arts. 14, 16 and 17 of EU Regulation 2022/2065 – the DSA), which we continue to comply with. Operational details are on the Moderation & complaints page.",
      ],
    },
    {
      h: "7. Governing law",
      body: [
        "These terms are governed by Italian law, without prejudice to mandatory consumer protections.",
      ],
    },
  ],
};

export default function TerminiPage({ params }: { params: { locale: string } }) {
  return <LegalPage c={params.locale === "en" ? EN : IT} />;
}
