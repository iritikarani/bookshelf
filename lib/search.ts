
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
  /** Candidate cover URLs, best first. Not all are guaranteed to exist — probe before showing. */
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

export function pickGenre(subjects: string[] | undefined): string | null {
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

/** First sentence, trimmed, HTML stripped — a one-line description. */
export function oneLine(
  text: string | null | undefined,
  max = 180
): string | null {
  if (!text) return null;

  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!plain) return null;

  const match = plain.match(/^(.{20,}?[.!?])(\s|$)/);
  let line = match ? match[1] : plain;

  if (line.length > max) {
    line =
      line.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  }

  return line;
}

/** Normalize image URLs and remove Google's curled-edge thumbnail effect. */
const httpsify = (url: string) =>
  url.replace(/^http:\/\//i, "https://").replace(/&edge=curl/gi, "");

/**
 * Request a larger Google Books image when supported.
 * The provider may still return a smaller image for some editions.
 */
function improveGoogleThumbnail(thumbnail: string): string {
  try {
    const url = new URL(httpsify(thumbnail));

    if (
      url.hostname === "books.google.com" &&
      url.pathname.includes("/books/content")
    ) {
      // Google Books commonly uses zoom=1 for thumbnails.
      url.searchParams.set("zoom", "2");
    }

    return url.toString();
  } catch {
    return httpsify(thumbnail);
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

/** How many results to ask each source for, and how many merged results to show. */
const PER_SOURCE = 30;
const MAX_RESULTS = 30;

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
    .filter((volume) => volume.volumeInfo?.title)
    .map((volume) => {
      const info = volume.volumeInfo;

      const isbns = (info.industryIdentifiers ?? [])
        .filter((item) => item.type.startsWith("ISBN"))
        .sort((a, b) => {
          if (a.type === "ISBN_13") return -1;
          if (b.type === "ISBN_13") return 1;
          return 0;
        })
        .map((item) => item.identifier);

      const thumb =
        info.imageLinks?.thumbnail ||
        info.imageLinks?.smallThumbnail;

      const thumbnail = thumb
        ? improveGoogleThumbnail(thumb)
        : null;

      const covers = [
        ...isbns.slice(0, 1).map((isbn) => olCoverByIsbn(isbn)),
        ...(thumbnail ? [thumbnail] : []),
      ];

      return {
        key: `g:${volume.id}`,
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
    // Free text matches titles and author names, so "premchand" lists his books.
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

  return (json.docs ?? []).map((doc) => {
    const covers = [
      ...(doc.cover_i ? [olCoverById(doc.cover_i, "L")] : []),
      ...(doc.isbn ?? [])
        .slice(0, 4)
        .map((isbn) => olCoverByIsbn(isbn, "L")),
    ];

    return {
      key: `ol:${doc.key}`,
      title: doc.title,
      author: (doc.author_name ?? []).slice(0, 2).join(", "),
      year: doc.first_publish_year ?? null,
      pages: doc.number_of_pages_median ?? null,
      genre: pickGenre(doc.subject),
      description: oneLine(doc.first_sentence?.[0]),

      // CHANGED: request the large Open Library cover, not the small thumbnail.
      thumbnail: doc.cover_i
        ? olCoverById(doc.cover_i, "L")
        : null,

      covers,
      olWorkKey: doc.key,
      source: "openlibrary" as const,
    };
  });
}

/** "premchnd godan" → "premchnd~1 godan~1": forgive one wrong letter per word. */
function fuzzyQuery(query: string): string {
  return query
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length >= 4 ? `${word}~1` : word))
    .join(" ");
}

const uniq = <T,>(items: T[]) => Array.from(new Set(items));

/** Merge results from both APIs: same normalized title + first author → one entry. */
export function mergeResults(
  ol: SearchResult[],
  google: SearchResult[]
): SearchResult[] {
  const out: SearchResult[] = [];
  const index = new Map<string, SearchResult>();

  const keyOf = (result: SearchResult) =>
    `${norm(result.title)}|${norm(result.author.split(",")[0] ?? "")}`;

  // Interleave so both sources surface near the top.
  const order: SearchResult[] = [];

  for (let i = 0; i < Math.max(ol.length, google.length); i++) {
    if (ol[i]) order.push(ol[i]);
    if (google[i]) order.push(google[i]);
  }

  for (const result of order) {
    const key = keyOf(result);
    const existing = index.get(key);

    if (!existing) {
      const copy = { ...result, covers: [...result.covers] };
      index.set(key, copy);
      out.push(copy);
      continue;
    }

    existing.covers = uniq([...existing.covers, ...result.covers]);

    existing.year =
      existing.year && result.year
        ? Math.min(existing.year, result.year)
        : existing.year ?? result.year;

    existing.pages ??= result.pages;
    existing.genre ??= result.genre;

    // Prefer Google's blurb (a real description) over OL's first sentence.
    if (result.source === "google" && result.description) {
      existing.description = result.description;
    } else {
      existing.description ??= result.description;
    }

    existing.thumbnail ??= result.thumbnail;
    existing.olWorkKey ??= result.olWorkKey;

    if (existing.source !== result.source) {
      existing.source = "both";
    }
  }

  return out.slice(0, MAX_RESULTS);
}

/**
 * Search both catalogues. Any box can be left empty: a title, an author's name
 * or a publisher on its own lists matching books.
 */

/** Recent searches, so typing back to an earlier query is instant. */
const searchCache = new Map<string, SearchResult[]>();

export async function searchBooks(
  title: string,
  author: string,
  signal: AbortSignal,
  publisher = "",
  /** Called with the first results as soon as either catalogue answers. */
  onPartial?: (results: SearchResult[]) => void
): Promise<SearchResult[]> {
  let t = title.trim();
  let a = author.trim();
  const p = publisher.trim();

  if (t.length < 2 && a.length < 2 && p.length < 2) return [];

  if (t.length < 2) t = "";
  if (a.length < 2) a = "";

  // Only the author typed (no publisher): list their books as free text.
  if (!t && a && !p) {
    [t, a] = [a, ""];
  }

  // An ISBN (10 or 13 digits, dashes and spaces allowed) finds that edition.
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

  const quote = (value: string) =>
    `"${value.replace(/"/g, "")}"`;

  // With multiple fields, search precisely; otherwise use free text.
  const googleQuery = p
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
  const cached = searchCache.get(cacheKey);

  if (cached) return cached;

  let olDone: SearchResult[] | null = null;
  let googleDone: SearchResult[] | null = null;

  const sendPartial = () => {
    if (signal.aborted || !onPartial) return;

    const partial = mergeResults(olDone ?? [], googleDone ?? []);

    if (partial.length) onPartial(partial);
  };

  const [ol, google] = await Promise.all([
    searchOpenLibrary(t, a, signal, false, p)
      .catch(() => [] as SearchResult[])
      .then((results) => {
        olDone = results;

        if (googleDone === null) sendPartial();

        return results;
      }),

    searchGoogle(googleQuery, signal)
      .catch(() => [] as SearchResult[])
      .then((results) => {
        googleDone = results;

        if (olDone === null) sendPartial();

        return results;
      }),
  ]);

  let merged = mergeResults(ol, google);

  // Few matches may mean a typo: try again with a more forgiving query.
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

/** Fill in a description from the Open Library work record if needed. */
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
