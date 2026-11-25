import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottoneAmicizia } from "@/components/BottoneAmicizia";

type Profilo = {
  handle: string;
  nome: string | null;
  visitati: number;
  da_provare: number;
  rapporto: string;
  liste_viste: boolean;
};

type Voce = {
  beach_id: string;
  tipo: string;
  nome: string;
  localita: string;
  regione: string | null;
  creato_il: string;
};

/**
 * Il profilo pubblico di una persona: /u/soprannome.
 *
 * DIPENDE DA CHI GUARDA, quindi non va mai in cache: la stessa pagina mostra
 * cose diverse a un estraneo, a un amico e al diretto interessato. Se finisse
 * in cache, la versione vista da un amico verrebbe servita a chiunque — che è
 * il modo più banale di buttare via tutto il lavoro fatto sui permessi.
 *
 * NON È INDICIZZABILE dai motori di ricerca. Un profilo che si fa trovare
 * cercando il soprannome su Google è un profilo che non protegge più niente:
 * la riservatezza qui si regge sul fatto che per trovare qualcuno bisogna
 * già sapere come si chiama.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProfiloPubblicoPage({
  params: { locale, handle },
}: {
  params: { locale: string; handle: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("social");
  const fmt = locale === "en" ? "en-GB" : "it-IT";

  const supabase = createClient();
  const { data: profData } = await supabase.rpc("profilo_di", { _handle: handle });
  const p = ((profData ?? []) as Profilo[])[0];

  // Il database restituisce zero righe anche quando il profilo esiste ma chi
  // guarda è stato bloccato: da fuori i due casi devono essere indistinguibili.
  if (!p) notFound();

  const { data: listeData } = await supabase.rpc("liste_di", { _handle: handle });
  const voci = (listeData ?? []) as Voce[];
  const visitati = voci.filter((v) => v.tipo === "visitato");
  const daProvare = voci.filter((v) => v.tipo === "da_provare");

  const data = (iso: string) =>
    new Date(iso).toLocaleDateString(fmt, { day: "numeric", month: "long", year: "numeric" });

  const Elenco = ({ titolo, voci: vv }: { titolo: string; voci: Voce[] }) =>
    vv.length === 0 ? null : (
      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">{titolo}</h2>
        <ul className="mt-3 space-y-2">
          {vv.map((v) => (
            <li
              key={v.beach_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sea-100 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/lido/${v.beach_id}`}
                  className="truncate font-medium text-sea-900 hover:underline"
                >
                  {v.nome}
                </Link>
                <div className="truncate text-xs text-sea-500">{v.localita}</div>
              </div>
              <span className="shrink-0 text-[11px] text-sea-400">{data(v.creato_il)}</span>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-sea-900">{p.nome || `@${p.handle}`}</h1>
            <p className="font-mono text-sm text-sea-500">@{p.handle}</p>
          </div>
          <BottoneAmicizia handle={p.handle} rapporto={p.rapporto} />
        </div>

        <div className="mt-4 flex gap-6">
          <div>
            <div className="text-2xl font-bold tabular-nums text-sea-900">{p.visitati}</div>
            <div className="text-[11px] text-sea-500">{t("contVisitati")}</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums text-sea-900">{p.da_provare}</div>
            <div className="text-[11px] text-sea-500">{t("contDaProvare")}</div>
          </div>
        </div>

        {/* Il numero di recensioni NON compare, e non è una dimenticanza:
            sapere che una persona ha visitato tre bagni e scritto tre
            recensioni significa sapere quali recensioni sono sue. */}
        <p className="mt-4 text-[11px] text-sea-400">{t("notaRecensioniAnonime")}</p>
      </div>

      {p.liste_viste ? (
        <>
          <Elenco titolo={t("suoiVisitati")} voci={visitati} />
          <Elenco titolo={t("suoiDaProvare")} voci={daProvare} />
          {voci.length === 0 ? (
            <p className="rounded-2xl border border-sea-100 bg-white p-5 text-sm text-sea-400 shadow-sm">
              {t("listeVuote")}
            </p>
          ) : null}
        </>
      ) : (
        <p className="rounded-2xl border border-sea-100 bg-white p-5 text-sm text-sea-500 shadow-sm">
          {t("listeRiservate")}
        </p>
      )}
    </div>
  );
}
