import { spineWidthPx } from "@/components/BookSpine";
import type { BookDisplay, Shelf } from "./types";

/** Matches the gap between items on a shelf row (gap-[3px]). */
const GAP = 3;

/**
 * Free width left on a shelf as it's drawn right now, in px, or null when the shelf isn't on
 * screen (another tab is open, or the example shelf is showing). Measured, not computed, so it
 * matches this screen's size.
 */
function freeWidth(shelfId: string): number | null {
  const row = document.querySelector<HTMLElement>(`[data-shelf-row="${CSS.escape(shelfId)}"]`);
  if (!row || !row.clientWidth) return null;
  const style = getComputedStyle(row);
  const inner = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 8; // 8px end spacer
  const items = row.querySelectorAll<HTMLElement>(":scope > [data-item-id]");
  const last = items[items.length - 1];
  if (!last) return inner;
  const used = last.offsetLeft + last.offsetWidth + parseFloat(getComputedStyle(last).marginRight) - parseFloat(style.paddingLeft);
  return inner - used - GAP;
}

/** How wide a new book will stand on this screen. */
function bookWidth(display: BookDisplay, pages: number | null): number {
  const root = getComputedStyle(document.documentElement);
  if (display === "cover") {
    // Face-out covers get margin on both sides (mx-2 / md:mx-3).
    const coverW = parseFloat(root.getPropertyValue("--cover-w")) || 90;
    return coverW + (window.matchMedia("(min-width: 768px)").matches ? 24 : 16);
  }
  const scale = parseFloat(root.getPropertyValue("--spine-scale")) || 1;
  return spineWidthPx(pages) * scale;
}

export type Placement = { shelfId: string } | { newBookcase: true };

/**
 * Where a new book goes. The chosen shelf if it has room; otherwise the next shelf down with
 * room, then any shelf above; otherwise a new bookcase.
 */
export function placeBook(shelves: Shelf[], chosenId: string, display: BookDisplay, pages: number | null): Placement {
  const need = bookWidth(display, pages);
  const i = Math.max(0, shelves.findIndex((s) => s.id === chosenId));
  const order = [...shelves.slice(i), ...shelves.slice(0, i)];
  for (const s of order) {
    const free = freeWidth(s.id);
    // Not drawn here: we can't tell, so trust the reader's choice.
    if (free === null) return { shelfId: chosenId };
    if (free >= need) return { shelfId: s.id };
  }
  return { newBookcase: true };
}
