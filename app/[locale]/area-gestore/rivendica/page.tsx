import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { RivendicaForm } from "@/components/RivendicaForm";

export const metadata: Metadata = {
  title: "LidoRank — Rivendica il tuo stabilimento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type BeachRow = { id: string; nome: string; localita: string };

export default async function RivendicaPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { beach?: string; q?: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("gestore");
  const pub = createPublicClient();

  // 1) Stabilimento già scelto: mostro il modulo.
  const beachId = (searchParams.beach ?? "").trim();
  if (beachId) {
    const { data } = await pub
      .from("beaches")
      .select("id,nome,localita")
      .eq("id", beachId)
      .maybeSingle();
    const beach = data as BeachRow | null;

    if (beach) {
      return (
        <div className="mx-auto max-w-xl space-y-4 py-6">
          <div>
            <h1 className="text-2xl font-bold text-sea-900">{t("claimTitle")}</h1>
            <p className="mt-1 text-sm text-sea-500">{t("claimIntro")}</p>
          </div>
          <RivendicaForm beachId={beach.id} beachName={`${beach.nome} — ${beach.localita}`} />
          <Link
            href="/area-gestore/rivendica"
            className="inline-block text-sm text-sea-600 underline underline-offset-2"
          >
            {t("change")}
          </Link>
        </div>
      );
    }
  }

  // 2) Ricerca dello stabilimento per nome.
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  let risultati: BeachRow[] = [];
  if (q.length >= 2) {
    const { data } = await pub
      .from("beaches")
      .select("id,nome,localita")
      .ilike("nome", `%${q}%`)
      .order("nome")
      .limit(15);
    risultati = (data ?? []) as BeachRow[];
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold text-sea-900">{t("claimTitle")}</h1>
        <p className="mt-1 text-sm text-sea-500">{t("claimIntro")}</p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="flex-1 rounded-lg border border-sea-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-sea-500 px-4 py-2 text-sm font-medium text-white hover:bg-sea-600"
        >
          {t("searchBtn")}
        </button>
      </form>

      {q.length >= 2 ? (
        risultati.length === 0 ? (
          <p className="text-sm text-sea-500">{t("noResults")}</p>
        ) : (
          <ul className="space-y-2">
            {risultati.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/area-gestore/rivendica?beach=${b.id}`}
                  className="block rounded-xl border border-sea-100 bg-white px-3 py-2 hover:border-sea-300"
                >
                  <div className="font-medium text-sea-900">{b.nome}</div>
                  <div className="text-xs text-sea-500">{b.localita}</div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      <p className="rounded-xl bg-sea-50 px-3 py-2 text-xs text-sea-600">{t("noPaymentNote")}</p>
    </div>
  );
}
