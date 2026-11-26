import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { indirizzoFoto } from "@/lib/foto";
import { durataLeggibile, type PercorsoInElenco } from "@/lib/percorsi";

export const metadata: Metadata = {
  title: "LidoRank — Percorsi lungo la costa",
  alternates: { canonical: "/percorsi" },
};

/**
 * L'elenco dei percorsi.
 *
 * REGISTRO DIVERSO DAL RESTO DEL SITO, di proposito. Le altre pagine servono
 * a trovare una cosa precisa: filtri, numeri, densità. Questa serve a far
 * venire voglia, ed è l'unico posto dove ha senso andare piano — immagini
 * grandi, poche voci, molto bianco. È il registro del prototipo di Francesco,
 * e qui funziona perché un itinerario si sceglie guardandolo, non filtrandolo.
 *
 * Resta in cache come le altre: sono contenuti redazionali che cambiano
 * raramente, e non devono costare processore a ogni visita.
 */
export const revalidate = 86400;

export default async function PercorsiPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("percorsi");

  const supabase = createPublicClient();
  const { data } = await supabase.rpc("percorsi_pubblici", { _localita: null });
  const percorsi = (data ?? []) as PercorsoInElenco[];

  return (
    <div className="mx-auto max-w-5xl space-y-10 py-6">
      <header className="max-w-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sea-400">
          {t("occhiello")}
        </div>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-sea-900 sm:text-5xl">
          {t("titolo")}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-sea-600">{t("intro")}</p>
      </header>

      {percorsi.length === 0 ? (
        <p className="rounded-2xl border border-sea-100 bg-white p-6 text-sm text-sea-500 shadow-sm">
          {t("vuoto")}
        </p>
      ) : (
        <div className="space-y-10">
          {percorsi.map((p, i) => (
            <article key={p.slug} className="group">
              <Link href={`/percorsi/${p.slug}`} className="block">
                {/* L'immagine è il pezzo che fa il lavoro: grande, sopra, e
                    senza niente scritto sopra che la disturbi. */}
                <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-gradient-to-br from-sea-200 to-sea-500">
                  {p.foto_percorso ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={indirizzoFoto(p.foto_percorso)}
                      alt=""
                      loading={i === 0 ? "eager" : "lazy"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  ) : null}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sea-700 backdrop-blur">
                    {t("numero", { n: i + 1 })}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-sea-400">
                  {p.localita ? <span>{p.localita}</span> : null}
                  {p.tema ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{t(`tema_${p.tema}`)}</span>
                    </>
                  ) : null}
                  {durataLeggibile(p.durata_ore) ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{durataLeggibile(p.durata_ore)}</span>
                    </>
                  ) : null}
                </div>

                <h2 className="mt-1.5 text-2xl font-bold leading-snug text-sea-900 group-hover:text-sea-600">
                  {p.titolo}
                </h2>
                {p.sottotitolo ? (
                  <p className="mt-1 max-w-2xl leading-relaxed text-sea-600">{p.sottotitolo}</p>
                ) : null}

                <p className="mt-2 text-sm text-sea-500">
                  {t("composizione", { tappe: p.tappe, bagni: p.bagni })}
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}

      <p className="border-t border-sea-100 pt-4 text-[11px] leading-relaxed text-sea-400">
        {t("nota")}
      </p>
    </div>
  );
}
