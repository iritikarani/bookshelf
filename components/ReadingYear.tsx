"use client";

import { useMemo, useState } from "react";
import { MONTH_NAMES, monthOf, yearOf } from "@/lib/date";
import { averageRating, hasLine, splitByReadState } from "@/lib/stats";
import type { Book, Shelf } from "@/lib/types";
import { BookCover } from "./BookCover";
import { StarDisplay } from "./StarRating";

export function ReadingYear({ shelves, books, onOpen, onWrapped, title = "Reading year" }: { shelves: Shelf[]; books: Book[]; onOpen: (b: Book) => void; onWrapped?: () => void; title?: string }) {
  const { read } = splitByReadState(books);
  const years = useMemo(() => {
    const ys = new Set<number>([new Date().getFullYear()]);
    for (const b of read) {
      const y = yearOf(b.date_finished);
      if (y) ys.add(y);
    }
    return [...ys].sort((a, b) => b - a);
  }, [read]);
  const [year, setYear] = useState(years[0]);
  const [hover, setHover] = useState<number | null>(null);

  const inYear = read.filter((b) => yearOf(b.date_finished) === year);
  const perMonth = Array.from({ length: 12 }, (_, m) => inYear.filter((b) => monthOf(b.date_finished) === m));
  const max = Math.max(1, ...perMonth.map((l) => l.length));
  const pagesRead = inYear.reduce((s, b) => s + (b.pages ?? 0), 0);
  const avg = averageRating(inYear);
  const lines = inYear.filter(hasLine).length;
  const bookOfYear = [...inYear].filter((b) => b.rating > 0).sort((a, b) => b.rating - a.rating || (b.date_finished ?? "").localeCompare(a.date_finished ?? ""))[0];
  const longest = [...inYear].filter((b) => b.pages).sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0))[0];
  const gridSteps = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl md:text-3xl">
          {title} <span className="font-mono text-xl text-ink-soft md:text-2xl">{year}</span>
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Year</span>
          <select className="field w-auto font-mono" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {onWrapped && inYear.length > 0 && (
        <button type="button" onClick={onWrapped} className="flex w-full items-center gap-4 rounded-2xl bg-accent/10 p-4 text-left ring-1 ring-accent/25 transition hover:bg-accent/15">
          <span className="text-3xl" aria-hidden>
            ✨
          </span>
          <span className="flex-1">
            <span className="block font-serif text-xl">Your {year}, wrapped</span>
            <span className="block text-sm text-ink-soft">Story cards of your reading year to share on Instagram</span>
          </span>
          <span aria-hidden className="text-xl text-ink-soft">
            ›
          </span>
        </button>
      )}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Books read", String(inYear.length)],
          ["Pages read", pagesRead.toLocaleString()],
          ["Average rating", avg === null ? "–" : `${avg.toFixed(1)}★`],
          ["Lines saved", String(lines)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-paper p-4 ring-1 ring-line/70">
            <dd className="font-mono text-2xl font-medium md:text-3xl">{value}</dd>
            <dt className="mt-1 text-xs uppercase tracking-wider text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>

      <figure className="rounded-xl bg-paper p-4 ring-1 ring-line/70 md:p-6">
        <figcaption className="mb-4 text-sm font-medium">Books finished each month</figcaption>
        <div className="relative h-48 md:h-56">
          {/* recessive gridlines */}
          <div className="absolute inset-0 bottom-6 left-6" aria-hidden>
            {gridSteps.map((v) => (
              <div key={v} className="absolute inset-x-0 border-t border-line/60" style={{ bottom: `${(v / max) * 100}%` }}>
                <span className="absolute -left-6 -translate-y-1/2 font-mono text-[11px] text-ink-soft">{v}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bottom-0 left-6 flex items-end gap-1 md:gap-2" role="list" aria-label="Books per month">
            {perMonth.map((list, m) => {
              const n = list.length;
              return (
                <div
                  key={m}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${MONTH_NAMES[m]}: ${n} ${n === 1 ? "book" : "books"}`}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end focus-visible:outline-offset-0"
                  onMouseEnter={() => setHover(m)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(m)}
                  onBlur={() => setHover(null)}
                >
                  <div className="flex w-full flex-1 items-end justify-center pb-0">
                    <div
                      className={`w-full max-w-[28px] rounded-t transition-[height,opacity] ${n ? "bg-accent" : ""} ${hover !== null && hover !== m ? "opacity-50" : ""}`}
                      style={{ height: n ? `calc(${(n / max) * 100}% - 0px)` : 0 }}
                    />
                  </div>
                  <span className="mt-1 h-5 font-mono text-[11px] text-ink-soft">{MONTH_NAMES[m].slice(0, 1)}<span className="hidden md:inline">{MONTH_NAMES[m].slice(1)}</span></span>
                  {hover === m && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-[180px] rounded-lg bg-ink px-2.5 py-1.5 text-xs text-wall shadow-lg">
                      <p className="font-medium">{MONTH_NAMES[m]} {year}: <span className="font-mono">{n}</span></p>
                      {list.slice(0, 4).map((b) => (
                        <p key={b.id} className="truncate opacity-80">{b.title}</p>
                      ))}
                      {list.length > 4 && <p className="opacity-60">+{list.length - 4} more</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </figure>

      <div className="grid gap-4 md:grid-cols-2">
        <Highlight title="Book of the year" book={bookOfYear} onOpen={onOpen} empty="Rate a book you finished this year to crown one.">
          {bookOfYear && <StarDisplay rating={bookOfYear.rating} size={16} />}
        </Highlight>
        <Highlight title="Longest read" book={longest} onOpen={onOpen} empty="Books with page counts will show up here.">
          {longest && <span className="font-mono text-sm">{longest.pages?.toLocaleString()} pages</span>}
        </Highlight>
      </div>
    </div>
  );
}

function Highlight({ title, book, onOpen, empty, children }: { title: string; book?: Book; onOpen: (b: Book) => void; empty: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-paper p-4 ring-1 ring-line/70">
      <h3 className="label">{title}</h3>
      {book ? (
        <button type="button" onClick={() => onOpen(book)} className="mt-2 flex w-full items-center gap-4 rounded-lg text-left">
          <div className="h-[108px] w-[72px] shrink-0 overflow-hidden rounded shadow-md">
            <BookCover book={book} />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-xl leading-tight">{book.title}</p>
            <p className="text-sm text-ink-soft">{book.author}</p>
            <div className="mt-2">{children}</div>
          </div>
        </button>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{empty}</p>
      )}
    </section>
  );
}
