import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { CITTA, cittaSlugs } from "@/lib/citta";
import { routing } from "@/i18n/routing";
import { BeachCardClient } from "@/components/BeachCardClient";
import { CommunityStrip } from "@/components/CommunityStrip";
import type { BeachScore } from "@/lib/types";

// Landing locale per gli sprint di raccolta recensioni. Template riutilizzabile:
// nuova città = una riga in lib/citta.ts. ISR (cache) come il resto del sito.
export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => cittaSlugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const cfg = CITTA[params.slug];
  if (!cfg) return {};
  const t = await getTranslations({ locale: params.locale, namespace: "citta" });
  return {
    title: t("metaTitle", { city: cfg.nome }),
    description: t("metaDesc", { city: cfg.nome }),
    alternates: { canonical: `/citta/${params.slug}` },
  };
}

export default async function CittaPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(locale);
  const cfg = CITTA[slug];
  if (!cfg) notFound();

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("beach_scores")
    .select("*")
    .eq("paese", "IT")
    .in("localita", cfg.localita)
    .order("avg_overall", { ascending: false, nullsFirst: false })
    .order("reviews_count", { ascending: false })
    .limit(80);
  const beaches = (data ?? []) as BeachScore[];
  const beachIds = beaches.map((b) => b.id);
  const t = await getTranslations("citta");

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-block text-sm text-sea-500 hover:underline">
        {t("back")}
      </Link>

      {/* Hero locale (nessun riferimento a patrocini finché non concessi) */}
      <section className="rounded-3xl bg-gradient-to-br from-sea-500 to-sea-700 p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-sea-50/80">
          LidoRank · {cfg.nome}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("heroTitle", { city: cfg.nome })}</h1>
        <p className="mt-2 max-w-2xl text-sm text-sea-50/90">{t("lead", { city: cfg.nome })}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="#bagni"
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-sea-900 transition hover:bg-amber-300"
          >
            {t("reviewCta", { city: cfg.nome })}
          </a>
          <Link
            href={`/classifiche?scope=comune&comune=${encodeURIComponent(cfg.nome)}`}
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
          >
            {t("rankingLink", { city: cfg.nome })}
          </Link>
        </div>
      </section>

      <CommunityStrip beachIds={beachIds} />

      <section id="bagni" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold text-sea-900">{t("listTitle", { city: cfg.nome })}</h2>
        {beaches.length === 0 ? (
          <p className="rounded-xl bg-white p-8 text-center text-sea-500 shadow-sm">
            {t("empty", { city: cfg.nome })}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beaches.map((b) => (
              <BeachCardClient key={b.id} beach={b} />
            ))}
          </div>
        )}
        <p className="text-xs text-sea-400">{t("coverage", { n: beaches.length, city: cfg.nome })}</p>
      </section>
    </div>
  );
}
