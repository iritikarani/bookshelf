"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatDate } from "@/lib/date";
import type { Book } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { EmptyState, PageTitle } from "./AppNav";
import { BookCover } from "./BookCover";
import type { BookPatch } from "./BookJournal";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "./Icons";
import { QuoteWall, quoteItems, type QuoteLook } from "./QuoteWall";
import { StarDisplay } from "./StarRating";

type View = "thoughts" | "quotes";
type Order = "newest" | "oldest";

const hasThought = (b: Book) => Boolean(b.what_i_liked?.trim());
const whenOf = (b: Book) => b.date_finished ?? b.updated_at ?? b.created_at;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

/** The journal: everything you've written about your books, and the quote wall. */
export function JournalPage({
  books,
  look,
  onOpen,
  onShelf,
  onUpdate,
}: {
  books: Book[];
  look?: QuoteLook;
  onOpen: (b: Book) => void;
  onShelf: () => void;
  /** Missing on example books: the journal is read-only then. */
  onUpdate?: (b: Book, patch: BookPatch) => void;
}) {
  const [view, setView] = useState<View>("thoughts");
  const [q, setQ] = useState("");
  const [bookId, setBookId] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [order, setOrder] = useState<Order>("newest");
  const [adding, setAdding] = useState(false);

  const query = q.trim().toLowerCase();
  const keep = (b: Book) => (!bookId || b.id === bookId) && (!minRating || b.rating >= minRating);
  const thoughts = useMemo(() => {
    const list = books.filter(hasThought).filter(keep).filter((b) => !query || [b.what_i_liked, b.title, b.author].some((t) => t?.toLowerCase().includes(query)));
    list.sort((a, b) => whenOf(b).localeCompare(whenOf(a)));
    return order === "oldest" ? list.reverse() : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, query, bookId, minRating, order]);
  const quotes = useMemo(() => {
    const list = quoteItems(books.filter(keep)).filter(({ book, quote }) => !query || [quote.text, quote.note, book.title, book.author].some((t) => t?.toLowerCase().includes(query)));
    return order === "oldest" ? list.reverse() : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, query, bookId, minRating, order]);
  const totalThoughts = books.filter(hasThought).length;
  const totalQuotes = quoteItems(books).length;
  const filtering = Boolean(query || bookId || minRating);
  const journalBooks = useMemo(() => [...books].sort((a, b) => a.title.localeCompare(b.title)), [books]);

  const clear = () => {
    setQ("");
    setBookId("");
    setMinRating(0);
  };

  return (
    <div>
      <PageTitle title="Journal" sub="What stayed with you, book by book." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Journal" className="inline-flex gap-1 rounded-full bg-paper/70 p-1 ring-1 ring-line/70">
          {(
            [
              ["thoughts", "My thoughts", totalThoughts],
              ["quotes", "Quote wall", totalQuotes],
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
        {view === "quotes" && onUpdate && books.length > 0 && !adding && (
          <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
            <PlusIcon width={16} height={16} /> Save a quote
          </button>
        )}
      </div>

      {(totalThoughts > 0 || totalQuotes > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <label htmlFor="journal-q" className="sr-only">
              Search the journal
            </label>
            <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input id="journal-q" type="search" maxLength={100} className="field h-11 rounded-full pl-10" placeholder={view === "quotes" ? "Search quotes" : "Search my thoughts"} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select aria-label="Filter by book" className="field h-11 w-auto max-w-[12rem] rounded-full bg-paper/80" value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="">All books</option>
            {journalBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <select aria-label="Filter by rating" className="field h-11 w-auto rounded-full bg-paper/80" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
            <option value={0}>Any rating</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}★{r < 5 ? "+" : ""}
              </option>
            ))}
          </select>
          <select aria-label="Sort" className="field h-11 w-auto rounded-full bg-paper/80" value={order} onChange={(e) => setOrder(e.target.value as Order)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      )}

      {adding && onUpdate && <NewQuote books={journalBooks} defaultBook={bookId} onCancel={() => setAdding(false)} onSave={(b, patch) => (onUpdate(b, patch), setAdding(false))} />}

      {view === "quotes" ? (
        <QuoteWall
          books={books}
          items={quotes}
          onOpen={onOpen}
          look={look}
          empty={
            filtering ? (
              <NoMatch onClear={clear} />
            ) : (
              <EmptyState icon="❝" title="No lines saved yet.">
                When a sentence stops you, save it here with its page number. Each one can become a card to share.
              </EmptyState>
            )
          }
        />
      ) : thoughts.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {thoughts.map((b) => (
            <ThoughtCard key={b.id} book={b} onOpen={() => onOpen(b)} onUpdate={onUpdate ? (patch) => onUpdate(b, patch) : undefined} />
          ))}
        </ul>
      ) : filtering ? (
        <NoMatch onClear={clear} />
      ) : (
        <EmptyState
          icon="✍️"
          title="Nothing stayed with you yet."
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

function NoMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-10 text-center">
      <p className="font-serif text-2xl">Nothing matches</p>
      <p className="mt-1 text-ink-soft">Try another word, or clear the filters.</p>
      <button type="button" className="btn-ghost mt-4" onClick={onClear}>
        Show everything
      </button>
    </div>
  );
}

function NewQuote({ books, defaultBook, onSave, onCancel }: { books: Book[]; defaultBook: string; onSave: (b: Book, patch: BookPatch) => void; onCancel: () => void }) {
  const [bookId, setBookId] = useState(defaultBook || books[0]?.id || "");
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [note, setNote] = useState("");
  const book = books.find((b) => b.id === bookId);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!book || !text.trim()) return;
    const p = page ? Math.max(1, Math.min(99999, parseInt(page, 10) || 0)) || null : null;
    onSave(book, { quotes: [...(book.quotes ?? []), { id: newId(), text: text.trim().slice(0, 1000), page: p, note: note.trim().slice(0, 500) || null, created_at: new Date().toISOString() }] });
  };
  return (
    <form onSubmit={submit} className="mb-6 animate-fade-in space-y-3 rounded-2xl bg-paper p-4 ring-1 ring-line/70 md:p-5">
      <p className="font-serif text-xl">Save a quote</p>
      <label className="block text-sm">
        <span className="label">From</span>
        <select className="field" value={bookId} onChange={(e) => setBookId(e.target.value)}>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
              {b.author ? ` · ${b.author}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="label">The line</span>
        <textarea autoFocus rows={3} maxLength={1000} className="field resize-y font-serif text-lg" placeholder="As it’s written in the book" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="grid grid-cols-[96px_1fr] gap-2">
        <input aria-label="Page number" inputMode="numeric" className="field font-mono" placeholder="Page" value={page} onChange={(e) => setPage(e.target.value.replace(/\D/g, "").slice(0, 5))} />
        <input aria-label="Your note (optional)" maxLength={500} className="field" placeholder="Your note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={!book || !text.trim()}>
          Save quote
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ThoughtCard({ book, onOpen, onUpdate }: { book: Book; onOpen: () => void; onUpdate?: (patch: BookPatch) => void }) {
  const color = useCoverColor(book);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState(book.what_i_liked ?? "");
  return (
    <li className="relative overflow-hidden rounded-2xl bg-paper ring-1 ring-line/70 transition hover:shadow-md">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
      <div className="flex gap-4 p-4 pl-5">
        <button type="button" onClick={onOpen} className="h-[84px] w-[56px] shrink-0 overflow-hidden rounded-[2px] shadow transition hover:-translate-y-0.5" aria-label={`Open ${book.title}`}>
          <BookCover book={book} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpen} className="text-left font-medium leading-snug hover:underline">
            {book.title}
          </button>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
            {book.author && <span>{book.author}</span>}
            {book.date_finished && <span>· {formatDate(book.date_finished)}</span>}
            {book.rating > 0 && <StarDisplay rating={book.rating} size={11} />}
          </p>
          {editing ? (
            <div className="mt-2">
              <label htmlFor={`jt-${book.id}`} className="sr-only">
                Edit your thoughts on {book.title}
              </label>
              <textarea id={`jt-${book.id}`} autoFocus rows={5} maxLength={4000} className="field resize-y font-book text-[17px] leading-snug" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5"
                  onClick={() => {
                    onUpdate?.({ what_i_liked: text.trim() || null });
                    setEditing(false);
                  }}
                >
                  Save
                </button>
                <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => (setText(book.what_i_liked ?? ""), setEditing(false))}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 line-clamp-6 whitespace-pre-line font-book text-[17px] leading-snug">{book.what_i_liked}</p>
          )}
          {onUpdate && !editing && (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              <button type="button" className="flex items-center gap-1 rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5 hover:text-ink" onClick={() => (setText(book.what_i_liked ?? ""), setEditing(true))}>
                <PencilIcon width={13} height={13} /> Edit
              </button>
              {confirm ? (
                <span className="flex items-center gap-1">
                  <button type="button" className="rounded-full px-2 py-1 font-medium text-danger hover:bg-danger/10" onClick={() => (onUpdate({ what_i_liked: null }), setConfirm(false))}>
                    Delete entry
                  </button>
                  <button type="button" className="rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5" onClick={() => setConfirm(false)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button type="button" className="flex items-center gap-1 rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5 hover:text-danger" onClick={() => setConfirm(true)}>
                  <TrashIcon width={13} height={13} /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
