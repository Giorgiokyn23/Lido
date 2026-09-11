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
