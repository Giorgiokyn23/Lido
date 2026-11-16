/**
 * Il profilo dello stabilimento: forma, colonne e regole, in un posto solo.
 *
 * Con cinquantadue campi, tenere la lista delle colonne scritta a mano in tre
 * pagine diverse è la ricetta sicura per ritrovarsi con una scheda che mostra
 * un dato e un modulo che non lo salva. Qui c'è la lista, qui c'è il tipo, e
 * chi legge il profilo importa questo.
 *
 * Non si usa select("*") di proposito: così, se un giorno aggiungiamo al
 * profilo una colonna che non va mostrata, non finisce in pagina per inerzia.
 */

export type Profilo = {
  // presentazione
  descrizione: string | null;
  orari: string | null;
  telefono: string | null;
  email_pubblica: string | null;
  sito: string | null;
  link_prenotazione: string | null;
  instagram: string | null;
  whatsapp: string | null;
  // spiaggia e capienza
  ombrelloni_totali: number | null;
  tipo_fondo: string | null;
  spiaggia_libera_adiacente: boolean | null;
  piscina: boolean | null;
  // prezzi
  prezzo_ombrellone_bassa: number | null;
  prezzo_ombrellone_alta: number | null;
  prezzo_lettino: number | null;
  prezzo_ingresso: number | null;
  prezzo_stagionale_da: number | null;
  prezzi_aggiornati_il: string | null;
  // stagione
  mese_apertura: number | null;
  mese_chiusura: number | null;
  aperto_tutto_anno: boolean | null;
  // servizi
  bar: boolean | null;
  ristorante: boolean | null;
  docce: boolean | null;
  cabine: boolean | null;
  wifi: boolean | null;
  parcheggio: string | null;
  parcheggio_posti: number | null;
  noleggio_attrezzature: boolean | null;
  campi_sportivi: boolean | null;
  animazione: boolean | null;
  area_bimbi: boolean | null;
  menu_bambini: boolean | null;
  pagamenti_carte: boolean | null;
  ombra_garantita: boolean | null;
  lingue: string[] | null;
  // sicurezza
  bagnino: boolean | null;
  bagnino_orario: string | null;
  defibrillatore: boolean | null;
  // gruppi
  gruppi_max: number | null;
  gruppi_preavviso_giorni: number | null;
  pranzo_gruppi: string | null;
  discesa_pullman: string | null;
  // accessibilità
  accesso_senza_scalini: boolean | null;
  passerella_fino_al_mare: boolean | null;
  sedia_mare: boolean | null;
  bagno_accessibile: boolean | null;
  // eventi privati
  eventi_privati: boolean | null;
  eventi_capienza: number | null;
  musica_serale: boolean | null;
  // sostenibilità
  raccolta_differenziata: boolean | null;
  plastic_free: boolean | null;
  fontanella_acqua: boolean | null;
  // capienza coperta, eventi, gruppi, sport, destagionalizzazione (0082)
  posti_ristorante: number | null;
  tipi_evento: string[] | null;
  tipi_gruppi: string[] | null;
  sport: string[] | null;
  tornei_organizzati: boolean | null;
  mesi_attivita: number[] | null;
  destagionalizzazione: string | null;
};

/** Le colonne da chiedere a Supabase. Derivate dal tipo: non possono divergere. */
export const COLONNE_PROFILO = [
  "descrizione",
  "orari",
  "telefono",
  "email_pubblica",
  "sito",
  "link_prenotazione",
  "instagram",
  "whatsapp",
  "ombrelloni_totali",
  "tipo_fondo",
  "spiaggia_libera_adiacente",
  "piscina",
  "prezzo_ombrellone_bassa",
  "prezzo_ombrellone_alta",
  "prezzo_lettino",
  "prezzo_ingresso",
  "prezzo_stagionale_da",
  "prezzi_aggiornati_il",
  "mese_apertura",
  "mese_chiusura",
  "aperto_tutto_anno",
  "bar",
  "ristorante",
  "docce",
  "cabine",
  "wifi",
  "parcheggio",
  "parcheggio_posti",
  "noleggio_attrezzature",
  "campi_sportivi",
  "animazione",
  "area_bimbi",
  "menu_bambini",
  "pagamenti_carte",
  "ombra_garantita",
  "lingue",
  "bagnino",
  "bagnino_orario",
  "defibrillatore",
  "gruppi_max",
  "gruppi_preavviso_giorni",
  "pranzo_gruppi",
  "discesa_pullman",
  "accesso_senza_scalini",
  "passerella_fino_al_mare",
  "sedia_mare",
  "bagno_accessibile",
  "eventi_privati",
  "eventi_capienza",
  "musica_serale",
  "raccolta_differenziata",
  "plastic_free",
  "fontanella_acqua",
  "posti_ristorante",
  "tipi_evento",
  "tipi_gruppi",
  "sport",
  "tornei_organizzati",
  "mesi_attivita",
  "destagionalizzazione",
].join(",");

export const TIPI_FONDO = ["sabbia", "ghiaia", "sassi", "scogli", "misto"] as const;
export const PARCHEGGI = ["no", "pubblico_vicino", "privato_gratuito", "privato_pagamento"] as const;
export const PRANZI = ["sempre", "su_prenotazione", "no"] as const;
export const PULLMAN = ["al_cancello", "nei_paraggi", "no"] as const;
export const LINGUE = ["en", "fr", "de", "es", "ru", "nl"] as const;

export const TIPI_EVENTO = [
  "dj_set", "musica_dal_vivo", "degustazioni", "cene_a_tema",
  "matrimoni", "eventi_aziendali", "cinema", "tornei_sportivi",
  "corsi_sport", "feste_private", "mercatini", "convegni",
] as const;

export const TIPI_GRUPPI = [
  "croceristi", "tour_privati", "scolaresche", "centri_estivi",
  "gruppi_sportivi", "terza_eta", "aziende", "associazioni",
] as const;

export const SPORT = [
  "beach_volley", "beach_tennis", "racchettoni", "sup", "canoa",
  "vela", "windsurf", "kitesurf", "nuoto", "snorkeling",
  "calcetto", "bocce", "padel", "fitness",
] as const;

export const MESI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Fuori stagione: da ottobre a marzo.
 * La stessa definizione vive in attivo_fuori_stagione() nella migrazione
 * 0082, che è l'autorità per i conteggi. Qui serve solo a disegnare la
 * pagina: se cambia il periodo, va cambiato in tutti e due i posti.
 */
export const FUORI_STAGIONE = [10, 11, 12, 1, 2, 3];
export const attivoFuoriStagione = (mesi: number[] | null | undefined): boolean =>
  !!mesi && mesi.some((m) => FUORI_STAGIONE.includes(m));

/** I campi liberi del profilo, con la loro lunghezza massima. */
export const TESTI_PROFILO: Record<string, number> = {
  descrizione: 2000,
  orari: 500,
  telefono: 40,
  email_pubblica: 200,
  instagram: 100,
  whatsapp: 40,
  bagnino_orario: 120,
};

export const vero = (v: unknown): boolean => v === true;
const dichiarato = (v: unknown): boolean => v !== null && v !== undefined;
const pieno = (v: string | null | undefined): boolean => !!v && v.trim().length > 0;

export const gruppiDichiarati = (p: Profilo | null): boolean =>
  dichiarato(p?.gruppi_max) || dichiarato(p?.pranzo_gruppi) || dichiarato(p?.discesa_pullman);

export const accessibilitaDichiarata = (p: Profilo | null): boolean =>
  dichiarato(p?.accesso_senza_scalini) ||
  dichiarato(p?.passerella_fino_al_mare) ||
  dichiarato(p?.sedia_mare) ||
  dichiarato(p?.bagno_accessibile);

/**
 * Le voci del profilo minimo che mancano ancora.
 *
 * ATTENZIONE: queste dieci regole esistono anche nel database, dentro
 * profilo_minimo_completo() e profilo_minimo_mancanti() della migrazione 0081.
 * Il database è l'autorità — è lui che permette o nega la pubblicazione di un
 * evento. Questa copia serve solo a DIRLO al gestore prima che ci provi. Se
 * cambi le regole, cambiale in entrambi i posti.
 */
export function mancantiMinimo(p: Profilo | null): string[] {
  const mancano: string[] = [];
  if (!pieno(p?.descrizione)) mancano.push("descrizione");
  if (!pieno(p?.orari)) mancano.push("orari");
  if (!pieno(p?.telefono) && !pieno(p?.email_pubblica)) mancano.push("contatto");
  if (!dichiarato(p?.ombrelloni_totali)) mancano.push("ombrelloni");
  if (!dichiarato(p?.tipo_fondo)) mancano.push("tipo_fondo");
  if (!dichiarato(p?.prezzo_ombrellone_alta)) mancano.push("prezzo");
  if (!dichiarato(p?.bagnino)) mancano.push("bagnino");
  if (!dichiarato(p?.parcheggio)) mancano.push("parcheggio");
  if (!dichiarato(p?.gruppi_max)) mancano.push("gruppi");
  if (!accessibilitaDichiarata(p)) mancano.push("accessibilita");
  return mancano;
}

/**
 * Quanto è completo il profilo, per gruppi di voci.
 *
 * Si contano NOVE gruppi e non cinquantadue caselle. Se ogni casella valesse
 * un punto, un gestore che ha scritto descrizione, orari e contatti si
 * vedrebbe al 6% e chiuderebbe la pagina: la barra deve essere un invito,
 * non una condanna. Un gruppo è "fatto" quando almeno una sua voce è stata
 * dichiarata, e un «no» dichiarato vale come un «sì»: è il silenzio che non conta.
 */
export function completezza(p: Profilo | null): { fatti: number; totale: number; pct: number } {
  const gruppi: boolean[] = [
    pieno(p?.descrizione),
    pieno(p?.orari),
    pieno(p?.telefono) || pieno(p?.email_pubblica) || pieno(p?.whatsapp),
    dichiarato(p?.ombrelloni_totali) || dichiarato(p?.tipo_fondo) || dichiarato(p?.piscina),
    dichiarato(p?.prezzo_ombrellone_alta) ||
      dichiarato(p?.prezzo_ombrellone_bassa) ||
      dichiarato(p?.prezzo_ingresso),
    dichiarato(p?.bar) ||
      dichiarato(p?.ristorante) ||
      dichiarato(p?.docce) ||
      dichiarato(p?.cabine) ||
      dichiarato(p?.wifi) ||
      dichiarato(p?.parcheggio) ||
      dichiarato(p?.area_bimbi),
    dichiarato(p?.bagnino) || dichiarato(p?.defibrillatore),
    gruppiDichiarati(p),
    accessibilitaDichiarata(p),
    (p?.tipi_evento?.length ?? 0) > 0 ||
      (p?.sport?.length ?? 0) > 0 ||
      (p?.mesi_attivita?.length ?? 0) > 0 ||
      pieno(p?.destagionalizzazione),
  ];
  const fatti = gruppi.filter(Boolean).length;
  return { fatti, totale: gruppi.length, pct: Math.round((fatti / gruppi.length) * 100) };
}
