"use client";

import type { CSSProperties } from "react";
import { hashString, heightFactor, textColorFor } from "@/lib/covers";
import type { Book, BookDisplay } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";

/** Spine thickness in px at desktop scale, from page count. */
export function spineWidthPx(pages: number | null | undefined): number {
  const p = pages && pages > 0 ? pages : 280;
  return Math.round(Math.min(46, Math.max(20, 15 + p / 22)));
}

/** The ways a book can sit on the shelf, for pickers. */
export const DISPLAY_OPTIONS: { id: BookDisplay; name: string }[] = [
  { id: "spine", name: "Standing" },
  { id: "lean", name: "Leaning" },
  { id: "stack", name: "Lying in a pile" },
  { id: "cover", name: "Cover out" },
];

/** A tiny drawing of each pose, for the pickers. */
export function PoseIcon({ pose }: { pose: BookDisplay }) {
  return (
    <svg viewBox="0 0 20 16" className="h-4 w-5 shrink-0" fill="currentColor" aria-hidden>
      {pose === "spine" && (
        <>
          <rect x="4" y="2" width="4" height="13" rx="0.8" />
          <rect x="9" y="4" width="3.5" height="11" rx="0.8" opacity=".6" />
          <rect x="13.5" y="1" width="3" height="14" rx="0.8" />
        </>
      )}
      {pose === "lean" && (
        <>
          <rect x="3" y="2" width="4" height="13" rx="0.8" />
          <rect x="8.4" y="2.4" width="3.6" height="13" rx="0.8" transform="rotate(16 12 15)" opacity=".75" />
        </>
      )}
      {pose === "stack" && (
        <>
          <rect x="2" y="12" width="16" height="3" rx="0.8" />
          <rect x="3.5" y="8.4" width="13" height="3" rx="0.8" opacity=".7" />
          <rect x="2.6" y="4.8" width="14" height="3" rx="0.8" />
        </>
      )}
      {pose === "cover" && <rect x="5" y="1.5" width="10" height="13.5" rx="1" />}
    </svg>
  );
}

/** How far a leaning book tilts, and the extra room its top needs (≈ sin of the angle). */
export const LEAN_DEG = 9;
const LEAN_REACH = 0.16;
/** Flat books piled on top of each other, at most this many to a pile. */
export const PILE_MAX = 4;

const spineW = (pages: number | null | undefined) => `calc(${spineWidthPx(pages)}px * var(--spine-scale))`;
const spineH = (pages: number | null | undefined) => `calc(var(--cover-h) * ${heightFactor(pages).toFixed(3)})`;

/** A leaning book's slot: its spine plus room for the top to tip over. */
export function leanSize(book: Pick<Book, "pages">): CSSProperties {
  return { width: `calc(${spineWidthPx(book.pages)}px * var(--spine-scale) + var(--cover-h) * ${(heightFactor(book.pages) * LEAN_REACH).toFixed(3)})`, height: spineH(book.pages) };
}

/** A book lying flat: as long as the book is tall, as high as its spine is thick. */
export function stackSize(book: Pick<Book, "pages">): CSSProperties {
  return { width: spineH(book.pages), height: spineW(book.pages) };
}

export function spineSize(book: Pick<Book, "pages">): CSSProperties {
  return {
    width: `calc(${spineWidthPx(book.pages)}px * var(--spine-scale))`,
    height: `calc(var(--cover-h) * ${heightFactor(book.pages).toFixed(3)})`,
  };
}

/** A book standing spine-out: cover colour, title running top to bottom, a few classic details. */
export function BookSpine({ book }: { book: Pick<Book, "title" | "author" | "cover_color" | "cover_url" | "uploaded_cover" | "pages"> }) {
  const color = useCoverColor(book);
  const ink = textColorFor(color);
  const variant = hashString(book.title) % 4;
  const w = spineWidthPx(book.pages);
  const fontSize = `calc(${Math.min(13, Math.max(8, w * 0.36)).toFixed(1)}px * var(--spine-scale))`;
  const surname = book.author.split(",")[0].trim().split(/\s+/).pop() ?? "";

  return (
    <div className="spine" style={{ backgroundColor: color, color: ink }}>
      {variant === 0 && (
        <>
          <span aria-hidden className="absolute inset-x-0 top-[6%] h-[2px] bg-current opacity-40" />
          <span aria-hidden className="absolute inset-x-0 top-[8%] h-[1px] bg-current opacity-40" />
          <span aria-hidden className="absolute inset-x-0 bottom-[16%] h-[1px] bg-current opacity-40" />
          <span aria-hidden className="absolute inset-x-0 bottom-[18%] h-[2px] bg-current opacity-40" />
        </>
      )}
      {variant === 1 && <span aria-hidden className="absolute inset-x-[14%] top-[22%] bottom-[30%] rounded-[1px] bg-white/35 mix-blend-soft-light" />}
      {variant === 3 && <span aria-hidden className="absolute inset-x-0 top-0 h-[12%] bg-black/15" />}
      <span className="spine-title font-serif" style={{ fontSize, ...(variant === 2 && ink === "#ffffff" ? { color: "#e8cf8a" } : {}) }}>
        {book.title}
      </span>
      {surname && w >= 24 && (
        <span className="mt-[6px] max-w-full truncate px-[2px] font-sans uppercase tracking-wide opacity-75" style={{ fontSize: `calc(${Math.max(6, w * 0.2).toFixed(1)}px * var(--spine-scale))` }}>
          {surname.slice(0, 6)}
        </span>
      )}
    </div>
  );
}
