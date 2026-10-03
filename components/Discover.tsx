"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultCoverColor } from "@/lib/covers";
import { bookKey } from "@/lib/goodreads";
import { INDIAN_AUTHORS, type DiscoverAuthor, type DiscoverBook } from "@/lib/indianAuthors";
import { useLibrary } from "@/lib/library";
import { lookupBook, searchAnything, type SearchResult } from "@/lib/search";
import type { BookDraft } from "@/lib/types";
import { BookCover } from "./BookCover";
import { SearchIcon, UploadIcon } from "./Icons";

const ERAS = ["All", "Classic", "Modern", "Contemporary"] as const;

/** A search result (or a curated book with no match) as a To-read draft. */
function toDraft(r: SearchResult | null, fallback: { title: string; author: string; year: number | null }, shelfId: string): BookDraft {
  return {
    shelf_id: shelfId,
    // Keep the name the reader chose (a curated title, or the search result they tapped).
    title: fallback.title,
    author: fallback.author || r?.author || "",
    cover_url: r?.covers[0] ?? null,
    uploaded_cover: null,
    cover_color: r?.covers[0] ? null : defaultCoverColor(fallback.title),
    display: "spine",
    status: "to_read",
    favourite: false,
    year_published: fallback.year ?? r?.year ?? null,
    pages: r?.pages ?? null,
    genre: r?.genre ?? null,
    short_description: r?.description ?? null,
    rating: 0,
    what_i_liked: null,
    favourite_line: null,
    date_finished: null,
  };
}

/**
 * Discover: search any book or author, browse Indian writers, or bring a Goodreads library in.
 * `onReadIt` opens the add-book form pre-filled so the reader can journal it straight away.
 */
export function Discover({ onReadIt, onImport }: { onReadIt: (r: SearchResult) => void; onImport: () => void }) {
  const { books, shelves, addBook } = useLibrary();
  const owned = useMemo(() => new Set(books.map((b) => bookKey(b.title, b.author))), [books]);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const addToRead = async (r: SearchResult | null, fallback: { title: string; author: string; year: number | null }) => {
    if (!shelves[0]) return;
    const draft = toDraft(r, fallback, shelves[0].id);
    await addBook(draft);
    setJustAdded((s) => new Set(s).add(bookKey(fallback.title, fallback.author)));
  };
  const status = (title: string, author: string) => {
    const k = bookKey(title, author);
    return justAdded.has(k) ? "added" : owned.has(k) ? "owned" : "none";
  };

  return (
    <div className="space-y-10">
      <SearchSection onReadIt={onReadIt} addToRead={addToRead} status={status} />

      <button
        type="button"
        onClick={onImport}
        className="flex w-full items-center gap-4 rounded-2xl bg-paper/80 p-4 text-left shadow-sm ring-1 ring-line/70 transition hover:ring-accent"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <UploadIcon />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">Coming from Goodreads?</span>
          <span className="block text-sm text-ink-soft">Import your whole library: shelves, ratings, reviews and dates read.</span>
        </span>
      </button>

      <IndianAuthors onReadIt={onReadIt} addToRead={addToRead} status={status} />
    </div>
  );
}

type AddFn = (r: SearchResult | null, fallback: { title: string; author: string; year: number | null }) => Promise<void>;
type StatusFn = (title: string, author: string) => "added" | "owned" | "none";

function SearchSection({ onReadIt, addToRead, status }: { onReadIt: (r: SearchResult) => void; addToRead: AddFn; status: StatusFn }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
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
    }, 400);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <section aria-labelledby="discover-search">
      <h2 id="discover-search" className="font-serif text-2xl md:text-3xl">Find any book</h2>
      <p className="mt-1 text-sm text-ink-soft">Search millions of books by title or author, in any language, from Open Library and Google Books.</p>
      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" width={18} height={18} />
        <input
          type="search"
          className="field rounded-full py-3 pl-11 text-base"
          placeholder="Try “Premchand”, “Ponniyin Selvan” or “The God of Small Things”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search books and authors"
        />
      </div>
      <p className="mt-2 h-4 text-xs text-ink-soft" aria-live="polite">
        {searching ? "Searching…" : query.trim().length >= 2 && !results.length ? "No matches yet. Try fewer words, or the author’s name." : ""}
      </p>
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-line/70 overflow-hidden rounded-2xl bg-paper/90 ring-1 ring-line/70">
          {results.map((r) => (
            <li key={r.key} className="flex items-center gap-3 p-3">
              <div className="h-[72px] w-12 shrink-0 overflow-hidden rounded-sm bg-ink/10 shadow">
                <BookCover book={{ title: r.title, author: r.author, cover_url: r.thumbnail ?? r.covers[0] ?? null, uploaded_cover: null, cover_color: defaultCoverColor(r.title) }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title}</p>
                <p className="truncate text-sm text-ink-soft">
                  {r.author || "Unknown author"}
                  {r.year && <span className="font-mono"> · {r.year}</span>}
                </p>
              </div>
              <AddButtons
                state={status(r.title, r.author)}
                onToRead={() => addToRead(r, { title: r.title, author: r.author, year: r.year })}
                onReadIt={() => onReadIt(r)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddButtons({ state, onToRead, onReadIt }: { state: "added" | "owned" | "none"; onToRead: () => void; onReadIt: () => void }) {
  const [busy, setBusy] = useState(false);
  if (state !== "none")
    return <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">{state === "added" ? "🔖 Added" : "On your shelf"}</span>;
  return (
    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
      <button
        type="button"
        className="btn-ghost bg-paper px-3 py-1.5 text-xs"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onToRead();
          } finally {
            setBusy(false);
          }
        }}
      >
        🔖 To read
      </button>
      <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={onReadIt}>
        ✓ I’ve read it
      </button>
    </div>
  );
}

function IndianAuthors({ onReadIt, addToRead, status }: { onReadIt: (r: SearchResult) => void; addToRead: AddFn; status: StatusFn }) {
  const [era, setEra] = useState<(typeof ERAS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);
  const authors = INDIAN_AUTHORS.filter((a) => era === "All" || a.era === era);

  return (
    <section aria-labelledby="discover-indian">
      <h2 id="discover-indian" className="font-serif text-2xl md:text-3xl">Indian authors</h2>
      <p className="mt-1 text-sm text-ink-soft">From Tagore and Premchand to today’s Booker winners: {INDIAN_AUTHORS.length} writers across Bengali, Hindi, Urdu, Tamil, Malayalam, Kannada, Punjabi and English.</p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="radiogroup" aria-label="Era">
        {ERAS.map((e) => (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={era === e}
            onClick={() => setEra(e)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${era === e ? "border-accent bg-accent/10 text-ink" : "border-line bg-paper/60 text-ink-soft hover:text-ink"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((a) => (
          <AuthorCard
            key={a.name}
            author={a}
            open={open === a.name}
            onToggle={() => setOpen(open === a.name ? null : a.name)}
            onReadIt={onReadIt}
            addToRead={addToRead}
            status={status}
          />
        ))}
      </div>
    </section>
  );
}

function AuthorCard({
  author,
  open,
  onToggle,
  onReadIt,
  addToRead,
  status,
}: {
  author: DiscoverAuthor;
  open: boolean;
  onToggle: () => void;
  onReadIt: (r: SearchResult) => void;
  addToRead: AddFn;
  status: StatusFn;
}) {
  const initials = author.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join("");
  return (
    <article className={`rounded-2xl bg-paper/90 ring-1 ring-line/70 transition ${open ? "shadow-md sm:col-span-2 lg:col-span-3" : "hover:shadow-sm"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-lg text-white" style={{ backgroundColor: "rgb(var(--accent))" }}>
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg leading-tight">{author.name}</span>
          <span className="block text-xs uppercase tracking-wider text-ink-soft">
            {author.language} · {author.era}
          </span>
          <span className={`mt-1.5 block text-sm text-ink-soft ${open ? "" : "line-clamp-2"}`}>{author.note}</span>
          {!open && <span className="mt-2 block truncate text-xs italic text-ink-soft">{author.books.map((b) => b.title).join(" · ")}</span>}
        </span>
      </button>
      {open && (
        <ul className="grid grid-cols-2 gap-4 px-4 pb-5 sm:grid-cols-3 lg:grid-cols-4">
          {author.books.map((b) => (
            <CuratedBook key={b.title} book={b} author={author.name} onReadIt={onReadIt} addToRead={addToRead} status={status} />
          ))}
        </ul>
      )}
    </article>
  );
}

function CuratedBook({ book, author, onReadIt, addToRead, status }: { book: DiscoverBook; author: string; onReadIt: (r: SearchResult) => void; addToRead: AddFn; status: StatusFn }) {
  const [match, setMatch] = useState<SearchResult | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    lookupBook(book.title, author).then((r) => alive && setMatch(r));
    return () => {
      alive = false;
    };
  }, [book.title, author]);

  const fallback = { title: book.title, author, year: book.year };
  // Use the found edition's cover, but keep our curated title, author and first-publication year.
  const asResult: SearchResult = {
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
    <li className="flex flex-col">
      <div className="mx-auto aspect-[2/3] w-full max-w-[120px] overflow-hidden rounded-[3px] bg-ink/5 shadow-[0_10px_18px_-8px_rgba(0,0,0,0.45)]">
        {match === undefined ? (
          <div className="h-full w-full animate-pulse bg-ink/10" aria-hidden />
        ) : (
          <BookCover book={{ title: book.title, author, cover_url: cover, uploaded_cover: null, cover_color: defaultCoverColor(book.title) }} />
        )}
      </div>
      <p className="mt-2 text-center font-serif leading-tight">{book.title}</p>
      <p className="text-center text-xs text-ink-soft">
        {book.original && <span className="italic">{book.original} · </span>}
        <span className="font-mono">{book.year ?? ""}</span>
      </p>
      <div className="mt-2 flex justify-center">
        <AddButtons state={status(book.title, author)} onToRead={() => addToRead(match ?? null, fallback)} onReadIt={() => onReadIt(asResult)} />
      </div>
    </li>
  );
}
