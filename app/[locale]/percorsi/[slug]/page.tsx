import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { indirizzoFoto } from "@/lib/foto";
import { durataLeggibile, numeroTappa, type RigaPercorso } from "@/lib/percorsi";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("percorso_con_tappe", { _slug: params.slug });
  const righe = (data ?? []) as RigaPercorso[];
  if (righe.length === 0) return {};
  return {
    title: `${righe[0].titolo} — Percorsi LidoRank`,
    description: righe[0].sottotitolo ?? undefined,
    alternates: { canonical: `/percorsi/${params.slug}` },
  };
}

/**
 * Un percorso con le sue tappe.
 *
 * LE TAPPE SONO UNA COLONNA, NON UNA GRIGLIA. Un itinerario ha un ordine, e
 * l'ordine si legge dall'alto in basso: in una griglia a due colonne non si
 * capisce se dopo la tappa 01 viene quella a destra o quella sotto. Il filo
 * verticale a sinistra lo rende esplicito anche a chi non legge i numeri.
 *
 * LE TAPPE CHE SONO NOSTRE SCHEDE SI APRONO, LE ALTRE NO, e la differenza si
 * vede: quelle con un collegamento portano a una pagina dove c'è il punteggio,
 * i prezzi e le foto. È il motivo per cui questi percorsi valgono qualcosa per
 * noi e non solo per chi li legge.
 */
export default async function PercorsoPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("percorsi");

  const supabase = createPublicClient();
  const { data } = await supabase.rpc("percorso_con_tappe", { _slug: slug });
  const righe = (data ?? []) as RigaPercorso[];
  if (righe.length === 0) notFound();

  const p = righe[0];
  // Una `left join` su un percorso senza tappe restituisce comunque una riga,
  // con `ordine` nullo: va scartata, o si disegnerebbe una tappa vuota.
  const tappe = righe.filter((r) => r.ordine != null).sort((a, b) => a.ordine! - b.ordine!);
  const bagni = tappe.filter((r) => r.beach_id).length;

  return (
    <div className="mx-auto max-w-3xl py-6">
      <Link href="/percorsi" className="text-sm text-sea-500 hover:underline">
        ← {t("tuttiIPercorsi")}
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-sea-400">
          {p.localita ? <span>{p.localita}</span> : null}
          {p.tema ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{t(`tema_${p.tema}`)}</span>
            </>
          ) : null}
        </div>
        <h1 className="mt-2 text-4xl font-bold leading-tight text-sea-900">{p.titolo}</h1>
        {p.sottotitolo ? (
          <p className="mt-3 text-lg leading-relaxed text-sea-600">{p.sottotitolo}</p>
        ) : null}
      </header>

      {p.foto_percorso ? (
        <div className="mt-6 aspect-[21/9] overflow-hidden rounded-2xl bg-sea-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={indirizzoFoto(p.foto_percorso)} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-sea-100 bg-white p-4 text-sm shadow-sm">
        <span className="text-sea-700">
          <strong className="font-semibold">{tappe.length}</strong> {t("tappeLabel")}
        </span>
        {bagni > 0 ? (
          <span className="text-sea-700">
            <strong className="font-semibold">{bagni}</strong> {t("bagniLabel")}
          </span>
        ) : null}
        {durataLeggibile(p.durata_ore) ? (
          <span className="text-sea-700">{durataLeggibile(p.durata_ore)}</span>
        ) : null}
        {p.periodo ? <span className="text-sea-700">{p.periodo}</span> : null}
      </div>

      {p.descrizione ? (
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-sea-800">
          {p.descrizione}
        </p>
      ) : null}

      <ol className="mt-8 space-y-0">
        {tappe.map((r, i) => {
          const ultima = i === tappe.length - 1;
          const contenuto = (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl font-semibold leading-snug text-sea-900">
                  {r.tappa_titolo}
                </h2>
                {r.durata_min ? (
                  <span className="text-xs text-sea-400">{t("minuti", { n: r.durata_min })}</span>
                ) : null}
              </div>
              {r.beach_id && r.bagno_localita ? (
                <p className="text-sm text-sea-500">{r.bagno_localita}</p>
              ) : null}
              {r.nota ? (
                <p className="mt-2 leading-relaxed text-sea-700">{r.nota}</p>
              ) : null}
              {r.beach_id ? (
                <span className="mt-2 inline-block text-sm font-medium text-sea-600 group-hover:underline">
                  {t("apriScheda")} →
                </span>
              ) : null}
            </>
          );

          return (
            <li key={r.ordine} className="relative flex gap-4 pb-8">
              {/* Il filo che unisce le tappe: è questo a far leggere l'elenco
                  come un percorso invece che come un insieme di punti. */}
              {!ultima ? (
                <span
                  aria-hidden="true"
                  className="absolute left-5 top-11 bottom-0 w-px bg-sea-200"
                />
              ) : null}

              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sea-200 bg-white font-mono text-sm font-semibold text-sea-600">
                {numeroTappa(r.ordine!)}
              </span>

              <div className="min-w-0 flex-1 pt-1.5">
                {r.beach_id ? (
                  <Link href={`/lido/${r.beach_id}`} className="group block">
                    {contenuto}
                  </Link>
                ) : (
                  contenuto
                )}

                {r.bagno_foto ? (
                  <Link href={`/lido/${r.beach_id}`} className="mt-3 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={indirizzoFoto(r.bagno_foto)}
                      alt=""
                      loading="lazy"
                      className="h-44 w-full rounded-xl object-cover"
                    />
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-sea-100 pt-4 text-[11px] leading-relaxed text-sea-400">
        {t("notaDettaglio")}
      </p>
    </div>
  );
}
