/**
 * Le specializzazioni scelte dal gestore: forma e regole in un posto solo.
 *
 * Una specializzazione è la direzione che un gestore vuole dare al suo bagno.
 * Ha sempre la stessa forma qualunque sia l'ambito — un interesse, un
 * racconto, una frequenza — per questo è una tabella con `ambito` e non una
 * collezione di colonne "musica_*", "sport_*". La prima è la musica.
 */

export const AMBITI = ["musica", "sport", "cucina", "cultura"] as const;
export type Ambito = (typeof AMBITI)[number];

export const STATI = ["attiva", "interessato", "non_ora"] as const;
export const FREQUENZE = [
  "occasionale",
  "mensile",
  "settimanale",
  "piu_volte_settimana",
] as const;

export type Specializzazione = {
  ambito: string;
  stato: string;
  racconto: string | null;
  frequenza: string | null;
};

export const COLONNE_SPECIALIZZAZIONE = "ambito,stato,racconto,frequenza";

/**
 * Quale etichetta mostrare al pubblico.
 *
 * `confermata` arriva dal database e vale solo se sul calendario c'è almeno
 * un evento pubblicato di quell'ambito. Lo stato dichiarato dal gestore NON
 * produce mai l'etichetta forte, neanche quando dice «li organizziamo già»:
 * se bastasse dirlo, le due etichette sarebbero la stessa cosa con due nomi,
 * e la seconda non significherebbe più niente.
 *
 * - "confermata" → il bagno fa davvero quella cosa, e si vede sul sito
 * - "aperta"     → dichiara una disponibilità, e la si presenta come tale
 * - null         → niente da mostrare
 */
export function etichetta(
  spec: Specializzazione | null | undefined,
  confermata: boolean
): "confermata" | "aperta" | null {
  if (!spec) return null;
  if (spec.stato === "non_ora") return null;
  return confermata ? "confermata" : "aperta";
}
