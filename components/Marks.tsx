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

/** The ribbons that poke out of the top of a book on the shelf. */
export function Ribbons({ book }: { book: Pick<Book, "favourite" | "status"> }) {
  const ribbons: string[] = [];
  if (book.favourite) ribbons.push(MARKS.favourite.color);
  if (book.status === "reading") ribbons.push(MARKS.reading.color);
  if (book.status === "to_read") ribbons.push(MARKS.to_read.color);
  if (!ribbons.length) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute -top-[9px] left-1/2 z-10 flex -translate-x-1/2 gap-[2px]">
      {ribbons.map((c, i) => (
        <span
          key={i}
          className="block h-[17px] w-[6px] shadow-[0_1px_1px_rgba(0,0,0,0.25)] md:h-[20px] md:w-[7px]"
          style={{ backgroundColor: c, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)" }}
        />
      ))}
    </span>
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
