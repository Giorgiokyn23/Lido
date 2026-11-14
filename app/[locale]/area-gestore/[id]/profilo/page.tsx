import { COLONNE_PROFILO } from "@/lib/profilo";
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

  // La scheda deve essere fra quelle che l'utente gestisce davvero — oppure
  // chi guarda è un amministratore. L'eccezione serve a popolare il sito
  // prima che i gestori arrivino: potendo riempire tu la scheda di un bagno
  // che conosci, ti presenti al gestore con la sua pagina già fatta invece
  // che con un modulo vuoto. La migrazione 0081 apre la stessa porta nel
  // database; senza questo pezzo quel permesso resterebbe inutilizzabile.
  const [{ data: mieiData }, { data: eAdmin }] = await Promise.all([
    supabase.rpc("miei_stabilimenti"),
    supabase.rpc("e_admin"),
  ]);
  const mio = ((mieiData ?? []) as Mio[]).find((m) => m.beach_id === id);
  if (!mio && !eAdmin) notFound();

  const { data: profiloData } = await supabase
    .from("profilo_stabilimento")
    .select(COLONNE_PROFILO)
    .eq("beach_id", id)
    .maybeSingle();

  // Nome, località e stato della scheda. Per il gestore arrivano già da
  // miei_stabilimenti(); per l'amministratore vanno letti qui.
  const pub = createPublicClient();
  const { data: beachRow } = await pub
    .from("beaches")
    .select("nome,localita,profile_status")
    .eq("id", id)
    .maybeSingle();
  const scheda = beachRow as { nome: string; localita: string; profile_status: string } | null;
  if (!mio && !scheda) notFound();
  const nome = mio?.nome ?? scheda?.nome ?? "";
  const localita = mio?.localita ?? scheda?.localita ?? "";
  const pubblico = scheda?.profile_status === "verificato";
  const comeAdmin = !mio && !!eAdmin;

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <Link href={`/area-gestore/${id}`} className="text-sm text-sea-500 hover:underline">
          {t("backHub")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sea-900">{nome}</h1>
        <p className="text-sm text-sea-500">
          {localita} · {t("editIntro")}
        </p>
      </div>

      {comeAdmin ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("modificaComeAdmin")}
        </p>
      ) : null}

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
