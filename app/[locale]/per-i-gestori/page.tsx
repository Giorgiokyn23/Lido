import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "LidoRank — Per i gestori",
  alternates: { canonical: "/per-i-gestori" },
};

const IT: LegalContent = {
  title: "Per i gestori",
  updated: "Ultimo aggiornamento: settembre 2026",
  backLabel: "← Torna alla home",
  intro:
    "Gestisci uno stabilimento presente su LidoRank? Ecco perché ci sei, come partecipare e come segnalare un contenuto. L'obiettivo non è danneggiare nessuno, ma dare a bagnanti, cittadini ed enti uno strumento trasparente.",
  sections: [
    {
      h: "Perché il tuo stabilimento è su LidoRank",
      body: [
        "LidoRank raccoglie informazioni fattuali su stabilimenti balneari e porti (nome, località, dati pubblici della concessione) e ospita le recensioni degli utenti, come fanno Google, TripAdvisor o Trustpilot. Elencare un'attività commerciale e le opinioni di chi la frequenta rientra nella libertà di informazione: non è richiesta un'autorizzazione preventiva del gestore.",
        "Se un dato è errato, lo correggiamo volentieri: basta scriverci.",
      ],
    },
    {
      h: "Rispondi e fatti conoscere",
      body: [
        "A breve potrai rivendicare il profilo del tuo stabilimento e rispondere pubblicamente alle recensioni, aggiungere foto, orari e listino. Nel frattempo, per correzioni o per essere ricontattato quando aprirà la funzione, scrivici a info@lidorank.com.",
      ],
    },
    {
      h: "Segnala un contenuto illecito",
      body: [
        "Se ritieni che una recensione sia falsa, diffamatoria, contenga dati personali di terzi o sia altrimenti illecita, puoi segnalarla: ogni recensione ha un pulsante di segnalazione e trovi la procedura nella pagina «Moderazione e reclami». Valutiamo le segnalazioni secondo le nostre regole e la normativa vigente (DSA) e, se fondate, interveniamo rimuovendo o limitando il contenuto.",
        "Una segnalazione non comporta la rimozione automatica: togliamo ciò che è illecito, non ciò che semplicemente non piace. È la stessa regola che tutela anche te da recensioni ingiuste.",
      ],
    },
    {
      h: "I nostri principi",
      body: [
        "I voti e la posizione in classifica non sono in vendita: nessun pagamento può influenzarli, mai. Distinguiamo le opinioni (i voti) dai fatti segnalati, moderiamo i contenuti illeciti e restiamo un progetto indipendente.",
      ],
    },
    {
      h: "Contatti",
      body: ["Gestori, correzioni, privacy: info@lidorank.com. Vedi anche le pagine «Contatti» e «Moderazione e reclami»."],
    },
  ],
};

const EN: LegalContent = {
  title: "For operators",
  updated: "Last updated: September 2026",
  backLabel: "← Back to home",
  intro:
    "Do you run an establishment listed on LidoRank? Here's why you're listed, how to take part and how to report content. The goal is not to harm anyone, but to give beachgoers, citizens and authorities a transparent tool.",
  sections: [
    {
      h: "Why your establishment is on LidoRank",
      body: [
        "LidoRank collects factual information on beach clubs and marinas (name, location, public concession data) and hosts user reviews, just like Google, TripAdvisor or Trustpilot. Listing a business and the opinions of the people who visit it falls under freedom of information: no prior authorisation from the operator is required.",
        "If any data is wrong, we're glad to correct it — just write to us.",
      ],
    },
    {
      h: "Respond and get known",
      body: [
        "Soon you'll be able to claim your establishment's profile and respond publicly to reviews, add photos, opening hours and prices. In the meantime, for corrections or to be contacted when the feature opens, email us at info@lidorank.com.",
      ],
    },
    {
      h: "Report unlawful content",
      body: [
        "If you believe a review is false, defamatory, contains third parties' personal data or is otherwise unlawful, you can report it: every review has a report button, and the procedure is on the «Moderation & complaints» page. We assess reports under our rules and applicable law (DSA) and, where founded, we act by removing or limiting the content.",
        "A report does not mean automatic removal: we remove what is unlawful, not what is simply disliked. It's the same rule that also protects you from unfair reviews.",
      ],
    },
    {
      h: "Our principles",
      body: [
        "Scores and ranking position are not for sale: no payment can ever influence them. We separate opinions (the scores) from reported facts, we moderate unlawful content, and we remain an independent project.",
      ],
    },
    {
      h: "Contact",
      body: ["Operators, corrections, privacy: info@lidorank.com. See also the «Contact» and «Moderation & complaints» pages."],
    },
  ],
};

export default function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return <LegalPage c={locale === "en" ? EN : IT} />;
}
