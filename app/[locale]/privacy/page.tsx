import type { Metadata } from "next";
import { LegalPage, type LegalContent } from "@/components/LegalPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LidoRank — Informativa privacy",
  alternates: { canonical: "/privacy" },
};

const IT: LegalContent = {
  title: "Informativa sulla privacy",
  updated: "Ultimo aggiornamento: settembre 2026",
  backLabel: "← Torna alla home",
  intro:
    "Questa informativa spiega quali dati personali trattiamo su LidoRank, perché, per quanto tempo e quali diritti hai. Trattiamo i dati nel rispetto del Regolamento (UE) 2016/679 (GDPR).",
  sections: [
    {
      h: "1. Titolari del trattamento",
      body: [
        "Il progetto LidoRank è gestito da Giorgio Menicagli Pirina e Francesco Mancuso, persone fisiche, che ne sono contitolari del trattamento ai sensi dell'art. 26 GDPR.",
        "I contitolari hanno definito un accordo interno che ripartisce le rispettive responsabilità (in particolare riguardo all'esercizio dei tuoi diritti e alle informazioni da fornirti): puoi richiederne l'essenza scrivendo all'indirizzo qui sotto. A prescindere dall'accordo, puoi esercitare i tuoi diritti nei confronti di ciascuno dei contitolari.",
        "Per qualunque richiesta relativa ai dati e per un recapito: info@lidorank.com.",
      ],
    },
    {
      h: "2. Quali dati raccogliamo",
      body: [
        "Dati dell'account (se ti registri): indirizzo email e credenziali di accesso gestite dal nostro fornitore di autenticazione.",
        "Recensioni: i voti sui nove criteri, l'eventuale commento, le informazioni fattuali che indichi e il periodo di visita dichiarato.",
        "Segnalazioni di illeciti (condotta di un bagno) e segnalazioni di recensioni come contenuto illecito (DSA art. 16): motivo, descrizione ed eventuale email di contatto che scegli di fornire, oltre alla dichiarazione di buona fede.",
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
        "Non conserviamo il tuo indirizzo IP in chiaro. Ne calcoliamo un hash con salt che serve solo a far rispettare i limiti anti-abuso (es. riconoscere comportamenti ripetuti dallo stesso dispositivo).",
        "Questo hash è un dato pseudonimizzato, non anonimo: riduce molto il rischio, ma resta un dato personale soggetto al GDPR, perché può essere usato per ricollegare azioni ripetute. Lo trattiamo di conseguenza.",
      ],
    },
    {
      h: "5. Con chi condividiamo i dati",
      body: [
        "Ci avvaliamo di fornitori che trattano i dati per nostro conto (responsabili del trattamento): hosting e database (Supabase), hosting dell'applicazione (Vercel) e protezione anti-bot (Cloudflare Turnstile).",
        "Alcuni di questi fornitori possono trattare dati anche al di fuori dell'UE/SEE (ad es. negli Stati Uniti). In tal caso i trasferimenti avvengono sulla base delle Clausole Contrattuali Tipo (SCC) adottate dalla Commissione europea e/o dell'adesione del fornitore all'EU-US Data Privacy Framework; puoi chiederci maggiori dettagli scrivendo a info@lidorank.com.",
        "Le segnalazioni di illeciti restano private e possono essere trasmesse agli enti competenti solo ove appropriato, secondo questa informativa. Non vendiamo i tuoi dati a terzi.",
      ],
    },
    {
      h: "6. Per quanto tempo li conserviamo",
      body: [
        "Dati dell'account: finché l'account è attivo; dopo una richiesta di cancellazione vengono rimossi entro 30 giorni, salvo obblighi di legge.",
        "Recensioni: restano pubbliche finché non ne chiedi la rimozione o chiudi l'account; le recensioni rifiutate o messe in quarantena sono conservate per tracciabilità non oltre 24 mesi.",
        "Segnalazioni (di illeciti e di contenuti): conservate per il tempo necessario alla gestione e comunque non oltre 24 mesi.",
        "Hash dell'IP: conservato al massimo 12 mesi ai soli fini anti-abuso, poi eliminato o ulteriormente anonimizzato.",
      ],
    },
    {
      h: "7. I tuoi diritti",
      body: [
        "Puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità dei tuoi dati scrivendo a info@lidorank.com.",
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
  updated: "Last updated: September 2026",
  backLabel: "← Back to home",
  intro:
    "This policy explains what personal data we process on LidoRank, why, for how long and what rights you have. We process data in line with Regulation (EU) 2016/679 (GDPR).",
  sections: [
    {
      h: "1. Data controllers",
      body: [
        "The LidoRank project is run by Giorgio Menicagli Pirina and Francesco Mancuso, natural persons, who are joint controllers under Art. 26 GDPR.",
        "The joint controllers have an internal arrangement allocating their respective responsibilities (in particular regarding your rights and the information owed to you): you can request the essence of it by writing to the address below. Regardless of that arrangement, you may exercise your rights against either controller.",
        "For any data-related request and for a point of contact: info@lidorank.com.",
      ],
    },
    {
      h: "2. What data we collect",
      body: [
        "Account data (if you register): email address and sign-in credentials handled by our authentication provider.",
        "Reviews: your scores across the nine criteria, any comment, the factual information you report and the visit period you declare.",
        "Reports of a club's violations, and reports of reviews as unlawful content (DSA Art. 16): reason, description and any contact email you choose to provide, plus the good-faith declaration.",
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
        "We do not store your IP address in clear. We compute a salted hash used only to enforce anti-abuse limits (e.g. to recognise repeated behaviour from the same device).",
        "This hash is pseudonymised data, not anonymous: it greatly reduces risk but remains personal data subject to the GDPR, because it can be used to link repeated actions. We treat it accordingly.",
      ],
    },
    {
      h: "5. Who we share data with",
      body: [
        "We use providers that process data on our behalf (processors): hosting and database (Supabase), application hosting (Vercel) and anti-bot protection (Cloudflare Turnstile).",
        "Some of these providers may process data outside the EU/EEA (e.g. in the United States). Where that happens, transfers rely on the Standard Contractual Clauses (SCCs) adopted by the European Commission and/or the provider's certification under the EU-US Data Privacy Framework; you can ask us for details at info@lidorank.com.",
        "Reports of violations stay private and may be forwarded to the competent authorities only where appropriate, in line with this policy. We do not sell your data to third parties.",
      ],
    },
    {
      h: "6. How long we keep it",
      body: [
        "Account data: while the account is active; after an erasure request it is removed within 30 days, unless the law requires otherwise.",
        "Reviews: they stay public until you ask for removal or close your account; rejected or quarantined reviews are kept for traceability for no more than 24 months.",
        "Reports (of violations and of content): kept for as long as needed to handle them and in any case no more than 24 months.",
        "IP hash: kept for at most 12 months for anti-abuse purposes only, then deleted or further anonymised.",
      ],
    },
    {
      h: "7. Your rights",
      body: [
        "You can request access, rectification, erasure, restriction, objection and portability of your data by writing to info@lidorank.com.",
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
