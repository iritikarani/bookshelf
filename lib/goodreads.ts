import { olCoverById } from "./covers";
import { politeFetch } from "./search";
import type { BookDraft, ReadStatus } from "./types";

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/** Goodreads writes ISBNs as ="0141439513" so spreadsheets keep the leading zero. */
const cleanIsbn = (v: string | undefined) => (v ?? "").replace(/[^0-9Xx]/g, "");

/** "2023/05/14" → "2023-05-14"; anything unreadable → null. */
function goodreadsDate(v: string | undefined): string | null {
  const m = (v ?? "").trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

const toInt = (v: string | undefined) => {
  const n = parseInt((v ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Goodreads reviews are HTML-ish: turn breaks into newlines, drop the rest of the tags. */
const cleanReview = (v: string | undefined) => {
  const text = (v ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
};

/** A book from the export, plus what's needed to find its cover. */
export type ImportedBook = Omit<BookDraft, "shelf_id"> & { isbn?: string };

export interface GoodreadsImport {
  books: ImportedBook[];
  counts: { read: number; reading: number; toRead: number; favourites: number };
}

/**
 * Turn a Goodreads library export (My Books → Import and export → Export library) into books.
 * Throws a readable error when the file isn't a Goodreads export.
 */
export function readGoodreadsExport(text: string): GoodreadsImport {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("That file is empty.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const iTitle = col("Title");
  const iAuthor = col("Author");
  if (iTitle < 0 || iAuthor < 0 || col("Exclusive Shelf") < 0) {
    throw new Error("This doesn't look like a Goodreads export. On Goodreads, go to My Books → Import and export → Export library.");
  }
  const get = (r: string[], name: string) => {
    const i = col(name);
    return i >= 0 ? r[i] : undefined;
  };

  const counts = { read: 0, reading: 0, toRead: 0, favourites: 0 };
  const books: ImportedBook[] = [];
  for (const r of rows.slice(1)) {
    // Goodreads appends the series, e.g. "Harry Potter and the Philosopher's Stone (Harry Potter, #1)".
    const title = (r[iTitle] ?? "").trim().replace(/\s*\([^()]*#\s*\d+(?:\.\d+)?\)\s*$/, "");
    if (!title) continue;
    const shelf = (get(r, "Exclusive Shelf") ?? "").trim().toLowerCase();
    const status: ReadStatus =
      shelf === "currently-reading" ? "reading" : shelf === "to-read" ? "to_read" : /did-?not-?finish|dnf|abandon/.test(shelf) ? "dnf" : "read";
    const shelves = (get(r, "Bookshelves") ?? "").toLowerCase();
    const favourite = /\bfavou?rites?\b/.test(shelves);
    // The reader's own Goodreads shelves become tags ("book-club" → "book club").
    const tags = [
      ...new Set(
        shelves
          .split(",")
          .map((t) => t.trim().replace(/-/g, " "))
          .filter((t) => t && !/^(read|to read|currently reading|favou?rites?)$/.test(t)),
      ),
    ].slice(0, 20);
    const rating = Math.min(5, Math.max(0, toInt(get(r, "My Rating")) ?? 0));
    const isbn = cleanIsbn(get(r, "ISBN13")) || cleanIsbn(get(r, "ISBN"));

    if (status === "read") counts.read++;
    else if (status === "reading" || status === "dnf") counts.reading++;
    else counts.toRead++;
    if (favourite) counts.favourites++;

    books.push({
      title,
      author: (r[iAuthor] ?? "").trim(),
      cover_url: null,
      isbn: isbn || undefined,
      uploaded_cover: null,
      cover_color: null,
      display: "spine",
      status,
      favourite,
      year_published: toInt(get(r, "Original Publication Year")) ?? toInt(get(r, "Year Published")),
      pages: toInt(get(r, "Number of Pages")),
      genre: null,
      short_description: null,
      rating: status === "read" ? rating : 0,
      what_i_liked: cleanReview(get(r, "My Review")),
      favourite_line: null,
      date_finished: status === "read" ? goodreadsDate(get(r, "Date Read")) : null,
      ...(tags.length ? { tags } : {}),
    });
  }
  if (!books.length) throw new Error("No books found in that file.");
  return { books, counts };
}

/** Normalised title+author, for skipping books already on the shelf. */
export const bookKey = (title: string, author: string) => {
  // Letters in any script (so two Hindi titles never look alike), accents ignored.
  const plain = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return `${plain(title).replace(/\s*\(.*?\)\s*/g, " ").replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim()}|${plain(author).replace(/[^\p{L}\p{M}]+/gu, "")}`;
};

/**
 * Find a book's cover on Open Library (through the site's catalogue helper): by ISBN when the
 * export has one, else by title and author. Returns a cover-ID URL, which Open Library serves
 * without the per-visitor limit its ISBN covers have.
 */
export async function findCover(b: Pick<ImportedBook, "title" | "author" | "isbn">, signal?: AbortSignal): Promise<string | null> {
  const tries: URLSearchParams[] = [];
  if (b.isbn) tries.push(new URLSearchParams({ q: `isbn:${b.isbn}` }));
  tries.push(new URLSearchParams({ title: b.title, ...(b.author ? { author: b.author.split(",")[0] } : {}) }));
  for (const params of tries) {
    params.set("fields", "cover_i");
    params.set("limit", "3");
    try {
      const res = await politeFetch(`https://openlibrary.org/search.json?${params}`, signal, 9000);
      if (!res.ok) continue;
      const json = (await res.json()) as { docs?: { cover_i?: number }[] };
      const id = json.docs?.find((d) => d.cover_i)?.cover_i;
      if (id) return olCoverById(id);
    } catch {
      if (signal?.aborted) return null;
    }
  }
  return null;
}
