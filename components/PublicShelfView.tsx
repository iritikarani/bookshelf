"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { groupItems } from "@/lib/library";
import { perCaseOf, roomAttrs, roomStyle, structureOf } from "@/lib/room";
import { useRoomClock, useSeason } from "@/lib/useClock";
import { aestheticOf } from "@/lib/themes";
import { hasSupabase } from "@/lib/store";
import { localStore } from "@/lib/store/local";
import { supabaseStore } from "@/lib/store/supabase";
import { summary } from "@/lib/stats";
import type { PublicShelf } from "@/lib/types";
import { useTab } from "@/lib/useTab";
import { ShelfSkeleton } from "./App";
import { BookDetail } from "./BookDetail";
import { Header, shelfSummary } from "./Header";
import { QuoteWall } from "./QuoteWall";
import { ReadingYear } from "./ReadingYear";
import { RoomScene } from "./RoomScene";
import { ShelfWall } from "./ShelfWall";

export function PublicShelfPage() {
  const slug = useSearchParams().get("u") ?? "";
  return <PublicShelfView slug={slug} />;
}

export function PublicShelfView({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicShelf | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useTab();
  const [openId, setOpenId] = useState<string | null>(null);
  useRoomClock(data?.profile.room);
  const season = useSeason(data?.profile.room);

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

  const shelves = useMemo(() => [...(data?.shelves ?? [])].sort((a, b) => a.position - b.position), [data]);
  const books = useMemo(() => data?.books ?? [], [data]);
  const items = useMemo(() => groupItems(shelves, books, data?.decor ?? []), [shelves, books, data]);
  const aesthetic = aestheticOf(data?.profile.shelf_style);
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
  return (
    <div data-style={aesthetic.id} {...roomAttrs(data?.profile.room, undefined, season)} style={roomStyle(data?.profile.room)} className="room min-h-dvh pb-16">
      <Header
        title={data ? `${name ? `${name}’s` : "A reader’s"} bookshelf` : " "}
        summary={data ? shelfSummary(books) : " "}
        stats={summary(books)}
        tab={tab}
        onTab={setTab}
        actions={<Link href="/login/" className="btn-ghost text-sm">Make your own</Link>}
      />
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        {data === undefined ? (
          <ShelfSkeleton />
        ) : tab === "shelf" ? (
          <RoomScene standing={structureOf(aesthetic, data?.profile.room) === "case"}>
            <ShelfWall shelves={shelves} itemsByShelf={items} structure={structureOf(aesthetic, data?.profile.room)} perCase={perCaseOf(data?.profile.room)} onOpenBook={(b) => setOpenId(b.id)} readOnly floor={false} />
          </RoomScene>
        ) : tab === "quotes" ? (
          <QuoteWall books={books} onOpen={(b) => setOpenId(b.id)} />
        ) : (
          <ReadingYear shelves={shelves} books={books} onOpen={(b) => setOpenId(b.id)} />
        )}
      </main>
      <BookDetail
        book={openBook}
        shelves={shelves}
        index={openList.findIndex((b) => b.id === openId)}
        shelfSize={openList.length}
        ownerName={name}
        readOnly
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
