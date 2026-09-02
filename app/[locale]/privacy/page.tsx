import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Informativa privacy",
  alternates: { canonical: "/privacy" },
};

const IT: LegalContent = {
  title: "Informativa sulla privacy",
  updated: "Ultimo aggiornamento: settembre 2026 · Bozza",
  backLabel: "← Torna alla home",
  draftNote:
    "Bozza operativa. Prima della pubblicazione va rivista da un professionista della privacy: i campi tra [ ] vanno completati con i dati reali del titolare.",
  intro:
    "Questa informativa spiega quali dati personali trattiamo su LidoRank, perché, per quanto tempo e quali diritti hai. Trattiamo i dati nel rispetto del Regolamento (UE) 2016/679 (GDPR).",
  sections: [
    {
      h: "1. Titolare del trattamento",
      body: [
        "Il progetto LidoRank è gestito da Giorgio Menicagli Pirina e Francesco Mancuso (di seguito «i titolari»).",
        "Per qualunque richiesta relativa ai dati: [indirizzo email da configurare]. Indirizzo: [indirizzo da inserire].",
      ],
    },
    {
      h: "2. Quali dati raccogliamo",
      body: [
        "Dati dell'account (se ti registri): indirizzo email e credenziali di accesso gestite dal nostro fornitore di autenticazione.",
        "Recensioni: i voti sui nove criteri, l'eventuale commento, i fatti oggettivi indicati e il periodo di visita dichiarato.",
        "Segnalazioni di illeciti: tipo, descrizione ed eventuale email di contatto che scegli di fornire.",
        "Dati tecnici: per limitare gli abusi conserviamo un hash dell'indirizzo IP (con salt), non l'IP in chiaro, oltre a log tecnici essenziali.",
      ],
    },
    {
      h: "3. Perché li trattiamo e su quale base giuridica",
      body: [
        "Per fornire il servizio e pubblicare le recensioni: esecuzione del servizio che richiedi e nostro legittimo interesse a offrire informazioni trasparenti.",
        "Per prevenire frodi e manipolazioni (rate-limit, anti-ondata): nostro legittimo interesse alla qualità e all'integrità dei dati.",
        "Per la gestione dell'account e comunicazioni: esecuzione del rapporto e, dove previsto, il tuo consenso.",
      ],
    },
    {
      h: "4. Hash dell'IP e misure anti-frode",
      body: [
        "Non conserviamo il tuo indirizzo IP in chiaro. Ne calcoliamo un hash con salt che serve solo a far rispettare i limiti anti-abuso, senza identificarti direttamente.",
      ],
    },
    {
      h: "5. Con chi condividiamo i dati",
      body: [
        "Ci avvaliamo di fornitori che trattano i dati per nostro conto: hosting e database (Supabase), hosting dell'applicazione (Vercel) e protezione anti-bot (Cloudflare Turnstile). Ove i server si trovino fuori dall'UE, sono adottate garanzie adeguate.",
        "Le segnalazioni di illeciti restano private e possono essere trasmesse agli enti competenti solo ove appropriato, secondo questa informativa. Non vendiamo i tuoi dati a terzi.",
      ],
    },
    {
      h: "6. Per quanto tempo li conserviamo",
      body: [
        "Le recensioni restano finché sono pubblicate o finché non ne chiedi la rimozione. Le segnalazioni sono conservate per il tempo necessario alla verifica. I dati dell'account restano finché l'account è attivo.",
      ],
    },
    {
      h: "7. I tuoi diritti",
      body: [
        "Puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità dei tuoi dati scrivendo a [indirizzo email da configurare].",
        "Hai inoltre diritto di proporre reclamo all'Autorità Garante per la protezione dei dati personali.",
      ],
    },
    {
      h: "8. Cookie",
      body: [
        "Usiamo i cookie e le tecnologie strettamente necessari al funzionamento del sito e alla sicurezza. Non usiamo cookie di profilazione a fini pubblicitari. Se questo cambierà, aggiorneremo l'informativa e, dove richiesto, chiederemo il consenso.",
      ],
    },
    {
      h: "9. Modifiche",
      body: [
        "Possiamo aggiornare questa informativa. La versione in vigore è quella pubblicata su questa pagina, con la data di aggiornamento in alto.",
      ],
    },
  ],
};

const EN: LegalContent = {
  title: "Privacy policy",
  updated: "Last updated: September 2026 · Draft",
  backLabel: "← Back to home",
  draftNote:
    "Working draft. Before publication it must be reviewed by a privacy professional: fields in [ ] must be completed with the controller's real details.",
  intro:
    "This policy explains what personal data we process on LidoRank, why, for how long and what rights you have. We process data in line with Regulation (EU) 2016/679 (GDPR).",
  sections: [
    {
      h: "1. Data controller",
      body: [
        "The LidoRank project is run by Giorgio Menicagli Pirina and Francesco Mancuso (the “controllers”).",
        "For any data-related request: [email to be configured]. Address: [address to be added].",
      ],
    },
    {
      h: "2. What data we collect",
      body: [
        "Account data (if you register): email address and sign-in credentials handled by our authentication provider.",
        "Reviews: your scores across the nine criteria, any comment, the objective facts you report and the visit period you declare.",
        "Reports of violations: type, description and any contact email you choose to provide.",
        "Technical data: to limit abuse we store a salted hash of your IP address, not the IP itself, plus essential technical logs.",
      ],
    },
    {
      h: "3. Why we process it and on what legal basis",
      body: [
        "To provide the service and publish reviews: performance of the service you request and our legitimate interest in offering transparent information.",
        "To prevent fraud and manipulation (rate limits, anti-surge): our legitimate interest in data quality and integrity.",
        "To manage accounts and communications: performance of the relationship and, where applicable, your consent.",
      ],
    },
    {
      h: "4. IP hashing and anti-fraud measures",
      body: [
        "We do not store your IP address in clear. We compute a salted hash used only to enforce anti-abuse limits, without directly identifying you.",
      ],
    },
    {
      h: "5. Who we share data with",
      body: [
        "We use providers that process data on our behalf: hosting and database (Supabase), application hosting (Vercel) and anti-bot protection (Cloudflare Turnstile). Where servers are outside the EU, appropriate safeguards are in place.",
        "Reports of violations stay private and may be forwarded to the competent authorities only where appropriate, in line with this policy. We do not sell your data to third parties.",
      ],
    },
    {
      h: "6. How long we keep it",
      body: [
        "Reviews remain while published or until you ask for removal. Reports are kept for as long as needed for verification. Account data remains while the account is active.",
      ],
    },
    {
      h: "7. Your rights",
      body: [
        "You can request access, rectification, erasure, restriction, objection and portability of your data by writing to [email to be configured].",
        "You also have the right to lodge a complaint with the competent data-protection authority.",
      ],
    },
    {
      h: "8. Cookies",
      body: [
        "We use only cookies and technologies strictly necessary for the site to work and for security. We do not use profiling cookies for advertising. If this changes, we will update this policy and, where required, ask for consent.",
      ],
    },
    {
      h: "9. Changes",
      body: [
        "We may update this policy. The version in force is the one published on this page, with the update date shown at the top.",
      ],
    },
  ],
};

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  return <LegalPage c={params.locale === "en" ? EN : IT} />;
}
