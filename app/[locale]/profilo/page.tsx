import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { NomeProfiloForm } from "@/components/NomeProfiloForm";
import { SoprannomeForm } from "@/components/SoprannomeForm";
import { Amici } from "@/components/Amici";
import { DiarioAmici } from "@/components/DiarioAmici";

export const metadata: Metadata = {
  title: "LidoRank — Il mio profilo",
  robots: { index: false, follow: false },
};

// Area personale: dipende dalla sessione, quindi mai in cache.
export const dynamic = "force-dynamic";

type Riga = {
  beach_id: string;
  tipo: string;
  nome: string;
  localita: string;
  regione: string;
  creato_il: string;
};

type MiaRecensione = {
  id: string;
  beach_id: string;
  stato: string;
  commento: string | null;
  visita_periodo: string | null;
  created_at: string;
};

export default async function ProfiloPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("profilo");
  const fmt = locale === "en" ? "en-GB" : "it-IT";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-sea-900">{t("titolo")}</h1>
        <p className="text-sm text-sea-600">{t("accessoRichiesto")}</p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-sea-500 px-5 py-2 font-medium text-white hover:bg-sea-600"
        >
          {t("accedi")}
        </Link>
      </div>
    );
  }

  const [{ data: listeData }, { data: recData }, { data: profiloData }] = await Promise.all([
    supabase.rpc("mie_liste"),
    supabase.rpc("mie_recensioni"),
    supabase.from("profili").select("nome,handle").eq("user_id", user.id).maybeSingle(),
  ]);

  const righe = (listeData ?? []) as Riga[];
  const recensioni = (recData ?? []) as MiaRecensione[];
  const visitati = righe.filter((r) => r.tipo === "visitato");
  const daProvare = righe.filter((r) => r.tipo === "da_provare");

  // Il nome arriva dalla tabella profili; al primo accesso può essere ancora
  // nei metadati dell'utente, dove l'ha messo la sovraimpressione di accesso.
  const handle = (profiloData as { handle?: string | null } | null)?.handle ?? null;

  const nome =
    ((profiloData as { nome?: string | null } | null)?.nome ??
      (user.user_metadata?.nome as string | undefined) ??
      "") || "";

  // I nomi dei bagni recensiti: mie_recensioni() restituisce solo gli id,
  // perché la funzione vive nel perimetro ristretto aperto dalla 0085.
  const nomi = new Map<string, string>();
  const idDaNominare = Array.from(new Set(recensioni.map((r) => r.beach_id)));
  if (idDaNominare.length) {
    const pub = createPublicClient();
    const { data: bs } = await pub
      .from("beaches")
      .select("id,nome,localita")
      .in("id", idDaNominare);
    for (const b of (bs ?? []) as { id: string; nome: string; localita: string }[]) {
      nomi.set(b.id, `${b.nome} — ${b.localita}`);
    }
  }

  const totale = visitati.length + daProvare.length + recensioni.length;
  const data = (iso: string) =>
    new Date(iso).toLocaleDateString(fmt, { day: "numeric", month: "long", year: "numeric" });

  const Elenco = ({
    titolo,
    descrizione,
    voci,
    vuoto,
  }: {
    titolo: string;
    descrizione: string;
    voci: Riga[];
    vuoto: string;
  }) => (
    <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-sea-800">{titolo}</h2>
      <p className="mt-0.5 text-xs text-sea-500">{descrizione}</p>
      {voci.length === 0 ? (
        <p className="mt-3 text-sm text-sea-400">{vuoto}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {voci.map((v) => (
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
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">
          {nome ? t("ciao", { nome }) : t("titolo")}
        </h1>
        <p className="mt-1 text-sm text-sea-500">{t("intro")}</p>
      </div>

      {/* I contatori compaiono solo quando c'è qualcosa da contare. In un
          prodotto ancora piccolo, tre zeri in cima alla pagina sono un
          promemoria di essere soli: non è il benvenuto che vogliamo dare. */}
      {totale > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: visitati.length, etichetta: t("contVisitati") },
            { n: daProvare.length, etichetta: t("contDaProvare") },
            { n: recensioni.length, etichetta: t("contRecensioni") },
          ].map((c) => (
            <div
              key={c.etichetta}
              className="rounded-2xl border border-sea-100 bg-white p-4 text-center shadow-sm"
            >
              <div className="text-2xl font-bold tabular-nums text-sea-900">{c.n}</div>
              <div className="text-[11px] text-sea-500">{c.etichetta}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Soprannome, amici e diario stanno QUI, in cima, e non in fondo alla
          pagina dove li avevo messi la prima volta. Una funzione nuova sotto
          liste e recensioni non la trova nessuno — e infatti non l'ha trovata
          nemmeno chi sapeva di averla chiesta. */}
      <DiarioAmici />

      <SoprannomeForm handle={handle} />

      <Amici haSoprannome={handle != null} />

      <Elenco
        titolo={t("visitatiTitolo")}
        descrizione={t("visitatiIntro")}
        voci={visitati}
        vuoto={t("visitatiVuoto")}
      />

      <Elenco
        titolo={t("daProvareTitolo")}
        descrizione={t("daProvareIntro")}
        voci={daProvare}
        vuoto={t("daProvareVuoto")}
      />

      <section className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-sea-800">{t("recensioniTitolo")}</h2>
        <p className="mt-0.5 text-xs text-sea-500">{t("recensioniIntro")}</p>
        {recensioni.length === 0 ? (
          <p className="mt-3 text-sm text-sea-400">{t("recensioniVuoto")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recensioni.map((r) => (
              <li key={r.id} className="rounded-xl border border-sea-100 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/lido/${r.beach_id}`}
                    className="font-medium text-sea-900 hover:underline"
                  >
                    {nomi.get(r.beach_id) ?? r.beach_id}
                  </Link>
                  <span className="text-[11px] text-sea-400">{data(r.created_at)}</span>
                </div>
                {r.commento ? (
                  <p className="mt-1 text-sm text-sea-700">{r.commento}</p>
                ) : (
                  <p className="mt-1 text-sm italic text-sea-400">{t("senzaCommento")}</p>
                )}
                {r.stato !== "pubblicata" ? (
                  <span className="mt-1 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                    {t("inVerifica")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <NomeProfiloForm nome={nome} />

      <p className="text-center text-[11px] text-sea-400">{t("notaAnonimato")}</p>
    </div>
  );
}
