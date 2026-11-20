/**
 * Come si cerca un bagno.
 *
 * IL DIFETTO CHE C'ERA. La ricerca confrontava l'INTERA frase digitata con il
 * nome dello stabilimento: `nome ilike '%Bagni Lido Livorno%'`. Ma nessun
 * bagno si chiama «Bagni Lido Livorno» — si chiama «Bagni Lido» e sta a
 * Livorno. Chi scriveva nome e città insieme, cioè chiunque, otteneva zero
 * risultati. Non era una ricerca approssimativa: era una ricerca che
 * funzionava solo se indovinavi il nome esatto e non aggiungevi altro.
 *
 * COME FUNZIONA ADESSO. La frase si spezza in parole, e una scheda è buona
 * se OGNI parola compare da qualche parte — nel nome, nella località o nella
 * regione. «Bagni Lido Livorno» diventa: «bagni» e «lido» nel nome, «livorno»
 * nella località. Più parole scrivi, più stringi il campo invece di azzerarlo.
 */

/**
 * Pulisce e spezza quello che ha scritto la persona.
 *
 * La pulizia non è cosmetica: questi pezzi finiscono dentro la sintassi dei
 * filtri di PostgREST, dove la virgola separa le condizioni e le parentesi le
 * raggruppano. Una virgola lasciata passare non romperebbe il database, ma
 * spezzerebbe il filtro in due pezzi senza senso e la ricerca restituirebbe
 * qualcosa di casuale. Per lo stesso motivo spariscono % e *, che in `ilike`
 * sono caratteri jolly: «%%%» non deve trasformarsi in «mostrami tutto».
 */
export function tokenizza(frase: string): string[] {
  return frase
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'’-]+/gu, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
    .slice(0, 6);
}

/** Le colonne in cui vale la pena cercare una parola. */
const CAMPI = ["nome", "localita", "regione"];

/** Il filtro PostgREST per una parola: «sta in uno qualunque di questi campi». */
export function filtroToken(token: string): string {
  return CAMPI.map((c) => `${c}.ilike.%${token}%`).join(",");
}
