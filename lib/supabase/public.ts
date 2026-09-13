import { createClient as createSbClient } from "@supabase/supabase-js";

// Client Supabase SENZA cookie/sessione, per le sole letture pubbliche
// (schede bagno, dati aggregati). Non tocca i cookie della richiesta, quindi le
// pagine che lo usano possono essere rese staticamente o in cache (ISR),
// riducendo il consumo di CPU serverless. Le policy RLS si applicano come utente
// anonimo — esattamente ciò che serve per contenuti pubblici uguali per tutti.
export function createPublicClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
