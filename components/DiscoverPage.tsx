"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultCoverColor } from "@/lib/covers";
import { searchBooks, type SearchResult } from "@/lib/search";
import type { Book } from "@/lib/types";
import { PageTitle } from "./AppNav";
import { GeneratedCover } from "./BookCover";
import { PlusIcon, SearchIcon, XIcon } from "./Icons";

const GENRES = ["Fiction", "Fantasy", "Mystery", "Romance", "Science fiction", "Classics", "Poetry", "History", "Biography", "Philosophy", "Self-help", "Graphic novels"];

const key = (title: string, author: string) => `${title}|${author.split(",")[0]}`.toLowerCase().replace(/[^a-z0-9|]/g, "");

/**
 * Discover: find real books in the Open Library and Google Books catalogues and put them on the
 * shelf. Nothing here is invented; every result comes from a catalogue.
 */
export function DiscoverPage({ books, onAdd }: { books: Book[]; onAdd: (r: SearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const owned = useMemo(() => new Set(books.map((b) => key(b.title, b.author))), [books]);

  // Authors you rate highly or keep as favourites: their other books.
  const loved = useMemo(() => {
    const score = new Map<string, number>();
    for (const b of books) {
      const a = b.author.split(",")[0].trim();
      if (!a) continue;
      score.set(a, (score.get(a) ?? 0) + (b.favourite ? 3 : 0) + (b.rating >= 4 ? 2 : 0) + 1);
    }
    return [...score].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([a]) => a);
  }, [books]);

  const q = genre ? `subject:${genre.toLowerCase().replace(/s$/, "")}` : query;
  const { results, state } = useSearch(q);
  const showing = query.trim().length >= 2 || genre;

  return (
    <div>
      <PageTitle title="Discover" sub="Find your next book and put it on your shelf." />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="discover-q" className="sr-only">
          Search by title, author or ISBN
        </label>
        <SearchIcon width={20} height={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          id="discover-q"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={120}
          className="field h-14 rounded-2xl pl-12 pr-12 text-base shadow-sm"
          placeholder="Title, author or ISBN"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setGenre(null);
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5">
            <XIcon width={18} height={18} />
          </button>
        )}
      </form>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Browse by genre">
        {GENRES.map((g) => {
          const on = genre === g;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setGenre(on ? null : g);
                setQuery("");
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-ink bg-ink text-wall" : "border-line bg-paper/60 text-ink-soft hover:text-ink"}`}
            >
              {g}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {showing ? (
          <>
            <h2 className="mb-4 font-serif text-2xl">{genre ?? "Results"}</h2>
            <Results results={results} state={state} owned={owned} onAdd={onAdd} />
          </>
        ) : (
          <div className="space-y-10">
            <p className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-5 text-ink-soft">
              {loved.length
                ? "Search for any book, or pick a genre to browse. Below: more by the authors on your shelf."
                : "Search for a book you love, or pick a genre to browse. Once your shelf has a few books, you’ll find more by your favourite authors here."}
            </p>
            {loved.map((a) => (
              <MoreBy key={a} author={a} owned={owned} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type SearchState = "idle" | "searching" | "done" | "offline";

function useSearch(q: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setState("idle");
      return;
    }
    const ctrl = new AbortController();
    setState("searching");
    const t = window.setTimeout(async () => {
      try {
        const r = await searchBooks(q, "", ctrl.signal, "", (partial) => setResults(partial));
        if (ctrl.signal.aborted) return;
        setResults(r);
        setState(!r.length && typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "done");
      } catch {
        if (!ctrl.signal.aborted) setState("offline");
      }
    }, 300);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [q]);
  return { results, state };
}

function MoreBy({ author, owned, onAdd }: { author: string; owned: Set<string>; onAdd: (r: SearchResult) => void }) {
  const { results, state } = useSearch(author);
  const theirs = results.filter((r) => r.author.toLowerCase().includes(author.toLowerCase().split(" ").pop() ?? ""));
  if (state === "done" && !theirs.length) return null;
  return (
    <section>
      <h2 className="mb-4 font-serif text-2xl">More by {author}</h2>
      <Results results={theirs.slice(0, 10)} state={state} owned={owned} onAdd={onAdd} />
    </section>
  );
}

function Results({ results, state, owned, onAdd }: { results: SearchResult[]; state: SearchState; owned: Set<string>; onAdd: (r: SearchResult) => void }) {
  if (!results.length) {
    return (
      <p className="py-6 text-ink-soft" aria-live="polite">
        {state === "searching"
          ? "Searching the catalogues…"
          : state === "offline"
            ? "Couldn’t reach the book catalogues. Check your connection and try again."
            : "No matches. Try fewer words, the author’s name, or the ISBN."}
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-label="Books found">
      {results.map((r) => {
        const have = owned.has(key(r.title, r.author));
        return (
          <li key={r.key} className="flex flex-col">
            <div className="aspect-[2/3] overflow-hidden rounded-[3px] bg-ink/5 shadow-md">
              {r.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnail} alt={`Cover of ${r.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              ) : (
                <GeneratedCover title={r.title} author={r.author} color={defaultCoverColor(r.title)} />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
            <p className="truncate text-xs text-ink-soft">
              {r.author || "Unknown author"}
              {r.year ? <span className="font-mono"> · {r.year}</span> : null}
            </p>
            <div className="mt-auto pt-2">
              {have ? (
                <span className="inline-flex h-9 items-center text-sm text-ink-soft">✓ On your shelf</span>
              ) : (
                <button type="button" onClick={() => onAdd(r)} className="btn-ghost h-9 w-full px-3" aria-label={`Add ${r.title} to my shelf`}>
                  <PlusIcon width={15} height={15} /> Add
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
