"use client";

import type { ReactNode } from "react";
import type { Book } from "@/lib/types";

export type Tab = "shelf" | "quotes" | "year";

const TABS: { id: Tab; label: string }[] = [
  { id: "shelf", label: "Shelf" },
  { id: "quotes", label: "Quote wall" },
  { id: "year", label: "Reading year" },
];

interface Stats {
  booksRead: number;
  avgRating: number | null;
  quotesSaved: number;
  toRead: number;
}

/** "12 books · 2 favourites · 1 reading" */
export function shelfSummary(books: Pick<Book, "favourite" | "status">[]): string {
  const n = books.length;
  const fav = books.filter((b) => b.favourite).length;
  const reading = books.filter((b) => b.status === "reading").length;
  return [`${n} book${n === 1 ? "" : "s"}`, fav ? `${fav} favourite${fav === 1 ? "" : "s"}` : null, reading ? `${reading} reading` : null].filter(Boolean).join(" · ");
}

/**
 * The page's top: a small wordmark, whose shelf this is, and one quiet summary line, so the room
 * below is what you look at. Full stats only appear on the Reading year tab.
 */
export function Header({
  title,
  summary,
  stats,
  tab,
  onTab,
  actions,
}: {
  title: ReactNode;
  summary?: ReactNode;
  stats?: Stats;
  tab?: Tab;
  onTab?: (t: Tab) => void;
  actions?: ReactNode;
}) {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="whitespace-nowrap font-serif text-xl leading-none tracking-tight md:text-2xl">
          Cosmic Space<span className="text-accent">.</span>
        </p>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="mt-5 md:mt-7">
        <h1 className="font-serif text-[34px] leading-[1.05] tracking-tight md:text-5xl">{title}</h1>
        {summary && <p className="mt-1.5 text-base text-ink-soft">{summary}</p>}
      </div>

      {stats && tab === "year" && (
        <dl className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-paper/60 p-3 shadow-sm ring-1 ring-line/60 backdrop-blur md:gap-4 md:p-4">
          <Stat label="Books read" value={String(stats.booksRead)} />
          <Stat label="Avg rating" value={stats.avgRating === null ? "–" : `${stats.avgRating.toFixed(1)}★`} />
          <Stat label="Quotes saved" value={String(stats.quotesSaved)} />
          <Stat label="To read" value={String(stats.toRead)} />
        </dl>
      )}

      {onTab && (
        <nav className="no-scrollbar mt-4 flex gap-1 overflow-x-auto" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-ink/[0.07] text-ink" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center md:text-left">
      <dd className="font-mono text-lg font-medium leading-tight md:text-2xl">{value}</dd>
      <dt className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">{label}</dt>
    </div>
  );
}
