import { getTranslations } from "next-intl/server";
import { SearchExperience } from "@/components/SearchExperience";

export const dynamic = "force-dynamic";

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations("home");

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sea-400 via-sea-500 to-sea-700 px-6 pb-24 pt-14 text-center text-white shadow-xl sm:pt-16">
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-amber-200/30 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-medium backdrop-blur">
            🏖️ {t("badge")}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("titleA")}
            <br className="hidden sm:block" /> {t("titleB")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sea-50/90">{t("subtitle")}</p>
        </div>

        <svg className="absolute inset-x-0 bottom-0 h-20 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#ffffff" fillOpacity="0.18" d="M0,64 C240,120 480,0 720,40 C960,80 1200,120 1440,64 L1440,120 L0,120 Z" />
          <path fill="#ffffff" fillOpacity="0.35" d="M0,88 C240,40 480,120 720,88 C960,56 1200,24 1440,80 L1440,120 L0,120 Z" />
          <path fill="#f7f3ea" d="M0,104 C240,80 480,120 720,104 C960,88 1200,112 1440,100 L1440,120 L0,120 Z" />
        </svg>
      </section>

      <SearchExperience locale={locale} />
    </div>
  );
}
