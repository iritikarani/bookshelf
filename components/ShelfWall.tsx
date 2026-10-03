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
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { heightFactor } from "@/lib/covers";
import type { Structure } from "@/lib/themes";
import type { Book, Decor, Shelf, ShelfItem } from "@/lib/types";
import { BookCover } from "./BookCover";
import { BookSpine, spineSize } from "./BookSpine";
import { DecorArt, decorSize, decorSpec } from "./Decor";
import { MarkChips, Ribbons, matchesFilter, type MarkFilter } from "./Marks";
import { StarDisplay } from "./StarRating";

interface Insertion {
  shelfId: string;
  index: number;
}

interface ShelfWallProps {
  shelves: Shelf[];
  itemsByShelf: Map<string, ShelfItem[]>;
  structure: Structure;
  onOpenBook: (book: Book) => void;
  onOpenDecor?: (decor: Decor) => void;
  onMove?: (itemId: string, shelfId: string, index: number) => void;
  justAddedId?: string | null;
  readOnly?: boolean;
  /** Draw the floor under a standing bookcase (off for the share image). */
  floor?: boolean;
  /** Rendered at the top of a shelf compartment, e.g. the example-shelf notice. */
  shelfNote?: (shelf: Shelf) => ReactNode;
  /** Dim every book that doesn't carry this mark. */
  filter?: MarkFilter;
}

// Prefer the item under the pointer over the shelf row that contains it.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length) {
    const item = hits.find((h) => String(h.id).startsWith("slot:"));
    return item ? [item] : hits;
  }
  return rectIntersection(args);
};

const coverSize = (book: Pick<Book, "pages">): CSSProperties => ({
  width: "var(--cover-w)",
  height: `calc(var(--cover-h) * ${heightFactor(book.pages).toFixed(3)})`,
});

const itemSize = (item: ShelfItem): CSSProperties =>
  item.type === "decor" ? decorSize(item.decor.kind) : item.book.display === "cover" ? coverSize(item.book) : spineSize(item.book);

export function ShelfWall({ shelves, itemsByShelf, structure, onOpenBook, onOpenDecor, onMove, justAddedId, readOnly, floor = true, shelfNote, filter = "all" }: ShelfWallProps) {
  const [active, setActive] = useState<ShelfItem | null>(null);
  const [insertion, setInsertion] = useState<Insertion | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }));

  const find = (id: string) => {
    for (const list of itemsByShelf.values()) {
      const x = list.find((i) => i.id === id);
      if (x) return x;
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => setActive(find(String(e.active.id)));

  const onDragMove = (e: DragMoveEvent) => {
    const data = e.over?.data.current as { shelfId: string; index?: number } | undefined;
    if (!e.over || !data) return setInsertion(null);
    if (data.index === undefined) {
      return setInsertion({ shelfId: data.shelfId, index: (itemsByShelf.get(data.shelfId) ?? []).length });
    }
    const start = e.activatorEvent as MouseEvent;
    const pointerX = (start.clientX ?? 0) + e.delta.x;
    const mid = e.over.rect.left + e.over.rect.width / 2;
    setInsertion({ shelfId: data.shelfId, index: data.index + (pointerX > mid ? 1 : 0) });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const item = find(String(e.active.id));
    const target = insertion;
    setActive(null);
    setInsertion(null);
    if (!item || !target || !e.over) return;
    let index = target.index;
    if (target.shelfId === item.shelf_id) {
      const from = (itemsByShelf.get(item.shelf_id) ?? []).findIndex((x) => x.id === item.id);
      if (from < index) index -= 1;
      if (from === index) return;
    }
    onMove?.(item.id, target.shelfId, index);
  };

  const content = (
    <div>
      <div className="shelf-unit" data-structure={structure}>
        <div className="unit-cap" aria-hidden />
        {structure === "case" && <div className="case-top" aria-hidden />}
        {shelves.map((shelf, i) => (
          <ShelfRow
            key={shelf.id}
            shelf={shelf}
            items={itemsByShelf.get(shelf.id) ?? []}
            onOpenBook={onOpenBook}
            onOpenDecor={onOpenDecor}
            readOnly={readOnly}
            justAddedId={justAddedId}
            insertion={insertion?.shelfId === shelf.id ? insertion.index : null}
            draggingId={active?.id ?? null}
            note={shelfNote?.(shelf)}
            filter={filter}
            board={structure !== "case" || i < shelves.length - 1}
          />
        ))}
        {structure === "case" && <div className="case-base" aria-hidden />}
      </div>
      {structure === "case" && floor && <div className="room-floor" aria-hidden />}
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
        setActive(null);
        setInsertion(null);
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Drag with a mouse to rearrange. Keyboard users can open an item and use its Arrange controls.",
        },
      }}
    >
      {content}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="rotate-2 drop-shadow-2xl" style={itemSize(active)}>
            <ItemVisual item={active} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ItemVisual({ item }: { item: ShelfItem }) {
  if (item.type === "decor") return <DecorArt kind={item.decor.kind} />;
  if (item.book.display === "cover")
    return (
      <span className="relative block h-full w-full overflow-hidden rounded-[3px] shadow-[0_6px_10px_-4px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.3)]">
        <BookCover book={item.book} />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28),rgba(255,255,255,0.18)_3%,transparent_9%,transparent_92%,rgba(0,0,0,0.12))]"
        />
      </span>
    );
  return <BookSpine book={item.book} />;
}

function ShelfRow({
  shelf,
  items,
  onOpenBook,
  onOpenDecor,
  readOnly,
  justAddedId,
  insertion,
  draggingId,
  note,
  filter,
  board,
}: {
  shelf: Shelf;
  items: ShelfItem[];
  onOpenBook: (b: Book) => void;
  onOpenDecor?: (d: Decor) => void;
  readOnly?: boolean;
  justAddedId?: string | null;
  insertion: number | null;
  draggingId: string | null;
  note?: ReactNode;
  filter: MarkFilter;
  board: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `shelf:${shelf.id}`, data: { shelfId: shelf.id }, disabled: readOnly });
  const headingId = `shelf-${shelf.id}-name`;
  const bookCount = items.filter((i) => i.type === "book").length;

  return (
    <>
      <section aria-labelledby={headingId} className="shelf-cell">
        <div className="flex items-baseline justify-between gap-3 px-3 pt-3 md:px-4">
          <h2 id={headingId} className="font-serif text-lg leading-tight md:text-xl">
            {shelf.name}
          </h2>
          <span className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-[11px] opacity-80 dark:bg-white/10">
            {bookCount} {bookCount === 1 ? "book" : "books"}
          </span>
        </div>
        {note && <div className="px-3 pt-2 md:px-4">{note}</div>}
        <div
          ref={setNodeRef}
          className={`shelf-scroll relative flex ${items.length ? "min-h-[calc(var(--cover-h)+20px)]" : "min-h-[calc(var(--cover-h)*0.6)]"} items-end gap-[3px] overflow-x-auto px-3 pb-0 pt-4 md:px-4 ${isOver ? "bg-accent/10" : ""}`}
          role="list"
          aria-label={`${shelf.name} shelf`}
        >
          {items.length === 0 && (
            <p className="relative self-center pb-3 text-sm italic opacity-70">
              {insertion === 0 && <Marker side="left" />}
              {readOnly ? "Empty shelf" : "Nothing on this shelf yet."}
            </p>
          )}
          {items.map((item, i) => (
            <Slot
              key={item.id}
              item={item}
              index={i}
              shelf={shelf}
              onOpenBook={onOpenBook}
              onOpenDecor={onOpenDecor}
              readOnly={readOnly}
              justAdded={item.id === justAddedId}
              dimmed={item.id === draggingId}
              faded={filter !== "all" && (item.type === "decor" || !matchesFilter(item.book, filter))}
              // Leave breathing room around face-out covers and objects, like a styled shelf.
              spaced={item.type === "decor" || item.book.display === "cover"}
              marker={insertion === i ? "left" : insertion === items.length && i === items.length - 1 ? "right" : null}
            />
          ))}
          <div className="w-2 shrink-0" aria-hidden />
        </div>
      </section>
      {board && <div className="plank" aria-hidden />}
    </>
  );
}

function Marker({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute bottom-0 top-0 z-20 w-1 rounded-full bg-accent shadow-[0_0_0_3px_rgb(var(--accent)/0.25)] ${side === "left" ? "-left-1.5" : "-right-1.5"}`}
    />
  );
}

function Slot({
  item,
  index,
  shelf,
  onOpenBook,
  onOpenDecor,
  readOnly,
  justAdded,
  dimmed,
  faded,
  spaced,
  marker,
}: {
  item: ShelfItem;
  index: number;
  shelf: Shelf;
  onOpenBook: (b: Book) => void;
  onOpenDecor?: (d: Decor) => void;
  readOnly?: boolean;
  justAdded: boolean;
  dimmed: boolean;
  faded: boolean;
  spaced: boolean;
  marker: "left" | "right" | null;
}) {
  const drag = useDraggable({ id: item.id, data: { shelfId: shelf.id }, disabled: readOnly });
  const drop = useDroppable({ id: `slot:${item.id}`, data: { shelfId: shelf.id, index }, disabled: readOnly });
  const ref = useRef<HTMLDivElement | null>(null);
  const [peek, setPeek] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (justAdded) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [justAdded]);

  const isBook = item.type === "book";
  const decorOnly = !isBook && (readOnly || !onOpenDecor);
  const label = isBook
    ? `${item.book.title}${item.book.author ? ` by ${item.book.author}` : ""}${item.book.status === "read" && item.book.rating ? `, rated ${item.book.rating} of 5` : ""}${item.book.favourite ? ", favourite" : ""}${item.book.status === "reading" ? ", reading now" : item.book.status === "to_read" ? ", to read" : ""}. Open journal entry.`
    : `${decorSpec(item.decor.kind).name}. Arrange.`;

  return (
    <div
      ref={(n) => {
        drop.setNodeRef(n);
        ref.current = n;
      }}
      role="listitem"
      data-item-id={item.id}
      className={`relative shrink-0 transition-[opacity,filter] duration-300 ${spaced ? "mx-2 md:mx-3" : ""} ${justAdded ? "animate-drop-in" : ""} ${faded ? "opacity-25 saturate-50" : ""}`}
      style={itemSize(item)}
    >
      {marker && <Marker side={marker} />}
      {decorOnly ? (
        <div role="img" aria-label={decorSpec(item.decor.kind).name} className="h-full w-full">
          <DecorArt kind={item.decor.kind} />
        </div>
      ) : (
        <button
          ref={drag.setNodeRef}
          type="button"
          {...(readOnly ? {} : drag.listeners)}
          onClick={() => {
            setPeek(null);
            if (isBook) onOpenBook(item.book);
            else onOpenDecor?.(item.decor);
          }}
          onMouseEnter={(e) => isBook && setPeek(e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setPeek(null)}
          onMouseDown={(e) => {
            setPeek(null);
            if (!readOnly) (drag.listeners as { onMouseDown?: (e: ReactMouseEvent) => void } | undefined)?.onMouseDown?.(e);
          }}
          aria-label={label}
          title={isBook ? item.book.title : decorSpec(item.decor.kind).name}
          className={`group block h-full w-full rounded-[3px] text-left outline-offset-4 ${dimmed ? "opacity-30" : ""} ${readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
        >
          <span
            className={`relative block h-full w-full origin-bottom transition-transform duration-200 ease-out motion-reduce:transform-none ${
              isBook && item.book.display === "cover" ? "group-hover:-translate-y-2 group-hover:-rotate-2" : "group-hover:-translate-y-1.5"
            } group-focus-visible:-translate-y-2`}
          >
            <ItemVisual item={item} />
            {isBook && <Ribbons book={item.book} />}
            {isBook && item.book.status === "read" && item.book.rating === 5 && (
              // On a spine the badge sits low, clear of the title and the mark ribbons.
              <span
                className={`absolute z-10 whitespace-nowrap rounded-full bg-amber-400 px-1 py-0.5 font-mono text-[9px] font-semibold leading-none text-amber-950 shadow md:text-[10px] ${
                  item.book.display === "cover" ? "-right-1.5 -top-1.5" : "bottom-[14%] left-1/2 -translate-x-1/2"
                }`}
              >
                ★5
              </span>
            )}
          </span>
        </button>
      )}
      {peek && isBook && !dimmed && <Peek book={item.book} rect={peek} />}
    </div>
  );
}

/** Hover preview: a little card above the book with the essentials. Desktop pointers only. */
function Peek({ book, rect }: { book: Book; rect: DOMRect }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120);
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-40 hidden w-56 -translate-x-1/2 -translate-y-full animate-fade-in rounded-xl bg-paper p-3 text-ink shadow-xl ring-1 ring-line [@media(hover:hover)]:block"
      style={{ left, top: rect.top - 14 }}
    >
      <p className="font-serif text-base leading-tight">{book.title}</p>
      {book.author && <p className="mt-0.5 text-xs text-ink-soft">{book.author}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {book.status === "read" ? (
          book.rating ? <StarDisplay rating={book.rating} size={14} /> : <span className="text-xs text-ink-soft">Not rated</span>
        ) : null}
        <MarkChips book={book} />
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">Click to open</p>
    </div>,
    document.body,
  );
}
