"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { FACTS, BOOL_FACTS, CIVIC_FACTS, SEGNALAZIONE_TIPI, NOTICE_TIPI, SUBPOINT_KEYS, metricsForTipo, coreKeysForTipo } from "@/lib/types";
import { cleanComment } from "@/lib/profanity";
import { hasHighRiskAccusation } from "@/lib/defamation";
import { sendNoticeAck, sendRivendicaAlert } from "@/lib/email";

export type SubmitState = { ok: boolean; error?: string };

// Una scheda è pubblicata in DUE indirizzi: /lido/<id> in italiano (senza
// prefisso) e /en/lido/<id> in inglese. La pagina è in cache per un'ora, quindi
// ogni cambiamento di stato deve invalidarle entrambe: altrimenti il database
// dice "verificato" e il sito continua a mostrare "non rivendicato".
function revalidaScheda(beachId: string | null | undefined): void {
  if (!beachId) return;
  revalidatePath(`/lido/${beachId}`);
  revalidatePath(`/en/lido/${beachId}`);
}

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

  // Il set di criteri dipende dal tipo di struttura (bagno = 10 balneari; porto = 8 nautici).
  const supabase = createClient();
  const { data: tipoRow } = await supabase
    .from("beaches")
    .select("tipo")
    .eq("id", beach_id)
    .maybeSingle();
  const tipo = (tipoRow?.tipo as string | undefined) ?? null;
  const metricSet = metricsForTipo(tipo);
  const coreSet = new Set<string>(coreKeysForTipo(tipo));

  // Voti: nessun default. I criteri obbligatori richiedono una scelta cosciente.
  const scores: Record<string, number | null> = {};
  for (const m of metricSet) {
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
  // fatti civici (uso del demanio) — anch'essi booleani facoltativi
  for (const cf of CIVIC_FACTS) {
    facts[cf.key] = pickBool(formData.get(cf.key));
  }

  // sotto-punti facoltativi per criterio (4 stati): salviamo solo sì/no/na,
  // "non so" = chiave assente (neutro). Tutto in un unico oggetto JSONB.
  const dettagli: Record<string, string> = {};
  for (const k of SUBPOINT_KEYS) {
    const v = String(formData.get(k) ?? "");
    if (v === "si" || v === "no" || v === "na") dettagli[k] = v;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Provenienza del recensore: compilata dal modulo se si arriva da un invito
  // del gestore (QR, WhatsApp, email). Valore libero dal client, quindi viene
  // ri-validato anche nel database. Descrive il campione, non lo valuta.
  const fonte = pickEnum(formData.get("fonte"), ["qr", "wa", "mail", "link"]);

  const ip_hash = clientIpHash();

  // Inserimento ATOMICO via RPC: rate-limit + anti-brigading + damper anti-ondata
  // avvengono tutti nella stessa transazione (niente race condition).
  const { error } = await supabase.rpc("submit_review", {
    _beach: beach_id,
    _uid: user?.id ?? null,
    _ip: ip_hash,
    _p: {
      ...scores,
      ...facts,
      commento,
      visita_periodo,
      hold,
      fonte,
      dettagli: Object.keys(dettagli).length ? dettagli : null,
    },
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

  revalidaScheda(beach_id);
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

// Server Action: invia una segnalazione importante/urgente (coda privata per l'ente).
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

  revalidaScheda(beach_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// LATO GESTORI — rivendicazione della scheda
//
// Nota di metodo: nulla di quanto segue tocca punteggi, pesi o posizione in
// classifica. Rivendicare una scheda dà al gestore il controllo dei dati
// descrittivi, mai un vantaggio nel ranking.
// ---------------------------------------------------------------------------

// Server Action: il gestore chiede di rivendicare uno stabilimento.
// La richiesta nasce sempre "in_attesa": l'approvazione è manuale.
export async function submitRivendicazione(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const beach_id = String(formData.get("beach_id") ?? "");
  if (!beach_id) return { ok: false, error: "Seleziona lo stabilimento da rivendicare." };

  const okTs = await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""));
  if (!okTs) return { ok: false, error: "Verifica anti-bot non superata. Riprova." };

  const nome = String(formData.get("nome") ?? "").trim().slice(0, 120);
  if (nome.length < 2) return { ok: false, error: "Indica il tuo nome e cognome." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Accedi con la tua email prima di inviare la richiesta." };
  }

  const ruolo_dichiarato = String(formData.get("ruolo_dichiarato") ?? "").trim().slice(0, 120) || null;
  const telefono = String(formData.get("telefono") ?? "").trim().slice(0, 40) || null;
  const email_contatto =
    String(formData.get("email_contatto") ?? "").trim().slice(0, 200) || user.email || null;
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 1000) || null;

  const { error } = await supabase.from("rivendicazioni").insert({
    user_id: user.id,
    beach_id,
    nome,
    ruolo_dichiarato,
    telefono,
    email_contatto,
    nota,
  });

  if (error) {
    // indice unico: richiesta già aperta, oppure stabilimento già assegnato
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "Esiste già una richiesta per questo stabilimento, oppure è stato assegnato a un altro gestore. Scrivici se pensi sia un errore.",
      };
    }
    return { ok: false, error: error.message || "Invio non riuscito." };
  }

  // Avviso agli amministratori. Non blocca mai: se Resend non è configurato
  // o l'invio fallisce, la richiesta resta comunque salvata e visibile in
  // /admin/rivendicazioni. La risposta al gestore la scrive una persona.
  try {
    const { data: b } = await supabase
      .from("beaches")
      .select("nome,localita")
      .eq("id", beach_id)
      .maybeSingle();
    await sendRivendicaAlert({
      stabilimento: b ? `${b.nome} — ${b.localita}` : beach_id,
      nome,
      ruolo: ruolo_dichiarato,
      telefono,
      email: email_contatto,
      nota,
    });
  } catch {
    // ignorata di proposito: l'avviso è un di più, non una condizione
  }

  revalidaScheda(beach_id);
  revalidatePath("/area-gestore");
  return { ok: true };
}

// Server Action (solo amministratori): approva o respinge una rivendicazione.
// Il controllo dei permessi è nel database, dentro decidi_rivendicazione.
export async function decidiRivendicazione(formData: FormData): Promise<void> {
  const rid = String(formData.get("rid") ?? "");
  const azione = String(formData.get("azione") ?? "");
  if (!rid || (azione !== "approva" && azione !== "respingi")) return;

  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 500) || null;

  const supabase = createClient();
  // Serve l'id della scheda per invalidarne la cache dopo il cambiamento.
  const { data: riga } = await supabase
    .from("rivendicazioni")
    .select("beach_id")
    .eq("id", rid)
    .maybeSingle();
  const { error } = await supabase.rpc("decidi_rivendicazione", {
    _rid: rid,
    _approva: azione === "approva",
    _motivo: motivo,
  });

  if (error) {
    if ((error.message || "").includes("non_autorizzato")) {
      throw new Error(
        "Non sei amministratore nella tabella profili: esegui il blocco BOOTSTRAP della migrazione 0071."
      );
    }
    throw new Error(error.message || "Operazione non riuscita.");
  }

  revalidaScheda(riga?.beach_id as string | undefined);
  revalidatePath("/admin/rivendicazioni");
  revalidatePath("/area-gestore");
}

// Server Action: il gestore salva il profilo pubblico del proprio stabilimento.
// I permessi veri stanno nella RLS (policy e_gestore_di): qui si controlla solo
// per poter dare un messaggio d'errore comprensibile invece di un rifiuto secco.
export async function salvaProfiloStabilimento(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const beach_id = String(formData.get("beach_id") ?? "");
  if (!beach_id) return { ok: false, error: "Stabilimento non valido." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Accedi per modificare il profilo." };

  const { data: autorizzato } = await supabase.rpc("e_gestore_di", { _beach: beach_id });
  if (!autorizzato) {
    return { ok: false, error: "Non risulti gestore approvato di questo stabilimento." };
  }

  const testo = (campo: string, max: number) =>
    String(formData.get(campo) ?? "").trim().slice(0, max) || null;

  // I link accettano solo http/https: evita javascript: e simili.
  const link = (campo: string) => {
    const v = testo(campo, 300);
    if (!v) return null;
    const conProtocollo = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(conProtocollo);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
    } catch {
      return null;
    }
  };

  const { error } = await supabase.from("profilo_stabilimento").upsert(
    {
      beach_id,
      descrizione: testo("descrizione", 2000),
      orari: testo("orari", 500),
      telefono: testo("telefono", 40),
      email_pubblica: testo("email_pubblica", 200),
      sito: link("sito"),
      link_prenotazione: link("link_prenotazione"),
    },
    { onConflict: "beach_id" }
  );

  if (error) return { ok: false, error: error.message || "Salvataggio non riuscito." };

  revalidaScheda(beach_id);
  revalidatePath("/area-gestore");
  return { ok: true };
}

// Server Action (solo amministratori): revoca una rivendica GIÀ APPROVATA.
// La scheda torna non rivendicata e il gestore perde il ruolo se non ha altro.
// I dati del profilo restano salvati ma smettono di essere pubblici.
export async function revocaRivendicazione(formData: FormData): Promise<void> {
  const rid = String(formData.get("rid") ?? "");
  if (!rid) return;
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 500) || null;

  const supabase = createClient();
  // Serve l'id della scheda per invalidarne la cache dopo il cambiamento.
  const { data: riga } = await supabase
    .from("rivendicazioni")
    .select("beach_id")
    .eq("id", rid)
    .maybeSingle();
  const { error } = await supabase.rpc("revoca_rivendicazione", { _rid: rid, _motivo: motivo });

  if (error) {
    const m = error.message || "";
    if (m.includes("non_autorizzato")) {
      throw new Error(
        "Non sei amministratore nella tabella profili: esegui il blocco BOOTSTRAP della migrazione 0071."
      );
    }
    if (m.includes("rivendicazione_non_approvata")) {
      throw new Error("Questa rivendica non è in stato «approvata»: forse è già stata revocata.");
    }
    throw new Error(m || "Revoca non riuscita.");
  }

  revalidaScheda(riga?.beach_id as string | undefined);
  revalidatePath("/admin/rivendicazioni");
  revalidatePath("/area-gestore");
}

// Server Action: il gestore ritira una richiesta in attesa o rinuncia a una
// scheda che gestisce. Funziona solo sulle proprie righe (controllo nel DB).
export async function rinunciaRivendicazione(formData: FormData): Promise<void> {
  const rid = String(formData.get("rid") ?? "");
  if (!rid) return;

  const supabase = createClient();
  // Serve l'id della scheda per invalidarne la cache dopo il cambiamento.
  const { data: riga } = await supabase
    .from("rivendicazioni")
    .select("beach_id")
    .eq("id", rid)
    .maybeSingle();
  const { error } = await supabase.rpc("rinuncia_rivendicazione", { _rid: rid });

  if (error) {
    const m = error.message || "";
    if (m.includes("rivendicazione_non_trovata")) {
      throw new Error("Richiesta non trovata fra le tue.");
    }
    if (m.includes("stato_non_annullabile")) {
      throw new Error("Questa richiesta non si può annullare: è già stata chiusa.");
    }
    throw new Error(m || "Operazione non riuscita.");
  }

  revalidaScheda(riga?.beach_id as string | undefined);
  revalidatePath("/area-gestore");
  revalidatePath("/admin/rivendicazioni");
}
