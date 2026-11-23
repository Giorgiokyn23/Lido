import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1) next-intl gestisce lingua/prefisso e produce la response
  const response = intl(request);

  // 2) Supabase: aggiorna la sessione — ma SOLO se una sessione esiste.
  //
  // Prima questo blocco girava a ogni singola richiesta, comprese quelle di
  // chi non ha mai fatto l'accesso: ogni apertura di pagina faceva una
  // chiamata di rete a Supabase per verificare un utente che non c'era.
  // Moltiplicato per ogni visitatore e ogni pagina, è stato il secondo
  // consumo di CPU del sito.
  //
  // Il riconoscimento è semplice e sicuro: Supabase scrive i suoi cookie con
  // il prefisso «sb-» e il suffisso «-auth-token». Se non ce n'è nemmeno uno,
  // non c'è niente da rinfrescare. Chi è anonimo oggi non perde nulla: non
  // aveva una sessione prima e non ne ha una dopo.
  const haSessione = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  if (!haSessione) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Record<string, unknown>)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // tutte le rotte tranne: api, auth (callback OAuth), asset statici e file con estensione
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
