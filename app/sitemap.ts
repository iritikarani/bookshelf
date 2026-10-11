import type { MetadataRoute } from "next";
import { GUIDES, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** The pages worth finding in search: the front page and the guides (never anyone's shelf). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...GUIDES.map((g) => ({ url: `${SITE_URL}${g.path}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
