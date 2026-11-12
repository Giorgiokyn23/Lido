import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Conferma del collegamento di accesso ricevuto via email.
 *
 * Perché questa rotta esiste accanto a /auth/callback. Il callback usa
 * `exchangeCodeForSession`, che fa parte del flusso PKCE: al momento della
 * richiesta il browser si salva un segreto (il code verifier) e lo riusa
 * quando il collegamento viene aperto. Finché chi clicca è lo stesso browser
 * che ha chiesto l'accesso, funziona. Ma se la richiesta parte dal computer e
 * l'email viene aperta dal telefono — cioè quasi sempre — il segreto non c'è,
 * lo scambio fallisce e l'utente resta fuori senza capire perché.
 *
 * Il token_hash non ha questo problema: è autosufficiente, non dipende dal
 * dispositivo che ha avviato l'accesso. È la via che Supabase documenta per
 * le applicazioni che gestiscono la sessione lato server.
 *
 * In più `verifyOtp` viaggia in POST, quindi la sessione torna nel corpo
 * della risposta e possiamo scriverla nei cookie qui, senza passare dal
 * frammento dell'URL che il server non potrebbe mai leggere.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Dove mandare la persona dopo. Accettiamo solo percorsi interni: un
  // redirect_to assoluto scritto da altri sarebbe un invito a usare il nostro
  // dominio come trampolino verso un sito qualsiasi.
  const richiesto = searchParams.get("next") ?? searchParams.get("redirect_to") ?? "/area-gestore";
  const destinazione = richiesto.startsWith("/") && !richiesto.startsWith("//")
    ? richiesto
    : "/area-gestore";

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${destinazione}`);
    }
  }

  // Fallito: niente redirect silenzioso alla home, che lascerebbe la persona a
  // chiedersi se è entrata o no. La riportiamo al login con la spiegazione.
  return NextResponse.redirect(`${origin}/login?errore=link`);
}
