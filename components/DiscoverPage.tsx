
"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultCoverColor } from "@/lib/covers";
import { searchBooks, type SearchResult } from "@/lib/search";
import type { Book } from "@/lib/types";
import { PageTitle } from "./AppNav";
import { GeneratedCover } from "./BookCover";
import { PlusIcon, SearchIcon, XIcon } from "./Icons";

const GENRES = [
  "Fiction",
  "Fantasy",
  "Mystery",
  "Romance",
  "Science fiction",
  "Classics",
  "Poetry",
  "History",
  "Biography",
  "Philosophy",
  "Self-help",
  "Graphic novels",
];

const key = (title: string, author: string) =>
  `${title}|${author.split(",")[0]}`
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, "");

/**
 * Requests a larger cover where the image provider supports it.
 * This does not artificially enlarge or sharpen image pixels.
 */
function getBetterCoverUrl(thumbnail: string): string {
  try {
    const url = new URL(thumbnail);

    // Request a larger Google Books image.
    if (
      url.hostname === "books.google.com" &&
      url.pathname.includes("/books/content")
    ) {
      url.searchParams.set("zoom", "3");
    }

    // Request a large Open Library cover.
    if (
      url.hostname === "covers.openlibrary.org" &&
      /-[SM]\.jpg$/i.test(url.pathname)
    ) {
      url.pathname = url.pathname.replace(
        /-[SM]\.jpg$/i,
        "-L.jpg"
      );
    }

    return url.toString();
  } catch {
    return thumbnail;
  }
}

/**
 * Discover real books from the available catalogues.
 */
export function DiscoverPage({
  books,
  onAdd,
}: {
  books: Book[];
  onAdd: (r: SearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);

  const owned = useMemo(
    () => new Set(books.map((b) => key(b.title, b.author))),
    [books]
  );

  // Recommend books by authors already on the user's shelf.
  const loved = useMemo(() => {
    const score = new Map<string, number>();

    for (const b of books) {
      const author = b.author.split(",")[0].trim();

      if (!author) continue;

      score.set(
        author,
        (score.get(author) ?? 0) +
          (b.favourite ? 3 : 0) +
          (b.rating >= 4 ? 2 : 0) +
          1
      );
    }

    return [...score]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([author]) => author);
  }, [books]);

  const q = genre
    ? `subject:${genre.toLowerCase().replace(/s$/, "")}`
    : query;

  const { results, state } = useSearch(q);
  const showing = query.trim().length >= 2 || Boolean(genre);

  return (
    <div>
      <PageTitle
        title="Discover"
        sub="Find your next book and put it on your shelf."
      />

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="relative"
      >
        <label htmlFor="discover-q" className="sr-only">
          Search by title, author or ISBN
        </label>

        <SearchIcon
          width={20}
          height={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
        />

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
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5"
          >
            <XIcon width={18} height={18} />
          </button>
        )}
      </form>

      <div
        className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
        role="group"
        aria-label="Browse by genre"
      >
        {GENRES.map((g) => {
          const selected = genre === g;

          return (
            <button
              key={g}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setGenre(selected ? null : g);
                setQuery("");
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
                selected
                  ? "border-ink bg-ink text-wall"
                  : "border-line bg-paper/60 text-ink-soft hover:text-ink"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {showing ? (
          <>
            <h2 className="mb-4 font-serif text-2xl">
              {genre ?? "Results"}
            </h2>

            <Results
              results={results}
              state={state}
              owned={owned}
              onAdd={onAdd}
            />
          </>
        ) : (
          <div className="space-y-10">
            <p className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-5 text-ink-soft">
              {loved.length
                ? "Search for any book, or pick a genre to browse. Below: more by the authors on your shelf."
                : "Search for a book you love, or pick a genre to browse. Once your shelf has a few books, you’ll find more by your favourite authors here."}
            </p>

            {loved.map((author) => (
              <MoreBy
                key={author}
                author={author}
                owned={owned}
                onAdd={onAdd}
              />
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

    const controller = new AbortController();

    setState("searching");

    const timeout = window.setTimeout(async () => {
      try {
        const found = await searchBooks(
          q,
          "",
          controller.signal,
          "",
          (partial) => setResults(partial)
        );

        if (controller.signal.aborted) return;

        setResults(found);

        setState(
          !found.length &&
            typeof navigator !== "undefined" &&
            !navigator.onLine
            ? "offline"
            : "done"
        );
      } catch {
        if (!controller.signal.aborted) {
          setState("offline");
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [q]);

  return { results, state };
}

function MoreBy({
  author,
  owned,
  onAdd,
}: {
  author: string;
  owned: Set<string>;
  onAdd: (r: SearchResult) => void;
}) {
  const { results, state } = useSearch(author);

  const theirs = results.filter((r) =>
    r.author
      .toLowerCase()
      .includes(author.toLowerCase().split(" ").pop() ?? "")
  );

  if (state === "done" && !theirs.length) return null;

  return (
    <section>
      <h2 className="mb-4 font-serif text-2xl">
        More by {author}
      </h2>

      <Results
        results={theirs.slice(0, 10)}
        state={state}
        owned={owned}
        onAdd={onAdd}
      />
    </section>
  );
}

function Results({
  results,
  state,
  owned,
  onAdd,
}: {
  results: SearchResult[];
  state: SearchState;
  owned: Set<string>;
  onAdd: (r: SearchResult) => void;
}) {
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
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      aria-label="Books found"
    >
      {results.map((r) => {
        const have = owned.has(key(r.title, r.author));

        return (
          <li key={r.key} className="flex flex-col">
            <div className="aspect-[2/3] overflow-hidden rounded-[3px] bg-ink/5 shadow-md">
              {r.thumbnail ? (
                <CoverImage
                  key={r.thumbnail}
                  thumbnail={r.thumbnail}
                  title={r.title}
                  author={r.author}
                />
              ) : (
                <GeneratedCover
                  title={r.title}
                  author={r.author}
                  color={defaultCoverColor(r.title)}
                />
              )}
            </div>

            <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">
              {r.title}
            </p>

            <p className="truncate text-xs text-ink-soft">
              {r.author || "Unknown author"}
              {r.year ? (
                <span className="font-mono"> · {r.year}</span>
              ) : null}
            </p>

            <div className="mt-auto pt-2">
              {have ? (
                <span className="inline-flex h-9 items-center text-sm text-ink-soft">
                  ✓ On your shelf
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onAdd(r)}
                  className="btn-ghost h-9 w-full px-3"
                  aria-label={`Add ${r.title} to my shelf`}
                >
                  <PlusIcon width={15} height={15} />
                  Add
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CoverImage({
  thumbnail,
  title,
  author,
}: {
  thumbnail: string;
  title: string;
  author: string;
}) {
  const [failed, setFailed] = useState(false);

  const imageUrl = useMemo(
    () => getBetterCoverUrl(thumbnail),
    [thumbnail]
  );

  if (failed) {
    return (
      <GeneratedCover
        title={title}
        author={author}
        color={defaultCoverColor(title)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={`Cover of ${title}`}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}
