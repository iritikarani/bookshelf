"use client";

import { hasLine } from "@/lib/stats";
import type { Book } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { StarDisplay, formatRating } from "./StarRating";

export function QuoteWall({ books, onOpen }: { books: Book[]; onOpen: (b: Book) => void }) {
  const quoted = books
    .filter(hasLine)
    .sort((a, b) => (b.date_finished ?? b.created_at).localeCompare(a.date_finished ?? a.created_at));

  if (!quoted.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-serif text-2xl">No lines kept yet</p>
        <p className="mt-2 text-ink-soft">When you save a favourite line for a book, it'll be pinned here.</p>
      </div>
    );
  }

  return (
    <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3" aria-label="Favourite lines">
      {quoted.map((b) => (
        <QuoteCard key={b.id} book={b} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function QuoteCard({ book, onOpen }: { book: Book; onOpen: (b: Book) => void }) {
  const color = useCoverColor(book);
  return (
    <li className="mb-4 break-inside-avoid">
      <button
        type="button"
        onClick={() => onOpen(book)}
        className="group relative block w-full overflow-hidden rounded-xl bg-paper p-5 pl-6 text-left shadow-sm ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
        aria-label={`“${book.favourite_line}”, from ${book.title}${book.rating ? `, rated ${formatRating(book.rating)} of 5` : ""}. Open book.`}
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
        <span aria-hidden className="font-serif text-4xl leading-none text-ink-soft/30">“</span>
        <p className="-mt-3 font-serif text-xl leading-snug">{book.favourite_line?.trim()}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{book.title}</p>
            {book.author && <p className="text-xs text-ink-soft">{book.author}</p>}
          </div>
          {book.rating > 0 && <StarDisplay rating={book.rating} size={14} className="shrink-0" />}
        </div>
      </button>
    </li>
  );
}
