"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { METRICS, FACTS, BOOL_FACTS, SEGNALAZIONE_TIPI, CORE_METRIC_KEYS, NOTICE_TIPI } from "@/lib/types";
import { cleanComment } from "@/lib/profanity";
import { hasHighRiskAccusation } from "@/lib/defamation";
import { sendNoticeAck } from "@/lib/email";

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

// Verifica il token Turnstile (Cloudflare) lato server.
// Se TURNSTILE_SECRET non è configurato, la verifica è disattivata (non blocca) —
// così il sito resta funzionante finché non colleghi le chiavi in produzione.
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // non ancora configurato → non bloccare
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false; // in caso di errore rete, meglio negare
  }
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

  // verifica anti-bot Turnstile (se configurato)
  const okTs = await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""));
  if (!okTs) return { ok: false, error: "Verifica anti-bot non superata. Riprova." };

  // Voti: nessun default. I 6 criteri principali sono obbligatori (scelta cosciente);
  // i 3 extra sono opzionali → "" o "na" diventano null.
  const coreSet = new Set<string>(CORE_METRIC_KEYS);
  const scores: Record<string, number | null> = {};
  for (const m of METRICS) {
    const raw = String(formData.get(m.key) ?? "").trim();
    if (raw === "" || raw === "na") {
      if (coreSet.has(m.key)) {
        return { ok: false, error: `Dai un voto a "${m.label}" (è tra i criteri obbligatori).` };
      }
      scores[m.key] = null; // criterio opzionale non valutato
      continue;
    }
    const n = Number(raw);
    // ammessi 1..5 a passi di 0,5 (mezzo voto)
    if (!Number.isFinite(n) || n < 1 || n > 5 || (n * 2) % 1 !== 0) {
      return { ok: false, error: `Voto non valido per "${m.label}".` };
    }
    scores[m.key] = n;
  }

  // Conferma di visita: obbligatoria (anti-recensioni fantasma)
  const visitato = String(formData.get("visitato") ?? "");
  if (visitato !== "1" && visitato !== "on" && visitato !== "true") {
    return { ok: false, error: "Per pubblicare, conferma di aver visitato lo stabilimento." };
  }
  // Data di visita (facoltativo): "YYYY-MM-DD"
  const visita_periodo = /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("visita_periodo") ?? ""))
    ? String(formData.get("visita_periodo"))
    : null;

  // commento: maschera bestemmie/volgarità prima di salvare (moderazione)
  const commentoRaw = String(formData.get("commento") ?? "").trim().slice(0, 2000);
  const commento = commentoRaw ? cleanComment(commentoRaw) : null;

  // Anti-diffamazione: se il commento contiene accuse esplicite di reato,
  // la recensione viene messa in attesa (non pubblicata) per un controllo umano,
  // invece di andare subito online. Riduce la finestra di esposizione.
  const hold = hasHighRiskAccusation(commento);

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

  // Inserimento ATOMICO via RPC: rate-limit + anti-brigading + damper anti-ondata
  // avvengono tutti nella stessa transazione (niente race condition).
  const { error } = await supabase.rpc("submit_review", {
    _beach: beach_id,
    _uid: user?.id ?? null,
    _ip: ip_hash,
    _p: { ...scores, ...facts, commento, visita_periodo, hold },
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("rate_limit_ip"))
      return { ok: false, error: "Troppe recensioni in poco tempo. Riprova più tardi." };
    if (msg.includes("rate_limit_beach"))
      return { ok: false, error: "Hai già recensito questo lido di recente." };
    if (error.code === "23505")
      return { ok: false, error: "Hai già recensito questo bagno con il tuo account." };
    return { ok: false, error: msg || "Errore nell'invio." };
  }

  revalidatePath(`/lido/${beach_id}`);
  revalidatePath("/");
  return { ok: true };
}

// Server Action: segnala una RECENSIONE come contenuto illecito (DSA art. 16).
// Salva la segnalazione tramite RPC e, se è stata lasciata un'email e Resend è
// configurato, invia la conferma di ricezione (art. 16). L'invio email non
// blocca mai il salvataggio.
export async function submitReviewNotice(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const review_id = String(formData.get("review_id") ?? "");
  if (!review_id) return { ok: false, error: "Recensione non valida." };

  const motivo = pickEnum(
    formData.get("motivo"),
    NOTICE_TIPI.map((t) => t.value)
  );
  if (!motivo) return { ok: false, error: "Seleziona un motivo." };

  const buonaFede = String(formData.get("buona_fede") ?? "");
  if (buonaFede !== "on" && buonaFede !== "1" && buonaFede !== "true") {
    return { ok: false, error: "Conferma la dichiarazione di buona fede per inviare." };
  }

  const spiegazione = String(formData.get("spiegazione") ?? "").trim().slice(0, 2000) || null;
  const email = String(formData.get("email") ?? "").trim().slice(0, 200) || null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_review_notice", {
    _rid: review_id,
    _motivo: motivo,
    _spiegazione: spiegazione,
    _email: email,
    _buonafede: true,
  });

  if (error) return { ok: false, error: error.message || "Invio non riuscito." };

  // Conferma di ricezione (art. 16): best-effort, non blocca in caso di errore.
  if (email) {
    try {
      await sendNoticeAck(email, String(data ?? ""));
    } catch {
      // ignora: la segnalazione è comunque registrata
    }
  }

  revalidatePath(`/lido`);
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

  const okTs = await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""));
  if (!okTs) return { ok: false, error: "Verifica anti-bot non superata. Riprova." };

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
