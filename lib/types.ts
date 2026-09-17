// Tipi condivisi (allineati allo schema SQL)

// Paesi disponibili nel filtro (si estende man mano che si aggiungono cluster)
export const COUNTRIES = [
  { code: "IT", flag: "🇮🇹" },
  { code: "ES", flag: "🇪🇸" },
  { code: "FR", flag: "🇫🇷" },
  { code: "PT", flag: "🇵🇹" },
  { code: "MT", flag: "🇲🇹" },
  { code: "MC", flag: "🇲🇨" },
  { code: "HR", flag: "🇭🇷" },
  { code: "GR", flag: "🇬🇷" },
  { code: "SI", flag: "🇸🇮" },
  { code: "ME", flag: "🇲🇪" },
  { code: "AL", flag: "🇦🇱" },
  { code: "CY", flag: "🇨🇾" },
  { code: "IL", flag: "🇮🇱" },
  { code: "TR", flag: "🇹🇷" },
  { code: "GB", flag: "🇬🇧" },
  { code: "IE", flag: "🇮🇪" },
  { code: "NL", flag: "🇳🇱" },
  { code: "BE", flag: "🇧🇪" },
  { code: "DE", flag: "🇩🇪" },
  { code: "DK", flag: "🇩🇰" },
  { code: "SE", flag: "🇸🇪" },
  { code: "PL", flag: "🇵🇱" },
  { code: "FI", flag: "🇫🇮" },
  { code: "NO", flag: "🇳🇴" },
  { code: "RO", flag: "🇷🇴" },
  { code: "BG", flag: "🇧🇬" },
  { code: "MA", flag: "🇲🇦" },
  { code: "DZ", flag: "🇩🇿" },
  { code: "TN", flag: "🇹🇳" },
  { code: "LY", flag: "🇱🇾" },
  { code: "EG", flag: "🇪🇬" },
  { code: "KE", flag: "🇰🇪" },
  { code: "TZ", flag: "🇹🇿" },
  { code: "MZ", flag: "🇲🇿" },
  { code: "MU", flag: "🇲🇺" },
  { code: "SC", flag: "🇸🇨" },
  { code: "MG", flag: "🇲🇬" },
  { code: "ZA", flag: "🇿🇦" },
  { code: "NA", flag: "🇳🇦" },
  { code: "AO", flag: "🇦🇴" },
  { code: "GH", flag: "🇬🇭" },
  { code: "SN", flag: "🇸🇳" },
  { code: "CV", flag: "🇨🇻" },
  { code: "MX", flag: "🇲🇽" },
  { code: "DO", flag: "🇩🇴" },
  { code: "CU", flag: "🇨🇺" },
  { code: "JM", flag: "🇯🇲" },
  { code: "BS", flag: "🇧🇸" },
  { code: "BB", flag: "🇧🇧" },
  { code: "BR", flag: "🇧🇷" },
  { code: "AR", flag: "🇦🇷" },
  { code: "UY", flag: "🇺🇾" },
  { code: "CL", flag: "🇨🇱" },
  { code: "CO", flag: "🇨🇴" },
  { code: "EC", flag: "🇪🇨" },
  { code: "PE", flag: "🇵🇪" },
  { code: "VE", flag: "🇻🇪" },
  { code: "US", flag: "🇺🇸" },
  { code: "CA", flag: "🇨🇦" },
  { code: "TH", flag: "🇹🇭" },
  { code: "ID", flag: "🇮🇩" },
  { code: "VN", flag: "🇻🇳" },
  { code: "PH", flag: "🇵🇭" },
  { code: "MY", flag: "🇲🇾" },
  { code: "KH", flag: "🇰🇭" },
  { code: "IN", flag: "🇮🇳" },
  { code: "LK", flag: "🇱🇰" },
  { code: "MV", flag: "🇲🇻" },
  { code: "BD", flag: "🇧🇩" },
  { code: "JP", flag: "🇯🇵" },
  { code: "KR", flag: "🇰🇷" },
  { code: "TW", flag: "🇹🇼" },
  { code: "CN", flag: "🇨🇳" },
  { code: "AU", flag: "🇦🇺" },
  { code: "NZ", flag: "🇳🇿" },
  { code: "FJ", flag: "🇫🇯" },
] as const;

// Raggruppamento per continente: l'interfaccia mostra i continenti,
// che si espandono nelle bandiere dei Paesi. Ordine = priorità di lancio.
export const CONTINENTS = [
  {
    key: "europa",
    emoji: "🇪🇺",
    codes: ["IT","ES","FR","PT","MT","MC","HR","GR","SI","ME","AL","GB","IE","NL","BE","DE","DK","SE","PL","FI","NO","RO","BG","CY"],
  },
  {
    key: "medioriente",
    emoji: "🕌",
    codes: ["TR","IL"],
  },
  {
    key: "africa",
    emoji: "🌍",
    codes: ["MA","DZ","TN","LY","EG","KE","TZ","MZ","MU","SC","MG","ZA","NA","AO","GH","SN","CV"],
  },
  {
    key: "americhe",
    emoji: "🌎",
    codes: ["MX","DO","CU","JM","BS","BB","US","CA","BR","AR","UY","CL","CO","EC","PE","VE"],
  },
  {
    key: "asia",
    emoji: "🌏",
    codes: ["TH","ID","VN","PH","MY","KH","IN","LK","MV","BD","JP","KR","TW","CN"],
  },
  {
    key: "oceania",
    emoji: "🏝️",
    codes: ["AU","NZ","FJ"],
  },
] as const;

export type ContinentKey = (typeof CONTINENTS)[number]["key"];

// mappa inversa: code -> continente (per sapere quale pannello aprire)
export const CONTINENT_OF: Record<string, ContinentKey> = Object.fromEntries(
  CONTINENTS.flatMap((cont) => cont.codes.map((code) => [code, cont.key]))
) as Record<string, ContinentKey>;

// lookup bandiera per codice
export const FLAG_OF: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.flag])
);


export const METRICS = [
  { key: "space_privacy",      label: "Spazio & Privacy",      hint: "Distanza tra ombrelloni e privacy" },
  { key: "family_services",    label: "Servizi Famiglie",      hint: "Nursery, giochi, area bimbi" },
  { key: "accessibility",      label: "Accessibilità",         hint: "Passerelle, sedia JOB, servizi dedicati" },
  { key: "seabed_quality",     label: "Fondale & Acqua",       hint: "Qualità del fondale e pulizia dell'acqua" },
  { key: "price_transparency", label: "Trasparenza Prezzi",    hint: "Chiarezza listino e rapporto qualità/prezzo" },
  { key: "sicurezza",          label: "Sicurezza",             hint: "Sorveglianza, salvataggio, manutenzione e pulizia" },
  { key: "atmosfera",          label: "Atmosfera",             hint: "Clima familiare e accoglienza" },
  { key: "eventi_comunita",    label: "Eventi & Comunità",     hint: "Eventi culturali, attività per giovani, iniziative per la comunità" },
  { key: "pulizia_igiene",     label: "Pulizia & Igiene",      hint: "Pulizia di spiaggia, bagni e docce; cura degli spazi" },
  { key: "impianti_sportivi",  label: "Impianti Sportivi",     hint: "Campi e attrezzature: beach volley, ping pong, calcetto, biliardino" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];

// ---- Vertical PORTI: criteri nautici/demaniali (per beaches.tipo = 'porto') ----
// Un porto non è una spiaggia: ha 8 criteri propri. Le colonne sono separate su
// `reviews`; una recensione compila solo il set del suo tipo (le altre restano
// NULL) e la present-mean nelle viste isola i due mondi da sola.
export const PORT_METRICS = [
  { key: "ormeggio",            label: "Ormeggio & Posti barca", hint: "Disponibilità posti, facilità e sicurezza dell'ormeggio, assistenza" },
  { key: "spazio_manovra",      label: "Spazio & Manovra",       hint: "Distanza tra le barche e ampiezza degli specchi di manovra" },
  { key: "canoni",              label: "Canoni & Trasparenza",   hint: "Chiarezza e proporzionalità dei canoni, assegnazione trasparente" },
  { key: "servizi_tecnici",     label: "Servizi tecnici",        hint: "Acqua e corrente in banchina, carburante, scivolo/gru, officina" },
  { key: "servizi_terra",       label: "Servizi a terra",        hint: "Servizi igienici, docce, parcheggio, wifi, ristorazione, vigilanza" },
  { key: "sicurezza_ambiente",  label: "Sicurezza & Ambiente",   hint: "Antincendio, sorveglianza, raccolta rifiuti e acque di sentina" },
  { key: "accessibilita_porto", label: "Accessibilità",          hint: "Pontili e servizi accessibili alle persone con disabilità" },
  { key: "governance",          label: "Governance & Comunità",  hint: "Trasparenza di amministrazione e assemblee, eventi, apertura alla città" },
] as const;

export type PortMetricKey = (typeof PORT_METRICS)[number]["key"];
export const PORT_METRIC_KEYS: PortMetricKey[] = PORT_METRICS.map((m) => m.key);

export const isPorto = (tipo: string | null | undefined): boolean => tipo === "porto";

// set di criteri per tipo di struttura (spiaggia/stabilimento → 10 balneari; porto → 8 nautici)
type MetricDef = { key: string; label: string; hint: string };
export const metricsForTipo = (tipo: string | null | undefined): ReadonlyArray<MetricDef> =>
  isPorto(tipo) ? PORT_METRICS : METRICS;
export const coreKeysForTipo = (tipo: string | null | undefined): string[] =>
  isPorto(tipo) ? (PORT_METRIC_KEYS as string[]) : (CORE_METRIC_KEYS as string[]);

// I 10 criteri di qualità: tutti obbligatori (scelta cosciente).
// - Pet Friendly tolto dai voti (ora fatto "accesso_cani"): non è un asse di
//   qualità e "pet friendly 3/5" confondeva.
// - "Rispetto Regole" sostituito da "Eventi & Comunità": le recensioni storiche
//   NON si perdono, il voto di rispetto_regole è stato ereditato da eventi_comunita
//   (backfill in migrazione), così l'overall dei vecchi resta invariato.
// - Nuovi: pulizia_igiene, impianti_sportivi (le recensioni vecchie non li hanno →
//   la media usa i criteri effettivamente votati, present-mean).
export const CORE_METRIC_KEYS: MetricKey[] = [
  "space_privacy", "family_services", "accessibility",
  "seabed_quality", "price_transparency", "sicurezza", "atmosfera",
  "eventi_comunita", "pulizia_igiene", "impianti_sportivi",
];
export const OPTIONAL_METRIC_KEYS: MetricKey[] = [];

// Sotto-punti (Fase 2): per ogni criterio, ~5 domande FACOLTATIVE in ottica
// Bolkestein/demanio. Non sono voti 1..5: sono dichiarazioni a 4 stati
//   sì (premia) · no (penalizza) · non so (neutro) · non applicabile (escluso).
// Salvate nella recensione in un unico campo JSONB `dettagli` { <subKey>: stato }.
// Aggregate sulla scheda come percentuali. Etichette nel namespace "subpoints".
// Config-driven: aggiungere/togliere un punto = una riga qui + la sua etichetta.
export const SUBPOINTS: Record<MetricKey, string[]> = {
  space_privacy:      ["sp_distanza", "sp_camminamenti", "sp_postazione", "sp_aree_comuni", "sp_densita"],
  family_services:    ["sg_ristorazione", "sg_famiglie", "sg_noleggio", "sg_personale", "sg_accessori"],
  accessibility:      ["ac_passerelle", "ac_job", "ac_servizi", "ac_percorso", "ac_personale"],
  seabed_quality:     ["fa_acqua", "fa_fondale", "fa_balneazione", "fa_scarichi", "fa_ambiente"],
  price_transparency: ["pr_listino", "pr_chiari", "pr_giornaliero", "pr_agevolate", "pr_qualita_prezzo"],
  sicurezza:          ["si_bagnino", "si_postazione", "si_bandiere", "si_soccorso", "si_manutenzione"],
  atmosfera:          ["at_accoglienza", "at_clima", "at_decoro", "at_rumore", "at_inclusione"],
  eventi_comunita:    ["ev_culturali", "ev_giovani", "ev_residenti", "ev_collaborazioni", "ev_fuori_stagione"],
  pulizia_igiene:     ["pu_bagni", "pu_arenile", "pu_differenziata", "pu_cabine", "pu_circostante"],
  impianti_sportivi:  ["is_beachvolley", "is_pingpong", "is_calcetto", "is_biliardino", "is_noleggio"],
};

// tutte le chiavi dei sotto-punti in ordine di criterio
export const SUBPOINT_KEYS: string[] = Object.values(SUBPOINTS).flat();

// sotto-punti che riflettono un OBBLIGO di legge (⚖️): pesano il doppio nel
// contributo al punteggio. Deve restare allineato alla funzione SQL dettagli_bonus.
export const OBLIGATORY_SUBPOINTS: string[] = [
  "sp_densita",
  "ac_passerelle", "ac_job", "ac_servizi",
  "fa_balneazione",
  "pr_listino",
  "si_bagnino", "si_postazione", "si_bandiere",
];

// stati ammessi salvati (il "non so" = assente/omesso, quindi neutro)
export const SUBPOINT_STATES = ["si", "no", "na"] as const;
export type SubpointState = (typeof SUBPOINT_STATES)[number];

// Soglie minime di recensioni perché un lido entri in classifica ed esponga il badge di rango.
// Sotto soglia: nessun rango mostrato ("classifica in costruzione"), per non
// eleggere un "migliore" sulla base di pochissimi dati.
export const RANK_MIN = { comune: 10, regione: 20, nazionale: 30 } as const;

// Fatti oggettivi (attributi, non voti): raccolti nella recensione, aggregati come percentuali.
export const FACTS = [
  {
    key: "accesso_mare",
    label: "Accesso al mare",
    hint: "Per legge la battigia e l'accesso al mare devono restare liberi",
    options: [
      { value: "libero",    label: "Libero" },
      { value: "limitato",  label: "Limitato" },
      { value: "bloccato",  label: "Bloccato / tornelli" },
    ],
  },
  {
    key: "docce",
    label: "Docce",
    hint: "",
    options: [
      { value: "gratuite",     label: "Gratuite" },
      { value: "a_pagamento",  label: "A pagamento" },
      { value: "assenti",      label: "Assenti" },
    ],
  },
  {
    key: "acqua_calda",
    label: "Acqua calda (doccia)",
    hint: "",
    options: [
      { value: "inclusa",      label: "Inclusa" },
      { value: "a_pagamento",  label: "A pagamento" },
      { value: "assente",      label: "Assente" },
    ],
  },
  {
    // Ex criterio a punteggio "Pet Friendly", ora fatto segnalato: informazione
    // utile a chi ha un cane, ma non un voto di qualità.
    key: "accesso_cani",
    label: "Accesso cani",
    hint: "",
    options: [
      { value: "si",            label: "Sì, ammessi" },
      { value: "area_dedicata", label: "Area cani dedicata" },
      { value: "fascia_oraria", label: "Solo in certi orari" },
      { value: "no",            label: "Non ammessi" },
    ],
  },
] as const;

export type FactKey = (typeof FACTS)[number]["key"];

// Fatti sì/no
export const BOOL_FACTS = [
  { key: "battigia_libera", label: "Battigia (5 m) libera e transitabile" },
  { key: "chip_richiesto",  label: "Serve chip / cauzione per entrare" },
] as const;

export type BoolFactKey = (typeof BOOL_FACTS)[number]["key"];

// Fatti "civici" sull'uso del demanio a beneficio della collettività (ottica
// Bolkestein): osservabili da un bagnante, NON sono voti e NON entrano nei
// punteggi/classifiche. Aggregati sulla scheda come percentuali. Etichette dal
// namespace "boolFacts" (it/en).
export const CIVIC_FACTS = [
  // NB: "eventi_giovani" è stato promosso a criterio a punteggio ("Eventi &
  // Comunità"), quindi non è più un semplice fatto sì/no qui.
  { key: "fuori_stagione",              label: "Aperto o attivo anche fuori stagione" },
  { key: "ingresso_giornaliero",        label: "Ingresso a giornata senza abbonamento stagionale" },
  { key: "tariffe_agevolate",           label: "Tariffe agevolate per residenti, famiglie o disabili" },
  { key: "prezzi_esposti",              label: "Listino prezzi esposto e visibile" },
  { key: "estremi_concessione_esposti", label: "Estremi della concessione demaniale esposti al pubblico" },
] as const;

export type CivicFactKey = (typeof CIVIC_FACTS)[number]["key"];

// Motivi per segnalare una RECENSIONE come contenuto illecito (DSA art. 16).
// Le etichette visibili vengono tradotte dal namespace "noticeTipi" (it/en).
export const NOTICE_TIPI = [
  { value: "falsa",                   label: "Recensione falsa o non genuina" },
  { value: "diffamazione",            label: "Diffamatoria / calunniosa" },
  { value: "dati_personali",          label: "Contiene dati personali di terzi" },
  { value: "odio",                    label: "Incitamento all'odio / discriminazione" },
  { value: "osceno",                  label: "Contenuto osceno o illecito" },
  { value: "spam",                    label: "Spam / pubblicità" },
  { value: "proprieta_intellettuale", label: "Violazione di proprietà intellettuale" },
  { value: "altro",                   label: "Altro motivo di illiceità" },
] as const;

export type NoticeTipo = (typeof NOTICE_TIPI)[number]["value"];

// Tipi di segnalazione illeciti (coda privata per l'ente)
export const SEGNALAZIONE_TIPI = [
  { value: "pagamento_minori",    label: "Fatti pagare a minori / bambini" },
  { value: "lettini_battigia",    label: "Lettini/ombrelloni sulla battigia (fascia dei 5 m)" },
  { value: "accesso_bloccato",    label: "Accesso al mare bloccato / tornelli senza varco libero" },
  { value: "no_battigia_libera",  label: "Battigia libera non garantita" },
  { value: "prezzi_non_esposti",  label: "Prezzi non esposti / non trasparenti" },
  { value: "occupazione_abusiva", label: "Occupazione oltre i limiti della concessione" },
  { value: "altro",               label: "Altro" },
] as const;

export interface Beach {
  id: string;
  nome: string;
  localita: string;
  regione: string;
  distanza_ombrelloni_metri: number | null;
  created_at: string;
}

// riga della view public.beach_scores
export interface BeachScore extends Beach {
  id_concessione: string | null;
  tipo: string | null;
  paese: string | null;
  reviews_count: number;
  avg_space_privacy: number | null;
  avg_family_services: number | null;
  avg_accessibility: number | null;
  avg_seabed_quality: number | null;
  avg_price_transparency: number | null;
  avg_sicurezza: number | null;
  avg_atmosfera: number | null;
  avg_eventi_comunita: number | null;
  avg_pulizia_igiene: number | null;
  avg_impianti_sportivi: number | null;
  // criteri porto (null per i bagni)
  avg_ormeggio: number | null;
  avg_spazio_manovra: number | null;
  avg_canoni: number | null;
  avg_servizi_tecnici: number | null;
  avg_servizi_terra: number | null;
  avg_sicurezza_ambiente: number | null;
  avg_accessibilita_porto: number | null;
  avg_governance: number | null;
  avg_overall: number | null;
}

export interface Review {
  id: string;
  beach_id: string;
  user_id: string | null;
  commento: string | null;
  space_privacy: number;
  family_services: number;
  accessibility: number;
  seabed_quality: number;
  pet_friendly: number | null; // storico: non più raccolto né conteggiato
  price_transparency: number;
  sicurezza: number | null;
  rispetto_regole: number | null; // storico: non più raccolto (ereditato da eventi_comunita)
  atmosfera: number | null;
  eventi_comunita: number | null;
  pulizia_igiene: number | null;
  impianti_sportivi: number | null;
  // criteri porto (null per i bagni)
  ormeggio: number | null;
  spazio_manovra: number | null;
  canoni: number | null;
  servizi_tecnici: number | null;
  servizi_terra: number | null;
  sicurezza_ambiente: number | null;
  accessibilita_porto: number | null;
  governance: number | null;
  accesso_mare: string | null;
  docce: string | null;
  acqua_calda: string | null;
  accesso_cani: string | null;
  dettagli: Record<string, string> | null; // sotto-punti { subKey: "si"|"no"|"na" }
  battigia_libera: boolean | null;
  chip_richiesto: boolean | null;
  eventi_giovani: boolean | null;
  fuori_stagione: boolean | null;
  ingresso_giornaliero: boolean | null;
  tariffe_agevolate: boolean | null;
  prezzi_esposti: boolean | null;
  estremi_concessione_esposti: boolean | null;
  verified: boolean;
  segnalata: number;
  peso: number;                 // 0..1 — peso della review nel punteggio (anti-frode)
  stato: "pubblicata" | "ridotta" | "shadow" | "rifiutata";
  flags_count: number;
  created_at: string;
}

export type NewReviewScores = Record<MetricKey, number>;

// riga della view public.beach_rankings (classifiche bayesiane)
export interface BeachRanking {
  id: string;
  nome: string;
  localita: string;
  regione: string;
  tipo: string | null;
  paese: string | null;
  reviews_count: number;
  avg_overall: number | null;
  weighted_score: number;
  rank_comune: number;
  rank_regione: number;
  rank_nazionale: number;
}
