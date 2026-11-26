import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { cittaSlugs } from "@/lib/citta";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";

export const revalidate = 86400; // rigenera la sitemap una volta al giorno

/**
 * LA SITEMAP NON ELENCA PIÙ TUTTE LE SCHEDE, e questa è la correzione più
 * importante fatta sul sito dal lato dei motori di ricerca.
 *
 * COSA ERA SUCCESSO. La versione precedente mandava a Google fino a
 * quarantanovemila indirizzi: in pratica tutte le schede, comprese le
 * ventisettemila senza una sola recensione. Google ha risposto nel modo in
 * cui risponde sempre in questi casi — «rilevata, ma attualmente non
 * indicizzata» su 27.105 pagine, e quattro pagine indicizzate in tutto.
 *
 * NON È UN PROBLEMA TECNICO, è una risposta a un giudizio. Google non ha
 * sbagliato a leggerci: una pagina con un nome, una località e nessun
 * contenuto non merita di stare in un indice, e chiedergli di indicizzarne
 * ventisettemila così non lascia il resto com'era — insegna che questo
 * dominio produce pagine vuote, e quel giudizio ricade anche sulle pagine
 * buone. È il motivo per cui le classifiche, che sarebbero ottimo materiale,
 * non si posizionano.
 *
 * LA REGOLA ORA: entra in sitemap solo ciò che ha qualcosa da dire —
 * almeno una recensione, oppure una scheda rivendicata dal gestore. Le altre
 * restano raggiungibili e collegate (si naviga, si cercano dentro al sito),
 * semplicemente non le proponiamo a Google finché sono vuote. Appena una
 * riceve la prima recensione, rientra da sola al giro successivo.
 *
 * Il numero scende da circa trentamila a qualche centinaio, ed è giusto così:
 * meglio trecento pagine indicizzate che trentamila ignorate.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  const pagine: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/classifiche`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/eventi`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/percorsi`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/per-i-gestori`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/metodologia`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/chi-siamo`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/linee-guida`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/moderazione`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/contatti`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Le pagine città sono aggregazioni con dentro contenuto vero: sono fra le
  // poche che hanno davvero una possibilità di posizionarsi.
  for (const slug of cittaSlugs()) {
    pagine.push({
      url: `${base}/citta/${slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // I percorsi: pochi, redazionali, scritti a mano. Esattamente il tipo di
  // pagina che un motore di ricerca vuole.
  const { data: percorsi } = await supabase.rpc("percorsi_pubblici", { _localita: null });
  for (const p of (percorsi ?? []) as { slug: string }[]) {
    pagine.push({
      url: `${base}/percorsi/${p.slug}`,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Le schede con almeno una recensione.
  const PAGINA = 1000;
  const schede = new Set<string>();
  for (let offset = 0; offset < 20000; offset += PAGINA) {
    const { data, error } = await supabase
      .from("beach_scores")
      .select("id")
      .gt("reviews_count", 0)
      .range(offset, offset + PAGINA - 1);
    if (error || !data || data.length === 0) break;
    for (const b of data as { id: string }[]) schede.add(b.id);
    if (data.length < PAGINA) break;
  }

  // E quelle rivendicate da un gestore: anche senza recensioni hanno un
  // profilo compilato, cioè contenuto scritto da qualcuno.
  for (let offset = 0; offset < 20000; offset += PAGINA) {
    const { data, error } = await supabase
      .from("beaches")
      .select("id")
      .eq("profile_status", "verificato")
      .range(offset, offset + PAGINA - 1);
    if (error || !data || data.length === 0) break;
    for (const b of data as { id: string }[]) schede.add(b.id);
    if (data.length < PAGINA) break;
  }

  for (const id of schede) {
    pagine.push({
      url: `${base}/lido/${id}`,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return pagine;
}
