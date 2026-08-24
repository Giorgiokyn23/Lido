import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1) next-intl gestisce lingua/prefisso e produce la response
  const response = intl(request);

  // 2) Supabase: aggiorna la sessione e scrive i cookie sulla stessa response
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
