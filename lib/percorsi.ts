/**
 * I percorsi lungo la costa: tipi e regole di presentazione in un posto solo.
 */

export const TEMI = ["mare", "cultura", "sapori", "sport", "natura", "famiglie"] as const;
export type Tema = (typeof TEMI)[number];

export type PercorsoInElenco = {
  slug: string;
  titolo: string;
  sottotitolo: string | null;
  tema: string | null;
  localita: string | null;
  durata_ore: number | null;
  periodo: string | null;
  foto_percorso: string | null;
  tappe: number;
  bagni: number;
};

export type RigaPercorso = {
  titolo: string;
  sottotitolo: string | null;
  descrizione: string | null;
  tema: string | null;
  localita: string | null;
  durata_ore: number | null;
  periodo: string | null;
  foto_percorso: string | null;
  ordine: number | null;
  beach_id: string | null;
  tappa_titolo: string | null;
  nota: string | null;
  durata_min: number | null;
  bagno_nome: string | null;
  bagno_localita: string | null;
  bagno_foto: string | null;
};

/**
 * La durata, scritta come la direbbe una persona.
 *
 * «2.5 ore» non lo dice nessuno: si dice «mezza giornata». Il numero esatto
 * serve a chi organizza, non a chi legge, e su un itinerario la precisione
 * al decimo di ora è falsa comunque — dipende da quanto ci si ferma.
 */
export function durataLeggibile(ore: number | null): string | null {
  if (ore == null) return null;
  if (ore <= 2) return "un paio d'ore";
  if (ore <= 4) return "mezza giornata";
  if (ore <= 7) return "una giornata";
  return "più giorni";
}

/**
 * Il numero progressivo della tappa, con lo zero davanti.
 *
 * È il dettaglio che fa sembrare un elenco un itinerario: «01, 02, 03»
 * suggerisce una sequenza da percorrere, «1, 2, 3» una lista della spesa.
 */
export function numeroTappa(n: number): string {
  return String(n).padStart(2, "0");
}
