import type { Metadata, Viewport } from "next";
import "../globals.css";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { NavAuth } from "@/components/NavAuth";
import { Logo } from "@/components/Logo";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";

// Pre-render statico per entrambe le lingue: niente più CPU per ogni visita.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// colore barra di stato (Android/PWA) + viewport per app installata
export const viewport: Viewport = {
  themeColor: "#166a92",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const en = locale === "en";
  return {
    metadataBase: new URL(base),
    icons: {
      // /favicon.ico è il percorso che Google sonda per primo nei risultati
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/icon.png",
    },
    // iOS: comportamento da app quando aggiunta alla schermata Home
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "LidoRank",
    },
    title: en
      ? "LidoRank — Vertical reviews of beach clubs worldwide"
      : "LidoRank — Le recensioni verticali dei beach club nel mondo",
    description: en
      ? "Structured, transparent reviews of beach clubs and marinas worldwide across eight criteria — and a channel to report violations to the authorities."
      : "Recensioni strutturate e trasparenti di lidi e porti in tutto il mondo, su otto criteri — e un canale per segnalare gli illeciti agli enti.",
    alternates: {
      canonical: en ? "/en" : "/",
      languages: { it: "/", en: "/en" },
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as "it" | "en")) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("nav");
  const tf = await getTranslations("footer");
  const tl = await getTranslations("legal");

  return (
    <html lang={locale} className="scroll-smooth">
      <body>
        <NextIntlClientProvider messages={messages}>
          <header className="sticky top-0 z-20 border-b border-sea-100 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold text-sea-700">
                <Logo className="h-8 w-8" />
                <span className="text-xl tracking-tight">LidoRank</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/classifiche" className="font-medium text-sea-700 hover:underline">
                  🏆 {t("rankings")}
                </Link>
                <Link href="/chi-siamo" className="hidden font-medium text-sea-700 hover:underline sm:inline">
                  {t("about")}
                </Link>
                {/* switch lingua */}
                <Link href="/" locale={locale === "en" ? "it" : "en"} className="rounded-full border border-sea-200 px-2.5 py-1 text-xs font-semibold text-sea-600 hover:bg-sea-50">
                  {locale === "en" ? "IT" : "EN"}
                </Link>
                <NavAuth />
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

          <footer className="mt-8 border-t border-sea-100 bg-white">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-sea-700">
                  <Logo className="h-7 w-7" />
                  LidoRank
                </div>
                <p className="mt-2 text-sm text-sea-500">{tf("desc")}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-sea-800">{tf("usefulTitle")}</p>
                <p className="mt-2 text-sm text-sea-500">{tf("usefulText")}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-sea-800">{tf("creditsTitle")}</p>
                <p className="mt-2 text-sm text-sea-500">
                  <strong className="text-sea-700">Giorgio Menicagli Pirina</strong> — Founder.
                </p>
                <p className="mt-2 text-sm text-sea-500">
                  <strong className="text-sea-700">Francesco Mancuso</strong> — Co-founder.
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-sea-100 px-4 py-4 text-xs text-sea-500">
              <Link href="/privacy" className="hover:text-sea-700 hover:underline">{tl("privacy")}</Link>
              <Link href="/termini" className="hover:text-sea-700 hover:underline">{tl("terms")}</Link>
              <Link href="/linee-guida" className="hover:text-sea-700 hover:underline">{tl("guidelines")}</Link>
              <Link href="/moderazione" className="hover:text-sea-700 hover:underline">{tl("moderation")}</Link>
              <Link href="/metodologia" className="hover:text-sea-700 hover:underline">{tl("methodology")}</Link>
              <Link href="/contatti" className="hover:text-sea-700 hover:underline">{tl("contact")}</Link>
            </nav>
            <div className="border-t border-sea-100 px-4 py-5 text-center text-xs text-sea-500">
              © {new Date().getFullYear()} LidoRank — Giorgio Menicagli Pirina e Francesco Mancuso. {tf("rights")}
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
