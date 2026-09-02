import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RANK_MIN } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("methodology");
  return { title: `LidoRank — ${t("title")}`, alternates: { canonical: "/metodologia" } };
}

export default async function MetodologiaPage() {
  const t = await getTranslations("methodology");

  const Section = ({ title, body }: { title: string; body: string }) => (
    <section className="space-y-1">
      <h2 className="text-lg font-semibold text-sea-800">{title}</h2>
      <p className="text-sm leading-relaxed text-sea-600">{body}</p>
    </section>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/classifiche" className="text-sm text-sea-500 hover:underline">
          {t("back")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-sea-900">{t("title")}</h1>
        <p className="mt-2 text-sea-600">{t("intro")}</p>
      </div>

      <div className="space-y-5 rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
        <Section title={t("s1Title")} body={t("s1Body")} />
        <Section title={t("s2Title")} body={t("s2Body")} />
        <Section
          title={t("s3Title")}
          body={t("s3Body", {
            comune: RANK_MIN.comune,
            regione: RANK_MIN.regione,
            nazionale: RANK_MIN.nazionale,
          })}
        />
        <Section title={t("s4Title")} body={t("s4Body")} />
        <Section title={t("s5Title")} body={t("s5Body")} />
      </div>

      <p className="rounded-xl bg-sea-50 px-4 py-3 text-sm text-sea-600">{t("disclaimer")}</p>
    </div>
  );
}
