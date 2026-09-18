import { ImageResponse } from "next/og";

// OG di default per la home e le pagine senza un'immagine propria.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LidoRank";

const SEA = { 500: "#1f83ae", 600: "#166a92", 900: "#173e53" };

export default function OgHome({ params }: { params: { locale: string } }) {
  const en = params.locale === "en";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: SEA[600], color: "#fff", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 64 }}>🌊</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800 }}>LidoRank</div>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, fontWeight: 700, maxWidth: 980, lineHeight: 1.2 }}>
          {en ? "The vertical reviews of beach clubs and marinas" : "Le recensioni verticali di lidi, beach club e porti"}
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 30, color: "#d6ecf5", maxWidth: 980 }}>
          {en ? "Structured, transparent ratings on beach and public-domain criteria" : "Voti strutturati e trasparenti su criteri balneari e di demanio"}
        </div>
      </div>
    ),
    size
  );
}
