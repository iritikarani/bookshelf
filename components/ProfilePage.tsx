"use client";

import type { ReactNode } from "react";
import { defaultCoverColor, textColorFor } from "@/lib/covers";
import type { Book, Shelf } from "@/lib/types";
import { GearIcon, MailIcon, ShareIcon } from "./Icons";
import { ReadingYear } from "./ReadingYear";

/** The top few of something, by how many books share it. */
function top(values: (string | null | undefined)[], n = 3): [string, number][] {
  const count = new Map<string, number>();
  for (const v of values) {
    const k = v?.trim();
    if (k) count.set(k, (count.get(k) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/** Profile: who you are as a reader, your numbers, and your reading year. */
export function ProfilePage({
  name,
  username,
  books,
  shelves,
  newNotes,
  onOpen,
  onSettings,
  onShare,
  onWrapped,
  onGuestbook,
}: {
  name?: string | null;
  username?: string | null;
  books: Book[];
  shelves: Shelf[];
  newNotes: number;
  onOpen: (b: Book) => void;
  onSettings: () => void;
  onShare?: () => void;
  onWrapped?: () => void;
  onGuestbook: () => void;
}) {
  const shown = name?.trim() || "Reader";
  const counts: [string, number][] = [
    ["Books read", books.filter((b) => b.status === "read").length],
    ["Reading", books.filter((b) => b.status === "reading").length],
    ["Want to read", books.filter((b) => b.status === "to_read").length],
    ["Favourites", books.filter((b) => b.favourite).length],
  ];
  const genres = top(books.map((b) => b.genre));
  const authors = top(books.map((b) => b.author.split(",")[0]));

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-paper/85 p-5 shadow-sm ring-1 ring-line/70 md:p-8">
        <div className="flex items-center gap-4 md:gap-6">
          <div
            aria-hidden
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-serif text-4xl shadow-inner ring-4 ring-paper md:h-24 md:w-24 md:text-5xl"
            style={{ backgroundColor: defaultCoverColor(shown), color: textColorFor(defaultCoverColor(shown)) }}
          >
            {shown.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-[30px] leading-[1.05] tracking-tight md:text-5xl">{shown}’s Shelf</h1>
            {username && <p className="mt-1 font-mono text-sm text-ink-soft">@{username}</p>}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {counts.map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-wall/60 px-4 py-3 ring-1 ring-line/60">
              <dd className="font-mono text-2xl font-medium">{n}</dd>
              <dt className="text-xs uppercase tracking-wider text-ink-soft">{label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={onSettings}>
            <GearIcon width={16} height={16} /> Settings
          </button>
          {onShare && (
            <button type="button" className="btn-ghost" onClick={onShare}>
              <ShareIcon width={16} height={16} /> Share my shelf
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onGuestbook}>
            <MailIcon width={16} height={16} /> Guest book{newNotes ? ` · ${newNotes} new` : ""}
          </button>
          {onWrapped && (
            <button type="button" className="btn-ghost" onClick={onWrapped}>
              <span aria-hidden>✨</span> Year wrapped
            </button>
          )}
        </div>
      </section>

      {(genres.length > 0 || authors.length > 0) && (
        <section aria-label="Favourites" className="grid gap-4 md:grid-cols-2">
          <TopList title="Favourite genres" items={genres} empty="Add genres to your books to see them here." />
          <TopList title="Most-read authors" items={authors} empty="Your authors will show up here." />
        </section>
      )}

      <section aria-label="My Reading">
        <ReadingYear shelves={shelves} books={books} onOpen={onOpen} onWrapped={onWrapped} title="My Reading" />
      </section>
    </div>
  );
}

function TopList({ title, items, empty }: { title: string; items: [string, number][]; empty: ReactNode }) {
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <div className="rounded-2xl bg-paper p-4 ring-1 ring-line/70 md:p-5">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {items.length ? (
        <ol className="space-y-2.5">
          {items.map(([label, n]) => (
            <li key={label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate">{label}</span>
                <span className="font-mono text-ink-soft">{n}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-soft">{empty}</p>
      )}
    </div>
  );
}
