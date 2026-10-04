"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { coverImageOf, heightFactor } from "@/lib/covers";
import { shareFiles, shareMessage } from "@/lib/shareMessage";
import { summary } from "@/lib/stats";
import { useSeason } from "@/lib/useClock";
import { perCaseOf, roomAttrs, roomStyle, structureOf, type RoomSettings } from "@/lib/room";
import { aestheticOf } from "@/lib/themes";
import type { Book, Shelf, ShelfItem, ShelfStyle } from "@/lib/types";
import { spineWidthPx } from "./BookSpine";
import { decorSpec } from "./Decor";
import { DownloadIcon } from "./Icons";
import { RoomScene } from "./RoomScene";
import { shelfSummary } from "./Header";
import { Sheet } from "./Sheet";
import { ShelfWall } from "./ShelfWall";

const W = 1080;
const H = 1920;
// Shelf scale inside the story image.
const COVER_H = 200;
const COVER_W = 132;
const SPINE_SCALE = 1.45;
const ROW_BUDGET = 820; // usable px per shelf row

export async function toDataUrl(url: string): Promise<string | null> {
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

/** The address to show on images: the public shelf when there is one, otherwise the site. */
export function shownLink(publicUrl?: string | null): string {
  if (publicUrl) return publicUrl.replace(/^https?:\/\//, "");
  return typeof window === "undefined" ? "" : window.location.host;
}

const textureCache = new Map<string, Promise<string | null>>();

/** Draw an SVG texture (a data URI using SVG filters) into a PNG data URI. */
function rasterizeSvg(dataUrl: string): Promise<string | null> {
  let hit = textureCache.get(dataUrl);
  if (!hit) {
    hit = (async () => {
      try {
        const svg = decodeURIComponent(dataUrl.slice(dataUrl.indexOf(",") + 1));
        const w = Number(/width='(\d+)'/.exec(svg)?.[1] ?? 300);
        const h = Number(/height='(\d+)'/.exec(svg)?.[1] ?? 300);
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    })();
    textureCache.set(dataUrl, hit);
  }
  return hit;
}

const SVG_URL = /url\("(data:image\/svg\+xml[^"]*)"\)/g;
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

async function flatten(bg: string): Promise<string> {
  let out = bg;
  for (const [, url] of bg.matchAll(SVG_URL)) out = out.replace(url, (await rasterizeSvg(url)) ?? BLANK);
  return out;
}

/**
 * The room's wood grain, plaster and paint are SVG noise filters. html-to-image can't draw SVG
 * filters (they come out solid black), so swap every one for a PNG of itself before rendering.
 */
export async function flattenTextures(root: HTMLElement) {
  const rules: string[] = [];
  const els = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  await Promise.all(
    els.map(async (el, i) => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg.includes("data:image/svg+xml")) el.style.backgroundImage = await flatten(bg);
      for (const pseudo of ["::before", "::after"]) {
        const pbg = getComputedStyle(el, pseudo).backgroundImage;
        if (!pbg.includes("data:image/svg+xml")) continue;
        el.classList.add(`tx${i}`);
        rules.push(`.tx${i}${pseudo}{background-image:${await flatten(pbg)} !important}`);
      }
    }),
  );
  if (rules.length) {
    const style = document.createElement("style");
    style.textContent = rules.join("\n");
    root.appendChild(style);
  }
}

/** Approximate width an item takes on the share image's shelf, including its spacing. */
function itemWidth(item: ShelfItem): number {
  if (item.type === "decor") {
    const d = decorSpec(item.decor.kind);
    return COVER_H * d.h * (d.viewBox[0] / d.viewBox[1]) + 27;
  }
  if (item.book.display === "cover") return COVER_W + 27;
  if (item.book.display === "stack") return COVER_H * heightFactor(item.book.pages) + 11;
  const spine = spineWidthPx(item.book.pages) * SPINE_SCALE + 3;
  return item.book.display === "lean" ? spine + COVER_H * heightFactor(item.book.pages) * 0.16 : spine;
}

export function ShareDialog({ open, onClose, shelves, itemsByShelf, books, styleId, room, owner, publicUrl }: {
  open: boolean;
  onClose: () => void;
  shelves: Shelf[];
  itemsByShelf: Map<string, ShelfItem[]>;
  books: Book[];
  styleId: ShelfStyle;
  room?: RoomSettings | null;
  owner?: string | null;
  /** The public shelf link, when sharing is on. */
  publicUrl?: string | null;
}) {
  const [done, setDone] = useState<string | null>(null);
  const flash = (msg: string) => {
    setDone(msg);
    window.setTimeout(() => setDone((m) => (m === msg ? null : m)), 1800);
  };
  const pngFile = async () => new File([await (await fetch(png!)).blob()], "cosmic-space-shelf.png", { type: "image/png" });
  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator;
  const canCopyImage = typeof window !== "undefined" && "ClipboardItem" in window;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Map<string, string | null> | null>(null);
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aesthetic = aestheticOf(styleId);
  const season = useSeason(room);

  // Up to 4 shelves that hold books (read shelves first), trimmed to what fits across the image.
  const picked = useMemo(() => {
    const withBooks = [...shelves]
      .filter((s) => (itemsByShelf.get(s.id) ?? []).some((i) => i.type === "book"))
      .slice(0, 4);
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

  const stats = summary(books);
  const reading = books.find((b) => b.status === "reading");

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
        await flattenTextures(nodeRef.current);
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
      <div className="mt-5 grid grid-cols-2 gap-2">
        <a className={`btn-primary py-3 ${png ? "" : "pointer-events-none opacity-50"}`} href={png ?? undefined} download="cosmic-space-shelf.png" aria-disabled={!png}>
          <DownloadIcon width={16} height={16} /> Download story
        </a>
        {canShareFiles && (
          <button
            type="button"
            className="btn-ghost py-3"
            disabled={!png}
            onClick={async () => {
              try {
                const file = await pngFile();
                await shareFiles([file], shareMessage({ publicUrl }), "My bookshelf");
              } catch {
                /* closed the share sheet */
              }
            }}
          >
            Share…
          </button>
        )}
        {canCopyImage && (
          <button
            type="button"
            className="btn-ghost py-3"
            disabled={!png}
            onClick={async () => {
              try {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": await pngFile() })]);
                flash("Image copied");
              } catch {
                flash("Couldn’t copy the image");
              }
            }}
          >
            Copy image
          </button>
        )}
        <button
          type="button"
          className="btn-ghost py-3"
          disabled={!publicUrl}
          title={publicUrl ? undefined : "Turn on Public shelf in Settings to get a link"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(publicUrl!);
              flash("Link copied");
            } catch {
              flash("Couldn’t copy the link");
            }
          }}
        >
          Copy link
        </button>
      </div>
      <p className="mt-2 h-5 text-center text-sm text-accent" role="status">
        {done ?? (!publicUrl ? <span className="text-ink-soft">To share a link, turn on Public shelf in Settings.</span> : null)}
      </p>

      {/* Off-screen render target */}
      {open && itemsForImage && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div ref={nodeRef} data-style={aesthetic.id} {...roomAttrs(room, undefined, season)} className="share-art room flex flex-col overflow-hidden px-[80px] pt-[100px] text-ink" style={{ ...roomStyle(room), ...vars }}>
            <p className="font-mono text-[26px] tracking-[6px] text-accent">COSMIC SPACE</p>
            <h1 className="mt-[18px] font-serif text-[96px] leading-none">{owner ? `${owner}’s bookshelf` : "My bookshelf"}</h1>
            <p className="mt-[16px] font-mono text-[28px] text-ink-soft">
              {new Date().getFullYear()} · {shelfSummary(books)}
            </p>
            {reading && (
              <p className="mt-[22px] text-[30px]">
                <span className="font-mono text-[22px] uppercase tracking-[3px] text-ink-soft">Currently reading </span>
                <span className="font-serif italic">{reading.title}</span>
              </p>
            )}
            <div className="mt-[40px] flex gap-[56px] font-mono">
              {[
                [stats.booksRead, "books read"],
                [stats.avgRating === null ? "–" : `${stats.avgRating.toFixed(1)}★`, "avg rating"],
                [stats.quotesSaved, "quotes saved"],
              ].map(([v, l]) => (
                <div key={String(l)}>
                  <div className="text-[60px] font-medium leading-tight">{v}</div>
                  <div className="text-[22px] uppercase tracking-[3px] text-ink-soft">{l}</div>
                </div>
              ))}
            </div>

            {/* The room as it looks on screen: window and lamp, the shelves, the floor and rug. */}
            <div className="share-room relative mt-[40px] flex flex-1 flex-col [&_h2]:!text-[34px]">
              <RoomScene standing={structureOf(aesthetic, room) === "case"}>
                <ShelfWall
                  shelves={picked.map((p) => p.shelf)}
                  itemsByShelf={itemsForImage}
                  structure={structureOf(aesthetic, room)}
                  perCase={perCaseOf(room)}
                  onOpenBook={() => {}}
                  readOnly
                  floor={false}
                  stacked
                />
              </RoomScene>
              <p className="absolute inset-x-0 bottom-[36px] text-center font-mono text-[22px] tracking-[2px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)]">
                {aesthetic.name} · {stats.booksRead} finished · made with Cosmic Space
                {shownLink(publicUrl) && <span className="mt-1 block text-[20px] tracking-[1px]">{shownLink(publicUrl)}</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
