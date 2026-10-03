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

async function searchGoogle(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`;
  const res = await fetch(url, { signal });
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

async function searchOpenLibrary(title: string, author: string, signal: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    limit: "10",
    fields: "key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,subject,first_sentence",
  });
  if (author) {
    params.set("title", title);
    params.set("author", author);
  } else {
    params.set("q", title);
  }
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, { signal });
  if (!res.ok) return [];
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
  return out.slice(0, 10);
}

export async function searchBooks(title: string, author: string, signal: AbortSignal): Promise<SearchResult[]> {
  const t = title.trim();
  const a = author.trim();
  if (t.length < 2) return [];
  const gq = `intitle:${t}${a ? ` inauthor:${a}` : ""}`;
  const [ol, google] = await Promise.all([
    searchOpenLibrary(t, a, signal).catch(() => [] as SearchResult[]),
    searchGoogle(gq, signal).catch(() => [] as SearchResult[]),
  ]);
  return mergeResults(ol, google);
}

/** Free-text search: a title, an author, or both ("premchand", "god of small things roy"). */
export async function searchAnything(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const [ol, google] = await Promise.all([
    searchOpenLibrary(q, "", signal).catch(() => [] as SearchResult[]),
    searchGoogle(q, signal).catch(() => [] as SearchResult[]),
  ]);
  return mergeResults(ol, google);
}

const lookups = new Map<string, Promise<SearchResult | null>>();

/**
 * Best match for a known title and author (cover, pages, description), cached for the visit.
 * Used by Discover so curated books show real covers and come with details when added.
 */
export function lookupBook(title: string, author: string): Promise<SearchResult | null> {
  const key = `${title}|${author}`.toLowerCase();
  let hit = lookups.get(key);
  if (!hit) {
    hit = searchBooks(title, author, new AbortController().signal)
      .then((results) => {
        const surname = norm(author).split(" ").pop() ?? "";
        return results.find((r) => norm(r.author).includes(surname)) ?? results[0] ?? null;
      })
      .catch(() => null);
    lookups.set(key, hit);
  }
  return hit;
}

/** Fill in a description from the Open Library work record if we don't have one. */
export async function fetchWorkDescription(workKey: string): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org${workKey}.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as { description?: string | { value: string } };
    const d = typeof json.description === "string" ? json.description : json.description?.value;
    return oneLine(d);
  } catch {
    return null;
  }
}
