"use client";

import { useState, type FormEvent } from "react";
import { cleanTag } from "./BookJournal";
import { collectionsOf, type Collection } from "@/lib/collections";
import { quoteItems } from "./QuoteWall";
import type { Book } from "@/lib/types";
import { BookCover } from "./BookCover";
import { Sheet } from "./Sheet";
import { MemoryNote } from "./Universe";

/**
 * Your collections as little fanned stacks of covers. Tap one to see every book in it. A book
 * joins a collection from its own page (Genre & collections).
 */
export function CollectionsShelf({
  books,
  onOpen,
  onRetag,
  title = "Your collections",
  hint = true,
}: {
  books: Book[];
  onOpen: (b: Book) => void;
  /** Rename a collection (to a new name) or delete it (to null) across all its books. */
  onRetag?: (from: string, to: string | null) => void;
  title?: string;
  hint?: boolean;
}) {
  const collections = collectionsOf(books);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const open = collections.find((c) => c.tag === openTag) ?? null;
  const setOpen = (c: Collection | null) => setOpenTag(c?.tag ?? null);
  if (!collections.length && !hint) return null;
  return (
    <section aria-labelledby="collections-title">
      <h2 id="collections-title" className="mb-3 font-serif text-2xl">
        {title}
      </h2>
      {collections.length ? (
        <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 pt-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
          {collections.map((c) => (
            <li key={c.tag} className="w-[46%] max-w-[220px] shrink-0 snap-start md:w-auto md:max-w-none">
              <CollectionCard collection={c} onOpen={() => setOpen(c)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-5 text-sm text-ink-soft">
          Group books your own way: comfort reads, book club, books that made you cry. Open a book and add it to a collection under <em>Genre &amp; collections</em>.
        </p>
      )}
      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.name ?? "Collection"} wide>
        {open && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">
                {open.books.length} {open.books.length === 1 ? "book" : "books"}
              </p>
              {onRetag && <CollectionActions key={open.tag} collection={open} taken={collections.map((c) => c.tag)} onRetag={(to) => (onRetag(open.tag, to), setOpenTag(to))} />}
            </div>
            <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
              {open.books.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className="group block w-full text-left"
                    onClick={() => {
                      setOpen(null);
                      onOpen(b);
                    }}
                    aria-label={`${b.title}${b.author ? ` by ${b.author}` : ""}. Open book.`}
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-[3px] shadow-md transition group-hover:-translate-y-1 motion-reduce:transform-none">
                      <BookCover book={b} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{b.title}</p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Sheet>
    </section>
  );
}

function CollectionCard({ collection, onOpen }: { collection: Collection; onOpen: () => void }) {
  const top = collection.books.slice(0, 3);
  const n = collection.books.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-2xl bg-paper/85 p-4 text-left ring-1 ring-line/70 transition hover:shadow-md"
      aria-label={`${collection.name}, ${n} ${n === 1 ? "book" : "books"}. Open collection.`}
    >
      {/* the first few covers, fanned like books set down together */}
      <div className="relative mx-auto h-[104px] w-[120px]" aria-hidden>
        {top.map((b, i) => {
          const spread = top.length === 1 ? 0 : (i - (top.length - 1) / 2) * 1;
          return (
            <div
              key={b.id}
              className="absolute bottom-0 left-1/2 h-[96px] w-[64px] overflow-hidden rounded-[3px] shadow-md transition-transform duration-300 motion-reduce:transform-none"
              style={{ transform: `translateX(calc(-50% + ${spread * 26}px)) rotate(${spread * 7}deg)`, transformOrigin: "50% 100%", zIndex: i === Math.floor((top.length - 1) / 2) ? 3 : 1 }}
            >
              <BookCover book={b} />
            </div>
          );
        })}
      </div>
      <p className="mt-3 truncate font-serif text-lg leading-tight">{collection.name}</p>
      <p className="text-xs text-ink-soft">
        {n} {n === 1 ? "book" : "books"}
      </p>
    </button>
  );
}

/** The memories you've pinned, for your profile. */
export function TreasuredMemories({ books, onOpen }: { books: Book[]; onOpen: (b: Book) => void }) {
  const pinned = quoteItems(books).filter(({ quote }) => quote.pinned).slice(0, 6);
  return (
    <section aria-labelledby="treasured-title">
      <h2 id="treasured-title" className="mb-3 font-serif text-2xl">
        Memories I treasure
      </h2>
      {pinned.length ? (
        <ul className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {pinned.map((it, i) => (
            <li key={`${it.book.id}:${it.quote.id}`}>
              <MemoryNote item={it} tilt={i % 2 ? 0.6 : -0.6} onOpen={() => onOpen(it.book)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-5 text-sm text-ink-soft">
          Pin the memories you love most and they’ll live here. Open a book, then tap <span aria-hidden>📌</span> <em>Pin to profile</em> under a quote, character or scene.
        </p>
      )}
    </section>
  );
}

/** Rename or delete a collection. Deleting only removes the grouping: the books stay on your shelf. */
function CollectionActions({ collection, taken, onRetag }: { collection: Collection; taken: string[]; onRetag: (to: string | null) => void }) {
  const [mode, setMode] = useState<"idle" | "rename" | "delete">("idle");
  const [name, setName] = useState(collection.name);
  const next = cleanTag(name);
  const clash = next !== collection.tag && taken.includes(next);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!next || next === collection.tag) return setMode("idle");
    onRetag(next);
    setMode("idle");
  };
  if (mode === "rename")
    return (
      <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label htmlFor="collection-name" className="sr-only">
          New name for {collection.name}
        </label>
        <input id="collection-name" autoFocus maxLength={30} className="field h-9 min-w-0 flex-1 py-1 text-sm sm:w-56" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn-primary h-9 px-3" disabled={!next}>
          {clash ? "Merge" : "Save"}
        </button>
        <button type="button" className="btn-ghost h-9 px-3" onClick={() => (setName(collection.name), setMode("idle"))}>
          Cancel
        </button>
        {clash && <p className="w-full text-xs text-ink-soft">There’s already a collection with that name; its books and these will be one collection.</p>}
      </form>
    );
  if (mode === "delete")
    return (
      <div role="alertdialog" aria-label={`Delete ${collection.name}?`} className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-danger/40 p-3 text-sm sm:w-auto">
        <span>Delete this collection? The books stay on your shelf.</span>
        <button type="button" className="btn-danger h-9 px-3" onClick={() => onRetag(null)}>
          Delete collection
        </button>
        <button type="button" className="btn-ghost h-9 px-3" autoFocus onClick={() => setMode("idle")}>
          Keep it
        </button>
      </div>
    );
  return (
    <div className="flex gap-2">
      <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={() => setMode("rename")}>
        Rename
      </button>
      <button type="button" className="btn-ghost h-9 px-3 text-sm text-danger" onClick={() => setMode("delete")}>
        Delete
      </button>
    </div>
  );
}
