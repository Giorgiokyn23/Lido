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
] as const;


export const METRICS = [
  { key: "space_privacy",      label: "Spazio & Privacy",      hint: "Distanza tra ombrelloni e privacy" },
  { key: "family_services",    label: "Servizi Famiglie",      hint: "Nursery, giochi, area bimbi" },
  { key: "accessibility",      label: "Accessibilità",         hint: "Passerelle, sedia JOB, servizi dedicati" },
  { key: "seabed_quality",     label: "Fondale & Acqua",       hint: "Qualità del fondale e pulizia dell'acqua" },
  { key: "pet_friendly",       label: "Pet Friendly",          hint: "Servizi per cani e animali" },
  { key: "price_transparency", label: "Trasparenza Prezzi",    hint: "Chiarezza listino e rapporto qualità/prezzo" },
  { key: "sicurezza",          label: "Sicurezza",             hint: "Sorveglianza, salvataggio, manutenzione e pulizia" },
  { key: "rispetto_regole",    label: "Rispetto Regole",       hint: "Distanze ombrelloni, battigia libera, norme demaniali" },
  { key: "atmosfera",          label: "Atmosfera",             hint: "Clima familiare e accoglienza" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];

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
] as const;

export type FactKey = (typeof FACTS)[number]["key"];

// Fatti sì/no
export const BOOL_FACTS = [
  { key: "battigia_libera", label: "Battigia (5 m) libera e transitabile" },
  { key: "chip_richiesto",  label: "Serve chip / cauzione per entrare" },
] as const;

export type BoolFactKey = (typeof BOOL_FACTS)[number]["key"];

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
  avg_pet_friendly: number | null;
  avg_price_transparency: number | null;
  avg_sicurezza: number | null;
  avg_rispetto_regole: number | null;
  avg_atmosfera: number | null;
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
  pet_friendly: number;
  price_transparency: number;
  sicurezza: number | null;
  rispetto_regole: number | null;
  atmosfera: number | null;
  accesso_mare: string | null;
  docce: string | null;
  acqua_calda: string | null;
  battigia_libera: boolean | null;
  chip_richiesto: boolean | null;
  verified: boolean;
  segnalata: number;
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
