// ============================================================
// Moderazione del linguaggio nei commenti delle recensioni.
//
// IMPORTANTE: in questo file NON è scritta nessuna bestemmia, nemmeno per
// confronto. Le bestemmie italiane hanno struttura [termine sacro] + [termine
// offensivo]: le riconosciamo COMBINANDO due liste separate. Presa da sola,
// nessuna delle due liste è una bestemmia — la parola completa esiste solo
// come schema (RegExp) costruito al volo durante il controllo, mai come testo.
//
// Comportamento: `cleanComment` sostituisce con asterischi ciò che riconosce,
// lasciando intatto il resto del commento (mascheramento, non cancellazione).
// Le liste sono modificabili: aggiungi/togli termini secondo necessità.
// ============================================================

// Termini "sacri" (di per sé NON offensivi: "grazie a dio" resta intatto,
// vengono mascherati solo se accostati a un termine offensivo qui sotto).
const SACRI = [
  "dio", "dii", "iddio", "madonna", "madonne", "cristo", "gesu", "gesù",
  "signoriddio", "sacramento", "ostia", "eucaristia", "vergine",
];

// Termini offensivi/peggiorativi che, accostati a un termine sacro, formano
// la bestemmia. Da soli sono parole comuni o volgari, non bestemmie.
const PEGGIORATIVI = [
  "porco", "porca", "cane", "cani", "boia", "maiale", "maiala", "ladro",
  "ladra", "infame", "schifoso", "bastardo", "bucaiolo", "impestato",
  "merd", "stronz", "troi", "puttan",
];

// Volgarità/insulti "a sé stanti" (non bestemmie): mascherati singolarmente.
// Tienila corta e mirata per evitare falsi positivi (es. parole innocenti che
// iniziano con la stessa radice).
const VOLGARI = [
  "cazzo", "cazzi", "cazzat", "coglion", "stronz", "vaffan", "vaffanculo",
  "minchia", "incul", "puttan", "troia", "merda", "merdo",
];

const SEP = "[\\s._\\-*'\"]{0,3}"; // separatori / piccole evasioni tra le due parti

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let CACHE: RegExp[] | null = null;

function patterns(): RegExp[] {
  if (CACHE) return CACHE;
  const pats: RegExp[] = [];
  // bestemmie = sacro + offensivo (in entrambi gli ordini), assemblate qui
  for (const s of SACRI) {
    for (const p of PEGGIORATIVI) {
      pats.push(new RegExp(`\\b${esc(p)}${SEP}${esc(s)}\\w*`, "gi"));
      pats.push(new RegExp(`\\b${esc(s)}${SEP}${esc(p)}\\w*`, "gi"));
    }
  }
  // volgarità singole
  for (const v of VOLGARI) {
    pats.push(new RegExp(`\\b${esc(v)}\\w*`, "gi"));
  }
  CACHE = pats;
  return pats;
}

/** Restituisce true se il commento contiene linguaggio da moderare. */
export function hasProfanity(text: string): boolean {
  if (!text) return false;
  return patterns().some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

/**
 * Maschera bestemmie e volgarità sostituendole con asterischi, lasciando
 * intatto il resto del testo. Non lancia mai: se il testo è vuoto torna vuoto.
 */
export function cleanComment(text: string): string {
  if (!text) return text;
  let out = text;
  for (const re of patterns()) {
    out = out.replace(re, (m) => "*".repeat(Math.max(3, m.length)));
  }
  return out;
}
