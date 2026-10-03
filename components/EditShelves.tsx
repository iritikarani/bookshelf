"use client";

import { useState } from "react";
import { useLibrary } from "@/lib/library";
import { ChevronDown, ChevronUp, PlusIcon, TrashIcon } from "./Icons";
import { Sheet } from "./Sheet";

export function EditShelves({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shelves, booksByShelf, renameShelf, moveShelf, deleteShelf, addShelf } = useLibrary();
  const [newName, setNewName] = useState("");
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
    <Sheet open={open} onClose={onClose} title="Edit shelves">
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
      {shelves.some((s) => s.is_want_to_read) && (
        <p className="mt-2 text-xs text-ink-soft">Books on “{shelves.find((s) => s.is_want_to_read)?.name}” count as your to-read pile.</p>
      )}
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
        <input className="field flex-1" placeholder="New shelf, e.g. Made me cry" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New shelf name" maxLength={60} />
        <button type="submit" className="btn-primary" disabled={!newName.trim()}>
          <PlusIcon width={16} height={16} /> Add
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Made me cry", `Read in ${new Date().getFullYear()}`, "Comfort reads", "Book club"].map((idea) => (
          <button key={idea} type="button" className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-accent hover:text-accent" onClick={() => setNewName(idea)}>
            {idea}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
