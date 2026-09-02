import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Linee guida per le recensioni",
  alternates: { canonical: "/linee-guida" },
};

const IT: LegalContent = {
  title: "Linee guida per le recensioni",
  updated: "Ultimo aggiornamento: settembre 2026",
  backLabel: "← Torna alla home",
  intro:
    "Le recensioni sono il cuore di LidoRank. Perché siano utili e corrette, chiediamo a tutti di rispettare poche regole chiare.",
  sections: [
    {
      h: "1. Recensisci solo dove sei stato",
      body: [
        "Scrivi una recensione solo per uno stabilimento che hai visitato di persona. Al momento dell'invio ti chiediamo di confermarlo e, se vuoi, di indicare il periodo della visita.",
      ],
    },
    {
      h: "2. Sii onesto e specifico",
      body: [
        "Basa i voti sulla tua esperienza reale. Un commento concreto (cosa hai visto, quando) è più utile di un giudizio generico. Assegna i voti in modo consapevole: se non puoi giudicare un criterio, lascialo su «Non valutato».",
      ],
    },
    {
      h: "3. Distinzione tra fatti e opinioni",
      body: [
        "I voti sui nove criteri sono opinioni personali. I «fatti oggettivi» (accesso al mare, docce, chip) vanno indicati con onestà perché descrivono circostanze verificabili. Non presentare un'opinione come un fatto accertato.",
      ],
    },
    {
      h: "4. Cosa non è ammesso",
      body: [
        "Insulti, contenuti offensivi o discriminatori; dati personali di terzi; accuse gravi e non verificabili presentate come certe; recensioni scritte da gestori sul proprio stabilimento o da concorrenti; contenuti illegali o che violano diritti altrui.",
      ],
    },
    {
      h: "5. Le segnalazioni di illeciti vanno nel canale apposito",
      body: [
        "Se vuoi segnalare una possibile irregolarità (es. accesso al mare bloccato, lettini sulla battigia), usa il modulo di segnalazione riservato, non la recensione pubblica. Le segnalazioni restano private.",
      ],
    },
    {
      h: "6. Cosa succede se una recensione viola le regole",
      body: [
        "Le recensioni sospette possono essere ridotte di peso, messe in sospeso o rimosse. Chiunque può segnalare una recensione con l'apposito pulsante; oltre una certa soglia di segnalazioni la recensione viene messa in quarantena in attesa di controllo.",
      ],
    },
  ],
};

const EN: LegalContent = {
  title: "Review guidelines",
  updated: "Last updated: September 2026",
  backLabel: "← Back to home",
  intro:
    "Reviews are the heart of LidoRank. To keep them useful and fair, we ask everyone to follow a few clear rules.",
  sections: [
    {
      h: "1. Only review where you've been",
      body: [
        "Write a review only for an establishment you visited in person. When submitting, we ask you to confirm this and, if you wish, to indicate the visit period.",
      ],
    },
    {
      h: "2. Be honest and specific",
      body: [
        "Base your scores on your real experience. A concrete comment (what you saw, when) is more useful than a generic verdict. Rate consciously: if you can't judge a criterion, leave it as “Not rated”.",
      ],
    },
    {
      h: "3. Facts vs opinions",
      body: [
        "The nine-criteria scores are personal opinions. The “objective facts” (sea access, showers, deposit chip) should be reported honestly because they describe verifiable circumstances. Don't present an opinion as an established fact.",
      ],
    },
    {
      h: "4. What is not allowed",
      body: [
        "Insults, offensive or discriminatory content; third parties' personal data; serious, unverifiable accusations presented as certain; reviews written by operators about their own establishment or by competitors; illegal content or content infringing others' rights.",
      ],
    },
    {
      h: "5. Reports of violations go through the dedicated channel",
      body: [
        "If you want to report a possible irregularity (e.g. blocked sea access, loungers on the shoreline), use the dedicated report form, not the public review. Reports stay private.",
      ],
    },
    {
      h: "6. What happens if a review breaks the rules",
      body: [
        "Suspicious reviews can be down-weighted, put on hold or removed. Anyone can flag a review with the dedicated button; above a certain flag threshold the review is quarantined pending checks.",
      ],
    },
  ],
};

export default function LineeGuidaPage({ params }: { params: { locale: string } }) {
  return <LegalPage c={params.locale === "en" ? EN : IT} />;
}
