import type { Book, MemoryKind, Quote } from "./types";

export type SavedQuote = Quote & { legacy?: boolean };

/** Every saved line of a book: the old single "favourite line" first, then the quote list. */
export function quotesOf(book: Pick<Book, "favourite_line" | "quotes" | "created_at" | "date_finished">): SavedQuote[] {
  const list: SavedQuote[] = [];
  if (book.favourite_line?.trim()) list.push({ id: "favourite-line", text: book.favourite_line.trim(), created_at: book.date_finished ?? book.created_at, legacy: true });
  for (const q of book.quotes ?? []) if (q?.text?.trim()) list.push(q);
  return list;
}

/**
 * The kinds of memory a reader can keep from a book. Quotes and passages are the book's own words
 * (shown in quotation marks); the rest are the reader's.
 */
export const MEMORY_KINDS: { id: MemoryKind; label: string; plural: string; icon: string; quoted: boolean; placeholder: string }[] = [
  { id: "quote", label: "Quote", plural: "Quotes", icon: "❝", quoted: true, placeholder: "As it’s written in the book" },
  { id: "passage", label: "Passage", plural: "Passages", icon: "📜", quoted: true, placeholder: "A longer piece of the book you want to keep" },
  { id: "reflection", label: "Reflection", plural: "Reflections", icon: "💭", quoted: false, placeholder: "What it made you think or feel" },
  { id: "character", label: "Character", plural: "Characters", icon: "🎭", quoted: false, placeholder: "Who they are, and why they stayed with you" },
  { id: "scene", label: "Scene", plural: "Scenes", icon: "🎬", quoted: false, placeholder: "The moment you keep coming back to" },
  { id: "lesson", label: "Lesson", plural: "Lessons", icon: "🌱", quoted: false, placeholder: "Something it taught you" },
  { id: "memory", label: "Memory", plural: "Memories", icon: "🕰️", quoted: false, placeholder: "Where you were, who you were, when you read it" },
];

const KIND_IDS = new Set<string>(MEMORY_KINDS.map((k) => k.id));

/** The kind of a saved entry. Anything older or unrecognised is a quote. */
export const kindOf = (q: Pick<Quote, "kind">): MemoryKind => (q.kind && KIND_IDS.has(q.kind) ? q.kind : "quote");
export const kindInfo = (kind: MemoryKind) => MEMORY_KINDS.find((k) => k.id === kind) ?? MEMORY_KINDS[0];

/** Only the book's own words (quotes and passages), for places that show a line in quotation marks. */
export const linesOf = (book: Parameters<typeof quotesOf>[0]): SavedQuote[] => quotesOf(book).filter((q) => kindInfo(kindOf(q)).quoted);
