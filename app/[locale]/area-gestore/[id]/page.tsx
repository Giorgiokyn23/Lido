import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { ProgressoProfilo, type CampiProfilo } from "@/components/ProgressoProfilo";
import { CentroInviti } from "@/components/CentroInviti";
import { RANK_MIN } from "@/lib/types";

export const metadata: Metadata = {
  title: "LidoRank — Area gestore",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Mio = { beach_id: string; nome: string; localita: string; approvata_il: string | null };

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-sea-100 bg-white p-4">
    <div className="text-[11px] font-medium uppercase tracking-wide text-sea-400">{label}</div>
    <div className="mt-1 text-2xl font-bold tabular-nums text-sea-900">{value}</div>
    {sub ? <div className="mt-0.5 text-[11px] text-sea-500">{sub}</div> : null}
  </div>
);

export default async function HubGestorePage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("gestore");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10 text-center">
        <p className="text-sm text-sea-600">{t("loginRequired")}</p>
        <Link
          href="/login"
          className="inline-block rounded-full bg-sea-500 px-5 py-2 font-medium text-white hover:bg-sea-600"
        >
          {t("loginCta")}
        </Link>
      </div>
    );
  }

  const { data: mieiData } = await supabase.rpc("miei_stabilimenti");
  const mio = ((mieiData ?? []) as Mio[]).find((m) => m.beach_id === id);
  if (!mio) notFound();

  const { data: profiloData } = await supabase
    .from("profilo_stabilimento")
    .select("descrizione,orari,telefono,email_pubblica,sito,link_prenotazione")
    .eq("beach_id", id)
    .maybeSingle();
  const profilo = (profiloData as CampiProfilo | null) ?? null;

  const pub = createPublicClient();
  const [{ data: beachRow }, { data: scoreRow }] = await Promise.all([
    pub.from("beaches").select("profile_status").eq("id", id).maybeSingle(),
    pub.from("beach_scores").select("reviews_count,avg_overall").eq("id", id).maybeSingle(),
  ]);

  const verificato = (beachRow?.profile_status as string | undefined) === "verificato";
  const recensioni = (scoreRow?.reviews_count as number | undefined) ?? 0;
  const media = scoreRow?.avg_overall as number | null | undefined;
  const soglia = RANK_MIN.comune;
  const inClassifica = recensioni >= soglia;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6">
      <div>
        <Link href="/area-gestore" className="text-sm text-sea-500 hover:underline">
          {t("backArea")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sea-900">{mio.nome}</h1>
        <p className="text-sm text-sea-500">{mio.localita}</p>
      </div>

      {!verificato ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("nonPubblico")}
        </p>
      ) : null}

      <ProgressoProfilo
        beachId={id}
        profilo={profilo}
        recensioni={recensioni}
        sogliaClassifica={soglia}
        verificato={verificato}
      />

      {/* Risultati gratuiti: numeri veri, con la soglia dichiarata */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label={t("tileRecensioni")} value={recensioni.toLocaleString("it-IT")} />
        <Tile
          label={t("tilePunteggio")}
          value={inClassifica && media != null ? media.toFixed(1) : "—"}
          sub={inClassifica ? undefined : t("tileSottoSoglia", { soglia })}
        />
        <Tile
          label={t("tileStato")}
          value={verificato ? t("sigilloVerificato") : t("tileInVerifica")}
        />
      </div>

      <CentroInviti beachId={id} nomeBagno={mio.nome} />

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/area-gestore/${id}/profilo`}
          className="rounded-full bg-sea-500 px-4 py-2 text-sm font-medium text-white hover:bg-sea-600"
        >
          {t("editCta")}
        </Link>
        <Link
          href={`/lido/${id}`}
          className="rounded-full border border-sea-300 px-4 py-2 text-sm font-medium text-sea-700 hover:bg-sea-50"
        >
          {t("openSheet")}
        </Link>
      </div>

      <p className="text-[11px] text-sea-400">{t("hubNota")}</p>
    </div>
  );
}
