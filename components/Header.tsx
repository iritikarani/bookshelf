"use client";

import type { ReactNode } from "react";

export type Tab = "shelf" | "quotes" | "year" | "discover";

const TABS: { id: Tab; label: string }[] = [
  { id: "shelf", label: "Shelf" },
  { id: "quotes", label: "Quote wall" },
  { id: "year", label: "Reading year" },
  { id: "discover", label: "Discover" },
];

interface Stats {
  booksRead: number;
  avgRating: number | null;
  linesKept: number;
  toRead: number;
}

export function Header({ stats, tab, onTab, actions, subtitle }: { stats: Stats; tab?: Tab; onTab?: (t: Tab) => void; actions?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-5 md:px-8 md:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="whitespace-nowrap font-serif text-[26px] leading-none tracking-tight sm:text-3xl md:text-4xl">
            Cosmic Space<span className="text-accent">.</span>
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>

      <dl className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-paper/60 p-3 shadow-sm ring-1 ring-line/60 backdrop-blur md:mt-6 md:gap-4 md:p-4">
        <Stat label="Books read" value={String(stats.booksRead)} />
        <Stat label="Avg rating" value={stats.avgRating === null ? "–" : `${stats.avgRating.toFixed(1)}★`} />
        <Stat label="Lines kept" value={String(stats.linesKept)} />
        <Stat label="To read" value={String(stats.toRead)} />
      </dl>

      {onTab && (
        <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`-mb-px shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors md:px-4 ${
                tab === t.id ? "border-accent text-ink" : "border-transparent text-ink-soft hover:text-ink"
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
      <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-soft md:text-xs">{label}</dt>
    </div>
  );
}
