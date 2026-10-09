"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { coverSources, defaultCoverColor } from "@/lib/covers";
import { GENRE_SUBJECTS, MOODS, lookupBook, subjectBooks, subjectForGenre, trendingBooks, type Mood } from "@/lib/discover";
import { fetchWorkDescription, searchBooks, type SearchResult } from "@/lib/search";
import { store } from "@/lib/store";
import { topCounts } from "@/lib/stats";
import type { Book, PublicShelfCard } from "@/lib/types";
import { PageTitle } from "./AppNav";
import { Avatar } from "./Avatar";
import { GeneratedCover } from "./BookCover";
import { PlusIcon, SearchIcon, XIcon } from "./Icons";
import { Sheet } from "./Sheet";

const ownKey = (title: string, author: string) => `${title}|${author.split(",")[0]}`.toLowerCase().replace(/[^a-z0-9|]/g, "");

type Load = "idle" | "loading" | "done" | "error";

/** Run a catalogue request, but only once the section scrolls near the screen. */
function useLazyList(load: (signal: AbortSignal) => Promise<SearchResult[]>, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [list, setList] = useState<SearchResult[]>([]);
  const [state, setState] = useState<Load>("idle");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  useEffect(() => {
    if (!seen) return;
    const ctrl = new AbortController();
    setState("loading");
    load(ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setList(r);
        setState("done");
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        // One quiet second try before saying anything.
        if (attempt === 0) window.setTimeout(() => setAttempt((n) => (n === 0 ? 1 : n)), 2500);
        else setState("error");
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, attempt, ...deps]);
  return { ref, list, state, retry: () => setAttempt((n) => n + 1) };
}

/**
 * Discover: real books from the Open Library and Google Books catalogues, gathered into
 * recommendations, trending books, moods, genres and other readers' public shelves.
 */
export function DiscoverPage({ books, onAdd }: { books: Book[]; onAdd: (r: SearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<SearchResult | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const owned = useMemo(() => new Set(books.map((b) => ownKey(b.title, b.author))), [books]);
  const has = (r: SearchResult) => owned.has(ownKey(r.title, r.author));

  // "Recommended for you": the subjects behind your most-shelved genres.
  const recommended = useMemo(() => {
    const out: [string, string][] = [];
    for (const [g] of topCounts(books.map((b) => b.genre), 6)) {
      const s = subjectForGenre(g);
      if (s && !out.some(([, sub]) => sub === s[1])) out.push(s);
    }
    return out.slice(0, 2);
  }, [books]);

  const open = (r: SearchResult) => setPreview(r);
  const searching = query.trim().length >= 2;

  return (
    <div>
      <PageTitle title="Discover" sub="Find your next story and give it a place on your shelf." />

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
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5">
            <XIcon width={18} height={18} />
          </button>
        )}
      </form>

      {searching ? (
        <SearchResults query={query} has={has} onOpen={open} />
      ) : (
        <div className="mt-10 space-y-12">
          {recommended.map(([label, subject]) => (
            <Strip key={subject} title={`Recommended for you · ${label}`} sub="Because your shelf loves it" load={(s) => subjectBooks(subject, label, s)} deps={[subject]} has={has} onOpen={open} />
          ))}

          <section aria-labelledby="moods">
            <h2 id="moods" className="font-serif text-2xl">
              Collections for every mood
            </h2>
            <p className="mb-4 text-sm text-ink-soft">Hand-picked shelves of much-loved books.</p>
            <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {MOODS.map((m) => (
                <li key={m.id} className="w-[78%] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none">
                  <MoodCard mood={m} onOpen={() => setMood(m)} />
                </li>
              ))}
            </ul>
          </section>

          <Strip title="Trending now" sub="What readers on Open Library are reading and saving" load={trendingBooks} deps={[]} has={has} onOpen={open} />

          <GenreShelves has={has} onOpen={open} />

          <ReaderShelves />
        </div>
      )}

      <MoodSheet mood={mood} has={has} onClose={() => setMood(null)} onOpen={open} />
      <BookPreview result={preview} owned={preview ? has(preview) : false} onClose={() => setPreview(null)} onAdd={(r) => (setPreview(null), onAdd(r))} />
    </div>
  );
}

function SearchResults({ query, has, onOpen }: { query: string; has: (r: SearchResult) => boolean; onOpen: (r: SearchResult) => void }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<Load>("idle");
  useEffect(() => {
    const ctrl = new AbortController();
    setState("loading");
    const t = window.setTimeout(async () => {
      try {
        const r = await searchBooks(query, "", ctrl.signal, "", (partial) => setResults(partial));
        if (ctrl.signal.aborted) return;
        setResults(r);
        setState(!r.length && typeof navigator !== "undefined" && !navigator.onLine ? "error" : "done");
      } catch {
        if (!ctrl.signal.aborted) setState("error");
      }
    }, 300);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query]);
  return (
    <section className="mt-8" aria-label="Search results">
      {results.length ? <CoverGrid results={results} has={has} onOpen={onOpen} /> : <Status state={state} empty="No matches. Try fewer words, the author’s name, or the ISBN." />}
    </section>
  );
}

function Status({ state, empty, onRetry }: { state: Load; empty: string; onRetry?: () => void }) {
  if (state === "loading" || state === "idle") return <SkeletonRow />;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-ink-soft/30 px-4 py-4 text-sm text-ink-soft" aria-live="polite">
      <p>{state === "error" ? "The book catalogues are slow to answer right now." : empty}</p>
      {state === "error" && onRetry && (
        <button type="button" className="btn-ghost bg-paper/70 py-1.5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Loading books">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="w-[100px] shrink-0 md:w-[118px]">
          <div className="aspect-[2/3] animate-pulse rounded-[3px] bg-ink/10" />
          <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-ink/10" />
        </div>
      ))}
    </div>
  );
}

function Strip({ title, sub, load, deps, has, onOpen, keepEmpty }: { title: string; sub?: string; keepEmpty?: boolean; load: (s: AbortSignal) => Promise<SearchResult[]>; deps: unknown[]; has: (r: SearchResult) => boolean; onOpen: (r: SearchResult) => void }) {
  const { ref, list, state, retry } = useLazyList(load, deps);
  if (state === "done" && !list.length && !keepEmpty) return <div ref={ref} />;
  return (
    <section ref={ref} aria-label={title || undefined}>
      {title && <h2 className="font-serif text-2xl">{title}</h2>}
      {sub && <p className="mb-4 text-sm text-ink-soft">{sub}</p>}
      {list.length ? <CoverStrip results={list} has={has} onOpen={onOpen} /> : <Status state={state} empty="Nothing here right now." onRetry={retry} />}
    </section>
  );
}

/** Cover images to try, sharpest first: the catalogue's large covers, then its thumbnail. */
function coverCandidates(r: SearchResult): string[] {
  const all = [...r.covers, ...(r.thumbnail ? [r.thumbnail] : [])];
  return [...new Set(all)].slice(0, 4);
}

function Cover({ r, width = 118 }: { r: SearchResult; width?: number }) {
  const candidates = useMemo(() => coverCandidates(r), [r]);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [candidates]);
  const url = candidates[i];
  const { src, srcSet } = url ? coverSources(url, width) : { src: "", srcSet: undefined };
  return (
    <div className="aspect-[2/3] overflow-hidden rounded-[3px] bg-ink/5 shadow-[2px_4px_10px_-3px_rgba(0,0,0,.45)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-active:translate-y-0 motion-reduce:transform-none">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={src}
          srcSet={srcSet}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setI((n) => n + 1)}
          // Open Library answers some missing covers with a 1×1 image.
          onLoad={(e) => e.currentTarget.naturalWidth < 10 && setI((n) => n + 1)}
        />
      ) : (
        <GeneratedCover title={r.title} author={r.author} color={defaultCoverColor(r.title)} />
      )}
    </div>
  );
}

function CoverButton({ r, owned, onOpen }: { r: SearchResult; owned: boolean; onOpen: (r: SearchResult) => void }) {
  return (
    <button type="button" onClick={() => onOpen(r)} className="group block w-full text-left" aria-label={`${r.title}${r.author ? ` by ${r.author}` : ""}${owned ? ", on your shelf" : ""}. Open.`}>
      <div className="relative">
        <Cover r={r} />
        {owned && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-paper/95 px-2 py-0.5 text-[11px] font-medium shadow">✓ On your shelf</span>}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
      <p className="truncate text-xs text-ink-soft">{r.author || "Unknown author"}</p>
    </button>
  );
}

function CoverStrip({ results, has, onOpen }: { results: SearchResult[]; has: (r: SearchResult) => boolean; onOpen: (r: SearchResult) => void }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {results.map((r) => (
        <li key={r.key} className="w-[100px] shrink-0 snap-start md:w-[118px]">
          <CoverButton r={r} owned={has(r)} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function CoverGrid({ results, has, onOpen }: { results: SearchResult[]; has: (r: SearchResult) => boolean; onOpen: (r: SearchResult) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6" aria-label="Books found">
      {results.map((r) => (
        <li key={r.key}>
          <CoverButton r={r} owned={has(r)} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

/** A mood collection as a little shelf of spines in its own colour. */
function MoodCard({ mood, onOpen }: { mood: Mood; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full overflow-hidden rounded-3xl bg-paper/85 text-left ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:transform-none">
      <div className="flex h-28 items-end gap-1 px-5 pt-5" style={{ background: `linear-gradient(180deg, ${mood.tint}1f, transparent)` }} aria-hidden>
        {mood.books.slice(0, 7).map(([t], i) => (
          <span
            key={t}
            className="block w-4 rounded-t-[2px] shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5"
            style={{ height: `${64 + ((i * 37) % 30)}px`, backgroundColor: i % 2 ? mood.tint : defaultCoverColor(t), transitionDelay: `${i * 20}ms` }}
          />
        ))}
      </div>
      <div className="plank mx-3 rounded-sm" aria-hidden />
      <div className="px-5 pb-5 pt-3">
        <p className="font-serif text-xl leading-snug">{mood.title}</p>
        <p className="mt-1 text-sm text-ink-soft">{mood.blurb}</p>
      </div>
    </button>
  );
}

function MoodSheet({ mood, has, onClose, onOpen }: { mood: Mood | null; has: (r: SearchResult) => boolean; onClose: () => void; onOpen: (r: SearchResult) => void }) {
  return (
    <Sheet open={Boolean(mood)} onClose={onClose} title={mood?.title ?? "Collection"} wide>
      {mood && (
        <>
          <p className="-mt-2 mb-5 text-ink-soft">{mood.blurb}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {mood.books.map(([title, author]) => (
              <li key={title}>
                <MoodBook title={title} author={author} has={has} onOpen={(r) => (onClose(), onOpen(r))} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

/** One book of a collection: its real catalogue entry, looked up when the collection opens. */
function MoodBook({ title, author, has, onOpen }: { title: string; author: string; has: (r: SearchResult) => boolean; onOpen: (r: SearchResult) => void }) {
  const [r, setR] = useState<SearchResult | null | undefined>(undefined);
  useEffect(() => {
    const ctrl = new AbortController();
    lookupBook(title, author, ctrl.signal)
      .then((x) => !ctrl.signal.aborted && setR(x))
      .catch(() => !ctrl.signal.aborted && setR(null));
    return () => ctrl.abort();
  }, [title, author]);
  // Until (or unless) the catalogue answers, the book is shown by its title and author alone.
  const shown: SearchResult = r ?? { key: title, title, author, year: null, pages: null, genre: null, description: null, thumbnail: null, covers: [], olWorkKey: null, source: "openlibrary" };
  return <CoverButton r={shown} owned={has(shown)} onOpen={onOpen} />;
}

function GenreShelves({ has, onOpen }: { has: (r: SearchResult) => boolean; onOpen: (r: SearchResult) => void }) {
  const [genre, setGenre] = useState(GENRE_SUBJECTS[0]);
  return (
    <section aria-labelledby="genres">
      <h2 id="genres" className="mb-3 font-serif text-2xl">
        Browse by genre
      </h2>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="radiogroup" aria-label="Genre">
        {GENRE_SUBJECTS.map((g) => {
          const on = g[1] === genre[1];
          return (
            <button
              key={g[1]}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setGenre(g)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-ink bg-ink text-wall" : "border-line bg-paper/60 text-ink-soft hover:text-ink"}`}
            >
              {g[0]}
            </button>
          );
        })}
      </div>
      <Strip key={genre[1]} title="" keepEmpty load={(s) => subjectBooks(genre[1], genre[0], s)} deps={[genre[1]]} has={has} onOpen={onOpen} />
    </section>
  );
}

/** Other readers' public shelves. Only shelves their owners chose to share are ever listed. */
function ReaderShelves() {
  const [shelves, setShelves] = useState<PublicShelfCard[] | null>(null);
  useEffect(() => {
    let alive = true;
    store
      .listPublicShelves(12)
      .then((s) => alive && setShelves(s))
      .catch(() => alive && setShelves([]));
    return () => {
      alive = false;
    };
  }, []);
  if (!shelves?.length) return null;
  return (
    <section aria-labelledby="readers">
      <h2 id="readers" className="font-serif text-2xl">
        Shelves you might like
      </h2>
      <p className="mb-4 text-sm text-ink-soft">Rooms other readers have opened to visitors.</p>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {shelves.map((s) => (
          <li key={s.slug} className="w-[78%] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none">
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${s.username ? `/s/@${s.username}` : `/s/?u=${encodeURIComponent(s.slug)}`}`}
              className="block overflow-hidden rounded-3xl bg-paper/85 ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-28 items-end gap-1.5 overflow-hidden px-5 pt-5" aria-hidden>
                {s.books.map((b) => (
                  <div key={b.title} className="h-[84px] w-[56px] shrink-0 overflow-hidden rounded-[2px] shadow">
                    {b.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.cover_url.replace(/-L\.jpg/, "-M.jpg")} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <GeneratedCover title={b.title} author={b.author} color={b.cover_color || defaultCoverColor(b.title)} />
                    )}
                  </div>
                ))}
              </div>
              <div className="plank mx-3 rounded-sm" aria-hidden />
              <div className="flex items-center gap-3 px-5 py-4">
                <Avatar name={s.display_name ?? s.username} src={s.avatar_url} size={40} className="!ring-2" />
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg">{s.display_name ?? s.username}’s Shelf</p>
                  <p className="text-xs text-ink-soft">
                    {s.username ? `@${s.username} · ` : ""}
                    {s.book_count} {s.book_count === 1 ? "book" : "books"}
                  </p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A book from the catalogues: what it is, and one tap to put it on the shelf. */
function BookPreview({ result, owned, onClose, onAdd }: { result: SearchResult | null; owned: boolean; onClose: () => void; onAdd: (r: SearchResult) => void }) {
  const [desc, setDesc] = useState<string | null>(null);
  useEffect(() => {
    setDesc(result?.description ?? null);
    if (!result || result.description || !result.olWorkKey) return;
    let alive = true;
    fetchWorkDescription(result.olWorkKey).then((d) => alive && d && setDesc(d));
    return () => {
      alive = false;
    };
  }, [result]);
  const meta: ReactNode[] = [result?.year, result?.pages ? `${result.pages} pages` : null, result?.genre].filter(Boolean);
  return (
    <Sheet open={Boolean(result)} onClose={onClose} title={result?.title ?? "Book"}>
      {result && (
        <div>
          <div className="flex gap-5">
            <div className="w-28 shrink-0">
              <Cover r={result} width={150} />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-2xl leading-tight">{result.title}</p>
              {result.author && <p className="mt-1 text-ink-soft">{result.author}</p>}
              {meta.length > 0 && <p className="mt-2 font-mono text-xs text-ink-soft">{meta.join(" · ")}</p>}
            </div>
          </div>
          {desc && (
            <section className="mt-6">
              <h3 className="label">About the book</h3>
              <p className="leading-relaxed text-ink-soft">{desc}</p>
            </section>
          )}
          <div className="mt-6">
            {owned ? (
              <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent ring-1 ring-accent/25">✓ This book is already on your shelf.</p>
            ) : (
              <button type="button" className="btn-primary w-full py-3 text-base" onClick={() => onAdd(result)}>
                <PlusIcon width={18} height={18} /> Add to my shelf
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
