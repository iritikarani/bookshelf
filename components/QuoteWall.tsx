"use client";

import { getFontEmbedCSS, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { shareFiles, shareMessage } from "@/lib/shareMessage";
import { roomAttrs, roomStyle, type RoomSettings } from "@/lib/room";
import { quotesOf, type SavedQuote } from "@/lib/quotes";
import type { Book, ShelfStyle } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { DownloadIcon, ShareIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { flattenTextures, shownLink } from "./ShareDialog";
import { StarDisplay, formatRating } from "./StarRating";

/** What a shared quote image needs to look like the reader's room. */
export interface QuoteLook {
  styleId: ShelfStyle;
  room?: RoomSettings | null;
  /** The public shelf link, shown under the card. */
  publicUrl?: string | null;
  /** Set on someone else's public shelf: whose shelf the quote comes from. */
  visitorOf?: string | null;
}

/** One quote on the wall: the line and the book it came from. */
export interface QuoteItem {
  book: Book;
  quote: SavedQuote;
}

export const quoteItems = (books: Book[]): QuoteItem[] =>
  books
    .flatMap((book) => quotesOf(book).map((quote) => ({ book, quote })))
    .sort((a, b) => (b.quote.created_at ?? "").localeCompare(a.quote.created_at ?? ""));

export function QuoteWall({ books, items, onOpen, look, empty }: { books: Book[]; items?: QuoteItem[]; onOpen: (b: Book) => void; look?: QuoteLook; empty?: React.ReactNode }) {
  const [sharing, setSharing] = useState<QuoteItem | null>(null);
  const quoted = items ?? quoteItems(books);

  if (!quoted.length) {
    return (
      <>
        {empty ?? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="font-serif text-2xl">No quotes saved yet</p>
            <p className="mt-2 text-ink-soft">When you save a line from a book, it’ll be pinned here.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3" aria-label="Saved quotes">
        {quoted.map((it) => (
          <QuoteCard key={`${it.book.id}:${it.quote.id}`} item={it} onOpen={onOpen} onShare={look ? () => setSharing(it) : undefined} />
        ))}
      </ul>
      {look && <QuoteShareSheet item={sharing} look={look} onClose={() => setSharing(null)} />}
    </>
  );
}

/** The card itself, as on the wall. `scale` draws it bigger for the shared image. */
function QuoteFace({ item, scale = 1 }: { item: QuoteItem; scale?: number }) {
  const { book, quote } = item;
  const color = useCoverColor(book);
  const px = (n: number) => `${n * scale}px`;
  return (
    <>
      <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: px(6), backgroundColor: color }} />
      <span aria-hidden className="font-serif leading-none text-ink-soft/30" style={{ fontSize: px(36) }}>
        “
      </span>
      <p className="font-serif leading-snug" style={{ fontSize: px(20), marginTop: px(-12) }}>
        {quote.text}
      </p>
      {quote.note && (
        <p className="italic text-ink-soft" style={{ fontSize: px(13), marginTop: px(10) }}>
          {quote.note}
        </p>
      )}
      <div className="flex items-end justify-between" style={{ marginTop: px(16), gap: px(12) }}>
        <div className="min-w-0">
          <p className="font-medium" style={{ fontSize: px(14) }}>
            {book.title}
          </p>
          {(book.author || quote.page) && (
            <p className="text-ink-soft" style={{ fontSize: px(12) }}>
              {book.author}
              {book.author && quote.page ? " · " : ""}
              {quote.page ? <span className="font-mono">p. {quote.page}</span> : null}
            </p>
          )}
        </div>
        {book.rating > 0 && <StarDisplay rating={book.rating} size={14 * scale} className="shrink-0" />}
      </div>
    </>
  );
}

function QuoteCard({ item, onOpen, onShare }: { item: QuoteItem; onOpen: (b: Book) => void; onShare?: () => void }) {
  const { book, quote } = item;
  return (
    <li className="relative mb-4 break-inside-avoid">
      <button
        type="button"
        onClick={() => onOpen(book)}
        className="group relative block w-full overflow-hidden rounded-xl bg-paper p-5 pl-6 text-left shadow-sm ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:transform-none"
        aria-label={`“${quote.text}”, from ${book.title}${quote.page ? `, page ${quote.page}` : ""}${book.rating ? `, rated ${formatRating(book.rating)} of 5` : ""}. Open book.`}
      >
        <QuoteFace item={item} />
      </button>
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          aria-label={`Share the quote from ${book.title} as an image`}
          title="Share as an image"
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-ink-soft ring-1 ring-line/70 transition hover:text-ink"
        >
          <ShareIcon width={16} height={16} />
        </button>
      )}
    </li>
  );
}

const W = 1080;
const H = 1350; // 4:5, sits well in feeds, chats and stories

/** A quote card drawn as an image on the room's own wall, to send to any app. */
export function QuoteShareSheet({ item, look, onClose }: { item: QuoteItem | null; look: QuoteLook; onClose: () => void }) {
  const book = item?.book ?? null;
  const nodeRef = useRef<HTMLDivElement>(null);
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const link = shownLink(look.publicUrl);

  useEffect(() => {
    setPng(null);
    setError(false);
    if (!book) return;
    let alive = true;
    (async () => {
      try {
        await document.fonts?.ready;
        await new Promise((r) => setTimeout(r, 350)); // let the cover colour settle
        const el = nodeRef.current;
        if (!alive || !el) return;
        await flattenTextures(el);
        const fontEmbedCSS = await getFontEmbedCSS(el).catch(() => "");
        const url = await toPng(el, { width: W, height: H, pixelRatio: 1, fontEmbedCSS });
        if (alive) setPng(url);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [item]);

  const fileName = book ? `${book.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "quote"}-quote.png` : "quote.png";
  const file = async () => new File([await (await fetch(png!)).blob()], fileName, { type: "image/png" });
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator;
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((x) => (x === m ? null : x)), 2000);
  };

  return (
    <Sheet open={Boolean(book)} onClose={onClose} title="Share this quote">
      <div className="mx-auto aspect-[4/5] w-full max-w-[300px] overflow-hidden rounded-xl bg-ink/5 shadow-inner ring-1 ring-line">
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={png} alt="Your quote as an image" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-soft" aria-live="polite">
            {error ? "Couldn’t make the image. Try again in a moment." : "Making your image…"}
          </div>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {canShare ? (
          <button
            type="button"
            className="btn-primary py-3"
            disabled={!png}
            onClick={async () => {
              try {
                const f = await file();
                const done = await shareFiles([f], shareMessage({ publicUrl: look.publicUrl, visitorOf: look.visitorOf }), book ? `A line from ${book.title}` : "A favourite line");
                if (done === "unsupported") {
                  const a = document.createElement("a");
                  a.href = png!;
                  a.download = fileName;
                  a.click();
                }
              } catch {
                /* closed the share sheet */
              }
            }}
          >
            <ShareIcon width={16} height={16} /> Share…
          </button>
        ) : null}
        <a className={`${canShare ? "btn-ghost" : "btn-primary col-span-2"} py-3 ${png ? "" : "pointer-events-none opacity-50"}`} href={png ?? undefined} download={fileName} aria-disabled={!png}>
          <DownloadIcon width={16} height={16} /> Download
        </a>
        {typeof window !== "undefined" && "ClipboardItem" in window && (
          <button
            type="button"
            className="btn-ghost col-span-2 py-3"
            disabled={!png}
            onClick={async () => {
              try {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": await file() })]);
                flash("Image copied");
              } catch {
                flash("Couldn’t copy the image");
              }
            }}
          >
            Copy image
          </button>
        )}
      </div>
      {msg && (
        <p role="status" className="mt-3 text-center text-sm text-ink-soft">
          {msg}
        </p>
      )}

      {/* the image itself, drawn off screen */}
      {book && (
        <div aria-hidden className="pointer-events-none fixed left-[-20000px] top-0">
          <div
            ref={nodeRef}
            data-style={look.styleId}
            {...roomAttrs(look.room)}
            className="room flex flex-col items-center justify-center text-ink"
            style={{ ...roomStyle(look.room), width: W, height: H, padding: "120px 110px 90px", backgroundAttachment: "scroll" }}
          >
            <div className="flex w-full flex-1 items-center">
              <div className="relative w-full overflow-hidden rounded-[36px] bg-paper text-left shadow-[0_40px_80px_-30px_rgba(0,0,0,.45)] ring-1 ring-line/70" style={{ padding: "64px 64px 60px 76px" }}>
                {item && <QuoteFace item={item} scale={3} />}
              </div>
            </div>
            <div className="pt-12 text-center text-ink-soft">
              <p className="font-serif text-[34px]">Cosmic Space</p>
              {link && <p className="mt-1 text-[26px]">{link}</p>}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
