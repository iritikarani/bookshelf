"use client";

import { useEffect, useState } from "react";
import { accentFor, coverColorOf, coverImageOf, coverPalette, type Palette } from "./covers";
import type { Book } from "./types";

type CoverBook = Pick<Book, "title" | "cover_color" | "cover_url" | "uploaded_cover">;

/** The book's colours: the chosen swatch, or the main and second colour of its cover image. */
export function useCoverPalette(book: CoverBook | null): Palette {
  const fallback = book ? coverColorOf(book) : "#888888";
  const src = book && !book.cover_color ? coverImageOf(book) : null;
  const [palette, setPalette] = useState<Palette | null>(null);

  useEffect(() => {
    setPalette(null);
    if (!src) return;
    let alive = true;
    coverPalette(src).then((p) => alive && setPalette(p));
    return () => {
      alive = false;
    };
  }, [src]);

  return palette ?? { base: fallback, accent: accentFor(fallback) };
}

/** The book's signature colour: the chosen swatch, or the main colour of its cover image. */
export function useCoverColor(book: CoverBook | null): string {
  return useCoverPalette(book).base;
}
