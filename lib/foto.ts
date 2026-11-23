/**
 * Le foto: regole in un posto solo.
 *
 * TRE COSE SUCCEDONO NEL BROWSER, PRIMA DI CARICARE, e non è un'ottimizzazione
 * ma il cuore della faccenda.
 *
 * 1. IL RIDIMENSIONAMENTO. Una foto da iPhone pesa fra 3 e 6 megabyte. Dieci
 *    foto su una scheda sarebbero cinquanta megabyte da scaricare per aprire
 *    una pagina: nessuno aspetta. Ridotta a 1600 pixel di lato lungo e
 *    ricompressa in webp sta sotto i 300 kilobyte, e su uno schermo di telefono
 *    o di computer non si vede la differenza. Costa anche meno in banda, che
 *    dopo il blocco dell'account per consumo non è un dettaglio.
 *
 * 2. LA CANCELLAZIONE DEI METADATI. Questa è la ragione più importante. Ogni
 *    foto scattata col telefono porta dentro, invisibili, la posizione GPS
 *    esatta, la data e l'ora al secondo, e il modello del dispositivo. Caricare
 *    il file originale significherebbe pubblicare le coordinate di dove si
 *    trovava una persona a una certa ora — su un sito dove le recensioni sono
 *    anonime. Ridisegnare l'immagine su una tela e riesportarla produce un file
 *    nuovo che quei dati non li ha: non vengono "rimossi", semplicemente non
 *    esistono nel file che parte. È il modo più solido di farlo, perché non
 *    dipende da una libreria che conosce tutti i formati di metadati.
 *
 * 3. IL LAVORO NON LO FA IL SERVER. Nessun byte di immagine passa da Vercel:
 *    il browser prepara il file e lo manda direttamente a Supabase. Se la
 *    conversione la facesse il server, dieci persone che caricano insieme
 *    basterebbero a far salire il consumo di processore che ci ha appena messo
 *    in pausa l'account.
 */

/** Lato lungo massimo. Oltre, non si guadagna niente di visibile. */
export const LATO_MASSIMO = 1600;

/** Qualità del webp. 0.82 è il punto dove l'occhio non distingue più. */
export const QUALITA = 0.82;

/** Quante foto per persona su uno stesso stabilimento. Lo impone anche il database. */
export const MASSIMO_PER_BAGNO = 6;

/** Tetto di sicurezza sul file in ingresso, prima di toccarlo: 25 MB. */
export const PESO_MASSIMO_INGRESSO = 25 * 1024 * 1024;

/** Lunghezza massima della didascalia. Uguale al vincolo nel database. */
export const DIDASCALIA_MASSIMA = 140;

export const FORMATI_ACCETTATI = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export type FotoPubblica = {
  id: string;
  percorso: string;
  didascalia: string | null;
  larghezza: number | null;
  altezza: number | null;
};

/**
 * L'indirizzo pubblico di una foto.
 *
 * Il secchio è pubblico, quindi non serve firmare niente: l'indirizzo si
 * compone. Senza firma non c'è una chiamata al server per ogni immagine, che su
 * una griglia di dodici foto sarebbero dodici chiamate.
 */
export function indirizzoFoto(percorso: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/foto/${percorso}`;
}

/**
 * Un percorso casuale in due livelli.
 *
 * NON contiene l'identificativo dell'utente, ed è una scelta precisa: gli
 * indirizzi delle foto sono pubblici, e una cartella chiamata col nome
 * dell'utente permetterebbe a chiunque di raggruppare le foto per autore e
 * capire che due recensioni anonime su bagni diversi sono della stessa persona.
 */
export function percorsoCasuale(): string {
  const pezzo = () => crypto.randomUUID().replace(/-/g, "");
  return `${pezzo()}/${pezzo()}.webp`;
}

export type FotoPreparata = {
  file: Blob;
  larghezza: number;
  altezza: number;
  /** Indirizzo locale per l'anteprima. Va revocato quando non serve più. */
  anteprima: string;
};

/**
 * Prende il file scelto dall'utente e restituisce l'immagine da caricare.
 *
 * Funziona solo nel browser: usa createImageBitmap e una tela.
 */
export async function preparaFoto(file: File): Promise<FotoPreparata> {
  if (file.size > PESO_MASSIMO_INGRESSO) {
    throw new Error("troppo_pesante");
  }

  // I telefoni Apple consegnano HEIC, che i browser non sempre sanno decodificare.
  // Se la decodifica non riesce lo diciamo chiaramente, invece di lasciare un
  // errore incomprensibile: la via d'uscita è condividere la foto, perché la
  // condivisione la converte in JPEG.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("formato_non_leggibile");
  }

  const scala = Math.min(1, LATO_MASSIMO / Math.max(bitmap.width, bitmap.height));
  const larghezza = Math.max(1, Math.round(bitmap.width * scala));
  const altezza = Math.max(1, Math.round(bitmap.height * scala));

  const tela = document.createElement("canvas");
  tela.width = larghezza;
  tela.height = altezza;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("tela_non_disponibile");
  ctx.drawImage(bitmap, 0, 0, larghezza, altezza);
  bitmap.close();

  const blob = await new Promise<Blob | null>((risolvi) =>
    tela.toBlob(risolvi, "image/webp", QUALITA)
  );
  if (!blob) throw new Error("conversione_non_riuscita");

  return {
    file: blob,
    larghezza,
    altezza,
    anteprima: URL.createObjectURL(blob),
  };
}

/** Messaggi d'errore in italiano, dalle chiavi tecniche. */
export function spiegaErroreFoto(codice: string): string {
  if (codice.includes("troppo_pesante")) {
    return "Questa immagine supera i 25 MB. Scegline una più leggera.";
  }
  if (codice.includes("formato_non_leggibile")) {
    return "Il browser non riesce ad aprire questo file. Se arriva da un iPhone, prova a condividerla con te stesso: la condivisione la converte in un formato leggibile.";
  }
  if (codice.includes("troppe_foto")) {
    return `Hai già caricato ${MASSIMO_PER_BAGNO} foto su questo stabilimento.`;
  }
  if (codice.includes("conversione_non_riuscita") || codice.includes("tela_non_disponibile")) {
    return "Non è stato possibile preparare l'immagine su questo dispositivo.";
  }
  return "Caricamento non riuscito. Riprova fra poco.";
}
