import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GUIDES, SITE_NAME, SITE_URL } from "@/lib/site";

/** Title, description, canonical address and link preview for a guide page. */
export function guideMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", siteName: SITE_NAME, title, description, url: path, images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

/**
 * A plain, readable page in the site's paper-and-wood look: the SelfShelf header, the article,
 * a way in, and links to the other guides. Rendered to static HTML, so it reads the same to
 * people and to search engines.
 */
export function GuidePage({ path, title, intro, children, jsonLd }: { path: string; title: string; intro: ReactNode; children: ReactNode; jsonLd?: object }) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    url: `${SITE_URL}${path}`,
    image: `${SITE_URL}/og.png`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/`, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` } },
  };
  return (
    <div data-style="pastel" className="room min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd ?? article) }} />
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pt-5 md:px-8 md:pt-7">
        <Link href="/" className="font-serif text-xl tracking-tight md:text-2xl">
          SelfShelf<span className="text-accent">.</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login/" className="btn px-3 text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <Link href="/login/?signup=1" className="btn-primary hidden sm:inline-flex">
            Create My Shelf
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-10 md:px-8 md:pt-16">
        <article className="guide rounded-3xl bg-paper/85 p-6 shadow-sm ring-1 ring-line/70 md:p-10">
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{title}</h1>
          <div className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</div>
          {children}
          <div className="mt-10 rounded-2xl bg-accent/10 p-5 ring-1 ring-accent/20">
            <p className="font-serif text-2xl">Start your shelf</p>
            <p className="mt-1 text-ink-soft">SelfShelf is free, and your shelf is private unless you choose to share it.</p>
            <Link href="/login/?signup=1" className="btn-primary mt-4 inline-flex px-6 py-3">
              Create My Shelf
            </Link>
          </div>
        </article>

        <nav aria-label="More guides" className="mt-10">
          <p className="label">More guides</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {GUIDES.filter((g) => g.path !== path).map((g) => (
              <li key={g.path}>
                <Link href={g.path} className="block rounded-2xl bg-paper/80 px-4 py-3 ring-1 ring-line/70 transition hover:ring-accent">
                  {g.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/" className="block rounded-2xl bg-paper/80 px-4 py-3 ring-1 ring-line/70 transition hover:ring-accent">
                SelfShelf home
              </Link>
            </li>
          </ul>
        </nav>
      </main>

      <footer className="border-t border-line/70 py-8 text-center text-sm text-ink-soft">
        SelfShelf<span className="text-accent">.</span> Your books. Your shelf. Your space.
      </footer>
    </div>
  );
}
