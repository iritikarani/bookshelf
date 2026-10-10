"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
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
import { hashString, heightFactor } from "@/lib/covers";
import type { Structure } from "@/lib/themes";
import type { Book, Decor, Shelf, ShelfItem } from "@/lib/types";
import { BookCover } from "./BookCover";
import { BookSpine, LEAN_DEG, PILE_MAX, leanSize, spineSize, stackSize } from "./BookSpine";
import { DecorArt, decorSize, decorSpec } from "./Decor";
import { MARKS, MarkChips, Ribbons, matchesFilter, type MarkFilter } from "./Marks";
import { ProgressBar, progressPercent } from "./ReadingProgress";
import { StarDisplay, formatRating } from "./StarRating";

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
  /** Stack bookcases one above the other instead of side by side (the share image can't swipe). */
  stacked?: boolean;
  /** Shelves per bookcase (room editor). */
  perCase?: number;
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

/** Names that only describe position ("Top shelf", "Shelf 4") or the demo; these stay off the visible shelf. */
const PLAIN_SHELF_NAMES = new Set(["top shelf", "middle shelf", "bottom shelf", "example shelf"]);
const isPlainShelfName = (name: string) => PLAIN_SHELF_NAMES.has(name.trim().toLowerCase()) || /^shelf \d+$/i.test(name.trim());

const coverSize = (book: Pick<Book, "pages">): CSSProperties => ({
  width: "var(--cover-w)",
  height: `calc(var(--cover-h) * ${heightFactor(book.pages).toFixed(3)})`,
});

const itemSize = (item: ShelfItem): CSSProperties => {
  if (item.type === "decor") return decorSize(item.decor.kind);
  const { display } = item.book;
  return display === "cover" ? coverSize(item.book) : display === "lean" ? leanSize(item.book) : display === "stack" ? stackSize(item.book) : spineSize(item.book);
};

type Lean = "left" | "right";

/**
 * Puts a spine in its pose inside the item's slot: tipped over against a neighbour (pivoting on
 * the bottom corner it rests on), or turned on its side to lie flat. Standing books pass through.
 */
function Posed({ item, lean = "right", children }: { item: ShelfItem; lean?: Lean; children: ReactNode }) {
  const display = item.type === "book" ? item.book.display : null;
  if (item.type !== "book" || (display !== "lean" && display !== "stack")) return <>{children}</>;
  const size = spineSize(item.book);
  if (display === "stack")
    return (
      <span className="absolute left-1/2 top-1/2 block" style={{ ...size, transform: "translate(-50%, -50%) rotate(-90deg)" }}>
        {children}
      </span>
    );
  return (
    <span
      className="absolute bottom-0 block"
      style={{
        ...size,
        ...(lean === "left" ? { right: 0, transformOrigin: "bottom left" } : { left: 0, transformOrigin: "bottom right" }),
        transform: `rotate(${lean === "left" ? -LEAN_DEG : LEAN_DEG}deg)`,
      }}
    >
      {children}
    </span>
  );
}

/** Something a book can lean on: a standing book, a face-out cover or an object. */
const holdsUp = (item?: ShelfItem) => Boolean(item && (item.type === "decor" || item.book.display === "spine" || item.book.display === "cover"));

/** A leaning book tips toward a neighbour that can hold it up: the one before it if it can, else the one after. */
function leanSide(items: ShelfItem[], i: number): Lean {
  if (holdsUp(items[i - 1])) return "left";
  if (holdsUp(items[i + 1])) return "right";
  return i > 0 ? "left" : "right";
}

/** Runs of flat books become piles (bottom book first); everything else stands in the row. */
type Segment = { item: ShelfItem; index: number }[];
const isFlat = (item: ShelfItem) => item.type === "book" && item.book.display === "stack";
function toSegments(items: ShelfItem[]): Segment[] {
  const out: Segment[] = [];
  items.forEach((item, index) => {
    const last = out[out.length - 1];
    if (isFlat(item) && last && isFlat(last[0].item) && last.length < PILE_MAX) last.push({ item, index });
    else out.push([{ item, index }]);
  });
  return out;
}

export function ShelfWall({ shelves, itemsByShelf, structure, onOpenBook, onOpenDecor, onMove, justAddedId, readOnly, floor = true, shelfNote, filter = "all", stacked, perCase = SHELVES_PER_BOOKCASE }: ShelfWallProps) {
  const [active, setActive] = useState<ShelfItem | null>(null);
  const [insertion, setInsertion] = useState<Insertion | null>(null);
  // Mouse: drag after a small move. Touch: press and hold for a moment, so a quick swipe still
  // scrolls the page and a tap still opens the book.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

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
    const start = e.activatorEvent as MouseEvent | TouchEvent;
    const startX = "touches" in start ? (start.touches[0] ?? start.changedTouches[0])?.clientX ?? 0 : start.clientX ?? 0;
    const pointerX = startX + e.delta.x;
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

  const cases = toBookcases(shelves, perCase);
  const renderCase = (group: Shelf[]) => (
    <div className="shelf-unit" data-structure={structure}>
      <div className="unit-cap" aria-hidden />
      {structure === "case" && <div className="case-top" aria-hidden />}
      {group.map((shelf, i) => (
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
          board={structure !== "case" || i < group.length - 1}
        />
      ))}
      {structure === "case" && <div className="case-base" aria-hidden />}
    </div>
  );

  const content = (
    <div>
      {cases.length <= 1 ? (
        renderCase(shelves)
      ) : stacked ? (
        <div className="space-y-8">{cases.map((group, i) => <div key={i}>{renderCase(group)}</div>)}</div>
      ) : (
        <Bookcases count={cases.length}>{cases.map((group) => renderCase(group))}</Bookcases>
      )}
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
          <div className="relative rotate-2 drop-shadow-2xl" style={itemSize(active)}>
            <Posed item={active}>
              <ItemVisual item={active} />
            </Posed>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** How many shelves one bookcase holds. When they're all full, a new bookcase is added. */
export const SHELVES_PER_BOOKCASE = 3;

function toBookcases(shelves: Shelf[], perCase: number): Shelf[][] {
  const out: Shelf[][] = [];
  for (let i = 0; i < shelves.length; i += perCase) out.push(shelves.slice(i, i + perCase));
  return out;
}

/** Bookcases stand side by side; one fills the view at a time, and you swipe (or tap the arrows) to the next. */
function Bookcases({ count, children }: { count: number; children: ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (el) setCurrent(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-3 text-sm">
        <button type="button" onClick={() => go(current - 1)} disabled={current === 0} className="rounded-full bg-paper/80 px-3 py-1 shadow ring-1 ring-line disabled:opacity-40" aria-label="Previous bookcase">
          ←
        </button>
        <span className="rounded-full bg-paper/80 px-3 py-1 font-medium shadow ring-1 ring-line" aria-live="polite">
          Bookcase {current + 1} of {count}
        </span>
        <button type="button" onClick={() => go(current + 1)} disabled={current >= count - 1} className="rounded-full bg-paper/80 px-3 py-1 shadow ring-1 ring-line disabled:opacity-40" aria-label="Next bookcase">
          →
        </button>
      </div>
      <div ref={ref} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" aria-label="Bookcases">
        {children.map((c, i) => (
          <section key={i} aria-label={`Bookcase ${i + 1} of ${count}`} className="w-full shrink-0 snap-start">
            {c}
          </section>
        ))}
      </div>
    </div>
  );
}

function ItemVisual({ item }: { item: ShelfItem }) {
  if (item.type === "decor")
    return (
      <span className="shelf-item-shadow block h-full w-full">
        <DecorArt kind={item.decor.kind} />
      </span>
    );
  if (item.book.display === "cover")
    return (
      <span className="shelf-item-shadow cover-3d">
        <span className="cover-face">
          <BookCover book={item.book} />
        </span>
      </span>
    );
  return (
    <span className="shelf-item-shadow block h-full w-full">
      <BookSpine book={item.book} />
    </span>
  );
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
  // A real shelf doesn't say "top shelf". Only names the reader chose are shown on the wood.
  const showName = !isPlainShelfName(shelf.name);

  return (
    <>
      <section aria-labelledby={headingId} className="shelf-cell">
        {/* inside of the compartment: side walls, underside of the shelf above, the surface books stand on */}
        <span aria-hidden className="cell-depth cell-wall-l" />
        <span aria-hidden className="cell-depth cell-wall-r" />
        <span aria-hidden className="cell-depth cell-ceiling" />
        <span aria-hidden className="cell-depth cell-surface" />
        <h2 id={headingId} className={showName ? "px-3 pt-3 font-serif text-base leading-tight opacity-80 md:px-4 md:text-lg" : "sr-only"}>
          {shelf.name}
        </h2>
        {note && <div className="px-3 pt-2 md:px-4">{note}</div>}
        <div
          ref={setNodeRef}
          data-shelf-row={shelf.id}
          className={`shelf-row shelf-scroll relative flex ${items.length ? "min-h-[calc(var(--cover-h)+20px)]" : "min-h-[calc(var(--cover-h)*0.6)]"} items-end gap-[3px] overflow-x-auto px-3 pb-0 ${showName ? "pt-4" : "pt-7"} md:px-4 ${isOver ? "bg-accent/10" : ""}`}
          role="list"
          aria-label={`${shelf.name} shelf`}
        >
          {items.length === 0 && (
            // An empty shelf is left bare; only screen readers are told it's empty.
            <p className="relative self-center pb-3">
              {insertion === 0 && <Marker side="left" />}
              <span className="sr-only">Empty shelf</span>
            </p>
          )}
          {toSegments(items).map((segment) => {
            const slot = ({ item, index: i }: Segment[number], pile: boolean) => (
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
                lean={leanSide(items, i)}
                // Books in a pile never line up perfectly.
                nudge={pile ? (hashString(item.id) % 9) - 4 : 0}
              />
            );
            if (!isFlat(segment[0].item)) return slot(segment[0], false);
            return (
              <div key={`pile:${segment[0].item.id}`} role="none" className="flex shrink-0 flex-col-reverse items-center px-1">
                {segment.map((entry) => slot(entry, true))}
              </div>
            );
          })}
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
  lean,
  nudge = 0,
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
  lean: Lean;
  nudge?: number;
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
    ? `${item.book.title}${item.book.author ? ` by ${item.book.author}` : ""}${item.book.status === "read" && item.book.rating ? `, rated ${formatRating(item.book.rating)} of 5` : ""}${item.book.favourite ? ", favourite" : ""}${item.book.status === "reading" ? ", reading now" : item.book.status === "to_read" ? ", want to read" : item.book.status === "dnf" ? ", did not finish" : ""}. Open journal entry.`
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
      style={{ ...itemSize(item), ...(nudge ? { transform: `translateX(${nudge}px)` } : {}) }}
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
          className={`group block h-full w-full select-none rounded-[3px] text-left outline-offset-4 [-webkit-touch-callout:none] ${dimmed ? "opacity-30" : ""} ${readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
        >
          <span
            className={`relative block h-full w-full origin-bottom transition-transform duration-200 ease-out motion-reduce:transform-none ${
              isBook && item.book.display === "cover" ? "group-hover:-translate-y-2 group-hover:-rotate-2" : "group-hover:-translate-y-1.5"
            } group-focus-visible:-translate-y-2`}
          >
            <Posed item={item} lean={lean}>
              <ItemVisual item={item} />
              {isBook && <Ribbons book={item.book} />}
              {isBook && item.book.status === "read" && item.book.rating === 5 && (
                // On a spine the badge sits low, clear of the title and the mark ribbons.
                <span
                  className={`absolute z-10 whitespace-nowrap rounded-full bg-amber-400 px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-amber-950 shadow md:text-xs ${
                    item.book.display === "cover" ? "-right-1.5 -top-1.5" : `bottom-[14%] left-1/2 -translate-x-1/2 ${item.book.display === "stack" ? "rotate-90" : ""}`
                  }`}
                >
                  ★5
                </span>
              )}
            </Posed>
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
      {book.status === "reading" && progressPercent(book) !== null && (
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar percent={progressPercent(book)!} color={MARKS.reading.color} className="flex-1" />
          <span className="font-mono text-xs text-ink-soft">p. {book.current_page}/{book.pages}</span>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-soft">Click to open</p>
    </div>,
    document.body,
  );
}
