import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShelfPage } from "@/components/PublicShelfView";

export const metadata: Metadata = {
  title: { absolute: "A bookshelf on SelfShelf" },
  description: "Have a look at this reader’s bookshelf, and make your own free virtual bookshelf on SelfShelf.",
  alternates: {},
  // The preview when a shelf link is shared: no fixed address, so it stays the shared shelf's own.
  openGraph: {
    type: "website",
    siteName: "SelfShelf",
    title: "A bookshelf on SelfShelf",
    description: "Have a look at this reader’s bookshelf, and make your own on SelfShelf.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  // Readers share their shelf by link; it isn't put in search results.
  robots: { index: false, follow: true },
};

/** Public read-only shelf: /s/?u=<slug>. A query string keeps the site fully static. */
export default function Page() {
  return (
    <Suspense>
      <PublicShelfPage />
    </Suspense>
  );
}
