import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "@/components/LoginPage";

export const metadata: Metadata = {
  title: "Sign in or create your free bookshelf",
  description: "Sign in to SelfShelf, or create your free virtual bookshelf and reading journal.",
  alternates: { canonical: "/login/" },
  openGraph: { type: "website", siteName: "SelfShelf", title: "Create your free bookshelf on SelfShelf", url: "/login/", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  // A sign-in form isn't a search result anyone needs; the front page is.
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
