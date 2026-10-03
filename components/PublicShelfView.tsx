"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { groupItems } from "@/lib/library";
import { aestheticOf } from "@/lib/themes";
import { store } from "@/lib/store";
import { summary } from "@/lib/stats";
import type { PublicShelf } from "@/lib/types";
import { useTab } from "@/lib/useTab";
import { ShelfSkeleton } from "./App";
import { BookDetail } from "./BookDetail";
import { Header } from "./Header";
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
  const [tab, setTab] = useTab();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return setData(null);
    store.getPublicShelf(slug).then(setData).catch(() => setData(null));
  }, [slug]);

  const shelves = useMemo(() => [...(data?.shelves ?? [])].sort((a, b) => a.position - b.position), [data]);
  const books = useMemo(() => data?.books ?? [], [data]);
  const items = useMemo(() => groupItems(shelves, books, data?.decor ?? []), [shelves, books, data]);
  const aesthetic = aestheticOf(data?.profile.shelf_style);
  const openBook = books.find((b) => b.id === openId) ?? null;
  const openList = openBook ? (items.get(openBook.shelf_id) ?? []) : [];

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
    <div data-style={aesthetic.id} className="room min-h-dvh pb-16">
      <Header
        stats={summary(books)}
        tab={tab}
        onTab={setTab}
        subtitle={data ? `${name ? `${name}'s` : "A reader's"} shelf · read-only` : " "}
        actions={<Link href="/login/" className="btn-ghost text-xs">Make your own</Link>}
      />
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        {data === undefined ? (
          <ShelfSkeleton />
        ) : tab === "shelf" ? (
          <RoomScene standing={aesthetic.structure === "case"}>
            <ShelfWall shelves={shelves} itemsByShelf={items} structure={aesthetic.structure} onOpenBook={(b) => setOpenId(b.id)} readOnly floor={false} />
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
