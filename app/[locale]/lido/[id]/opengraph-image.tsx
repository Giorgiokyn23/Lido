import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { metricsForTipo, type BeachScore } from "@/lib/types";

// Anteprima OG (WhatsApp/social) generata dinamicamente per ogni profilo.
// Si aggiorna da sola quando cambiano voto/recensioni (rigenerata lato server).
export const runtime = "nodejs";
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "LidoRank";

const SEA = { 50: "#eef7fb", 100: "#d6ecf5", 400: "#3fa0c8", 500: "#1f83ae", 600: "#166a92", 900: "#173e53" };
const AMBER = "#fbbf24";

export default async function OgImage({ params }: { params: { id: string; locale: string } }) {
  const en = params.locale === "en";
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from("beach_scores").select("*").eq("id", params.id).maybeSingle();
    const b = (data as BeachScore | null) ?? null;

    const val = (k: string) => (b as unknown as Record<string, number | null>)?.[`avg_${k}`] ?? null;
    const crits = b
      ? metricsForTipo(b.tipo)
          .map((m) => ({ label: m.label, v: val(m.key) }))
          .filter((x): x is { label: string; v: number } => typeof x.v === "number")
          .sort((a, z) => z.v - a.v)
          .slice(0, 3)
      : [];
    const overall = b?.avg_overall != null ? b.avg_overall.toFixed(1) : "—";
    const nome = b?.nome ?? "LidoRank";
    const luogo = b ? [b.localita, b.regione].filter(Boolean).join(" · ") : "";

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: SEA[50], padding: 56, fontFamily: "sans-serif" }}>
          {/* brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 46, height: 46, borderRadius: 12, background: SEA[600], alignItems: "center", justifyContent: "center", fontSize: 28 }}>🌊</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: SEA[600] }}>LidoRank</div>
          </div>

          {/* luogo + nome */}
          <div style={{ display: "flex", marginTop: 34, fontSize: 26, color: SEA[500] }}>{luogo}</div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 74, fontWeight: 800, color: SEA[900], lineHeight: 1.05 }}>{nome}</div>

          {/* score + recensioni */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, background: SEA[600], color: "#fff", borderRadius: 18, padding: "14px 24px" }}>
              <div style={{ fontSize: 46, fontWeight: 800 }}>{overall}</div>
              <div style={{ fontSize: 24, opacity: 0.85 }}>/ 5</div>
            </div>
            <div style={{ display: "flex", fontSize: 28, color: SEA[600] }}>
              {b?.reviews_count ?? 0} {en ? "reviews" : "recensioni"}
            </div>
          </div>

          {/* 3 criteri */}
          <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
            {crits.map((c) => (
              <div key={c.label} style={{ display: "flex", flexDirection: "column", width: 320, background: "#fff", borderRadius: 16, padding: "16px 20px", border: `1px solid ${SEA[100]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: SEA[900] }}>
                  <div style={{ display: "flex" }}>{c.label}</div>
                  <div style={{ display: "flex", fontWeight: 700 }}>{c.v.toFixed(1)}</div>
                </div>
                <div style={{ display: "flex", marginTop: 10, height: 12, background: SEA[100], borderRadius: 999 }}>
                  <div style={{ display: "flex", width: `${Math.round((c.v / 5) * 300)}px`, height: 12, background: SEA[400], borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>

          {/* CTA (invito visivo, non un bottone) */}
          <div style={{ display: "flex", marginTop: "auto" }}>
            <div style={{ display: "flex", background: AMBER, color: SEA[900], fontSize: 28, fontWeight: 700, borderRadius: 16, padding: "18px 34px" }}>
              {en ? "Read & leave your review" : "Leggi e lascia la tua recensione"}
            </div>
          </div>
        </div>
      ),
      size
    );
  } catch {
    // fallback brandizzato: mai un'anteprima rotta
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: SEA[600], color: "#fff", fontSize: 64, fontWeight: 800, fontFamily: "sans-serif" }}>
          🌊 LidoRank
        </div>
      ),
      size
    );
  }
}
