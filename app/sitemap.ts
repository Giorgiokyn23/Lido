import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lidorank.com";

export const revalidate = 86400; // rigenera la sitemap una volta al giorno

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  // fino a 50.000 URL per sitemap: preleviamo gli id dei lidi
  const { data } = await supabase
    .from("beaches")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(45000);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/classifiche`, changeFrequency: "daily", priority: 0.9 },
  ];

  const beachPages: MetadataRoute.Sitemap = (data ?? []).map((b) => ({
    url: `${base}/lido/${b.id}`,
    lastModified: b.created_at ? new Date(b.created_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...beachPages];
}
