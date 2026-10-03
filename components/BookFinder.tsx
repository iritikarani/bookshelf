"use client";

import { useEffect, useState } from "react";
import { defaultCoverColor } from "@/lib/covers";
import { INDIAN_AUTHORS, type DiscoverAuthor, type DiscoverBook } from "@/lib/indianAuthors";
import { lookupBook, searchAnything, type SearchResult } from "@/lib/search";
import { BookCover } from "./BookCover";
import { ChevronLeft, ChevronRight, SearchIcon } from "./Icons";

const ERAS = ["All", "Classic", "Modern", "Contemporary"] as const;

/**
 * First step of "Add a book": search any book or author, or browse Indian authors.
 * Picking a book hands it to the form, which fills in the cover and details.
 */
export function BookFinder({ onPick, onManual }: { onPick: (r: SearchResult) => void; onManual: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchingNow = query.trim().length >= 2;

  useEffect(() => {
    if (!searchingNow) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = window.setTimeout(async () => {
      const r = await searchAnything(query, ctrl.signal).catch(() => []);
      if (!ctrl.signal.aborted) {
        setResults(r);
        setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, searchingNow]);

  return (
    <div className="space-y-6 pt-1">
      <div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" width={18} height={18} />
          <input
            type="search"
            data-autofocus
            className="field rounded-full py-3 pl-11 text-base"
            placeholder="Search any book or author"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search any book or author"
          />
        </div>
        <p className="mt-2 px-1 text-xs text-ink-soft" aria-live="polite">
          {searching
            ? "Searching…"
            : searchingNow && !results.length
              ? "No matches yet. Try fewer words, or the author’s name."
              : "Millions of books in every language, from Open Library and Google Books."}
        </p>
      </div>

      {searchingNow ? (
        results.length > 0 && (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl ring-1 ring-line/70" aria-label="Search results">
            {results.map((r) => (
              <li key={r.key}>
                <button type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent/5">
                  <div className="h-[66px] w-11 shrink-0 overflow-hidden rounded-sm bg-ink/10 shadow">
                    <BookCover book={{ title: r.title, author: r.author, cover_url: r.thumbnail ?? r.covers[0] ?? null, uploaded_cover: null, cover_color: defaultCoverColor(r.title) }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-sm text-ink-soft">
                      {r.author || "Unknown author"}
                      {r.year && <span className="font-mono"> · {r.year}</span>}
                    </p>
                  </div>
                  <ChevronRight width={18} height={18} className="shrink-0 text-ink-soft" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <IndianAuthors onPick={onPick} />
      )}

      <div className="border-t border-line pt-4 text-center">
        <button type="button" className="text-sm font-medium text-accent underline-offset-2 hover:underline" onClick={onManual}>
          Can’t find it? Add it by hand
        </button>
      </div>
    </div>
  );
}

function IndianAuthors({ onPick }: { onPick: (r: SearchResult) => void }) {
  const [era, setEra] = useState<(typeof ERAS)[number]>("All");
  const [open, setOpen] = useState<DiscoverAuthor | null>(null);
  const authors = INDIAN_AUTHORS.filter((a) => era === "All" || a.era === era);

  if (open) {
    return (
      <section aria-label={`Books by ${open.name}`}>
        <button type="button" onClick={() => setOpen(null)} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
          <ChevronLeft width={16} height={16} /> Indian authors
        </button>
        <h3 className="font-serif text-2xl leading-tight">{open.name}</h3>
        <p className="text-xs uppercase tracking-wider text-ink-soft">
          {open.language} · {open.era}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{open.note}</p>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {open.books.map((b) => (
            <CuratedBook key={b.title} book={b} author={open.name} onPick={onPick} />
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-soft">Looking for another of their books? Search for it above.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="finder-indian">
      <h3 id="finder-indian" className="font-serif text-xl">Browse Indian authors</h3>
      <p className="text-xs text-ink-soft">{INDIAN_AUTHORS.length} writers, from Tagore and Premchand to today’s Booker winners.</p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="radiogroup" aria-label="Era">
        {ERAS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={era === e}
            onClick={() => setEra(e)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${era === e ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-soft hover:text-ink"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {authors.map((a) => (
          <li key={a.name}>
            <button type="button" onClick={() => setOpen(a)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 ring-line/70 transition hover:bg-accent/5 hover:ring-accent/50">
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-sm text-accent-ink">
                {a.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{a.name}</span>
                <span className="block truncate text-xs text-ink-soft">
                  {a.language} · {a.books.map((b) => b.title).join(", ")}
                </span>
              </span>
              <ChevronRight width={16} height={16} className="shrink-0 text-ink-soft" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CuratedBook({ book, author, onPick }: { book: DiscoverBook; author: string; onPick: (r: SearchResult) => void }) {
  const [match, setMatch] = useState<SearchResult | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    lookupBook(book.title, author).then((r) => alive && setMatch(r));
    return () => {
      alive = false;
    };
  }, [book.title, author]);

  // Use the found edition's cover and details, but keep the curated title, author and first-publication year.
  const result: SearchResult = {
    key: `curated:${author}:${book.title}`,
    title: book.title,
    author,
    year: book.year ?? match?.year ?? null,
    pages: match?.pages ?? null,
    genre: match?.genre ?? null,
    description: match?.description ?? null,
    thumbnail: match?.thumbnail ?? null,
    covers: match?.covers ?? [],
    olWorkKey: match?.olWorkKey ?? null,
    source: match?.source ?? "openlibrary",
  };
  const cover = match?.covers[0] ?? (match?.thumbnail || null);

  return (
    <li>
      <button type="button" onClick={() => onPick(result)} className="group flex w-full flex-col items-center text-center" aria-label={`${book.title}, ${book.year ?? ""}. Add this book`}>
        <span className="block aspect-[2/3] w-full max-w-[110px] overflow-hidden rounded-[3px] bg-ink/5 shadow-[0_10px_18px_-8px_rgba(0,0,0,0.45)] transition group-hover:-translate-y-1 motion-reduce:transform-none">
          {match === undefined ? (
            <span className="block h-full w-full animate-pulse bg-ink/10" aria-hidden />
          ) : (
            <BookCover book={{ title: book.title, author, cover_url: cover, uploaded_cover: null, cover_color: defaultCoverColor(book.title) }} />
          )}
        </span>
        <span className="mt-2 font-serif leading-tight">{book.title}</span>
        <span className="text-xs text-ink-soft">
          {book.original && <span className="italic">{book.original} · </span>}
          <span className="font-mono">{book.year ?? ""}</span>
        </span>
      </button>
    </li>
  );
}
