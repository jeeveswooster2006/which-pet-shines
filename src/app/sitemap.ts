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

// Regenerated hourly rather than frozen at build time. Two reasons:
// (1) new pets are approved continuously, so a build-time snapshot would go
// stale within hours, and (2) it means the build does not depend on the
// database being reachable from the build environment — a DB blip (or a CI
// runner with no access to production Postgres) would otherwise hard-fail
// the whole deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "" || route === "/vote" || route === "/bracket" ? "hourly" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  // A sitemap missing its pet pages is a minor SEO loss; a sitemap that
  // throws takes the route (and, at build time, the deploy) down with it.
  // Degrade to the static routes instead and let the next revalidation
  // pick the pet pages back up.
  let petEntries: MetadataRoute.Sitemap = [];
  try {
    const approvedPets = await db
      .select({ slug: pets.slug, updatedAt: pets.updatedAt })
      .from(pets)
      .where(eq(pets.status, "APPROVED"));

    petEntries = approvedPets.map((p) => ({
      url: `${siteUrl}/pet/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] could not load pet pages, serving static routes only:", err);
  }

  return [...staticEntries, ...petEntries];
}
