import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import {
  ProfiloStabilimentoForm,
  type ProfiloValori,
} from "@/components/ProfiloStabilimentoForm";

export const metadata: Metadata = {
  title: "LidoRank — Modifica profilo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Mio = { beach_id: string; nome: string; localita: string; approvata_il: string | null };

export default async function ModificaProfiloPage({
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

  // La scheda deve essere fra quelle che l'utente gestisce davvero.
  const { data: mieiData } = await supabase.rpc("miei_stabilimenti");
  const mio = ((mieiData ?? []) as Mio[]).find((m) => m.beach_id === id);
  if (!mio) notFound();

  const { data: profiloData } = await supabase
    .from("profilo_stabilimento")
    .select(
      "descrizione,orari,telefono,email_pubblica,sito,link_prenotazione,gruppi_max,gruppi_preavviso_giorni,pranzo_gruppi,discesa_pullman,accesso_senza_scalini,passerella_fino_al_mare,sedia_mare,bagno_accessibile,lingue,pagamenti_carte,ombra_garantita"
    )
    .eq("beach_id", id)
    .maybeSingle();

  // Lo stato della scheda serve solo per avvisare se il profilo non è pubblico.
  const pub = createPublicClient();
  const { data: beachRow } = await pub
    .from("beaches")
    .select("profile_status")
    .eq("id", id)
    .maybeSingle();
  const pubblico = (beachRow?.profile_status as string | undefined) === "verificato";

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <Link href={`/area-gestore/${id}`} className="text-sm text-sea-500 hover:underline">
          {t("backHub")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sea-900">{mio.nome}</h1>
        <p className="text-sm text-sea-500">
          {mio.localita} · {t("editIntro")}
        </p>
      </div>

      {!pubblico ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("nonPubblico")}
        </p>
      ) : null}

      <ProfiloStabilimentoForm
        beachId={id}
        valori={(profiloData as ProfiloValori | null) ?? null}
      />

      <Link
        href={`/lido/${id}`}
        className="inline-block text-sm text-sea-600 underline underline-offset-2"
      >
        {t("openSheet")}
      </Link>
    </div>
  );
}
