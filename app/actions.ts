"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { METRICS, FACTS, BOOL_FACTS, SEGNALAZIONE_TIPI } from "@/lib/types";

export type SubmitState = { ok: boolean; error?: string };

// hash dell'IP (con salt) per rate-limit senza salvare l'IP in chiaro
function clientIpHash(): string {
  const h = headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const salt = process.env.IP_SALT || "lido-default-salt";
  return createHash("sha256").update(ip + salt).digest("hex");
}

// helper: valore enum ammesso o null
function pickEnum(v: FormDataEntryValue | null, allowed: readonly string[]): string | null {
  const s = String(v ?? "");
  return allowed.includes(s) ? s : null;
}
// helper: 'si' -> true, 'no' -> false, altro -> null
function pickBool(v: FormDataEntryValue | null): boolean | null {
  const s = String(v ?? "");
  return s === "si" ? true : s === "no" ? false : null;
}

// Server Action: inserisce una recensione (6 voti 1..5 + commento).
export async function submitReview(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const beach_id = String(formData.get("beach_id") ?? "");
  if (!beach_id) return { ok: false, error: "Lido non valido." };

  // honeypot anti-bot: campo invisibile che solo i bot compilano
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { ok: true }; // fingiamo successo, non inseriamo nulla
  }

  const scores: Record<string, number> = {};
  for (const m of METRICS) {
    const n = Number(formData.get(m.key));
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return { ok: false, error: `Voto non valido per "${m.label}".` };
    }
    scores[m.key] = n;
  }

  const commento = String(formData.get("commento") ?? "").trim().slice(0, 2000) || null;

  // fatti oggettivi (opzionali)
  const facts: Record<string, string | boolean | null> = {};
  for (const f of FACTS) {
    facts[f.key] = pickEnum(formData.get(f.key), f.options.map((o) => o.value));
  }
  for (const bf of BOOL_FACTS) {
    facts[bf.key] = pickBool(formData.get(bf.key));
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ip_hash = clientIpHash();

  // rate-limit: max 6 recensioni/ora dallo stesso IP
  const sinceIso = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash)
    .gte("created_at", sinceIso);
  if ((count ?? 0) >= 6) {
    return { ok: false, error: "Troppe recensioni in poco tempo. Riprova più tardi." };
  }

  const { error } = await supabase.from("reviews").insert({
    beach_id,
    user_id: user?.id ?? null,
    verified: !!user,
    ip_hash,
    commento,
    ...scores,
    ...facts,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Hai già recensito questo bagno con il tuo account." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/lido/${beach_id}`);
  revalidatePath("/");
  return { ok: true };
}

// Server Action: logout
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}

// Server Action: invia una segnalazione di illecito (coda privata per l'ente).
export async function submitSegnalazione(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const beach_id = String(formData.get("beach_id") ?? "");
  if (!beach_id) return { ok: false, error: "Lido non valido." };

  const tipo = pickEnum(
    formData.get("tipo"),
    SEGNALAZIONE_TIPI.map((t) => t.value)
  );
  if (!tipo) return { ok: false, error: "Seleziona il tipo di segnalazione." };

  const descrizione = String(formData.get("descrizione") ?? "").trim().slice(0, 2000) || null;
  const email_contatto = String(formData.get("email_contatto") ?? "").trim().slice(0, 200) || null;

  const supabase = createClient();
  const { error } = await supabase.from("segnalazioni").insert({
    beach_id,
    tipo,
    descrizione,
    email_contatto,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/lido/${beach_id}`);
  return { ok: true };
}
