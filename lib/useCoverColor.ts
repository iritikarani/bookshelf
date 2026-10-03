"use client";

import { useEffect, useState } from "react";
import { averageImageColor, coverColorOf, coverImageOf } from "./covers";
import type { Book } from "./types";

/** The book's signature colour: the chosen swatch, or the average colour of its cover image. */
export function useCoverColor(book: Pick<Book, "title" | "cover_color" | "cover_url" | "uploaded_cover"> | null): string {
  const fallback = book ? coverColorOf(book) : "#888888";
  const src = book && !book.cover_color ? coverImageOf(book) : null;
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    setColor(null);
    if (!src) return;
    let alive = true;
    averageImageColor(src).then((c) => alive && setColor(c));
    return () => {
      alive = false;
    };
  }, [src]);

  return color ?? fallback;
}
