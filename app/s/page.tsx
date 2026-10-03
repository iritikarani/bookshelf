import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShelfPage } from "@/components/PublicShelfView";

export const metadata: Metadata = {
  title: "A shelf on Cosmic Space",
  robots: { index: false },
};

/** Public read-only shelf: /s/?u=<slug>. A query string keeps the site fully static. */
export default function Page() {
  return (
    <Suspense>
      <PublicShelfPage />
    </Suspense>
  );
}
