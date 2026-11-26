import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: `${t("title")} — LidoRank`,
    description: t("missione"),
    alternates: { canonical: "/chi-siamo" },
  };
}

function Avatar({ src, initials, alt }: { src: string; initials: string; alt: string }) {
  return (
    <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-sea-500 text-xl font-bold text-white shadow">
      <span className="absolute inset-0 grid place-items-center">{initials}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

/**
 * Chi siamo.
 *
 * LA MISSIONE STA IN CIMA, DA SOLA, e non in fondo a un elenco di paragrafi:
 * è l'unica frase che qualcuno potrebbe citare, e deve poterla leggere senza
 * scorrere. Sotto c'è la storia, che è la parte che fa fidare — una fotografia
 * di due ragazzi in Cornovaglia dice di questo progetto più di qualunque
 * dichiarazione di intenti.
 */
export default async function ChiSiamoPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-2">
      <section className="rounded-3xl bg-gradient-to-br from-sea-500 to-sea-700 p-8 text-white shadow-lg">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sea-100/80">
          {t("title")}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">{t("missioneTitolo")}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-sea-50/90">{t("missione")}</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-sea-900">{t("storiaTitolo")}</h2>

        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/noi-newquay.jpg"
            alt={t("fotoAlt")}
            className="w-full rounded-2xl object-cover shadow-sm"
          />
          <figcaption className="mt-2 text-center text-[11px] uppercase tracking-wide text-sea-400">
            {t("fotoDidascalia")}
          </figcaption>
        </figure>

        <div className="mt-5 space-y-4 leading-relaxed text-sea-800">
          <p>{t("storia1")}</p>
          <p>{t("storia2")}</p>
          <p>{t("storia3")}</p>
          <p>{t("storia4")}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar src="/giorgio.jpg" initials="GM" alt="Giorgio Menicagli Pirina" />
            <div className="min-w-0">
              <h3 className="font-bold leading-tight text-sea-900">Giorgio Menicagli Pirina</h3>
              <p className="text-sm font-semibold text-sea-500">{t("giorgioRuolo")}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-sea-700">{t("giorgioBio")}</p>
        </article>

        <article className="rounded-2xl border border-sea-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar src="/francesco.jpg" initials="FM" alt="Francesco Mancuso" />
            <div className="min-w-0">
              <h3 className="font-bold leading-tight text-sea-900">Francesco Mancuso</h3>
              <p className="text-sm font-semibold text-sea-500">{t("francescoRuolo")}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-sea-700">{t("francescoBio")}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-sea-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-sea-900">{t("regoleTitolo")}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-sea-700">
          <li>{t("regola1")}</li>
          <li>{t("regola2")}</li>
          <li>{t("regola3")}</li>
        </ul>
        <p className="mt-4 text-sm text-sea-600">
          {t("contattaci")}{" "}
          <Link href="/contatti" className="font-medium text-sea-700 underline underline-offset-2">
            {t("contattaciLink")}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
