"use client";

import type { CSSProperties } from "react";
import { hashString, heightFactor, textColorFor } from "@/lib/covers";
import type { Book } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";

/** Spine thickness in px at desktop scale, from page count. */
export function spineWidthPx(pages: number | null | undefined): number {
  const p = pages && pages > 0 ? pages : 280;
  return Math.round(Math.min(46, Math.max(20, 15 + p / 22)));
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
