import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const dynamic = "force-static";

const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** Lets phones add SelfShelf to the home screen with its own icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: your virtual bookshelf`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#f5f1ea",
    theme_color: "#3a604c",
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
