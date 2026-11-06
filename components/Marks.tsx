"use client";

import { useEffect, useRef } from "react";
import type { Book, ReadStatus } from "@/lib/types";
import { SparkleBurst, useBurst } from "./Living";

/** Marks: a favourite heart plus where the book is in your reading life. */
export const MARKS = {
  favourite: { label: "Favourite", short: "Favourite", icon: "❤", color: "#d6455f" },
  reading: { label: "Reading", short: "Reading", icon: "📖", color: "#e0a031" },
  to_read: { label: "Want to read", short: "Want to read", icon: "🔖", color: "#4f86c9" },
  dnf: { label: "Didn’t finish", short: "DNF", icon: "⏸", color: "#8a7f74" },
} as const;

export type MarkFilter = "all" | "favourite" | "reading" | "to_read";

export const matchesFilter = (book: Pick<Book, "favourite" | "status">, f: MarkFilter) =>
  f === "all" ? true : f === "favourite" ? book.favourite : book.status === f;

/**
 * Ribbon bookmarks, as if tucked between the pages: each one comes out of the page block at the
 * top, folds over the top edge and hangs down the front, ending in a notched tail halfway down.
 * On spines they sit near the edge so the title stays readable.
 */
export function Ribbons({ book }: { book: Pick<Book, "favourite" | "status" | "display"> & Partial<Pick<Book, "current_page">> }) {
  const motion = useRibbonMotion(book);
  const ribbons: { color: string; kind: "favourite" | "reading" | "to_read" | "tucking" }[] = [];
  if (book.favourite) ribbons.push({ color: MARKS.favourite.color, kind: "favourite" });
  if (book.status === "reading") ribbons.push({ color: MARKS.reading.color, kind: "reading" });
  if (book.status === "to_read") ribbons.push({ color: MARKS.to_read.color, kind: "to_read" });
  // Just finished: the reading ribbon slips back in between the pages before it goes.
  if (motion.tucking) ribbons.push({ color: MARKS.reading.color, kind: "tucking" });
  if (!ribbons.length) return null;
  const cover = book.display === "cover";
  return (
    <>
      {ribbons.map(({ color: c, kind }, i) => {
        const tilt = i % 2 ? -1.2 : 1.2;
        const anim = kind === "tucking" ? "ribbon-tuck" : kind === "reading" && motion.sway ? "ribbon-sway" : "";
        return (
          <span
            key={kind === "reading" && motion.sway ? `reading-${motion.sway}` : kind}
            aria-hidden
            className={`pointer-events-none absolute -top-[3px] z-10 h-[36%] origin-top drop-shadow-[1px_1.5px_1px_rgba(0,0,0,0.35)] ${anim}`}
            style={{
              width: cover ? 8 : 4,
              // on a spine, ribbons hang right at the edges so the title stays clear
              ...(cover ? { right: `calc(16% + ${i * 11}px)` } : i % 2 ? { left: 1 } : { right: 1 }),
              transform: `rotate(${tilt}deg)`,
              ["--r" as string]: `${tilt}deg`,
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
            {kind === "favourite" && motion.sparkle && <SparkleBurst key={motion.sparkle} color={MARKS.favourite.color} />}
          </span>
        );
      })}
    </>
  );
}

/**
 * Remembers a book's last marks, so its ribbons can answer a change: the reading ribbon sways when
 * the page moves on and tucks away when the book is finished; a new favourite gets a sparkle.
 * Nothing happens on first sight, only on a change.
 */
function useRibbonMotion(book: Pick<Book, "favourite" | "status"> & Partial<Pick<Book, "current_page">>) {
  const last = useRef(book);
  const [sway, fireSway] = useBurst(950);
  const [tucking, fireTuck] = useBurst(950);
  const [sparkle, fireSparkle] = useBurst(800);
  useEffect(() => {
    const before = last.current;
    last.current = book;
    if (before.status === "reading" && book.status === "reading" && (before.current_page ?? null) !== (book.current_page ?? null)) fireSway();
    if (before.status === "reading" && book.status === "read") fireTuck();
    if (!before.favourite && book.favourite) fireSparkle();
  }, [book, book.status, book.current_page, book.favourite, fireSway, fireTuck, fireSparkle]);
  return { sway, tucking: tucking !== null, sparkle };
}

/** Small labelled chips describing a book's marks. */
export function MarkChips({ book, className = "" }: { book: Pick<Book, "favourite" | "status">; className?: string }) {
  const chips: { key: string; label: string; icon: string; color: string }[] = [];
  if (book.favourite) chips.push({ key: "favourite", ...MARKS.favourite });
  if (book.status === "reading") chips.push({ key: "reading", ...MARKS.reading });
  if (book.status === "to_read") chips.push({ key: "to_read", ...MARKS.to_read });
  if (book.status === "dnf") chips.push({ key: "dnf", ...MARKS.dnf });
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

/** Editor for marks: a favourite toggle and a want to read / reading / finished / DNF choice. */
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
  const [sparkle, fireSparkle] = useBurst(800);
  const statuses: { id: ReadStatus; label: string; icon: string; color?: string }[] = [
    { id: "to_read", label: MARKS.to_read.label, icon: MARKS.to_read.icon, color: MARKS.to_read.color },
    { id: "reading", label: MARKS.reading.label, icon: MARKS.reading.icon, color: MARKS.reading.color },
    { id: "read", label: "Finished", icon: "✓" },
    { id: "dnf", label: "DNF", icon: MARKS.dnf.icon, color: MARKS.dnf.color },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={favourite}
        onClick={() => {
          if (!favourite) fireSparkle();
          onFavourite(!favourite);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
        style={favourite ? { borderColor: MARKS.favourite.color, backgroundColor: `${MARKS.favourite.color}1f`, color: MARKS.favourite.color } : undefined}
      >
        <span aria-hidden className="relative">
          {favourite ? "❤" : "♡"}
          {sparkle && <SparkleBurst key={sparkle} color={MARKS.favourite.color} />}
        </span>{" "}
        Favourite
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
