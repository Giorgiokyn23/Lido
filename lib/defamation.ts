// ============================================================
// Filtro anti-diffamazione (riduzione del rischio, non censura).
//
// Non blocca e non cancella: SEGNALA i commenti che contengono accuse esplicite
// di reato/illiceità rivolte a un'attività (es. «truffa», «ladri», «evasione»).
// L'azione di invio usa questo segnale per METTERE IN ATTESA la recensione
// (stato di quarantena) invece di pubblicarla subito: così un'accusa grave non
// resta online prima di un controllo umano. È una misura volontaria di sicurezza
// (tutelata dall'art. 7 DSA) e riduce la finestra di esposizione, ferma restando
// la responsabilità di chi scrive per le proprie parole.
//
// Nota: un falso positivo comporta solo un ritardo (revisione), non la
// cancellazione del contenuto. Teniamo perciò la lista mirata alle accuse di
// REATO, non alle semplici critiche negative («sporco», «caro», «maleducati»
// NON attivano il filtro).
// ============================================================

// Radici di accuse gravi (reato/illecito). Match come sottostringa "di parola".
const ACCUSE = [
  // italiano
  "truff",        // truffa, truffatori, truffano
  "ladr",         // ladri, ladro, ladra
  "rubano", "ruba ", "rubare", "derubat",
  "evasor", "evasione fiscale", "evadono le tasse", "evade le tasse",
  "corrott", "corruzione",
  "mafios", "camorr", "'ndranghet", "mafia",
  "spacci",       // spaccio, spacciano
  "ricicl",       // riciclaggio, riciclano
  "frode", "frodano", "frodare",
  "imbroglion", "imbroglian",
  "disonest",
  "estorsion", "pizzo",
  "abusivi ", "sono abusivi", "è abusivo", "sono degli abusivi",
  "pedofil", "molestator", "stupr",
  // english
  "scam", "fraud", "fraudster", "thiev", "thief", "steal", "stealing",
  "launder", "mafia", "criminal", "tax evasion", "evade tax",
  "extortion", "pedophil", "paedophil", "rapist",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // toglie accenti
    .replace(/\s+/g, " ");
}

/**
 * true se il commento contiene un'accusa esplicita di reato/illiceità,
 * tale da meritare un controllo umano prima della pubblicazione.
 */
export function hasHighRiskAccusation(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = normalize(text);
  return ACCUSE.some((k) => t.includes(k));
}
