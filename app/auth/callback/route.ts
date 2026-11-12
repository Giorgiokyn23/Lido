import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback del flusso PKCE (`exchangeCodeForSession`).
 *
 * Resta in piedi per i collegamenti già spediti e per il caso in cui chi
 * clicca sia lo stesso browser che ha chiesto l'accesso. Per tutti gli altri
 * casi — email aperta dal telefono dopo aver chiesto il codice dal computer —
 * la strada buona è /auth/confirm, che non dipende dal dispositivo.
 *
 * Prima questa rotta ignorava l'esito dello scambio e reindirizzava comunque
 * alla home: chi falliva si ritrovava sul sito da sconosciuto, senza un
 * messaggio, convinto che il sito fosse rotto. Ora l'errore si vede.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const richiesto = searchParams.get("next") ?? "/area-gestore";
  const destinazione = richiesto.startsWith("/") && !richiesto.startsWith("//")
    ? richiesto
    : "/area-gestore";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${destinazione}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?errore=link`);
}
