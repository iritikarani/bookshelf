
import { olCoverById, olCoverByIsbn } from "./covers";

export interface SearchResult {
  key: string;
  title: string;
  author: string;
  year: number | null;
  pages: number | null;
  genre: string | null;
  description: string | null;
  thumbnail: string | null;
  /** Candidate cover URLs, best first. */
  covers: string[];
  olWorkKey: string | null;
  source: "google" | "openlibrary" | "both";
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NOISE_SUBJECTS =
  /accessible book|protected daisy|in library|lending library|large type|open library|staff picks|fiction, general|nyt:|reading level|overdrive|internet archive/i;

const GENRES: [RegExp, string][] = [
  [/science fiction|sci-fi/i, "Science fiction"],
  [/fantasy/i, "Fantasy"],
  [/mystery|detective/i, "Mystery"],
  [/thriller|suspense/i, "Thriller"],
  [/horror/i, "Horror"],
  [/romance|love stories/i, "Romance"],
  [/poetry|poems/i, "Poetry"],
  [/biography|autobiography|memoir/i, "Biography & memoir"],
  [/history|historical/i, "History"],
  [/philosophy/i, "Philosophy"],
  [/self-help|self help/i, "Self-help"],
  [/young adult|juvenile/i, "Young adult"],
  [/classic/i, "Classics"],
  [/graphic novel|comics/i, "Graphic novel"],
  [/science/i, "Science"],
  [/business|economics/i, "Business"],
  [/fiction/i, "Fiction"],
];

export function pickGenre(
  subjects: string[] | undefined
): string | null {
  if (!subjects?.length) return null;

  const clean = subjects.filter((s) => !NOISE_SUBJECTS.test(s));

  for (const [re, label] of GENRES) {
    if (clean.some((s) => re.test(s))) return label;
  }

  const first = clean[0];

  return first && first.length <= 30
    ? first.replace(/\s*\/.*$/, "")
    : null;
}

/** Return a short, plain-text book description. */
export function oneLine(
  text: string | null | undefined,
  max = 180
): string | null {
  if (!text) return null;

  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return null;

  const match = plain.match(/^(.{20,}?[.!?])(\s|$)/);
  let line = match ? match[1] : plain;

  if (line.length > max) {
    line =
      line.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  }

  return line;
}

const httpsify = (url: string) =>
  url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");

/**
 * Ask Google Books for a larger cover when supported.
 * This does not create detail missing from the original image.
 */
function improveGoogleCoverUrl(url: string): string {
  try {
    const parsed = new URL(httpsify(url));

    if (
      parsed.hostname === "books.google.com" &&
      parsed.pathname.includes("/books/content")
    ) {
      parsed.searchParams.set("zoom", "2");
    }

    return parsed.toString();
  } catch {
    return httpsify(url);
  }
}

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    description?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    industryIdentifiers?: {
      type: string;
      identifier: string;
    }[];
  };
}

async function searchGoogle(
  query: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}` +
    `&maxResults=${PER_SOURCE}&printType=books`;

  const res = await fetch(url, { signal });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    items?: GoogleVolume[];
  };

  return (json.items ?? [])
    .filter((v) => v.volumeInfo?.title)
    .map((v) => {
      const info = v.volumeInfo;

      const isbns = (info.industryIdentifiers ?? [])
        .filter((i) => i.type.startsWith("ISBN"))
        .sort((a) => (a.type === "ISBN_13" ? -1 : 1))
        .map((i) => i.identifier);

      const thumb =
        info.imageLinks?.thumbnail ||
        info.imageLinks?.smallThumbnail;

      const thumbnail = thumb
        ? improveGoogleCoverUrl(thumb)
        : null;

      const covers = [
        ...isbns.slice(0, 1).map((i) => olCoverByIsbn(i)),
        ...(thumbnail ? [thumbnail] : []),
      ];

      return {
        key: `g:${v.id}`,
        title: info.title!,
        author: (info.authors ?? []).join(", "),
        year: info.publishedDate
          ? Number(info.publishedDate.slice(0, 4)) || null
          : null,
        pages: info.pageCount || null,
        genre: pickGenre(info.categories),
        description: oneLine(info.description),
        thumbnail,
        covers,
        olWorkKey: null,
        source: "google" as const,
      };
    });
}

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  first_sentence?: string[];
}

/** Number of results requested from each source. */
const PER_SOURCE = 30;
const MAX_RESULTS = 30;

async function searchOpenLibrary(
  title: string,
  author: string,
  signal: AbortSignal,
  fuzzy = false,
  publisher = ""
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    limit: String(PER_SOURCE),
    fields:
      "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,first_sentence",
  });

  if (publisher) {
    params.set("publisher", publisher);
    if (title) params.set("title", title);
    if (author) params.set("author", author);
  } else if (author) {
    params.set("title", title);
    params.set("author", author);
  } else {
    params.set("q", fuzzy ? fuzzyQuery(title) : title);
  }

  const res = await fetch(
    `https://openlibrary.org/search.json?${params}`,
    { signal }
  );

  if (!res.ok) return [];

  const json = (await res.json()) as {
    docs?: OLDoc[];
  };

  return (json.docs ?? []).map((d) => {
    const covers = [
      ...(d.cover_i ? [olCoverById(d.cover_i, "L")] : []),
      ...(d.isbn ?? [])
        .slice(0, 4)
        .map((i) => olCoverByIsbn(i)),
    ];

    return {
      key: `ol:${d.key}`,
      title: d.title,
      author: (d.author_name ?? []).slice(0, 2).join(", "),
      year: d.first_publish_year ?? null,
      pages: d.number_of_pages_median ?? null,
      genre: pickGenre(d.subject),
      description: oneLine(d.first_sentence?.[0]),

      // CHANGED: request a large cover instead of a small thumbnail.
      thumbnail: d.cover_i
        ? olCoverById(d.cover_i, "L")
        : null,

      covers,
      olWorkKey: d.key,
      source: "openlibrary" as const,
    };
  });
}

/** Allow Open Library to forgive one incorrect letter per word. */
function fuzzyQuery(q: string): string {
  return q
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length >= 4 ? `${w}~1` : w))
    .join(" ");
}

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

/** Merge matching books from both catalogues. */
export function mergeResults(
  ol: SearchResult[],
  google: SearchResult[]
): SearchResult[] {
  const out: SearchResult[] = [];
  const index = new Map<string, SearchResult>();

  const keyOf = (r: SearchResult) =>
    `${norm(r.title)}|${norm(r.author.split(",")[0] ?? "")}`;

  const order: SearchResult[] = [];

  for (let i = 0; i < Math.max(ol.length, google.length); i++) {
    if (ol[i]) order.push(ol[i]);
    if (google[i]) order.push(google[i]);
  }

  for (const r of order) {
    const k = keyOf(r);
    const existing = index.get(k);

    if (!existing) {
      const copy = { ...r, covers: [...r.covers] };
      index.set(k, copy);
      out.push(copy);
      continue;
    }

    existing.covers = uniq([...existing.covers, ...r.covers]);

    existing.year =
      existing.year && r.year
        ? Math.min(existing.year, r.year)
        : existing.year ?? r.year;

    existing.pages ??= r.pages;
    existing.genre ??= r.genre;

    if (r.source === "google" && r.description) {
      existing.description = r.description;
    } else {
      existing.description ??= r.description;
    }

    existing.thumbnail ??= r.thumbnail;
    existing.olWorkKey ??= r.olWorkKey;

    if (existing.source !== r.source) {
      existing.source = "both";
    }
  }

  return out.slice(0, MAX_RESULTS);
}

/** Cache recent searches so repeated queries can return quickly. */
const searchCache = new Map<string, SearchResult[]>();

export async function searchBooks(
  title: string,
  author: string,
  signal: AbortSignal,
  publisher = "",
  onPartial?: (results: SearchResult[]) => void
): Promise<SearchResult[]> {
  let t = title.trim();
  let a = author.trim();
  const p = publisher.trim();

  if (t.length < 2 && a.length < 2 && p.length < 2) {
    return [];
  }

  if (t.length < 2) t = "";
  if (a.length < 2) a = "";

  // If only an author is supplied, search for their books.
  if (!t && a && !p) {
    [t, a] = [a, ""];
  }

  // Search for an exact edition when the query is an ISBN.
  const isbn = !a && !p ? t.replace(/[\s-]/g, "") : "";

  if (/^(97[89])?\d{9}[\dXx]$/.test(isbn)) {
    const [ol, google] = await Promise.all([
      searchOpenLibrary(`isbn:${isbn}`, "", signal).catch(
        () => [] as SearchResult[]
      ),
      searchGoogle(`isbn:${isbn}`, signal).catch(
        () => [] as SearchResult[]
      ),
    ]);

    return mergeResults(ol, google);
  }

  const quote = (x: string) => `"${x.replace(/"/g, "")}"`;

  const gq = p
    ? [
        t && `intitle:${t}`,
        a && `inauthor:${a}`,
        `inpublisher:${quote(p)}`,
      ]
        .filter(Boolean)
        .join(" ")
    : a
      ? `intitle:${t} inauthor:${a}`
      : t;

  const cacheKey = [t, a, p].join("|").toLowerCase();
  const hit = searchCache.get(cacheKey);

  if (hit) return hit;

  let olDone: SearchResult[] | null = null;
  let googleDone: SearchResult[] | null = null;

  const early = () => {
    if (signal.aborted || !onPartial) return;

    const partial = mergeResults(
      olDone ?? [],
      googleDone ?? []
    );

    if (partial.length) onPartial(partial);
  };

  const [ol, google] = await Promise.all([
    searchOpenLibrary(t, a, signal, false, p)
      .catch(() => [] as SearchResult[])
      .then((r) => {
        olDone = r;
        if (googleDone === null) early();
        return r;
      }),

    searchGoogle(gq, signal)
      .catch(() => [] as SearchResult[])
      .then((r) => {
        googleDone = r;
        if (olDone === null) early();
        return r;
      }),
  ]);

  let merged = mergeResults(ol, google);

  // Retry a small result set with a more forgiving query.
  if (merged.length < 3 && !p && !signal.aborted) {
    if (merged.length) onPartial?.(merged);

    const loose = await searchOpenLibrary(
      a ? `${t} ${a}` : t,
      "",
      signal,
      true
    ).catch(() => [] as SearchResult[]);

    merged = mergeResults(merged, loose);
  }

  if (!signal.aborted && merged.length) {
    searchCache.set(cacheKey, merged);

    if (searchCache.size > 60) {
      searchCache.delete(searchCache.keys().next().value!);
    }
  }

  return merged;
}

/** Fetch a description from an Open Library work record. */
export async function fetchWorkDescription(
  workKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org${workKey}.json`
    );

    if (!res.ok) return null;

    const json = (await res.json()) as {
      description?: string | { value: string };
    };

    const description =
      typeof json.description === "string"
        ? json.description
        : json.description?.value;

    return oneLine(description);
  } catch {
    return null;
  }
}
