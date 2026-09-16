// Configurazione delle pagine-città (landing locali per gli sprint di raccolta
// recensioni). Aggiungere una città = una riga qui. Le stringhe visibili sono
// tradotte (namespace "citta") e usano {city}; qui stanno solo nome e le
// località (frazioni comprese) da filtrare.
//
// NB: nessun riferimento a patrocini finché non concessi per iscritto.

export type CittaConfig = {
  nome: string;
  localita: string[]; // località/frazioni balneari da includere
};

export const CITTA: Record<string, CittaConfig> = {
  livorno: {
    nome: "Livorno",
    localita: ["Livorno", "Antignano", "Ardenza", "Quercianella"],
  },
};

export const cittaSlugs = (): string[] => Object.keys(CITTA);
