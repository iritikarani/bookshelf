"use client";

import { DEFAULT_THEME } from "@/lib/themes";
import { useEffect, useMemo, useState } from "react";
import { groupByShelf } from "@/lib/library";
import { store } from "@/lib/store";
import { summary } from "@/lib/stats";
import type { PublicShelf } from "@/lib/types";
import { useTab } from "@/lib/useTab";
import { ShelfSkeleton } from "./App";
import { BookDetail } from "./BookDetail";
import { Header } from "./Header";
import { QuoteWall } from "./QuoteWall";
import { ReadingYear } from "./ReadingYear";
import { ShelfWall } from "./ShelfWall";

export function PublicShelfView({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicShelf | null | undefined>(undefined);
  const [tab, setTab] = useTab();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    store.getPublicShelf(slug).then(setData).catch(() => setData(null));
  }, [slug]);

  const shelves = useMemo(() => [...(data?.shelves ?? [])].sort((a, b) => a.position - b.position), [data]);
  const books = useMemo(() => data?.books ?? [], [data]);
  const byShelf = useMemo(() => groupByShelf(shelves, books), [shelves, books]);
  const openBook = books.find((b) => b.id === openId) ?? null;
  const openList = openBook ? (byShelf.get(openBook.shelf_id) ?? []) : [];

  if (data === null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-serif text-4xl">This shelf is private</h1>
        <p className="max-w-sm text-ink-soft">The link may be wrong, or its owner has turned sharing off.</p>
        <a href="/" className="btn-primary mt-4">Start your own shelf</a>
      </main>
    );
  }

  const name = data?.profile.display_name;
  return (
    <div data-wood={data?.profile.wood_theme ?? DEFAULT_THEME} className="min-h-dvh pb-16">
      <Header
        stats={summary(shelves, books)}
        tab={tab}
        onTab={setTab}
        subtitle={data ? `${name ? `${name}'s` : "A reader's"} shelf · read-only` : " "}
        actions={<a href="/" className="btn-ghost text-xs">Make your own</a>}
      />
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        {data === undefined ? (
          <ShelfSkeleton />
        ) : tab === "shelf" ? (
          <ShelfWall shelves={shelves} booksByShelf={byShelf} onOpen={(b) => setOpenId(b.id)} readOnly />
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
