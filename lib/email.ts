// ============================================================
// Invio email transazionali via Resend (HTTP API).
//
// Serve per le comunicazioni DSA: conferma di ricezione di una segnalazione
// (art. 16) e comunicazione della decisione con motivazione (art. 17).
//
// SICUREZZA/GRADUALITÀ: se RESEND_API_KEY non è configurata, `sendEmail` NON
// invia nulla e restituisce { ok:true, skipped:true } senza mai lanciare. Così
// il sito funziona già oggi (la segnalazione viene salvata comunque) e le email
// partono automaticamente appena colleghi Resend, senza toccare il codice.
//
// Variabili d'ambiente:
//   RESEND_API_KEY   -> la chiave API di Resend (server-side, mai esposta)
//   RESEND_FROM      -> mittente verificato, es. "LidoRank <info@lidorank.com>"
// ============================================================

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "LidoRank <info@lidorank.com>";
  // niente chiave o destinatario → non inviare, ma non è un errore
  if (!key) return { ok: true, skipped: true };
  if (!opts.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(opts.to)) {
    return { ok: true, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      return { ok: false, error: `resend_${res.status}: ${msg.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}

// Cornice HTML minima e sobria per le email di LidoRank.
function frame(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f8;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0b2e3b">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-weight:700;font-size:18px;color:#0b4f6c;margin-bottom:12px">LidoRank</div>
    <div style="background:#fff;border:1px solid #e3edf0;border-radius:14px;padding:20px">
      <h1 style="font-size:17px;margin:0 0 10px">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:11px;color:#8aa2ab;margin-top:16px">Hai ricevuto questa email perché hai inviato una segnalazione su lidorank.com. Per assistenza: info@lidorank.com</p>
  </div></body></html>`;
}

// Conferma di ricezione di una segnalazione di recensione (DSA art. 16).
export async function sendNoticeAck(to: string, noticeId: string): Promise<SendResult> {
  return sendEmail({
    to,
    subject: "Abbiamo ricevuto la tua segnalazione — LidoRank",
    html: frame(
      "Segnalazione ricevuta",
      `<p style="font-size:14px;line-height:1.5">Grazie: abbiamo ricevuto la tua segnalazione relativa a una recensione e la valuteremo secondo le nostre regole di moderazione.</p>
       <p style="font-size:14px;line-height:1.5">Riferimento: <b>${noticeId}</b>.</p>
       <p style="font-size:14px;line-height:1.5">Se la segnalazione porta a una decisione sul contenuto, te ne comunicheremo l'esito a questo indirizzo. Non è necessario che tu faccia altro.</p>`
    ),
    text: `Abbiamo ricevuto la tua segnalazione (rif. ${noticeId}). La valuteremo e, se porta a una decisione, ti comunicheremo l'esito a questo indirizzo.`,
  });
}

// Comunicazione della decisione con motivazione (DSA art. 17).
// Pronta all'uso da un futuro pannello di moderazione o da una funzione server.
export async function sendNoticeDecision(
  to: string,
  noticeId: string,
  esito: "accolta" | "respinta",
  motivazione: string
): Promise<SendResult> {
  const esitoLabel = esito === "accolta" ? "accolta" : "respinta";
  return sendEmail({
    to,
    subject: "Esito della tua segnalazione — LidoRank",
    html: frame(
      "Decisione sulla tua segnalazione",
      `<p style="font-size:14px;line-height:1.5">La tua segnalazione (rif. <b>${noticeId}</b>) è stata <b>${esitoLabel}</b>.</p>
       <p style="font-size:14px;line-height:1.5">${motivazione}</p>
       <p style="font-size:14px;line-height:1.5">Se ritieni la decisione errata, puoi contestarla rispondendo a questa email o scrivendo a info@lidorank.com.</p>`
    ),
    text: `La tua segnalazione (rif. ${noticeId}) è stata ${esitoLabel}. ${motivazione} Puoi contestare la decisione scrivendo a info@lidorank.com.`,
  });
}

// ============================================================
// AVVISO INTERNO: nuova richiesta di rivendica di una scheda.
//
// Va agli indirizzi in ADMIN_EMAILS, non al gestore: la risposta al gestore
// la scrive una persona, a mano, da info@lidorank.com. Per questo l'email
// contiene tutto il necessario per rispondere in due clic.
// ============================================================

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendRivendicaAlert(d: {
  stabilimento: string;
  nome: string;
  ruolo?: string | null;
  telefono?: string | null;
  email?: string | null;
  nota?: string | null;
}): Promise<SendResult[]> {
  const destinatari = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (destinatari.length === 0) return [{ ok: true, skipped: true }];

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";
  const riga = (etichetta: string, valore: string | null | undefined) =>
    valore
      ? `<tr><td style="padding:4px 12px 4px 0;color:#6b8793;font-size:13px">${etichetta}</td><td style="padding:4px 0;font-size:13px"><b>${esc(valore)}</b></td></tr>`
      : "";

  // Risposta già pronta: si apre il client di posta con destinatario e oggetto.
  const rispondi = d.email
    ? `mailto:${encodeURIComponent(d.email)}?subject=${encodeURIComponent(
        `La tua richiesta per ${d.stabilimento} — LidoRank`
      )}`
    : null;

  const html = `<!doctype html><html><body style="margin:0;background:#f5f7f8;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0b2e3b">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-weight:700;font-size:18px;color:#0b4f6c;margin-bottom:12px">LidoRank · avviso interno</div>
    <div style="background:#fff;border:1px solid #e3edf0;border-radius:14px;padding:20px">
      <h1 style="font-size:17px;margin:0 0 4px">Nuova richiesta di rivendica</h1>
      <p style="font-size:15px;margin:0 0 14px"><b>${esc(d.stabilimento)}</b></p>
      <table style="border-collapse:collapse">
        ${riga("Richiedente", d.nome)}
        ${riga("Ruolo dichiarato", d.ruolo)}
        ${riga("Telefono", d.telefono)}
        ${riga("Email", d.email)}
      </table>
      ${d.nota ? `<p style="font-size:13px;line-height:1.5;background:#f3f8fa;border-radius:8px;padding:10px;margin:14px 0 0">${esc(d.nota)}</p>` : ""}
      <p style="margin:18px 0 0">
        <a href="${base}/admin/rivendicazioni" style="display:inline-block;background:#0b4f6c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600">Apri e verifica</a>
        ${rispondi ? `<a href="${rispondi}" style="display:inline-block;margin-left:8px;color:#0b4f6c;text-decoration:none;padding:10px 16px;border:1px solid #cfe0e6;border-radius:999px;font-size:14px;font-weight:600">Rispondi al gestore</a>` : ""}
      </p>
      <p style="font-size:12px;color:#8aa2ab;margin:14px 0 0">Approva solo dopo aver verificato che la persona gestisca davvero lo stabilimento.</p>
    </div>
  </div></body></html>`;

  const text = [
    `Nuova richiesta di rivendica — ${d.stabilimento}`,
    `Richiedente: ${d.nome}`,
    d.ruolo ? `Ruolo: ${d.ruolo}` : "",
    d.telefono ? `Telefono: ${d.telefono}` : "",
    d.email ? `Email: ${d.email}` : "",
    d.nota ? `Nota: ${d.nota}` : "",
    `Verifica: ${base}/admin/rivendicazioni`,
  ]
    .filter(Boolean)
    .join("\n");

  return Promise.all(
    destinatari.map((to) =>
      sendEmail({ to, subject: `Nuova rivendica: ${d.stabilimento} — LidoRank`, html, text })
    )
  );
}
