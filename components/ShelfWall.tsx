"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type CSSProperties, type ReactNode } from "react";
import { heightFactor } from "@/lib/covers";
import type { Book, Shelf } from "@/lib/types";
import { BookCover } from "./BookCover";

interface Insertion {
  shelfId: string;
  index: number;
}

interface ShelfWallProps {
  shelves: Shelf[];
  booksByShelf: Map<string, Book[]>;
  onOpen: (book: Book) => void;
  onMove?: (bookId: string, shelfId: string, index: number) => void;
  justAddedId?: string | null;
  readOnly?: boolean;
  /** Rendered under a shelf's header, e.g. the example-shelf notice. */
  shelfNote?: (shelf: Shelf) => ReactNode;
}

// Prefer the book under the pointer over the shelf row that contains it.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length) {
    const book = hits.find((h) => String(h.id).startsWith("book:"));
    return book ? [book] : hits;
  }
  return rectIntersection(args);
};

export function ShelfWall({ shelves, booksByShelf, onOpen, onMove, justAddedId, readOnly, shelfNote }: ShelfWallProps) {
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [insertion, setInsertion] = useState<Insertion | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }));

  const findBook = (id: string) => {
    for (const list of booksByShelf.values()) {
      const b = list.find((x) => x.id === id);
      if (b) return b;
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => setActiveBook(findBook(String(e.active.id)));

  const onDragMove = (e: DragMoveEvent) => {
    const over = e.over;
    if (!over) return setInsertion(null);
    const data = over.data.current as { shelfId: string; index?: number } | undefined;
    if (!data) return setInsertion(null);
    if (data.index === undefined) {
      return setInsertion({ shelfId: data.shelfId, index: (booksByShelf.get(data.shelfId) ?? []).length });
    }
    const start = e.activatorEvent as MouseEvent;
    const pointerX = (start.clientX ?? 0) + e.delta.x;
    const mid = over.rect.left + over.rect.width / 2;
    setInsertion({ shelfId: data.shelfId, index: data.index + (pointerX > mid ? 1 : 0) });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const book = findBook(String(e.active.id));
    const target = insertion;
    setActiveBook(null);
    setInsertion(null);
    if (!book || !target || !e.over) return;
    let index = target.index;
    if (target.shelfId === book.shelf_id) {
      const from = (booksByShelf.get(book.shelf_id) ?? []).findIndex((b) => b.id === book.id);
      if (from < index) index -= 1;
      if (from === index) return;
    }
    onMove?.(book.id, target.shelfId, index);
  };

  const content = (
    <div className="bookcase">
      <div className="case-top" aria-hidden />
      {shelves.map((shelf, i) => (
        <ShelfRow
          key={shelf.id}
          shelf={shelf}
          books={booksByShelf.get(shelf.id) ?? []}
          onOpen={onOpen}
          readOnly={readOnly}
          justAddedId={justAddedId}
          insertion={insertion?.shelfId === shelf.id ? insertion.index : null}
          draggingId={activeBook?.id ?? null}
          note={shelfNote?.(shelf)}
          last={i === shelves.length - 1}
        />
      ))}
      <div className="case-base" aria-hidden />
    </div>
  );

  if (readOnly) return content;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveBook(null);
        setInsertion(null);
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Drag with a mouse to reorder. Keyboard users can open the book and use Move.",
        },
      }}
    >
      {content}
      <DragOverlay dropAnimation={null}>
        {activeBook ? (
          <div className="rotate-3 shadow-2xl" style={coverSize(activeBook)}>
            <BookCover book={activeBook} className="rounded-[3px]" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const coverSize = (book: Pick<Book, "pages">): CSSProperties => ({
  width: "var(--cover-w)",
  height: `calc(var(--cover-h) * ${heightFactor(book.pages).toFixed(3)})`,
});

function ShelfRow({
  shelf,
  books,
  onOpen,
  readOnly,
  justAddedId,
  insertion,
  draggingId,
  note,
  last,
}: {
  shelf: Shelf;
  books: Book[];
  onOpen: (b: Book) => void;
  readOnly?: boolean;
  justAddedId?: string | null;
  insertion: number | null;
  draggingId: string | null;
  note?: ReactNode;
  last: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `shelf:${shelf.id}`, data: { shelfId: shelf.id }, disabled: readOnly });
  const headingId = `shelf-${shelf.id}-name`;

  return (
    <>
      <section aria-labelledby={headingId} className="case-cell">
        <div className="flex items-baseline justify-between gap-3 px-3 pt-3 md:px-4">
          <h2 id={headingId} className="font-serif text-lg leading-tight md:text-xl">
            {shelf.name}
          </h2>
          <span className="rounded-full bg-paper/70 px-2 py-0.5 font-mono text-[11px] text-ink-soft">
            {books.length} {books.length === 1 ? "book" : "books"}
          </span>
        </div>
        {note && <div className="px-3 pt-2 md:px-4">{note}</div>}
        <div
          ref={setNodeRef}
          className={`shelf-scroll relative flex ${books.length ? "min-h-[calc(var(--cover-h)+20px)]" : "min-h-[calc(var(--cover-h)*0.6)]"} items-end gap-3 overflow-x-auto px-3 pb-0 pt-4 md:gap-4 md:px-4 ${isOver ? "bg-accent/10" : ""}`}
          role="list"
          aria-label={`${shelf.name} shelf`}
        >
          {books.length === 0 && (
            <p className="relative self-center pb-3 text-sm italic text-ink-soft">
              {insertion === 0 && <Marker side="left" />}
              {readOnly ? "Empty shelf" : shelf.is_want_to_read ? "Books you're planning to read go here." : "Nothing on this shelf yet."}
            </p>
          )}
          {books.map((book, i) => (
            <ShelfBook
              key={book.id}
              book={book}
              index={i}
              shelf={shelf}
              onOpen={onOpen}
              readOnly={readOnly}
              justAdded={book.id === justAddedId}
              dimmed={book.id === draggingId}
              marker={insertion === i ? "left" : insertion === books.length && i === books.length - 1 ? "right" : null}
            />
          ))}
          <div className="w-1 shrink-0" aria-hidden />
        </div>
      </section>
      {!last && <div className="plank" aria-hidden />}
    </>
  );
}

function Marker({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-0 top-0 z-20 w-1 rounded-full bg-accent shadow-[0_0_0_3px_rgb(var(--accent)/0.25)] ${side === "left" ? "-left-2 md:-left-2.5" : "-right-2 md:-right-2.5"}`}
    />
  );
}

function ShelfBook({
  book,
  index,
  shelf,
  onOpen,
  readOnly,
  justAdded,
  dimmed,
  marker,
}: {
  book: Book;
  index: number;
  shelf: Shelf;
  onOpen: (b: Book) => void;
  readOnly?: boolean;
  justAdded: boolean;
  dimmed: boolean;
  marker: "left" | "right" | null;
}) {
  const drag = useDraggable({ id: book.id, data: { shelfId: shelf.id }, disabled: readOnly });
  const drop = useDroppable({ id: `book:${book.id}`, data: { shelfId: shelf.id, index }, disabled: readOnly });

  const label = `${book.title}${book.author ? ` by ${book.author}` : ""}${!shelf.is_want_to_read && book.rating ? `, rated ${book.rating} of 5` : ""}. Open journal entry.`;

  return (
    <div
      ref={drop.setNodeRef}
      role="listitem"
      data-book-id={book.id}
      className={`relative shrink-0 ${justAdded ? "animate-drop-in" : ""}`}
      style={coverSize(book)}
    >
      {marker && <Marker side={marker} />}
      <button
        ref={drag.setNodeRef}
        type="button"
        {...(readOnly ? {} : drag.listeners)}
        onClick={() => onOpen(book)}
        aria-label={label}
        title={book.title}
        className={`group block h-full w-full rounded-[3px] text-left outline-offset-4 ${dimmed ? "opacity-30" : ""} ${readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      >
        <span className="relative block h-full w-full origin-bottom transition-transform duration-200 ease-out group-hover:-translate-y-2 group-hover:-rotate-2 group-focus-visible:-translate-y-2 motion-reduce:transform-none">
          <span className="block h-full w-full overflow-hidden rounded-[3px] shadow-[0_6px_10px_-4px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.3)] transition-shadow group-hover:shadow-[0_14px_18px_-6px_rgba(0,0,0,0.5)]">
            <BookCover book={book} />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[3px] bg-[linear-gradient(90deg,rgba(0,0,0,0.28),rgba(255,255,255,0.18)_3%,transparent_9%,transparent_92%,rgba(0,0,0,0.12))]"
            />
          </span>
          {!shelf.is_want_to_read && book.rating === 5 && (
            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-amber-950 shadow">
              ★5
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
