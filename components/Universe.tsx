"use client";

import { kindInfo, kindOf } from "@/lib/quotes";
import { authorCounts, topCounts } from "@/lib/stats";
import type { Book } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { BookCover } from "./BookCover";
import { quoteItems, type QuoteItem } from "./QuoteWall";

/**
 * Pieces of "My Universe" (the home page): the memories you've kept, who you are as a reader, and
 * the path your reading has taken. Everything is drawn from your own books; nothing is invented,
 * and a section with nothing true to say stays out of the way.
 */

const listOf = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);

/** A few of your most recent memories, like notes tucked into books. */
export function MemoryNotes({ books, onOpen, onArchive }: { books: Book[]; onOpen: (b: Book) => void; onArchive: () => void }) {
  const items = quoteItems(books).slice(0, 6);
  if (!items.length) return null;
  return (
    <section aria-labelledby="universe-memories">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="universe-memories" className="font-serif text-2xl">
          Kept from your books
        </h2>
        <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={onArchive}>
          Memory archive ›
        </button>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 pt-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map((it, i) => (
          <li key={`${it.book.id}:${it.quote.id}`} className="w-[78%] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none">
            <MemoryNote item={it} tilt={i % 2 ? 0.6 : -0.6} onOpen={() => onOpen(it.book)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MemoryNote({ item, tilt, onOpen }: { item: QuoteItem; tilt: number; onOpen: () => void }) {
  const { book, quote } = item;
  const info = kindInfo(kindOf(quote));
  const color = useCoverColor(book);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block h-full w-full rounded-md bg-paper p-4 pt-5 text-left shadow-[0_8px_18px_-12px_rgba(0,0,0,0.45)] ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-label={`${info.label} from ${book.title}: ${quote.text}. Open book.`}
    >
      {/* a strip of washi tape holding the note in */}
      <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-2deg] rounded-[2px] opacity-80" style={{ backgroundColor: color }} />
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-soft">
        <span aria-hidden>{info.icon}</span> {info.label}
      </p>
      <p className={`mt-2 line-clamp-4 leading-snug ${info.quoted ? "font-serif text-lg" : "font-book text-[17px]"}`}>{info.quoted ? `“${quote.text}”` : quote.text}</p>
      <p className="mt-3 truncate text-xs text-ink-soft">
        {book.title}
        {quote.page ? <span className="font-mono"> · p. {quote.page}</span> : null}
      </p>
    </button>
  );
}

/**
 * Who you are as a reader, in a few plain sentences: the genres you return to, the author you
 * keep coming back to, what you tend to keep from a book, and the books you hold closest.
 */
export function ReadingIdentity({ books, onOpen, fallback = null }: { books: Book[]; onOpen: (b: Book) => void; fallback?: React.ReactNode }) {
  const read = books.filter((b) => b.status === "read" || b.status === "reading");
  const genres = topCounts(read.map((b) => b.genre), 3).filter(([, n]) => n >= 2).map(([g]) => g);
  const [author, authorTimes] = authorCounts(books, 1)[0] ?? ["", 0];
  const kinds = topCounts(quoteItems(books).map(({ quote }) => kindInfo(kindOf(quote)).plural.toLowerCase()), 2).map(([k]) => k);
  const favourites = books.filter((b) => b.favourite).sort((a, b) => (b.date_finished ?? b.updated_at).localeCompare(a.date_finished ?? a.updated_at));

  const lines: string[] = [];
  if (genres.length) lines.push(`You keep returning to ${listOf(genres)}.`);
  if (author && authorTimes >= 2) lines.push(`${author} has ${authorTimes} books on your shelves.`);
  if (kinds.length) lines.push(`From a book, you tend to keep ${listOf(kinds)}.`);
  if (!lines.length && !favourites.length) return <>{fallback}</>;

  return (
    <section aria-labelledby="universe-identity" className="rounded-3xl bg-paper/80 p-5 ring-1 ring-line/70 md:p-6">
      <h2 id="universe-identity" className="font-serif text-2xl">
        You, as a reader
      </h2>
      {lines.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {lines.map((l) => (
            <li key={l} className="font-book text-[17px] leading-snug">
              {l}
            </li>
          ))}
        </ul>
      )}
      {favourites.length > 0 && (
        <div className="mt-5">
          <p className="label">Held closest</p>
          <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {favourites.slice(0, 12).map((b) => (
              <li key={b.id} className="shrink-0">
                <button type="button" onClick={() => onOpen(b)} aria-label={`${b.title}, a favourite. Open book.`} className="block h-[84px] w-[56px] overflow-hidden rounded-[2px] shadow-md transition hover:-translate-y-0.5 motion-reduce:transform-none">
                  <BookCover book={b} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Finished books, month by month: the path your reading has taken. Books without a finish date come last. */
export function ReadingTimeline({ books, onOpen }: { books: Book[]; onOpen: (b: Book) => void }) {
  const finished = books.filter((b) => b.status === "read");
  if (!finished.length) return null;
  const dated = finished.filter((b) => b.date_finished).sort((a, b) => b.date_finished!.localeCompare(a.date_finished!));
  const groups: { key: string; label: string; books: Book[] }[] = [];
  for (const b of dated) {
    const key = b.date_finished!.slice(0, 7);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const [y, m] = key.split("-").map(Number);
      g = { key, label: new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }), books: [] };
      groups.push(g);
    }
    g.books.push(b);
  }
  const shown = groups.slice(0, 8);
  const undated = finished.filter((b) => !b.date_finished);

  return (
    <section aria-labelledby="universe-timeline">
      <h2 id="universe-timeline" className="mb-3 font-serif text-2xl">
        Your reading path
      </h2>
      <ol className="relative space-y-5 border-l-2 border-dashed border-line pl-5">
        {shown.map((g) => (
          <TimelineStop key={g.key} label={g.label} books={g.books} onOpen={onOpen} />
        ))}
        {groups.length > shown.length && <li className="text-sm text-ink-soft">…and {groups.slice(shown.length).reduce((n, g) => n + g.books.length, 0)} more before that.</li>}
        {undated.length > 0 && <TimelineStop label="Finished, date not set" books={undated} onOpen={onOpen} />}
      </ol>
    </section>
  );
}

function TimelineStop({ label, books, onOpen }: { label: string; books: Book[]; onOpen: (b: Book) => void }) {
  return (
    <li className="relative">
      <span aria-hidden className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-accent shadow" />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {books.map((b) => (
          <li key={b.id} className="shrink-0">
            <button type="button" onClick={() => onOpen(b)} aria-label={`${b.title}${b.author ? ` by ${b.author}` : ""}. Open book.`} className="block h-[78px] w-[52px] overflow-hidden rounded-[2px] shadow-md transition hover:-translate-y-0.5 motion-reduce:transform-none">
              <BookCover book={b} />
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
