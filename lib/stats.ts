import { quotesOf } from "./quotes";
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

export const hasLine = (b: Book) => quotesOf(b).length > 0;

export function summary(books: Book[]) {
  const { read, toRead } = splitByReadState(books);
  return {
    booksRead: read.length,
    avgRating: averageRating(read),
    quotesSaved: books.filter(hasLine).length,
    toRead: toRead.length,
  };
}

const monthKey = (iso: string) => iso.slice(0, 7); // "2026-03"
const prevMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/**
 * Reading streak: months in a row with at least one finished book, counting back from this month
 * (or last month, so a streak isn't lost on the 1st).
 */
export function monthStreak(books: Book[], today = new Date()): number {
  const months = new Set(books.filter((b) => b.status === "read" && b.date_finished).map((b) => monthKey(b.date_finished!)));
  let key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (!months.has(key)) key = prevMonth(key);
  let n = 0;
  while (months.has(key)) {
    n++;
    key = prevMonth(key);
  }
  return n;
}

/** The longest run of months in a row with a finished book, within one year. */
export function bestMonthRun(books: Book[], year: number): number {
  const months = new Set(books.filter((b) => b.status === "read" && b.date_finished?.startsWith(`${year}-`)).map((b) => Number(b.date_finished!.slice(5, 7))));
  let best = 0;
  let run = 0;
  for (let m = 1; m <= 12; m++) {
    run = months.has(m) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** The most common values (genre, author…) with how many books share each. */
export function topCounts(values: (string | null | undefined)[], n = 3): [string, number][] {
  const count = new Map<string, number>();
  for (const v of values) {
    const k = v?.trim();
    if (k) count.set(k, (count.get(k) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

export const firstAuthor = (b: Pick<Book, "author">) => b.author.split(",")[0].trim();

/** "Mr. Ajay K. Pandey" → "ajay k pandey": the same person however the name was typed. */
export function authorKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .replace(/^(mr|mrs|ms|miss|dr|prof|sir|shri|smt)\s+/, "")
    .trim();
}

/** Letters apart, counting a swap of neighbours as one ("agrawal" / "agarwal"). */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Two spellings of one author: same first name and a surname at most two letters apart. */
function sameAuthor(a: string, b: string): boolean {
  if (a === b) return true;
  const [fa, ...ra] = a.split(" ");
  const [fb, ...rb] = b.split(" ");
  if (!fa || fa !== fb || !ra.length || !rb.length) return false;
  const la = ra.join(" ");
  const lb = rb.join(" ");
  return Math.min(la.length, lb.length) >= 4 && distance(la, lb) <= 2;
}

/**
 * Authors with how many books each, counting differently typed names of the same person
 * together ("Radhika Agarwal" and "radhika agrawal"). Shown under the spelling used most.
 */
export function authorCounts(books: Pick<Book, "author">[], n = 500): [string, number][] {
  const groups: { key: string; count: number; spellings: Map<string, number> }[] = [];
  for (const b of books) {
    const name = firstAuthor(b);
    const key = authorKey(name);
    if (!key) continue;
    const g = groups.find((x) => sameAuthor(x.key, key));
    if (g) {
      g.count++;
      g.spellings.set(name, (g.spellings.get(name) ?? 0) + 1);
    } else groups.push({ key, count: 1, spellings: new Map([[name, 1]]) });
  }
  return groups
    .map((g) => [[...g.spellings].sort((a, b) => b[1] - a[1])[0][0], g.count] as [string, number])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}
