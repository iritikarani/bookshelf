"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState, type ReactNode } from "react";
import type { Book, ReadStatus } from "@/lib/types";
import { BookCover } from "./BookCover";
import { SearchIcon, XIcon } from "./Icons";
import { MARKS } from "./Marks";
import { progressPercent } from "./ReadingProgress";
import { StarDisplay } from "./StarRating";

export type StatusShelf = "reading" | "to_read" | "read" | "favourite" | "dnf";
export type MarkPatch = { status?: ReadStatus; favourite?: boolean };

const SHELVES: { id: StatusShelf; title: string; empty: string }[] = [
  { id: "reading", title: "Currently Reading", empty: "Nothing on the go. Drag a book here when you start it." },
  { id: "to_read", title: "Want to Read", empty: "Books you’d like to read next will wait here." },
  { id: "read", title: "Finished", empty: "Finish a book and it moves here." },
  { id: "favourite", title: "Favourites", empty: "Drag the books you love here, or tap ❤ on a book." },
  { id: "dnf", title: "Didn’t finish", empty: "" },
];

const inShelf = (b: Book, s: StatusShelf) => (s === "favourite" ? b.favourite : b.status === s);

type Sort = "added" | "title" | "author" | "rating" | "progress";
const SORTS: { id: Sort; label: string }[] = [
  { id: "added", label: "Recently added" },
  { id: "title", label: "Title" },
  { id: "author", label: "Author" },
  { id: "rating", label: "Rating" },
  { id: "progress", label: "Progress" },
];

const surname = (a: string) => (a.split(",")[0].trim().split(/\s+/).pop() ?? "").toLowerCase();
const sorters: Record<Sort, (a: Book, b: Book) => number> = {
  added: (a, b) => b.created_at.localeCompare(a.created_at),
  title: (a, b) => a.title.replace(/^(the|a|an)\s+/i, "").localeCompare(b.title.replace(/^(the|a|an)\s+/i, "")),
  author: (a, b) => surname(a.author).localeCompare(surname(b.author)) || a.title.localeCompare(b.title),
  rating: (a, b) => b.rating - a.rating || a.title.localeCompare(b.title),
  progress: (a, b) => (progressPercent(b) ?? -1) - (progressPercent(a) ?? -1),
};

/** What the move menu turns into, for a book on a given shelf. */
function patchFor(target: StatusShelf, book: Book): MarkPatch | null {
  if (target === "favourite") return book.favourite ? null : { favourite: true };
  return book.status === target ? null : { status: target };
}

/**
 * My Shelf by status: Currently Reading, Want to Read, Finished and Favourites as real shelves.
 * Drag a book between them (mouse, touch hold, or keyboard), or use its Move menu.
 */
export function StatusShelves({ books, onOpen, onMark, readOnly }: { books: Book[]; onOpen: (b: Book) => void; onMark: (b: Book, patch: MarkPatch) => void; readOnly?: boolean }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("added");
  const [genre, setGenre] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [recent, setRecent] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dragging, setDragging] = useState<Book | null>(null);

  const genres = useMemo(() => [...new Set(books.map((b) => b.genre?.trim()).filter(Boolean) as string[])].sort(), [books]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    return books
      .filter((b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .filter((b) => !genre || b.genre?.trim() === genre)
      .filter((b) => !minRating || b.rating >= minRating)
      .filter((b) => !recent || b.created_at >= since)
      .sort(sorters[sort]);
  }, [books, query, genre, minRating, recent, sort]);
  const active = [genre && `Genre: ${genre}`, minRating && `${minRating}★ and up`, recent && "Added in the last 30 days"].filter(Boolean) as string[];
  const clearFilters = () => {
    setGenre("");
    setMinRating(0);
    setRecent(false);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const onStart = (e: DragStartEvent) => setDragging(books.find((b) => b.id === e.active.data.current?.bookId) ?? null);
  const onEnd = (e: DragEndEvent) => {
    setDragging(null);
    const book = books.find((b) => b.id === e.active.data.current?.bookId);
    const target = e.over?.id as StatusShelf | undefined;
    if (!book || !target) return;
    const patch = patchFor(target, book);
    if (patch) onMark(book, patch);
  };

  const filtering = Boolean(query.trim() || active.length);
  const shelves = SHELVES.filter((s) => s.id !== "dnf" || books.some((b) => b.status === "dnf"));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <label htmlFor="shelf-q" className="sr-only">
            Search my shelf by title or author
          </label>
          <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input id="shelf-q" type="search" maxLength={100} className="field h-11 rounded-full pl-10" placeholder="Search my shelf" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button type="button" className={`btn-ghost h-11 bg-paper/70 ${active.length ? "border-accent text-accent" : ""}`} aria-expanded={filtersOpen} aria-controls="shelf-filters" onClick={() => setFiltersOpen((o) => !o)}>
          Filter{active.length ? ` · ${active.length}` : ""}
        </button>
        <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-paper/70 pl-4 pr-1 text-sm">
          <span className="text-ink-soft">Sort</span>
          <select className="h-9 rounded-full bg-transparent pr-2 font-medium focus:outline-none" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtersOpen && (
        <div id="shelf-filters" className="mb-3 grid animate-fade-in gap-3 rounded-2xl bg-paper/90 p-4 ring-1 ring-line/70 sm:grid-cols-3">
          <label className="text-sm">
            <span className="label">Genre</span>
            <select className="field" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">Any genre</option>
              {genres.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="label">Rating</span>
            <select className="field" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              <option value={0}>Any rating</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r}★{r < 5 ? " and up" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="label">Added</span>
            <button type="button" role="switch" aria-checked={recent} onClick={() => setRecent((r) => !r)} className={`field text-left ${recent ? "border-accent text-accent" : ""}`}>
              {recent ? "✓ " : ""}In the last 30 days
            </button>
          </div>
        </div>
      )}
      {active.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {active.map((a) => (
            <span key={a} className="rounded-full bg-accent/10 px-3 py-1 text-accent ring-1 ring-accent/30">
              {a}
            </span>
          ))}
          <button type="button" className="text-ink-soft underline-offset-2 hover:text-ink hover:underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}
      {!readOnly && <p className="mb-6 text-sm text-ink-soft">Drag a book onto another shelf, or use the ⇄ button on it. On a phone, hold a book to pick it up.</p>}

      {filtering && !shown.length ? (
        <div className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-10 text-center">
          <p className="font-serif text-2xl">No books match</p>
          <p className="mt-1 text-ink-soft">Try another word, or clear the filters.</p>
          <button
            type="button"
            className="btn-ghost mt-4"
            onClick={() => {
              setQuery("");
              clearFilters();
            }}
          >
            Show all books
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setDragging(null)}>
          <div className="space-y-8">
            {shelves.map((s) => {
              const list = shown.filter((b) => inShelf(b, s.id));
              if (filtering && !list.length) return null;
              return (
                <Shelf key={s.id} id={s.id} title={s.title} count={list.length} disabled={readOnly}>
                  {list.length ? (
                    list.map((b) => <ShelfBook key={b.id} book={b} shelf={s.id} onOpen={onOpen} onMark={onMark} readOnly={readOnly} />)
                  ) : (
                    <p className="self-center px-2 py-8 text-sm text-ink-soft">{s.empty}</p>
                  )}
                </Shelf>
              );
            })}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
            {dragging ? (
              <div className="h-[132px] w-[88px] rotate-[-4deg] overflow-hidden rounded-[3px] shadow-2xl ring-2 ring-accent/60 md:h-[150px] md:w-[100px]">
                <BookCover book={dragging} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function Shelf({ id, title, count, disabled, children }: { id: StatusShelf; title: string; count: number; disabled?: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  const mark = id === "read" ? null : MARKS[id];
  return (
    <section ref={setNodeRef} aria-label={`${title}, ${count} ${count === 1 ? "book" : "books"}`}>
      <h2 className="mb-2 flex items-baseline gap-2 font-serif text-2xl">
        {mark && (
          <span aria-hidden className="text-base" style={{ color: mark.color }}>
            {mark.icon}
          </span>
        )}
        {title}
        <span className="font-mono text-sm text-ink-soft">{count}</span>
      </h2>
      <div className={`rounded-t-xl transition-colors duration-200 ${isOver ? "bg-accent/15 ring-2 ring-accent/50" : ""}`}>
        <ul className="no-scrollbar flex min-h-[150px] items-end gap-4 overflow-x-auto px-3 pb-0 pt-4 md:min-h-[170px] md:gap-4">{children}</ul>
      </div>
      <div className="plank rounded-sm" aria-hidden />
    </section>
  );
}

const MOVES: { id: StatusShelf; label: string }[] = [
  { id: "reading", label: "Currently Reading" },
  { id: "to_read", label: "Want to Read" },
  { id: "read", label: "Finished" },
  { id: "dnf", label: "Didn’t finish" },
];

function ShelfBook({ book, shelf, onOpen, onMark, readOnly }: { book: Book; shelf: StatusShelf; onOpen: (b: Book) => void; onMark: (b: Book, patch: MarkPatch) => void; readOnly?: boolean }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: `${shelf}:${book.id}`, data: { bookId: book.id }, disabled: readOnly });
  const pct = book.status === "reading" ? progressPercent(book) : null;
  return (
    <li className={`relative w-[88px] shrink-0 transition-opacity md:w-[100px] ${isDragging ? "opacity-30" : ""}`}>
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onOpen(book)}
        aria-label={`${book.title}${book.author ? ` by ${book.author}` : ""}. Open, or drag to another shelf.`}
        aria-roledescription="book you can drag"
        className="group block w-full touch-manipulation text-left"
      >
        <div className="h-[132px] overflow-hidden rounded-[3px] shadow-[2px_4px_8px_-2px_rgba(0,0,0,.45)] transition-transform group-hover:-translate-y-1 motion-reduce:transform-none md:h-[150px]">
          <BookCover book={book} />
        </div>
        {pct !== null && (
          <div className="absolute inset-x-1.5 top-[118px] h-1 overflow-hidden rounded-full bg-black/30 md:top-[136px]" aria-hidden>
            <div className="h-full bg-white/90" style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>
      {book.favourite && shelf !== "favourite" && (
        <span aria-label="Favourite" className="absolute bottom-1 right-1 rounded-full bg-paper/90 px-1.5 text-xs" style={{ color: MARKS.favourite.color }}>
          ❤
        </span>
      )}
      {book.rating > 0 && shelf === "read" && <StarDisplay rating={book.rating} size={10} className="absolute bottom-1 left-1 rounded bg-black/45 px-1 py-0.5" />}
      {!readOnly && <MoveMenu book={book} onMark={onMark} />}
    </li>
  );
}

/** The no-drag way: a small button on each book with a native menu (big, familiar on phones). */
function MoveMenu({ book, onMark }: { book: Book; onMark: (b: Book, patch: MarkPatch) => void }) {
  return (
    <label className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-paper text-xs text-ink shadow ring-1 ring-line focus-within:ring-2 focus-within:ring-accent">
      <span aria-hidden>⇄</span>
      <select
        aria-label={`Move ${book.title}`}
        className="absolute inset-0 cursor-pointer opacity-0"
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === "fav") onMark(book, { favourite: !book.favourite });
          else if (v) onMark(book, { status: v as ReadStatus });
        }}
      >
        <option value="" disabled>
          Move “{book.title}” to…
        </option>
        {MOVES.filter((m) => m.id !== book.status).map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
        <option value="fav">{book.favourite ? "Remove from Favourites" : "Add to Favourites"}</option>
      </select>
    </label>
  );
}
