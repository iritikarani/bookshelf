"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { slugFromLocation } from "@/lib/publicLink";
import { authorCounts, topCounts } from "@/lib/stats";
import { CountsRow, ReaderHeader, TopList } from "./ProfilePage";
import { CoverRow } from "./HomePage";
import { EmptyState } from "./AppNav";
import { useEffect, useMemo, useState } from "react";
import { groupItems } from "@/lib/library";
import { perCaseOf, roomAttrs, roomStyle, structureOf } from "@/lib/room";
import { useRoomClock, useSeason } from "@/lib/useClock";
import { aestheticOf } from "@/lib/themes";
import { hasSupabase } from "@/lib/store";
import { localStore } from "@/lib/store/local";
import { supabaseStore } from "@/lib/store/supabase";
import type { PublicShelf } from "@/lib/types";
import { usePublicTab } from "@/lib/useTab";
import { ShelfSkeleton } from "./App";
import { BookDetail } from "./BookDetail";
import { QuoteWall } from "./QuoteWall";
import { ReadingYear } from "./ReadingYear";
import { RoomScene } from "./RoomScene";
import { siteUrl } from "@/lib/basePath";
import { ShelfWall } from "./ShelfWall";
import { SignGuestbook } from "./Guestbook";
import { RoomTabs } from "./RoomSwitcher";
import { FIRST_ROOM_NAME, type RoomEntry } from "@/lib/library";

export function PublicShelfPage() {
  const params = useSearchParams();
  // "/s/@username" (rewritten to this page by the host) or "/s/?u=…".
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => setSlug(slugFromLocation(window.location.search, window.location.pathname)), [params]);
  if (slug === null) return null;
  return <PublicShelfView slug={slug} />;
}

export function PublicShelfView({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicShelf | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = usePublicTab();
  const [openId, setOpenId] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  // Which room the visitor is looking at (null is the first room).
  const [roomId, setRoomId] = useState<string | null>(null);
  const extra = useMemo(() => [...(data?.rooms ?? [])].sort((a, b) => a.position - b.position), [data]);
  const activeRoom = extra.find((r) => r.id === roomId) ?? null;
  // The look of the room being visited: an extra room's own, or the profile's.
  const look = activeRoom ? activeRoom.room : data?.profile.room;
  const roomTabs: RoomEntry[] = [
    { id: null, name: data?.profile.room?.title?.trim() || FIRST_ROOM_NAME, shelf_style: data?.profile.shelf_style ?? "pastel" },
    ...extra.map((r) => ({ id: r.id, name: r.name, shelf_style: r.shelf_style })),
  ];
  useRoomClock(look);
  const season = useSeason(look);

  useEffect(() => {
    if (!slug) return setData(null);
    setFailed(false);
    setData(undefined);
    // Shared shelves always come from accounts, even on a phone that once used a guest shelf.
    (hasSupabase ? supabaseStore : localStore)
      .getPublicShelf(slug)
      .then(setData)
      .catch(() => setFailed(true));
  }, [slug, attempt]);

  const allShelves = useMemo(() => [...(data?.shelves ?? [])].sort((a, b) => a.position - b.position), [data]);
  const shelves = useMemo(() => allShelves.filter((s) => (s.room_id ?? null) === (activeRoom?.id ?? null)), [allShelves, activeRoom]);
  const books = useMemo(() => data?.books ?? [], [data]);
  const items = useMemo(() => groupItems(allShelves, books, data?.decor ?? []), [allShelves, books, data]);
  const aesthetic = aestheticOf(activeRoom ? activeRoom.shelf_style : data?.profile.shelf_style);
  const openBook = books.find((b) => b.id === openId) ?? null;
  const openList = openBook ? (items.get(openBook.shelf_id) ?? []) : [];

  if (failed) {
    return (
      <main data-style="pastel" className="room flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-4xl">Couldn’t open this shelf</h1>
        <p className="max-w-sm text-ink-soft">Check the internet connection and try again.</p>
        <button type="button" className="btn-primary mt-4" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </main>
    );
  }

  if (data === null) {
    return (
      <main data-style="pastel" className="room flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-4xl">This shelf is private</h1>
        <p className="max-w-sm text-ink-soft">The link may be wrong, or its owner has turned sharing off.</p>
        <Link href="/login/" className="btn-primary mt-4">Start your own shelf</Link>
      </main>
    );
  }

  const name = data?.profile.display_name;
  const guestbookOpen = data?.profile.guestbook_enabled !== false;
  const shareUrl = typeof window === "undefined" ? null : siteUrl(slug.startsWith("@") ? `/s/${slug}` : `/s/?u=${encodeURIComponent(slug)}`);
  return (
    <div data-style={aesthetic.id} {...roomAttrs(look, undefined, season)} style={roomStyle(look)} className="room min-h-dvh pb-16">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link href="/" className="whitespace-nowrap font-serif text-xl leading-none tracking-tight md:text-2xl">
          Cosmic Space<span className="text-accent">.</span>
        </Link>
        <Link href="/login/?signup=1" className="btn-ghost bg-paper/70 text-sm">
          Make your own shelf
        </Link>
      </header>
      {data && (
        <section className="mx-auto mt-2 w-full max-w-6xl px-4 md:px-8">
          <div className="rounded-3xl bg-paper/85 p-5 shadow-sm ring-1 ring-line/70 md:p-8">
            <ReaderHeader name={name} username={data.profile.username} bio={data.profile.bio} avatar={data.profile.avatar_url} />
            <CountsRow books={books} />
            {guestbookOpen && (
              <button type="button" onClick={() => setSignOpen(true)} className="btn-primary mt-5">
                <span aria-hidden>💌</span> Sign the guest book
              </button>
            )}
          </div>
          <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto" aria-label="Sections">
            {(
              [
                ["shelf", "Bookshelf"],
                ["books", "Books"],
                ["quotes", "Quote wall"],
                ["year", "Reading year"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-ink text-wall" : "bg-paper/60 text-ink-soft hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </section>
      )}
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        {data === undefined ? (
          <ShelfSkeleton />
        ) : tab === "shelf" ? (
          <>
            {extra.length > 0 && <RoomTabs rooms={roomTabs} active={activeRoom?.id ?? null} onPick={setRoomId} />}
            <RoomScene standing={structureOf(aesthetic, look) === "case"}>
              <ShelfWall shelves={shelves} itemsByShelf={items} structure={structureOf(aesthetic, look)} perCase={perCaseOf(look)} onOpenBook={(b) => setOpenId(b.id)} readOnly floor={false} />
            </RoomScene>
          </>
        ) : tab === "books" ? (
          <PublicBooks books={books} onOpen={(b) => setOpenId(b.id)} />
        ) : tab === "quotes" ? (
          <QuoteWall books={books} onOpen={(b) => setOpenId(b.id)} look={{ styleId: aesthetic.id, room: look, publicUrl: shareUrl, visitorOf: name ?? null }} />
        ) : (
          <ReadingYear shelves={allShelves} books={books} onOpen={(b) => setOpenId(b.id)} />
        )}
      </main>
      <BookDetail
        book={openBook}
        shelves={allShelves}
        index={openList.findIndex((b) => b.id === openId)}
        shelfSize={openList.length}
        ownerName={name}
        readOnly
        onClose={() => setOpenId(null)}
      />
      {data && guestbookOpen && (
        <button type="button" onClick={() => setSignOpen(true)} className="btn-primary fixed bottom-6 right-4 z-30 shadow-lg md:right-8" aria-label="Leave a note in the guest book">
          <span aria-hidden>💌</span> Leave a note
        </button>
      )}
      <SignGuestbook
        open={signOpen}
        onClose={() => setSignOpen(false)}
        ownerName={name}
        onSign={(note) => (hasSupabase ? supabaseStore : localStore).signGuestbook(slug, note)}
      />
    </div>
  );
}

/** A public shelf's books by status, plus favourite genres. Read-only. */
function PublicBooks({ books, onOpen }: { books: import("@/lib/types").Book[]; onOpen: (b: import("@/lib/types").Book) => void }) {
  if (!books.length) return <EmptyState title="This shelf is still empty.">Come back soon: the first stories are on their way.</EmptyState>;
  const by = (f: (b: (typeof books)[number]) => boolean) => books.filter(f);
  const sections: [string, typeof books][] = [
    ["Currently reading", by((b) => b.status === "reading")],
    ["Favourites", by((b) => b.favourite)],
    ["Books read", by((b) => b.status === "read").sort((a, b) => (b.date_finished ?? "").localeCompare(a.date_finished ?? ""))],
    ["Want to read", by((b) => b.status === "to_read")],
  ];
  const genres = topCounts(books.map((b) => b.genre), 500);
  const authors = authorCounts(books);
  return (
    <div className="space-y-10">
      {sections
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <section key={title} aria-label={title}>
            <h2 className="mb-3 flex items-baseline gap-2 font-serif text-2xl">
              {title} <span className="font-mono text-sm text-ink-soft">{list.length}</span>
            </h2>
            <CoverRow books={list} onOpen={onOpen} rated={title === "Books read"} />
          </section>
        ))}
      <section aria-label="Favourite genres and authors" className="grid gap-4 md:grid-cols-2">
        <TopList title="Favourite genres" items={genres} empty="No genres yet." />
        <TopList title="Most-read authors" items={authors} empty="No authors yet." />
      </section>
    </div>
  );
}
