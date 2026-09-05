import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { pets } from "@/db/schema";
import { eq } from "drizzle-orm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const STATIC_ROUTES = [
  "",
  "/vote",
  "/enter",
  "/bracket",
  "/pet-of-the-month",
  "/hall-of-fame",
  "/rules",
  "/terms",
  "/privacy",
  "/cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "" || route === "/vote" || route === "/bracket" ? "hourly" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const approvedPets = await db
    .select({ slug: pets.slug, updatedAt: pets.updatedAt })
    .from(pets)
    .where(eq(pets.status, "APPROVED"));

  const petEntries: MetadataRoute.Sitemap = approvedPets.map((p) => ({
    url: `${siteUrl}/pet/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticEntries, ...petEntries];
}
