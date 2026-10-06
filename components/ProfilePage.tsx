"use client";

import type { ReactNode } from "react";
import { yearOf } from "@/lib/date";
import { firstAuthor, monthStreak, topCounts } from "@/lib/stats";
import type { Book, Profile, Shelf } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CoverRow } from "./HomePage";
import { GearIcon, MailIcon, PencilIcon, ShareIcon } from "./Icons";
import { ReadingYear } from "./ReadingYear";

/** The counts every shelf shows: read, reading, want to read, favourites. */
export function shelfCounts(books: Book[]): [string, number][] {
  return [
    ["Books read", books.filter((b) => b.status === "read").length],
    ["Reading", books.filter((b) => b.status === "reading").length],
    ["Want to read", books.filter((b) => b.status === "to_read").length],
    ["Favourites", books.filter((b) => b.favourite).length],
  ];
}

/** Picture, name, @username and bio: the top of a profile, yours or a public one. */
export function ReaderHeader({ name, username, bio, avatar, children }: { name?: string | null; username?: string | null; bio?: string | null; avatar?: string | null; children?: ReactNode }) {
  const shown = name?.trim() || username || "Reader";
  return (
    <div className="flex items-center gap-4 md:gap-6">
      <Avatar name={shown} src={avatar} size={88} className="md:!h-24 md:!w-24" />
      <div className="min-w-0">
        <h1 className="font-serif text-[30px] leading-[1.05] tracking-tight md:text-5xl">{shown}’s Shelf</h1>
        {username && <p className="mt-1 font-mono text-sm text-ink-soft">@{username}</p>}
        {bio && <p className="mt-2 max-w-xl whitespace-pre-line text-ink-soft">{bio}</p>}
        {children}
      </div>
    </div>
  );
}

export function CountsRow({ books }: { books: Book[] }) {
  return (
    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {shelfCounts(books).map(([label, n]) => (
        <div key={label} className="rounded-2xl bg-wall/60 px-4 py-3 ring-1 ring-line/60">
          <dd className="font-mono text-2xl font-medium">{n}</dd>
          <dt className="text-xs uppercase tracking-wider text-ink-soft">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** "9 of 24 books" with a bar: this year's reading goal. */
export function GoalProgress({ goal, books, onSet }: { goal?: number | null; books: Book[]; onSet?: () => void }) {
  const year = new Date().getFullYear();
  const done = books.filter((b) => b.status === "read" && yearOf(b.date_finished) === year).length;
  if (!goal) {
    return onSet ? (
      <button type="button" onClick={onSet} className="w-full rounded-2xl border border-dashed border-ink-soft/35 px-4 py-3 text-left text-sm text-ink-soft transition hover:border-accent hover:text-ink">
        <span className="font-medium text-ink">Set a reading goal for {year}</span> · how many books would you like to finish?
      </button>
    ) : null;
  }
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          <span className="font-mono text-lg font-medium">{done}</span> of <span className="font-mono">{goal}</span> books in {year}
        </span>
        <span className="font-mono text-ink-soft">{done >= goal ? "Goal reached ✦" : `${pct}%`}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={done} aria-label="Reading goal">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Profile: who you are as a reader, your numbers, and your reading year. */
export function ProfilePage({
  profile,
  books,
  shelves,
  newNotes,
  onOpen,
  onEdit,
  onSettings,
  onShare,
  onWrapped,
  onGuestbook,
}: {
  profile: Profile | null;
  books: Book[];
  shelves: Shelf[];
  newNotes: number;
  onOpen: (b: Book) => void;
  onEdit?: () => void;
  onSettings: () => void;
  onShare?: () => void;
  onWrapped?: () => void;
  onGuestbook: () => void;
}) {
  const genres = topCounts(books.map((b) => b.genre));
  const authors = topCounts(books.map(firstAuthor));
  const streak = monthStreak(books);
  const recent = books
    .filter((b) => b.status === "read")
    .sort((a, b) => (b.date_finished ?? b.created_at).localeCompare(a.date_finished ?? a.created_at))
    .slice(0, 12);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-paper/85 p-5 shadow-sm ring-1 ring-line/70 md:p-8">
        <ReaderHeader name={profile?.display_name} username={profile?.username} bio={profile?.bio} avatar={profile?.avatar_url}>
          <p className="mt-2 text-xs text-ink-soft">
            {profile?.is_public ? "🌍 Public shelf" : "🔒 Private shelf"}
            {profile?.guestbook_enabled === false ? " · Guest book closed" : ""}
          </p>
        </ReaderHeader>
        <CountsRow books={books} />
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <GoalProgress goal={profile?.reading_goal} books={books} onSet={onEdit} />
          <p className="text-sm text-ink-soft md:text-right">
            <span className="font-mono text-lg font-medium text-ink">{streak}</span> {streak === 1 ? "month" : "months"} in a row
            <span className="block text-xs">with a finished book</span>
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {onEdit && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              <PencilIcon width={16} height={16} /> Edit profile
            </button>
          )}
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
          <button type="button" className="btn-ghost" onClick={onSettings}>
            <GearIcon width={16} height={16} /> Settings
          </button>
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="pf-recent">
          <h2 id="pf-recent" className="mb-3 font-serif text-2xl">
            Recently read
          </h2>
          <CoverRow books={recent} onOpen={onOpen} rated />
        </section>
      )}

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

export function TopList({ title, items, empty }: { title: string; items: [string, number][]; empty: ReactNode }) {
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
