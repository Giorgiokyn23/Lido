import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chi siamo — Lidò",
  description:
    "Chi ha ideato e sviluppato Lidò, la piattaforma indipendente di recensioni verticali degli stabilimenti balneari italiani.",
};

function Avatar({ src, initials, alt }: { src: string; initials: string; alt: string }) {
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-sea-500 text-2xl font-bold text-white shadow">
      {/* iniziali come fallback dietro la foto */}
      <span className="absolute inset-0 grid place-items-center">{initials}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

export default function ChiSiamoPage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-sea-500 to-sea-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Chi siamo</h1>
        <p className="mt-2 max-w-2xl text-sea-50/90">
          Lidò è un progetto civico indipendente: portare trasparenza sulle spiagge italiane con
          recensioni strutturate e dati verificabili, utili ai cittadini e agli enti che vigilano
          sul demanio marittimo.
        </p>
      </section>

      {/* Team */}
      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar src="/giorgio.jpg" initials="GM" alt="Giorgio Menicagli Pirina" />
            <div>
              <h2 className="text-lg font-bold text-sea-900">Giorgio Menicagli Pirina</h2>
              <p className="text-sm text-sea-500">Ideatore e sviluppatore</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-sea-700">
            Ingegnere italiano specializzato in sistemi avanzati di intelligenza artificiale per il
            settore aerospaziale e della difesa. Ha conseguito una laurea in Informatica e un master
            in Intelligenza Artificiale (con lode) alla Northeastern University di Londra, e ha
            collaborato con i ricercatori del DESY su reti neurali convoluzionali quantistiche. I suoi
            interessi vanno oltre l'ingegneria, toccando le implicazioni sociali dell'IA — economia,
            filosofia politica, storia del cambiamento tecnologico. È autore del libro{" "}
            <em>AMAKOM: Una pace perpetua per l'età dei robot</em>.
          </p>
        </article>

        <article className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar src="/francesco.jpg" initials="FM" alt="Francesco Mancuso" />
            <div>
              <h2 className="text-lg font-bold text-sea-900">Francesco Mancuso</h2>
              <p className="text-sm text-sea-500">Co-autore</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-sea-700">
            Dottorando in Politica Comparata e Teoria Politica Analitica. Studia il capitale sociale
            locale e le risposte alle politiche neoliberali nel processo di integrazione europea,
            entro un progetto su lavoro, tempo libero e omogeneizzazione culturale.
          </p>
        </article>
      </section>

      {/* Come nasce / Ideato da */}
      <section className="rounded-2xl border border-sea-100 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-sea-900">Come nasce Lidò</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-sea-700">
          <p>
            Lidò nasce da una domanda semplice: perché scegliere uno stabilimento balneare in Italia
            è ancora così poco trasparente? Prezzi non sempre esposti, accesso al mare che dovrebbe
            essere libero per legge, servizi per famiglie e accessibilità difficili da confrontare.
            Nel pieno del dibattito sulle concessioni (direttiva Bolkestein), mancava uno strumento
            neutrale che desse voce ai bagnanti e dati oggettivi a chi deve decidere.
          </p>
          <p>
            L'idea è unire due mondi: il rigore dei dati pubblici (le concessioni del demanio
            marittimo) e l'esperienza reale delle persone (recensioni verticali su nove criteri).
            Il risultato è una base informativa utile ai cittadini per scegliere e agli enti per
            vigilare.
          </p>
          <p className="text-sea-500">
            Progetto ideato e sviluppato da Giorgio Menicagli Pirina, con la collaborazione di
            Francesco Mancuso sul versante dell'analisi politica e normativa. Realizzato anche con
            l'ausilio di strumenti di intelligenza artificiale, sotto supervisione umana.
          </p>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-sea-600 hover:underline">
          ← Torna alla home
        </Link>
      </section>
    </div>
  );
}
