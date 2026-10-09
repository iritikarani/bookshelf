import { olCoverById, olCoverByIsbn } from "./covers";

/**
 * Open Library asks apps to go gently: at most two of our requests at a time, the rest wait
 * their turn (a burst of requests is what made it stop answering).
 */
let olActive = 0;
const olQueue: (() => void)[] = [];
/**
 * `first`: someone is waiting on this one (a search they typed), so it goes ahead of the
 * background requests (Discover's shelves and look-ups) instead of queueing behind them.
 */
export async function politeFetch(url: string, signal?: AbortSignal, ms = 12000, first = false): Promise<Response> {
  if (olActive >= 2) await new Promise<void>((r) => (first ? olQueue.unshift(r) : olQueue.push(r)));
  olActive++;
  try {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    // The clock starts once it's our turn, not while waiting in line.
    return await catalogFetch(url, signal, ms);
  } finally {
    olActive--;
    olQueue.shift()?.();
  }
}

/**
 * The site's own catalogue helper (/api/catalog on Vercel) answers for the phone, so a network
 * or browser that can't reach the catalogues directly still gets books, and answers are cached.
 * Where the helper doesn't exist (local preview, other hosts) requests go straight to the source.
 */
let helperMissing = false;
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

function viaHelper(url: string): string | null {
  const u = new URL(url);
  if (u.hostname === "openlibrary.org" && u.pathname === "/search.json") return `${BASE}/api/catalog?kind=search&${u.searchParams}`;
  const work = u.hostname === "openlibrary.org" && u.pathname.match(/^(\/works\/OL\d+W)\.json$/);
  if (work) return `${BASE}/api/catalog?kind=work&key=${encodeURIComponent(work[1])}`;
  if (u.hostname === "www.googleapis.com" && u.pathname === "/books/v1/volumes") return `${BASE}/api/catalog?kind=google&q=${encodeURIComponent(u.searchParams.get("q") ?? "")}`;
  return null;
}

export async function catalogFetch(url: string, signal?: AbortSignal, ms = 12000): Promise<Response> {
  const helper = typeof window !== "undefined" && !helperMissing ? viaHelper(url) : null;
  if (helper) {
    try {
      const res = await fetch(helper, { signal: withTimeout(signal, ms) });
      // A catalogue saying "too many requests" says the same to the phone: don't ask it twice.
      if (res.ok || res.status === 429) return res;
      if (res.status === 404) helperMissing = true; // no helper on this host
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  // Straight to the catalogue (also a second chance when the helper couldn't get an answer).
  return fetch(url, { signal: withTimeout(signal, ms) });
}

/** A catalogue that hasn't answered in `ms` is given up on, so nothing waits forever. */
export function withTimeout(signal?: AbortSignal, ms = 12000): AbortSignal {
  const ctrl = new AbortController();
  const stop = () => ctrl.abort();
  signal?.addEventListener("abort", stop, { once: true });
  setTimeout(stop, ms);
  return ctrl.signal;
}

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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NOISE_SUBJECTS = /accessible book|protected daisy|in library|lending library|large type|open library|staff picks|fiction, general|nyt:|reading level|overdrive|internet archive/i;

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
  for (const [re, label] of GENRES) if (clean.some((s) => re.test(s))) return label;
  const first = clean[0];
  return first && first.length <= 30 ? first.replace(/\s*\/.*$/, "") : null;
}

/** First sentence, trimmed, HTML stripped — a one-line description. */
export function oneLine(text: string | null | undefined, max = 180): string | null {
  if (!text) return null;
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return null;
  const m = plain.match(/^(.{20,}?[.!?])(\s|$)/);
  let line = m ? m[1] : plain;
  if (line.length > max) line = line.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  return line;
}

const httpsify = (url: string) =>
  url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");

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
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

/**
 * Google Books without a key shares one daily allowance with everyone else, and it often runs
 * out (HTTP 429). With NEXT_PUBLIC_GOOGLE_BOOKS_KEY set (a browser key restricted to this site),
 * the site gets its own allowance. Once Google says the allowance is used up, stop asking it for
 * the rest of the visit and let Open Library answer alone.
 */
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_KEY ?? "";
let googleOutUntil = 0;

export async function searchGoogle(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  if (Date.now() < googleOutUntil) return [];
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${PER_SOURCE}&printType=books${GOOGLE_KEY ? `&key=${encodeURIComponent(GOOGLE_KEY)}` : ""}`;
  const res = await catalogFetch(url, signal);
  if (res.status === 429 || res.status === 403) {
    googleOutUntil = Date.now() + 30 * 60 * 1000;
    return [];
  }
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: GoogleVolume[] };
  return (json.items ?? [])
    .filter((v) => v.volumeInfo?.title)
    .map((v) => {
      const info = v.volumeInfo;
      const isbns = (info.industryIdentifiers ?? [])
        .filter((i) => i.type.startsWith("ISBN"))
        .sort((a) => (a.type === "ISBN_13" ? -1 : 1))
        .map((i) => i.identifier);
      const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      const thumbnail = thumb ? httpsify(thumb) : null;
      const covers = [
        ...isbns.slice(0, 1).map((i) => olCoverByIsbn(i)),
        ...(thumbnail ? [thumbnail] : []),
      ];
      return {
        key: `g:${v.id}`,
        title: info.title!,
        author: (info.authors ?? []).join(", "),
        year: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) || null : null,
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

/** How many results to ask each source for, and how many merged results to show. */
const PER_SOURCE = 30;
const MAX_RESULTS = 30;

async function searchOpenLibrary(title: string, author: string, signal: AbortSignal, fuzzy = false, publisher = ""): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    limit: String(PER_SOURCE),
    fields: "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,first_sentence",
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
  const res = await politeFetch(`https://openlibrary.org/search.json?${params}`, signal, 12000, true);
  // Not an empty list: "Open Library didn't answer" must not look like "no such book".
  if (!res.ok) throw new Error(`Open Library answered ${res.status}`);
  const json = (await res.json()) as { docs?: OLDoc[] };
  return (json.docs ?? []).map((d) => {
    const covers = [
      ...(d.cover_i ? [olCoverById(d.cover_i)] : []),
      ...(d.isbn ?? []).slice(0, 4).map((i) => olCoverByIsbn(i)),
    ];
    return {
      key: `ol:${d.key}`,
      title: d.title,
      author: (d.author_name ?? []).slice(0, 2).join(", "),
      year: d.first_publish_year ?? null,
      pages: d.number_of_pages_median ?? null,
      genre: pickGenre(d.subject),
      description: oneLine(d.first_sentence?.[0]),
      thumbnail: d.cover_i ? olCoverById(d.cover_i, "S") : null,
      covers,
      olWorkKey: d.key,
      source: "openlibrary" as const,
    };
  });
}

/** "premchnd godan" → "premchnd~1 godan~1": lets Open Library forgive one wrong letter per word. */
function fuzzyQuery(q: string): string {
  return words(q)
    .map((w) => (w.length >= 4 ? `${w}~1` : w))
    .join(" ");
}

const words = (q: string) => q.replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** "midnight libr" → "midnight libr*": a title typed only partway still finds the book. */
function prefixQuery(q: string): string | null {
  const w = words(q);
  const last = w[w.length - 1];
  if (!last || last.length < 2 || /\s$/.test(q)) return null;
  return [...w.slice(0, -1), `${last}*`].join(" ");
}

/** The catalogues couldn't be reached (as opposed to: they answered, with no matches). */
export class CatalogueUnavailable extends Error {
  constructor() {
    super("The book catalogues didn’t answer.");
    this.name = "CatalogueUnavailable";
  }
}

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

/** Merge results from both APIs: same normalised title + first author → one entry with pooled covers. */
export function mergeResults(ol: SearchResult[], google: SearchResult[]): SearchResult[] {
  const out: SearchResult[] = [];
  const index = new Map<string, SearchResult>();
  const keyOf = (r: SearchResult) => `${norm(r.title)}|${norm(r.author.split(",")[0] ?? "")}`;
  // Interleave so both sources surface near the top.
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
    existing.year = existing.year && r.year ? Math.min(existing.year, r.year) : existing.year ?? r.year;
    existing.pages ??= r.pages;
    existing.genre ??= r.genre;
    // Prefer Google's blurb (a real description) over OL's first sentence.
    if (r.source === "google" && r.description) existing.description = r.description;
    else existing.description ??= r.description;
    existing.thumbnail ??= r.thumbnail;
    existing.olWorkKey ??= r.olWorkKey;
    if (existing.source !== r.source) existing.source = "both";
  }
  return out.slice(0, MAX_RESULTS);
}

/**
 * Search both catalogues. Any box can be left empty: a title, an author's name or a publisher
 * on its own lists matching books, and filling more boxes narrows the results.
 */
/** Recent searches, so typing back to an earlier query (or retyping it) is instant. */
const searchCache = new Map<string, SearchResult[]>();

export async function searchBooks(
  title: string,
  author: string,
  signal: AbortSignal,
  publisher = "",
  /** Called with the first results as soon as either catalogue answers, before the other has. */
  onPartial?: (results: SearchResult[]) => void,
): Promise<SearchResult[]> {
  let t = title.trim();
  let a = author.trim();
  const p = publisher.trim();
  if (t.length < 2 && a.length < 2 && p.length < 2) return [];
  if (t.length < 2) t = "";
  if (a.length < 2) a = "";
  // Only the author typed (no publisher): list their books as free text.
  if (!t && a && !p) [t, a] = [a, ""];

  // An ISBN (10 or 13 digits, dashes and spaces allowed) finds that exact edition.
  const isbn = !a && !p ? t.replace(/[\s-]/g, "") : "";
  if (/^(97[89])?\d{9}[\dXx]$/.test(isbn)) {
    let olFailed = false;
    const [ol, google] = await Promise.all([
      searchOpenLibrary(`isbn:${isbn}`, "", signal).catch(() => ((olFailed = true), [] as SearchResult[])),
      searchGoogle(`isbn:${isbn}`, signal).catch(() => [] as SearchResult[]),
    ]);
    const found = mergeResults(ol, google);
    if (!found.length && olFailed && !signal.aborted) throw new CatalogueUnavailable();
    return found;
  }

  const quote = (x: string) => `"${x.replace(/"/g, "")}"`;
  // With more than one box filled, search fields precisely; with only a title (or only an
  // author), treat it as free text so it matches titles and author names alike.
  const gq = p
    ? [t && `intitle:${t}`, a && `inauthor:${a}`, `inpublisher:${quote(p)}`].filter(Boolean).join(" ")
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
    const partial = mergeResults(olDone ?? [], googleDone ?? []);
    if (partial.length) onPartial(partial);
  };
  let olFailed = false;
  const [ol, google] = await Promise.all([
    searchOpenLibrary(t, a, signal, false, p)
      .catch(() => ((olFailed = true), [] as SearchResult[]))
      .then((r) => ((olDone = r), googleDone === null && early(), r)),
    searchGoogle(gq, signal)
      .catch(() => [] as SearchResult[])
      .then((r) => ((googleDone = r), olDone === null && early(), r)),
  ]);
  let merged = mergeResults(ol, google);
  // Few or no matches usually means a typo or a word typed only partway: try again, forgiving
  // one wrong letter per word, and with the last word as the start of a word.
  if (merged.length < 3 && !p && !olFailed && !signal.aborted) {
    // Show what we have while the forgiving search runs.
    if (merged.length) onPartial?.(merged);
    const free = a ? `${t} ${a}` : t;
    const prefix = prefixQuery(free);
    const [loose, partial] = await Promise.all([
      searchOpenLibrary(free, "", signal, true).catch(() => [] as SearchResult[]),
      prefix ? searchOpenLibrary(prefix, "", signal).catch(() => [] as SearchResult[]) : Promise.resolve([] as SearchResult[]),
    ]);
    merged = mergeResults(mergeResults(merged, partial), loose);
  }
  // Nothing found because nothing answered: say so (with a retry), not "no matches".
  if (!merged.length && olFailed && !signal.aborted) throw new CatalogueUnavailable();
  if (!signal.aborted && merged.length) {
    searchCache.set(cacheKey, merged);
    if (searchCache.size > 60) searchCache.delete(searchCache.keys().next().value!);
  }
  return merged;
}

/** Fill in a description from the Open Library work record if we don't have one. */
export async function fetchWorkDescription(workKey: string): Promise<string | null> {
  try {
    const res = await politeFetch(`https://openlibrary.org${workKey}.json`, undefined, 12000, true);
    if (!res.ok) return null;
    const json = (await res.json()) as { description?: string | { value: string } };
    const d = typeof json.description === "string" ? json.description : json.description?.value;
    return oneLine(d);
  } catch {
    return null;
  }
}
