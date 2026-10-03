"use client";

import type { Book, ReadStatus } from "@/lib/types";

/** Marks: a favourite heart plus where the book is in your reading life. */
export const MARKS = {
  favourite: { label: "Favourite", short: "Favourite", icon: "❤", color: "#d6455f" },
  reading: { label: "Reading now", short: "Reading", icon: "📖", color: "#e0a031" },
  to_read: { label: "To read", short: "To read", icon: "🔖", color: "#4f86c9" },
} as const;

export type MarkFilter = "all" | "favourite" | "reading" | "to_read";

export const matchesFilter = (book: Pick<Book, "favourite" | "status">, f: MarkFilter) =>
  f === "all" ? true : f === "favourite" ? book.favourite : book.status === f;

/**
 * Ribbon bookmarks, as if tucked between the pages: each one comes out of the page block at the
 * top, folds over the top edge and hangs down the front, ending in a notched tail halfway down.
 * On spines they sit near the edge so the title stays readable.
 */
export function Ribbons({ book }: { book: Pick<Book, "favourite" | "status" | "display"> }) {
  const ribbons: string[] = [];
  if (book.favourite) ribbons.push(MARKS.favourite.color);
  if (book.status === "reading") ribbons.push(MARKS.reading.color);
  if (book.status === "to_read") ribbons.push(MARKS.to_read.color);
  if (!ribbons.length) return null;
  const cover = book.display === "cover";
  return (
    <>
      {ribbons.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute -top-[3px] z-10 h-[36%] origin-top drop-shadow-[1px_1.5px_1px_rgba(0,0,0,0.35)]"
          style={{
            width: cover ? 8 : 5,
            // on a spine, a second ribbon hangs at the opposite edge so the title stays clear
            ...(cover ? { right: `calc(16% + ${i * 11}px)` } : i % 2 ? { left: 3 } : { right: 3 }),
            transform: `rotate(${i % 2 ? -1.2 : 1.2}deg)`,
          }}
        >
          {/* the bit that bends over the top edge of the pages */}
          <span className="absolute inset-x-0 top-0 h-[4px] rounded-t-[2px]" style={{ backgroundColor: `color-mix(in srgb, ${c} 70%, black)` }} />
          {/* the satin tail hanging down the front */}
          <span
            className="absolute inset-x-0 bottom-0 top-[3px]"
            style={{
              background: `linear-gradient(90deg, rgba(0,0,0,.22), rgba(255,255,255,.38) 38%, rgba(255,255,255,.1) 60%, rgba(0,0,0,.2)), linear-gradient(180deg, rgba(0,0,0,.18), transparent 18%), ${c}`,
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 6px), 0 100%)",
            }}
          />
        </span>
      ))}
    </>
  );
}

/** Small labelled chips describing a book's marks. */
export function MarkChips({ book, className = "" }: { book: Pick<Book, "favourite" | "status">; className?: string }) {
  const chips: { key: string; label: string; icon: string; color: string }[] = [];
  if (book.favourite) chips.push({ key: "favourite", ...MARKS.favourite });
  if (book.status === "reading") chips.push({ key: "reading", ...MARKS.reading });
  if (book.status === "to_read") chips.push({ key: "to_read", ...MARKS.to_read });
  if (!chips.length) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
          <span aria-hidden>{c.icon}</span>
          {c.label}
        </span>
      ))}
    </span>
  );
}

/** Editor for marks: a favourite toggle and a read / reading / to-read choice. */
export function MarkPicker({
  favourite,
  status,
  onFavourite,
  onStatus,
}: {
  favourite: boolean;
  status: ReadStatus;
  onFavourite: (v: boolean) => void;
  onStatus: (s: ReadStatus) => void;
}) {
  const statuses: { id: ReadStatus; label: string; icon: string; color?: string }[] = [
    { id: "read", label: "Read it", icon: "✓" },
    { id: "reading", label: MARKS.reading.label, icon: MARKS.reading.icon, color: MARKS.reading.color },
    { id: "to_read", label: MARKS.to_read.label, icon: MARKS.to_read.icon, color: MARKS.to_read.color },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={favourite}
        onClick={() => onFavourite(!favourite)}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
        style={favourite ? { borderColor: MARKS.favourite.color, backgroundColor: `${MARKS.favourite.color}1f`, color: MARKS.favourite.color } : undefined}
      >
        <span aria-hidden>{favourite ? "❤" : "♡"}</span> Favourite
      </button>
      <span className="mx-1 h-5 w-px bg-line" aria-hidden />
      <div role="radiogroup" aria-label="Reading status" className="inline-flex flex-wrap gap-1.5">
        {statuses.map((s) => {
          const on = status === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onStatus(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? "" : "border-line text-ink-soft hover:text-ink"}`}
              style={on ? { borderColor: s.color ?? "rgb(var(--accent))", backgroundColor: `${s.color ?? "#547562"}1f`, color: s.color ?? "rgb(var(--accent))" } : undefined}
            >
              <span aria-hidden>{s.icon}</span> {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
