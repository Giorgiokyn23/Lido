import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { RANK_MIN, type BeachRanking } from "@/lib/types";

/**
 * La fascia che sta fra l'intestazione e la ricerca.
 *
 * PERCHÉ ESISTE. Fino a ieri la home passava dal titolo a una griglia infinita
 * di schede, in gran parte senza recensioni. Chi arrivava si faceva due idee,
 * nessuna delle due vera: che il sito sia vuoto, oppure — quando le schede con
 * una recensione sola mostravano 5,0 — che i voti non vogliano dire niente.
 * Nel frattempo la cosa migliore che abbiamo, cioè una classifica vera
 * costruita su decine di recensioni per bagno, stava due pagine più in là e
 * non la vedeva nessuno.
 *
 * Qui ci sono le tre cose che reggono a un esame: quante schede ci sono
 * davvero, che sono legate all'identificativo di concessione — il che le
 * rende verificabili una per una contro il demanio, e non è una cosa che si
 * possa dire di un elenco qualunque — e una classifica reale con sotto il
 * numero di recensioni di ciascuno.
 *
 * NIENTE NUMERI GONFIATI. Il conteggio delle recensioni è quello vero, anche
 * se è piccolo, e la classifica mostra quante ne ha ogni bagno. Un numero
 * tondo e generico («migliaia di recensioni!») si riconosce a vista e brucia
 * la fiducia su tutto il resto, comprese le parti solide.
 *
 * Server component e in cache come la home: sono due query su viste pubbliche,
 * uguali per tutti, e non devono costare processore a ogni visita.
 */
export async function VetrinaHome({ locale }: { locale: string }) {
  const t = await getTranslations("vetrina");

  const supabase = createPublicClient();

  // La località da mostrare è configurabile senza toccare il codice: quando
  // la copertura si sposta altrove, basta una variabile d'ambiente.
  const citta = process.env.NEXT_PUBLIC_CITTA_VETRINA || "Livorno";

  const [{ data: topData }, { count: schede }, { count: recensioni }] = await Promise.all([
    // `paese` come fa la pagina delle classifiche: senza, una località
    // omonima in un altro paese finirebbe mescolata a questa.
    supabase
      .from("beach_rankings")
      .select("*")
      .eq("paese", "IT")
      .eq("localita", citta)
      .order("rank_comune")
      .limit(8),
    supabase.from("beaches").select("*", { count: "exact", head: true }),
    supabase
      .from("recensioni_pubbliche")
      .select("*", { count: "exact", head: true })
      .in("stato", ["pubblicata", "ridotta"]),
  ]);

  // Solo chi è davvero in classifica. La vista restituisce anche i bagni sotto
  // soglia con rank calcolato: mostrarli qui contraddirebbe la regola che la
  // pagina delle classifiche dichiara per iscritto.
  const top = ((topData ?? []) as BeachRanking[]).filter(
    (b) => b.reviews_count >= RANK_MIN.comune
  );

  const numero = (n: number | null | undefined) =>
    (n ?? 0).toLocaleString(locale === "en" ? "en-GB" : "it-IT");

  const medaglia = ["🥇", "🥈", "🥉"];

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold tabular-nums text-sea-900">{numero(schede)}</div>
          <div className="mt-0.5 text-sm font-medium text-sea-700">{t("schede")}</div>
          <p className="mt-1 text-xs leading-relaxed text-sea-500">{t("schedeNota")}</p>
        </div>
        <div className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold tabular-nums text-sea-900">10</div>
          <div className="mt-0.5 text-sm font-medium text-sea-700">{t("criteri")}</div>
          <p className="mt-1 text-xs leading-relaxed text-sea-500">{t("criteriNota")}</p>
        </div>
        <div className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <div className="text-3xl font-bold tabular-nums text-sea-900">{numero(recensioni)}</div>
          <div className="mt-0.5 text-sm font-medium text-sea-700">{t("recensioni")}</div>
          <p className="mt-1 text-xs leading-relaxed text-sea-500">{t("recensioniNota")}</p>
        </div>
      </div>

      {/* La classifica vera. Non compare se non c'è: una classifica vuota o di
          due righe fa più danno dell'assenza. */}
      {/* Basta UNA scheda in classifica per mostrare il riquadro. Prima ne
          chiedevo tre, e il risultato è stato che in produzione il blocco non
          compariva affatto senza che si capisse perché: una condizione che
          nasconde in silenzio è una condizione che non si può diagnosticare. */}
      {top.length >= 1 ? (
        <div className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-sea-900">{t("classificaTitolo", { citta })}</h2>
            <Link
              href="/classifiche"
              className="text-sm font-medium text-sea-600 hover:underline"
            >
              {t("tutteLeClassifiche")} →
            </Link>
          </div>
          {/* Dire qui che il numero è «pesato» serve: la scheda del singolo
              bagno mostra la media semplice, e due numeri diversi per lo
              stesso bagno senza spiegazione fanno dubitare di entrambi. */}
          <p className="mt-1 text-xs text-sea-500">
            {t("sogliaNota", { soglia: RANK_MIN.comune })} {t("pesatoNota")}
          </p>

          <ol className="mt-4 space-y-1">
            {top.slice(0, 5).map((b, i) => (
              <li key={b.id}>
                <Link
                  href={`/lido/${b.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-sea-50"
                >
                  <span className="w-7 shrink-0 text-center text-lg tabular-nums">
                    {medaglia[i] ?? (
                      <span className="text-sm font-semibold text-sea-400">#{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-sea-900">{b.nome}</span>
                    <span className="block text-xs text-sea-500">
                      {t("suRecensioni", { n: b.reviews_count })}
                    </span>
                  </span>
                  {/* Solo il numero: l'etichetta «punteggio pesato» sta una
                      volta sola nella riga in alto. Ripetuta su ogni riga
                      diventava rumore e rubava l'occhio al nome del bagno. */}
                  <span className="shrink-0 text-lg font-bold tabular-nums text-sea-900">
                    {b.weighted_score.toFixed(2)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
