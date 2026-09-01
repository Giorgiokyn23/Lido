import type { MetadataRoute } from "next";

// Manifest PWA (App Router): servito automaticamente su /manifest.webmanifest
// e collegato in <head> da Next. Permette "Aggiungi a schermata Home" e,
// insieme al service worker (next-pwa), l'installazione come app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LidoRank — recensioni di lidi e beach club",
    short_name: "LidoRank",
    description:
      "Recensioni strutturate e trasparenti di lidi, beach club e porti nel mondo su nove criteri.",
    lang: "it",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#166a92",
    categories: ["travel", "lifestyle", "navigation"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
