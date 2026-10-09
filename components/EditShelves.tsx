"use client";

import { useState } from "react";
import { useLibrary } from "@/lib/library";
import { authorKey, firstAuthor } from "@/lib/stats";
import type { Book } from "@/lib/types";
import { ChevronDown, ChevronUp, PlusIcon, TrashIcon } from "./Icons";
import { Sheet } from "./Sheet";

const SORTS = {
  title: "Title A–Z",
  author: "Author A–Z",
  finished: "Recently finished",
  rating: "Highest rated",
} as const;
type SortKey = keyof typeof SORTS;

const titleKey = (t: string) => t.toLowerCase().replace(/^(the|a|an)\s+/, "");
const surname = (b: Book) => authorKey(firstAuthor(b)).split(" ").pop() ?? "";

/** A shelf's books in a chosen order (ties keep their current order). */
function sorted(books: Book[], by: SortKey): Book[] {
  const cmp: Record<SortKey, (a: Book, b: Book) => number> = {
    title: (a, b) => titleKey(a.title).localeCompare(titleKey(b.title)),
    author: (a, b) => surname(a).localeCompare(surname(b)) || titleKey(a.title).localeCompare(titleKey(b.title)),
    // Unfinished books go after the finished ones.
    finished: (a, b) => (b.date_finished ?? "").localeCompare(a.date_finished ?? ""),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  };
  return [...books].sort(cmp[by]);
}

export function EditShelves({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shelves, booksByShelf, renameShelf, moveShelf, deleteShelf, addShelf, arrangeShelf } = useLibrary();
  const [newName, setNewName] = useState("");
  // The order before the last sort, so it can be put back.
  const [undo, setUndo] = useState<{ shelfId: string; name: string; by: SortKey; ids: string[] } | null>(null);

  const sortShelf = (shelfId: string, name: string, by: SortKey) => {
    const books = booksByShelf.get(shelfId) ?? [];
    setUndo({ shelfId, name, by, ids: books.map((b) => b.id) });
    void arrangeShelf(shelfId, sorted(books, by).map((b) => b.id));
  };
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const commit = (id: string, original: string) => {
    const name = (drafts[id] ?? original).trim();
    if (name && name !== original) renameShelf(id, name.slice(0, 60));
    setDrafts((d) => {
      const { [id]: _, ...rest } = d;
      return rest;
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Your shelves">
      <ul className="space-y-2">
        {shelves.map((s, i) => {
          const count = booksByShelf.get(s.id)?.length ?? 0;
          return (
            <li key={s.id} className="flex items-center gap-2 rounded-xl border border-line bg-wall/40 p-2">
              <div className="flex flex-col">
                <button type="button" className="rounded p-0.5 text-ink-soft hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => moveShelf(s.id, -1)} aria-label={`Move ${s.name} up`}>
                  <ChevronUp width={18} height={18} />
                </button>
                <button type="button" className="rounded p-0.5 text-ink-soft hover:text-ink disabled:opacity-30" disabled={i === shelves.length - 1} onClick={() => moveShelf(s.id, 1)} aria-label={`Move ${s.name} down`}>
                  <ChevronDown width={18} height={18} />
                </button>
              </div>
              <input
                className="field flex-1 font-serif text-lg"
                aria-label={`Shelf name, currently ${s.name}`}
                value={drafts[s.id] ?? s.name}
                maxLength={60}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                onBlur={() => commit(s.id, s.name)}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              />
              <span className="w-14 text-right font-mono text-xs text-ink-soft">{count} {count === 1 ? "book" : "books"}</span>
              {count > 1 && (
                <select
                  className="w-[4.5rem] shrink-0 rounded-lg border border-line bg-paper px-1.5 py-2 text-xs text-ink-soft"
                  aria-label={`Sort the books on ${s.name}`}
                  value=""
                  onChange={(e) => e.target.value && sortShelf(s.id, s.name, e.target.value as SortKey)}
                >
                  <option value="">Sort…</option>
                  {Object.entries(SORTS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="rounded-full p-2 text-ink-soft hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                disabled={count > 0 || shelves.length <= 1}
                title={count > 0 ? "Only empty shelves can be deleted" : "Delete shelf"}
                onClick={() => deleteShelf(s.id)}
                aria-label={count > 0 ? `${s.name} has books, so it can't be deleted` : `Delete ${s.name}`}
              >
                <TrashIcon width={18} height={18} />
              </button>
            </li>
          );
        })}
      </ul>
      {undo && (
        <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm" role="status">
          <span>
            Sorted {undo.name}: {SORTS[undo.by]}.
          </span>
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => {
              void arrangeShelf(undo.shelfId, undo.ids);
              setUndo(null);
            }}
          >
            Undo
          </button>
        </p>
      )}
      <p className="mt-2 text-sm text-ink-soft">Tap a name to make it yours. Named shelves show their name on the wood. To place books by hand, drag them on the shelf.</p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name) return;
          addShelf(name.slice(0, 60));
          setNewName("");
        }}
      >
        <input className="field flex-1" placeholder="Create a shelf, e.g. Comfort Reads" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New shelf name" maxLength={60} />
        <button type="submit" className="btn-primary" disabled={!newName.trim()}>
          <PlusIcon width={16} height={16} /> Add
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Comfort Reads", "Books That Broke Me", `${new Date().getFullYear()} TBR`, "Fantasy Corner", "Romance", "Books I Want To Reread"].map((idea) => (
          <button key={idea} type="button" className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent" onClick={() => setNewName(idea)}>
            ♡ {idea}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
