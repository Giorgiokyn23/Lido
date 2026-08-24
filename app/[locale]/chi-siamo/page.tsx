import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: `${t("title")} — LidoRank` };
}

function Avatar({ src, initials, alt }: { src: string; initials: string; alt: string }) {
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-sea-500 text-2xl font-bold text-white shadow">
      <span className="absolute inset-0 grid place-items-center">{initials}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

export default async function ChiSiamoPage() {
  const t = await getTranslations("about");

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-sea-500 to-sea-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sea-50/90">{t("heroText")}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar src="/giorgio.jpg" initials="GM" alt="Giorgio Menicagli Pirina" />
            <div>
              <h2 className="text-lg font-bold text-sea-900">Giorgio Menicagli Pirina</h2>
              <p className="text-sm font-semibold text-sea-500">{t("founderRole")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-sea-700">{t("giorgioBio")}</p>
        </article>

        <article className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar src="/francesco.jpg" initials="FM" alt="Francesco Mancuso" />
            <div>
              <h2 className="text-lg font-bold text-sea-900">Francesco Mancuso</h2>
              <p className="text-sm font-semibold text-sea-500">{t("cofounderRole")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-sea-700">{t("francescoBio")}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-sea-100 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-sea-900">{t("howTitle")}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-sea-700">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
          <p className="text-sea-500">{t("p3")}</p>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-sea-600 hover:underline">
          {t("back")}
        </Link>
      </section>
    </div>
  );
}
