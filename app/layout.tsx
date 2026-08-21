import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lido-self.vercel.app"),
  title: "Lidò — Le recensioni verticali degli stabilimenti balneari italiani",
  description:
    "Recensioni strutturate, trasparenti e conformi ai criteri Bolkestein per i lidi e le spiagge d'Italia.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="it">
      <body>
        <header className="sticky top-0 z-20 border-b border-sea-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-sea-700">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sea-500 text-white">L</span>
              <span className="text-xl tracking-tight">Lidò</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/classifiche" className="font-medium text-sea-700 hover:underline">
                🏆 Classifiche
              </Link>
              <Link href="/chi-siamo" className="hidden font-medium text-sea-700 hover:underline sm:inline">
                Chi siamo
              </Link>
              {user ? (
                <form action={signOut} className="flex items-center gap-2">
                  <span className="hidden max-w-[140px] truncate text-xs text-sea-500 sm:inline">
                    {user.email}
                  </span>
                  <button className="rounded-full bg-sea-50 px-3 py-1 font-medium text-sea-700 hover:bg-sea-100">
                    Esci
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-sea-500 px-4 py-1.5 font-medium text-white hover:bg-sea-600"
                >
                  Accedi
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-8 border-t border-sea-100 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sea-700">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-sea-500 text-white">L</span>
                Lidò
              </div>
              <p className="mt-2 text-sm text-sea-500">
                Le recensioni verticali degli stabilimenti balneari italiani. Dati strutturati e
                trasparenti, pensati anche per i criteri dei bandi Bolkestein.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-sea-800">A chi è utile</p>
              <p className="mt-2 text-sm text-sea-500">
                Ai bagnanti per scegliere, ai gestori per farsi conoscere, e a Comuni ed enti di
                controllo del demanio marittimo come base dati sul rispetto delle regole. Lidò è un
                progetto indipendente: nessuna affiliazione con enti pubblici salvo accordi
                dichiarati.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-sea-800">Crediti</p>
              <p className="mt-2 text-sm text-sea-500">
                <strong className="text-sea-700">Giorgio Menicagli Pirina</strong> — Founder.
              </p>
              <p className="mt-2 text-sm text-sea-500">
                <strong className="text-sea-700">Francesco Mancuso</strong> — Co-founder, dottorando in
                Politica Comparata e Teoria Politica Analitica.
              </p>
            </div>
          </div>
          <div className="border-t border-sea-100 px-4 py-5 text-center text-xs text-sea-500">
            © {new Date().getFullYear()} Lidò — Giorgio Menicagli Pirina. Tutti i diritti riservati.
            Contenuti, codice, marchio e struttura dati sono protetti; riproduzione vietata senza
            autorizzazione scritta.
          </div>
        </footer>
      </body>
    </html>
  );
}
