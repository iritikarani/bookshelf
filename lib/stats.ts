import type { Book } from "./types";

export function splitByReadState(books: Book[]) {
  return {
    read: books.filter((b) => b.status === "read"),
    reading: books.filter((b) => b.status === "reading"),
    toRead: books.filter((b) => b.status === "to_read"),
  };
}

export function averageRating(books: Book[]): number | null {
  const rated = books.filter((b) => b.rating > 0);
  if (!rated.length) return null;
  return rated.reduce((s, b) => s + b.rating, 0) / rated.length;
}

export const hasLine = (b: Book) => Boolean(b.favourite_line?.trim());

export function summary(books: Book[]) {
  const { read, toRead } = splitByReadState(books);
  return {
    booksRead: read.length,
    avgRating: averageRating(read),
    quotesSaved: books.filter(hasLine).length,
    toRead: toRead.length,
  };
}
