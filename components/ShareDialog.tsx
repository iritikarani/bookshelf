"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { coverImageOf } from "@/lib/covers";
import { summary } from "@/lib/stats";
import { aestheticOf } from "@/lib/themes";
import type { Book, Shelf, ShelfItem, ShelfStyle } from "@/lib/types";
import { spineWidthPx } from "./BookSpine";
import { decorSpec } from "./Decor";
import { DownloadIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { ShelfWall } from "./ShelfWall";

const W = 1080;
const H = 1920;
// Shelf scale inside the story image.
const COVER_H = 200;
const COVER_W = 132;
const SPINE_SCALE = 1.45;
const ROW_BUDGET = 820; // usable px per shelf row

async function toDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Approximate width an item takes on the share image's shelf, including its spacing. */
function itemWidth(item: ShelfItem): number {
  if (item.type === "decor") {
    const d = decorSpec(item.decor.kind);
    return COVER_H * d.h * (d.viewBox[0] / d.viewBox[1]) + 27;
  }
  if (item.book.display === "cover") return COVER_W + 27;
  return spineWidthPx(item.book.pages) * SPINE_SCALE + 3;
}

export function ShareDialog({ open, onClose, shelves, itemsByShelf, books, styleId, owner }: {
  open: boolean;
  onClose: () => void;
  shelves: Shelf[];
  itemsByShelf: Map<string, ShelfItem[]>;
  books: Book[];
  styleId: ShelfStyle;
  owner?: string | null;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Map<string, string | null> | null>(null);
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aesthetic = aestheticOf(styleId);

  // Up to 4 shelves that hold books (read shelves first), trimmed to what fits across the image.
  const picked = useMemo(() => {
    const withBooks = [...shelves]
      .filter((s) => (itemsByShelf.get(s.id) ?? []).some((i) => i.type === "book"))
      .sort((a, b) => Number(a.is_want_to_read) - Number(b.is_want_to_read) || a.position - b.position)
      .slice(0, 4)
      .sort((a, b) => a.position - b.position);
    return withBooks.map((shelf) => {
      let used = 0;
      const items: ShelfItem[] = [];
      for (const item of itemsByShelf.get(shelf.id) ?? []) {
        const w = itemWidth(item);
        if (used + w > ROW_BUDGET) break;
        used += w;
        items.push(item);
      }
      return { shelf, items };
    });
  }, [shelves, itemsByShelf]);

  const stats = summary(shelves, books);

  useEffect(() => {
    if (!open) {
      setImages(null);
      setPng(null);
      setError(null);
      return;
    }
    let alive = true;
    (async () => {
      const shownBooks = picked.flatMap((p) => p.items).flatMap((i) => (i.type === "book" ? [i.book] : []));
      const entries = await Promise.all(
        shownBooks.map(async (b) => {
          const src = coverImageOf(b);
          return [b.id, src ? await toDataUrl(src) : null] as const;
        }),
      );
      if (alive) setImages(new Map(entries));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Books with covers swapped for inlined data URLs, so html-to-image can draw them.
  const itemsForImage = useMemo(() => {
    if (!images) return null;
    return new Map(
      picked.map(({ shelf, items }) => [
        shelf.id,
        items.map((i): ShelfItem => {
          if (i.type !== "book") return i;
          const data = images.get(i.book.id) ?? null;
          return { ...i, book: { ...i.book, cover_url: data, uploaded_cover: null } };
        }),
      ]),
    );
  }, [images, picked]);

  useEffect(() => {
    if (!itemsForImage || !nodeRef.current) return;
    let alive = true;
    (async () => {
      try {
        await document.fonts?.ready;
        // Let spine colours (sampled from the covers) settle before rendering.
        await new Promise((r) => setTimeout(r, 450));
        if (!alive || !nodeRef.current) return;
        const url = await toPng(nodeRef.current, { width: W, height: H, pixelRatio: 1 });
        if (alive) setPng(url);
      } catch (e) {
        console.error(e);
        if (alive) setError("Couldn't render the image. Try again in a moment.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [itemsForImage]);

  const vars = { "--cover-h": `${COVER_H}px`, "--cover-w": `${COVER_W}px`, "--spine-scale": SPINE_SCALE, width: W, height: H, backgroundAttachment: "scroll" } as CSSProperties;

  return (
    <Sheet open={open} onClose={onClose} title="Share my shelf">
      <p className="text-sm text-ink-soft">A 1080 × 1920 image of your shelf in its current room, sized for Instagram stories.</p>
      <div className="mx-auto mt-4 aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl bg-ink/5 shadow-inner ring-1 ring-line">
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={png} alt="Preview of your shareable shelf image" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-soft" aria-live="polite">
            {error ?? "Arranging your shelf…"}
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-center">
        <a className={`btn-primary px-6 ${png ? "" : "pointer-events-none opacity-50"}`} href={png ?? undefined} download="ex-libris-shelf.png" aria-disabled={!png}>
          <DownloadIcon width={16} height={16} /> Download image
        </a>
      </div>

      {/* Off-screen render target */}
      {open && itemsForImage && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div ref={nodeRef} data-style={aesthetic.id} className="room flex flex-col px-[80px] pb-[90px] pt-[110px] text-ink" style={vars}>
            <p className="font-mono text-[26px] tracking-[6px] text-accent">EX LIBRIS</p>
            <h1 className="mt-[18px] font-serif text-[100px] leading-none">{owner ? `${owner}'s shelf` : "My bookshelf"}</h1>
            <div className="mt-[40px] flex gap-[56px] font-mono">
              {[
                [stats.booksRead, "books read"],
                [stats.avgRating === null ? "–" : `${stats.avgRating.toFixed(1)}★`, "avg rating"],
                [stats.linesKept, "lines kept"],
              ].map(([v, l]) => (
                <div key={String(l)}>
                  <div className="text-[60px] font-medium leading-tight">{v}</div>
                  <div className="text-[22px] uppercase tracking-[3px] text-ink-soft">{l}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto [&_h2]:!text-[34px]">
              <ShelfWall
                shelves={picked.map((p) => p.shelf)}
                itemsByShelf={itemsForImage}
                structure={aesthetic.structure}
                onOpenBook={() => {}}
                readOnly
                floor={false}
              />
            </div>

            <p className="mt-[50px] font-mono text-[22px] tracking-[2px] text-ink-soft">
              {aesthetic.name} · {stats.booksRead} finished · made with Ex Libris
            </p>
          </div>
        </div>
      )}
    </Sheet>
  );
}
