import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";

export const revalidate = 86400; // rigenera la sitemap una volta al giorno

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  // Supabase restituisce max 1000 righe per richiesta: pagino a blocchi
  // finché ho preso tutti i lidi (limite sitemap: 50.000 URL).
  const PAGE = 1000;
  const CAP = 49000;
  const beachPages: MetadataRoute.Sitemap = [];
  for (let offset = 0; offset < CAP; offset += PAGE) {
    const { data, error } = await supabase
      .from("beaches")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const b of data) {
      beachPages.push({
        url: `${base}/lido/${b.id}`,
        lastModified: b.created_at ? new Date(b.created_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    if (data.length < PAGE) break; // ultima pagina
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/classifiche`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/metodologia`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/chi-siamo`, changeFrequency: "monthly", priority: 0.4 },
  ];

  return [...staticPages, ...beachPages];
}
