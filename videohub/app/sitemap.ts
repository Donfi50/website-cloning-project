import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic"; // read the database per request, not at build time

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const videos = await db.video.findMany({
    where: { status: "READY" },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000, // sitemap files are limited to 50,000 URLs; split into several if you grow past this
  });
  return [
    { url: base, changeFrequency: "daily" },
    ...["terms", "privacy", "copyright"].map(p => ({ url: `${base}/${p}` })),
    ...videos.map(v => ({ url: `${base}/watch/${v.id}`, lastModified: v.createdAt })),
  ];
}
