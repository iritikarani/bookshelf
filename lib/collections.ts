import type { Book } from "./types";

/**
 * Collections are your own named groups of books ("comfort reads", "book club", "made me cry").
 * They're stored as each book's tags, so a book can be in several, and nothing new is needed in
 * the database. Names are kept lower-case (see cleanTag); this gives them a capital to read well.
 */
export const collectionName = (tag: string) => (tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : tag);

export interface Collection {
  tag: string;
  name: string;
  books: Book[];
}

/** Every collection on the shelf, biggest first, each with its books (most recently changed first). */
export function collectionsOf(books: Book[]): Collection[] {
  const map = new Map<string, Book[]>();
  for (const b of books) for (const t of b.tags ?? []) if (t.trim()) map.set(t, [...(map.get(t) ?? []), b]);
  return [...map]
    .map(([tag, list]) => ({ tag, name: collectionName(tag), books: [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }))
    .sort((a, b) => b.books.length - a.books.length || a.name.localeCompare(b.name));
}

/** The names of every collection, for "add to a collection" suggestions. */
export const collectionTags = (books: Book[]) => collectionsOf(books).map((c) => c.tag);
