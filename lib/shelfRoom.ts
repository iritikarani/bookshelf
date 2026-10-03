import { spineWidthPx } from "@/components/BookSpine";
import { decorSpec } from "@/components/Decor";
import type { BookDisplay, Shelf, ShelfItem } from "./types";

/** Matches the gap between items on a shelf row (gap-[3px]). */
const GAP = 3;
const WIDTH_KEY = "exlibris:shelfWidth";

interface Metrics {
  coverW: number;
  coverH: number;
  spineScale: number;
  /** Side margins around face-out covers and objects (mx-2, md:mx-3). */
  margin: number;
}

function metrics(): Metrics {
  const root = getComputedStyle(document.documentElement);
  return {
    coverW: parseFloat(root.getPropertyValue("--cover-w")) || 90,
    coverH: parseFloat(root.getPropertyValue("--cover-h")) || 136,
    spineScale: parseFloat(root.getPropertyValue("--spine-scale")) || 1,
    margin: window.matchMedia("(min-width: 768px)").matches ? 24 : 16,
  };
}

function bookWidth(display: BookDisplay, pages: number | null, m: Metrics): number {
  return display === "cover" ? m.coverW + m.margin : spineWidthPx(pages) * m.spineScale;
}

function itemWidth(item: ShelfItem, m: Metrics): number {
  if (item.type === "book") return bookWidth(item.book.display, item.book.pages, m);
  const d = decorSpec(item.decor.kind);
  return m.coverH * d.h * (d.viewBox[0] / d.viewBox[1]) + m.margin;
}

/**
 * The usable width of one shelf on this screen. Measured from a shelf on screen when there is
 * one (and remembered), so it works from any tab; otherwise estimated from the window.
 */
function shelfWidth(): number {
  const row = document.querySelector<HTMLElement>("[data-shelf-row]");
  if (row?.clientWidth) {
    const s = getComputedStyle(row);
    const w = row.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - 8; // 8px end spacer
    try {
      localStorage.setItem(WIDTH_KEY, `${window.innerWidth}:${w}`);
    } catch {}
    return w;
  }
  try {
    const [vw, w] = (localStorage.getItem(WIDTH_KEY) ?? "").split(":").map(Number);
    if (vw === window.innerWidth && w > 0) return w;
  } catch {}
  // Page gutter, bookcase frame and shelf padding, roughly.
  const md = window.matchMedia("(min-width: 768px)").matches;
  return Math.min(window.innerWidth, 1152) - (md ? 64 : 32) - 24 - (md ? 32 : 24) - 8;
}

export type Placement = { shelfId: string } | { newBookcase: true };

/**
 * Where a new book goes. The chosen shelf if it has room; otherwise the next shelf down with
 * room, then any shelf above; when every shelf is full, a new bookcase.
 */
export function placeBook(shelves: Shelf[], itemsByShelf: Map<string, ShelfItem[]>, chosenId: string, display: BookDisplay, pages: number | null): Placement {
  const m = metrics();
  const width = shelfWidth();
  const need = bookWidth(display, pages, m);
  const i = Math.max(0, shelves.findIndex((s) => s.id === chosenId));
  const order = [...shelves.slice(i), ...shelves.slice(0, i)];
  for (const s of order) {
    const items = itemsByShelf.get(s.id) ?? [];
    const used = items.reduce((sum, it) => sum + itemWidth(it, m) + GAP, 0);
    if (width - used >= need) return { shelfId: s.id };
  }
  return { newBookcase: true };
}
