import { searchGoogle } from "./search";

/**
 * A stand-in for a cover that won't load: the same book's cover from Google Books.
 *
 * Open Library (where most saved covers live) is sometimes down for hours. Rather than every
 * cover turning into a plain designed one, the book is looked up on Google Books (through the
 * site's catalogue helper) and its cover shown instead. Only a result with the same title (and
 * author, when we have one) is used, so a book never gets someone else's cover. Nothing is
 * saved to the book itself: the shelf goes back to its own cover once that loads again.
 */

type Lookup = { title: string; author: string; cover_url: string | null };

const KEY = "exlibris:standInCovers";
const found = new Map<string, string>(
  (() => {
    try {
      if (typeof window === "undefined") return [];
      return JSON.parse(localStorage.getItem(KEY) ?? "[]") as [string, string][];
    } catch {
      return [];
    }
  })(),
);
const pending = new Map<string, Promise<string | null>>();

function remember(id: string, url: string) {
  found.set(id, url);
  try {
    localStorage.setItem(KEY, JSON.stringify([...found].slice(-400)));
  } catch {}
}

const plain = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*[:(].*$/, "") // "Title: A Novel", "Title (Book 2)"
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const surname = (author: string) => plain(author.split(",")[0]).split(" ").pop() ?? "";

const isbnOf = (url: string | null) => url?.match(/covers\.openlibrary\.org\/b\/isbn\/([\dXx]{10,13})-/)?.[1] ?? null;

/** A Google Books cover for this book, or null if none that clearly matches. */
export function findStandInCover(book: Lookup): Promise<string | null> {
  const id = `${plain(book.title)}|${surname(book.author)}`;
  if (found.has(id)) return Promise.resolve(found.get(id)!);
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;
  const job = (async () => {
    const isbn = isbnOf(book.cover_url);
    const queries = [
      ...(isbn ? [`isbn:${isbn}`] : []),
      `intitle:${book.title.replace(/[:(].*$/, "").trim()}${book.author ? ` inauthor:${book.author.split(",")[0].trim()}` : ""}`,
    ];
    for (const q of queries) {
      try {
        const results = await searchGoogle(q, new AbortController().signal);
        const match = results.find(
          (r) => r.thumbnail && plain(r.title) === plain(book.title) && (!book.author || !surname(book.author) || plain(r.author).includes(surname(book.author))),
        );
        if (match?.thumbnail) {
          remember(id, match.thumbnail);
          return match.thumbnail;
        }
      } catch {}
    }
    return null;
  })();
  pending.set(id, job);
  job.finally(() => pending.delete(id));
  return job;
}

/**
 * Whether Open Library covers seem to be down for this visit: several failed and none loaded.
 * Then covers go straight to their stand-ins instead of each waiting for Open Library to fail.
 */
let olFailures = 0;
let olLoaded = false;
export function noteOpenLibraryCover(ok: boolean) {
  if (ok) olLoaded = true;
  else olFailures++;
}
export const openLibraryLooksDown = () => !olLoaded && olFailures >= 3;
