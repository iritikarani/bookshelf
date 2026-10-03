import type { Book, Shelf } from "./types";

export function splitByReadState(shelves: Shelf[], books: Book[]) {
  const wantIds = new Set(shelves.filter((s) => s.is_want_to_read).map((s) => s.id));
  const read = books.filter((b) => !wantIds.has(b.shelf_id));
  const toRead = books.filter((b) => wantIds.has(b.shelf_id));
  return { read, toRead, wantIds };
}

export function averageRating(books: Book[]): number | null {
  const rated = books.filter((b) => b.rating > 0);
  if (!rated.length) return null;
  return rated.reduce((s, b) => s + b.rating, 0) / rated.length;
}

export const hasLine = (b: Book) => Boolean(b.favourite_line?.trim());

export function summary(shelves: Shelf[], books: Book[]) {
  const { read, toRead } = splitByReadState(shelves, books);
  return {
    booksRead: read.length,
    avgRating: averageRating(read),
    linesKept: books.filter(hasLine).length,
    toRead: toRead.length,
  };
}
