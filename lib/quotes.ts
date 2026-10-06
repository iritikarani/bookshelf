import type { Book, Quote } from "./types";

export type SavedQuote = Quote & { legacy?: boolean };

/** Every saved line of a book: the old single "favourite line" first, then the quote list. */
export function quotesOf(book: Pick<Book, "favourite_line" | "quotes" | "created_at" | "date_finished">): SavedQuote[] {
  const list: SavedQuote[] = [];
  if (book.favourite_line?.trim()) list.push({ id: "favourite-line", text: book.favourite_line.trim(), created_at: book.date_finished ?? book.created_at, legacy: true });
  for (const q of book.quotes ?? []) if (q?.text?.trim()) list.push(q);
  return list;
}
