"use client";

import { useState } from "react";
import { formatDate } from "@/lib/date";
import { hasLine } from "@/lib/stats";
import type { Book } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { EmptyState, PageTitle } from "./AppNav";
import { BookCover } from "./BookCover";
import { QuoteWall, type QuoteLook } from "./QuoteWall";
import { StarDisplay } from "./StarRating";

type View = "thoughts" | "quotes";

const hasThought = (b: Book) => Boolean(b.what_i_liked?.trim());

/** The journal: everything you've written about your books, and the quote wall. */
export function JournalPage({ books, look, onOpen, onShelf }: { books: Book[]; look?: QuoteLook; onOpen: (b: Book) => void; onShelf: () => void }) {
  const [view, setView] = useState<View>("thoughts");
  const thoughts = books.filter(hasThought).sort((a, b) => (b.date_finished ?? b.updated_at).localeCompare(a.date_finished ?? a.updated_at));
  const quotes = books.filter(hasLine).length;

  return (
    <div>
      <PageTitle title="Journal" sub="What stayed with you, book by book." />
      <div role="tablist" aria-label="Journal" className="mb-6 inline-flex gap-1 rounded-full bg-paper/70 p-1 ring-1 ring-line/70">
        {(
          [
            ["thoughts", "My thoughts", thoughts.length],
            ["quotes", "Quote wall", quotes],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${view === id ? "bg-ink text-wall" : "text-ink-soft hover:text-ink"}`}
          >
            {label} <span className="font-mono text-xs opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {view === "quotes" ? (
        <QuoteWall books={books} onOpen={onOpen} look={look} />
      ) : thoughts.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {thoughts.map((b) => (
            <ThoughtCard key={b.id} book={b} onOpen={() => onOpen(b)} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="✍️"
          title="Your journal is waiting."
          action={
            <button type="button" className="btn-primary px-5 py-3" onClick={onShelf}>
              Go to my shelf
            </button>
          }
        >
          Open any book on your shelf and write what stayed with you. Your thoughts collect here.
        </EmptyState>
      )}
    </div>
  );
}

function ThoughtCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const color = useCoverColor(book);
  return (
    <li>
      <button type="button" onClick={onOpen} className="relative flex h-full w-full gap-4 overflow-hidden rounded-2xl bg-paper p-4 pl-5 text-left ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
        <div className="h-[84px] w-[56px] shrink-0 overflow-hidden rounded-[2px] shadow">
          <BookCover book={book} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{book.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
            {book.author && <span>{book.author}</span>}
            {book.date_finished && <span>· {formatDate(book.date_finished)}</span>}
            {book.rating > 0 && <StarDisplay rating={book.rating} size={11} />}
          </p>
          <p className="mt-2 line-clamp-5 whitespace-pre-line font-book text-[17px] leading-snug">{book.what_i_liked}</p>
        </div>
      </button>
    </li>
  );
}
