import { olCoverById } from "./covers";
import { politeFetch, searchGoogle, type SearchResult } from "./search";

/**
 * Discover's sources. Trending and genre shelves come straight from Open Library; mood
 * collections are hand-picked lists of real books whose details are looked up in the catalogues.
 */

interface OLWork {
  key?: string;
  title?: string;
  author_name?: string[];
  authors?: { name?: string }[];
  cover_i?: number;
  cover_id?: number;
  first_publish_year?: number;
}

const cache = new Map<string, SearchResult[]>();

/** Open Library JSON, politely queued and given up on after a while; null when it can't answer. */
async function fetchJson<T>(url: string, signal: AbortSignal, ms = 12000): Promise<T | null> {
  try {
    const res = await politeFetch(url, signal, ms);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return null;
  }
}

// Discoveries are remembered on this device for half a day, so coming back is instant and
// doesn't ask the catalogues again.
const STORE_KEY = "exlibris:discover:v1";
const TTL = 12 * 60 * 60 * 1000;
function readStored(): Record<string, { at: number; r: SearchResult[] }> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function remember(key: string, r: SearchResult[]) {
  try {
    const all = readStored();
    all[key] = { at: Date.now(), r };
    const fresh = Object.fromEntries(Object.entries(all).filter(([, v]) => Date.now() - v.at < TTL).slice(-80));
    localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  } catch {}
}

function fromWork(w: OLWork, genre: string | null = null): SearchResult | null {
  if (!w.title) return null;
  const cover = w.cover_i ?? w.cover_id;
  const author = (w.author_name ?? w.authors?.map((a) => a.name ?? "") ?? []).filter(Boolean).join(", ");
  return {
    key: `ol:${w.key ?? w.title}`,
    title: w.title,
    author,
    year: w.first_publish_year ?? null,
    pages: null,
    genre,
    description: null,
    thumbnail: cover ? olCoverById(cover, "M") : null,
    covers: cover ? [olCoverById(cover, "L")] : [],
    olWorkKey: w.key ?? null,
    source: "openlibrary",
  };
}

async function cached(key: string, load: () => Promise<SearchResult[]>): Promise<SearchResult[]> {
  const hit = cache.get(key);
  if (hit) return hit;
  const stored = typeof window === "undefined" ? undefined : readStored()[key];
  if (stored && Date.now() - stored.at < TTL) {
    cache.set(key, stored.r);
    return stored.r;
  }
  const r = await load();
  if (r.length) {
    cache.set(key, r);
    remember(key, r);
  }
  return r;
}

/** What readers on Open Library are opening this week. */
export function trendingBooks(signal: AbortSignal): Promise<SearchResult[]> {
  return cached("trending", async () => {
    const json = await fetchJson<{ works?: OLWork[] }>("https://openlibrary.org/trending/weekly.json?limit=24", signal);
    if (!json) throw new Error("unavailable");
    return (json.works ?? []).map((w) => fromWork(w)).filter((r): r is SearchResult => Boolean(r?.thumbnail));
  });
}

/** Well-loved books in a subject, e.g. "fantasy". */
export function subjectBooks(subject: string, label: string, signal: AbortSignal): Promise<SearchResult[]> {
  const slug = subject.toLowerCase().trim().replace(/&/g, "and").replace(/\s+/g, "_");
  return cached(`subject:${slug}`, async () => {
    const json = await fetchJson<{ works?: OLWork[] }>(`https://openlibrary.org/subjects/${encodeURIComponent(slug)}.json?limit=24`, signal);
    const fromOL = (json?.works ?? []).map((w) => fromWork(w, label)).filter((r): r is SearchResult => Boolean(r?.thumbnail));
    if (fromOL.length) return fromOL;
    // Open Library slow or down: the same subject from Google Books.
    const google = await searchGoogle(`subject:"${label}"`, signal).catch(() => [] as SearchResult[]);
    if (!google.length && !json) throw new Error("unavailable");
    return google.filter((r) => r.thumbnail).map((r) => ({ ...r, genre: r.genre ?? label }));
  });
}

/** Find one known book (title + author) in Open Library: one small request per book. */
export function lookupBook(title: string, author: string, signal: AbortSignal): Promise<SearchResult | null> {
  return cached(`book:${title}|${author}`, async () => {
    const params = new URLSearchParams({ title, author, limit: "3", fields: "key,title,author_name,cover_i,first_publish_year" });
    const json = await fetchJson<{ docs?: OLWork[] }>(`https://openlibrary.org/search.json?${params}`, signal);
    const best = (json?.docs ?? []).map((w) => fromWork(w)).find((r): r is SearchResult => Boolean(r?.thumbnail));
    return best ? [best] : [];
  }).then((r) => r[0] ?? null);
}

export interface Mood {
  id: string;
  title: string;
  blurb: string;
  /** The collection's colour on the shelf card. */
  tint: string;
  books: [title: string, author: string][];
}

/** Hand-picked collections of real, well-known books. */
export const MOODS: Mood[] = [
  {
    id: "autumn",
    title: "Books that feel like autumn",
    blurb: "Old libraries, cold mornings, a little mystery.",
    tint: "#b5651d",
    books: [
      ["The Secret History", "Donna Tartt"],
      ["Rebecca", "Daphne du Maurier"],
      ["The Night Circus", "Erin Morgenstern"],
      ["Practical Magic", "Alice Hoffman"],
      ["Wuthering Heights", "Emily Brontë"],
      ["Something Wicked This Way Comes", "Ray Bradbury"],
      ["A Discovery of Witches", "Deborah Harkness"],
      ["The Thirteenth Tale", "Diane Setterfield"],
    ],
  },
  {
    id: "destroy",
    title: "Books that will destroy you emotionally",
    blurb: "Keep tissues close. You were warned.",
    tint: "#5a3d6b",
    books: [
      ["A Little Life", "Hanya Yanagihara"],
      ["The Book Thief", "Markus Zusak"],
      ["Never Let Me Go", "Kazuo Ishiguro"],
      ["The Kite Runner", "Khaled Hosseini"],
      ["The Song of Achilles", "Madeline Miller"],
      ["Flowers for Algernon", "Daniel Keyes"],
      ["A Thousand Splendid Suns", "Khaled Hosseini"],
      ["The God of Small Things", "Arundhati Roy"],
    ],
  },
  {
    id: "comfort",
    title: "Comfort reads",
    blurb: "Warm, kind and gentle, like tea on a rainy day.",
    tint: "#547562",
    books: [
      ["The House in the Cerulean Sea", "TJ Klune"],
      ["Anne of Green Gables", "L. M. Montgomery"],
      ["A Man Called Ove", "Fredrik Backman"],
      ["Legends & Lattes", "Travis Baldree"],
      ["The Guernsey Literary and Potato Peel Pie Society", "Mary Ann Shaffer"],
      ["Little Women", "Louisa May Alcott"],
      ["84, Charing Cross Road", "Helene Hanff"],
      ["Before the Coffee Gets Cold", "Toshikazu Kawaguchi"],
    ],
  },
  {
    id: "slowburn",
    title: "Slow-burn romances",
    blurb: "Glances, letters, and years of almost.",
    tint: "#c0586a",
    books: [
      ["Pride and Prejudice", "Jane Austen"],
      ["Persuasion", "Jane Austen"],
      ["North and South", "Elizabeth Gaskell"],
      ["Normal People", "Sally Rooney"],
      ["Jane Eyre", "Charlotte Brontë"],
      ["The Time Traveler's Wife", "Audrey Niffenegger"],
      ["Outlander", "Diana Gabaldon"],
      ["Beach Read", "Emily Henry"],
    ],
  },
  {
    id: "2am",
    title: "Books to read at 2 AM",
    blurb: "Just one more chapter. Lights on, maybe.",
    tint: "#2e3f5e",
    books: [
      ["The Haunting of Hill House", "Shirley Jackson"],
      ["Mexican Gothic", "Silvia Moreno-Garcia"],
      ["Gone Girl", "Gillian Flynn"],
      ["The Silent Patient", "Alex Michaelides"],
      ["Piranesi", "Susanna Clarke"],
      ["Dracula", "Bram Stoker"],
      ["Coraline", "Neil Gaiman"],
      ["The Shining", "Stephen King"],
    ],
  },
  {
    id: "oneSitting",
    title: "Short enough for one sitting",
    blurb: "Small books that stay with you for a long time.",
    tint: "#8a6a3b",
    books: [
      ["Small Things Like These", "Claire Keegan"],
      ["Foster", "Claire Keegan"],
      ["The Old Man and the Sea", "Ernest Hemingway"],
      ["Of Mice and Men", "John Steinbeck"],
      ["Convenience Store Woman", "Sayaka Murata"],
      ["The Little Prince", "Antoine de Saint-Exupéry"],
      ["Train Dreams", "Denis Johnson"],
      ["Breakfast at Tiffany's", "Truman Capote"],
    ],
  },
];

/** Genre shelves: what's shown, and the Open Library subject behind it. */
export const GENRE_SUBJECTS: [label: string, subject: string][] = [
  ["Fantasy", "fantasy"],
  ["Mystery", "mystery"],
  ["Romance", "romance"],
  ["Science fiction", "science_fiction"],
  ["Classics", "classic_literature"],
  ["Historical fiction", "historical_fiction"],
  ["Thriller", "thrillers"],
  ["Poetry", "poetry"],
  ["Biography", "biography"],
  ["Philosophy", "philosophy"],
  ["Self-help", "self-help"],
  ["Graphic novels", "graphic_novels"],
];

/** The subjects behind a reader's favourite genres, for "Recommended for you". */
export function subjectForGenre(genre: string): [string, string] | null {
  const g = genre.toLowerCase();
  return GENRE_SUBJECTS.find(([label, subject]) => g.includes(label.toLowerCase()) || label.toLowerCase().includes(g) || subject.replace(/_/g, " ").includes(g)) ?? null;
}
