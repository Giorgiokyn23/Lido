import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";

// Crawler che raccolgono contenuti per ADDESTRARE modelli.
// Bloccarli NON influisce sul posizionamento nei motori di ricerca: sono agenti
// distinti da Googlebot e Bingbot, che restano pienamente ammessi qui sotto.
// In particolare Google-Extended riguarda solo l'uso dei contenuti per l'AI di
// Google, non l'indicizzazione né il ranking della Ricerca.
const CRAWLER_ADDESTRAMENTO = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "FacebookBot",
  "Diffbot",
  "Omgilibot",
  "omgili",
  "ImagesiftBot",
  "Timpibot",
  "Webzio-Extended",
  "Scrapy",
];

// Aree private o senza valore per i motori: non indicizzarle.
const AREE_PRIVATE = ["/area-gestore", "/admin", "/login", "/auth/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Motori di ricerca e tutti gli altri: catalogo aperto, aree private no.
      { userAgent: "*", allow: "/", disallow: AREE_PRIVATE },
      // Raccolta per addestramento: no.
      { userAgent: CRAWLER_ADDESTRAMENTO, disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
