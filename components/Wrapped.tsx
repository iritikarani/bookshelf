"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { coverImageOf } from "@/lib/covers";
import { MONTH_NAMES, monthOf, yearOf } from "@/lib/date";
import { roomAttrs, roomStyle, type RoomSettings } from "@/lib/room";
import { averageRating, hasLine } from "@/lib/stats";
import type { Book, ShelfStyle } from "@/lib/types";
import { BookCover } from "./BookCover";
import { BookSpine, spineWidthPx } from "./BookSpine";
import { DownloadIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { flattenTextures, shownLink, toDataUrl } from "./ShareDialog";
import { StarDisplay } from "./StarRating";

const W = 1080;
const H = 1920;
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Finished books per year (by date finished). */
export function finishedIn(books: Book[], year: number) {
  return books.filter((b) => b.status === "read" && yearOf(b.date_finished) === year);
}

/** The year to wrap: this year if anything was finished in it, otherwise the latest year that has some. */
export function wrapYears(books: Book[]): number[] {
  const ys = new Set<number>();
  for (const b of books) if (b.status === "read") {
    const y = yearOf(b.date_finished);
    if (y) ys.add(y);
  }
  return [...ys].sort((a, b) => b - a);
}

function yearStats(books: Book[], year: number) {
  const done = finishedIn(books, year);
  const perMonth = Array.from({ length: 12 }, (_, m) => done.filter((b) => monthOf(b.date_finished) === m).length);
  const busiest = perMonth.indexOf(Math.max(...perMonth));
  const authors = new Map<string, number>();
  for (const b of done) if (b.author.trim()) authors.set(b.author.trim(), (authors.get(b.author.trim()) ?? 0) + 1);
  const topAuthor = [...authors].sort((a, b) => b[1] - a[1])[0];
  const favourite =
    [...done].sort((a, b) => b.rating - a.rating || Number(b.favourite) - Number(a.favourite) || Number(hasLine(b)) - Number(hasLine(a)) || (b.date_finished ?? "").localeCompare(a.date_finished ?? ""))[0] ?? null;
  const line = (favourite && hasLine(favourite) ? favourite : done.find(hasLine)) ?? null;
  return {
    done,
    pages: done.reduce((s, b) => s + (b.pages ?? 0), 0),
    perMonth,
    busiest: perMonth[busiest] > 0 ? busiest : null,
    avg: averageRating(done),
    lines: done.filter(hasLine).length,
    topAuthor: topAuthor && topAuthor[1] > 1 ? { name: topAuthor[0], count: topAuthor[1] } : null,
    longest: [...done].filter((b) => b.pages).sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0))[0] ?? null,
    favourite,
    line,
    reading: books.filter((b) => b.status === "reading"),
    toRead: books.filter((b) => b.status === "to_read").length,
  };
}
type Stats = ReturnType<typeof yearStats>;

/** One 1080 × 1920 story card, in the colours of the reader's room. */
function Card({ styleId, room, children, cardRef }: { styleId: ShelfStyle; room?: RoomSettings | null; children: ReactNode; cardRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={cardRef}
      data-style={styleId}
      {...roomAttrs(room)}
      className="wrapped-card room relative flex flex-col overflow-hidden text-ink"
      style={{ ...roomStyle(room), width: W, height: H, padding: "120px 96px 96px", backgroundAttachment: "scroll" }}
    >
      {children}
    </div>
  );
}

const Kicker = ({ children }: { children: ReactNode }) => <p className="font-sans text-[30px] uppercase tracking-[0.3em] text-ink-soft">{children}</p>;
const Footer = ({ year, owner, link }: { year: number; owner?: string | null; link: string }) => (
  <div className="mt-auto flex items-end justify-between gap-8 font-mono text-[24px] tracking-[2px] text-ink-soft">
    <span>{owner ? `${owner}’s ${year} in books` : `My ${year} in books`}</span>
    <span className="text-right">
      Cosmic Space
      {link && <span className="mt-2 block break-all text-[22px] tracking-[1px]">{link}</span>}
    </span>
  </div>
);

/** A shelf of the year's books, standing on a board. */
function YearShelf({ books }: { books: Book[] }) {
  let used = 0;
  const shown: Book[] = [];
  for (const b of books) {
    const w = spineWidthPx(b.pages) * 1.9 + 4;
    if (used + w > W - 2 * 96 - 40) break;
    used += w;
    shown.push(b);
  }
  return (
    <div className="relative" style={{ "--cover-h": "300px", "--cover-w": "200px", "--spine-scale": 1.9 } as CSSProperties}>
      <div className="flex items-end gap-[4px] px-5">
        {shown.map((b) => (
          <div key={b.id} className="shelf-item-shadow shrink-0" style={{ width: `calc(${spineWidthPx(b.pages)}px * 1.9)`, height: `calc(300px * ${(0.9 + Math.min(Math.max((b.pages ?? 280) - 80, 0), 820) / 820 * 0.12).toFixed(3)})` }}>
            <BookSpine book={b} />
          </div>
        ))}
      </div>
      <div className="h-[26px] rounded-[4px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.25), transparent 30%, rgba(0,0,0,.25)), var(--board)", boxShadow: "0 18px 24px -12px rgba(0,0,0,.45)" }} />
    </div>
  );
}

function IntroCard({ s, year, owner }: { s: Stats; year: number; owner?: string | null }) {
  return (
    <>
      <Kicker>{owner ? `${owner}’s year in books` : "My year in books"}</Kicker>
      <p className="mt-6 font-serif text-[150px] leading-none">{year}</p>
      <div className="mt-24">
        <p className="font-serif text-[300px] leading-[0.85]">{s.done.length}</p>
        <p className="mt-6 font-serif text-[64px] leading-tight">{s.done.length === 1 ? "book finished" : "books finished"}</p>
        {s.pages > 0 && <p className="mt-4 text-[40px] text-ink-soft">{s.pages.toLocaleString()} pages turned</p>}
      </div>
      <div className="mt-auto mb-16">
        <YearShelf books={s.done} />
      </div>
    </>
  );
}

function FavouriteCard({ s }: { s: Stats }) {
  const b = s.favourite!;
  const quote = s.line?.favourite_line?.trim();
  return (
    <>
      <Kicker>{b.rating > 0 ? "Book of the year" : "A book to remember"}</Kicker>
      <div className="flex flex-1 flex-col justify-center pb-16">
      <div className="mx-auto w-[440px] overflow-hidden rounded-[6px] shadow-[0_40px_60px_-20px_rgba(0,0,0,.5)]" style={{ aspectRatio: "2 / 3" }}>
        <BookCover book={b} size="L" />
      </div>
      <p className="mt-14 text-center font-serif text-[72px] leading-[1.05]">{b.title}</p>
      {b.author && <p className="mt-4 text-center text-[38px] text-ink-soft">{b.author}</p>}
      {b.rating > 0 && (
        <div className="mt-8 flex justify-center">
          <StarDisplay rating={b.rating} size={64} />
        </div>
      )}
      {quote && (
        <blockquote className="mx-auto mt-12 max-w-[820px] text-center font-serif text-[44px] italic leading-snug">
          “{quote.length > 160 ? `${quote.slice(0, 157)}…` : quote}”
          {s.line && s.line.id !== b.id && <span className="mt-3 block text-[30px] not-italic text-ink-soft">— {s.line.title}</span>}
        </blockquote>
      )}
      </div>
    </>
  );
}

function MonthsCard({ s }: { s: Stats }) {
  const max = Math.max(1, ...s.perMonth);
  return (
    <>
      <Kicker>Month by month</Kicker>
      <div className="flex flex-1 flex-col justify-center pb-16">
      {s.busiest !== null && (
        <p className="mt-10 font-serif text-[88px] leading-[1.05]">
          {MONTH_FULL[s.busiest]} was your biggest month: {s.perMonth[s.busiest]} {s.perMonth[s.busiest] === 1 ? "book" : "books"}.
        </p>
      )}
      <div className="mt-16 flex h-[620px] items-end gap-[18px] rounded-[28px] bg-paper/70 px-10 pb-8 pt-10 shadow-[0_20px_40px_-24px_rgba(0,0,0,.35)]">
        {s.perMonth.map((n, m) => (
          <div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-4">
            {n > 0 && <span className="font-mono text-[30px]">{n}</span>}
            <div className="w-full rounded-t-[10px]" style={{ height: `${(n / max) * 420}px`, minHeight: 6, background: m === s.busiest ? "rgb(var(--accent))" : "rgb(var(--ink) / 0.22)" }} />
            <span className="font-mono text-[26px] text-ink-soft">{MONTH_NAMES[m].slice(0, 1)}</span>
          </div>
        ))}
      </div>
      {s.longest && (
        <p className="mt-14 text-[40px] leading-snug">
          The longest: <span className="font-serif text-[46px]">{s.longest.title}</span>, {s.longest.pages?.toLocaleString()} pages.
        </p>
      )}
      </div>
    </>
  );
}

function MoreCard({ s }: { s: Stats }) {
  // Four facts, skipping any that would only say 0.
  const tiles = (
    [
      ["Average rating", s.avg === null ? "" : `${s.avg.toFixed(1)}★`],
      ["Lines saved", s.lines ? String(s.lines) : ""],
      ["Reading now", s.reading.length ? String(s.reading.length) : ""],
      ["Waiting to be read", s.toRead ? String(s.toRead) : ""],
      ["Pages turned", s.pages ? s.pages.toLocaleString() : ""],
      ["Books finished", String(s.done.length)],
    ] as [string, string][]
  )
    .filter(([, v]) => v)
    .slice(0, 4);
  return (
    <>
      <Kicker>And also</Kicker>
      <div className="flex flex-1 flex-col justify-center pb-16">
      {s.topAuthor ? (
        <p className="mt-10 font-serif text-[84px] leading-[1.05]">
          Your author of the year: {s.topAuthor.name}, {s.topAuthor.count} books.
        </p>
      ) : (
        <p className="mt-10 font-serif text-[84px] leading-[1.05]">{s.done.length} stories, {s.pages ? `${s.pages.toLocaleString()} pages, ` : ""}one cosy shelf.</p>
      )}
      <dl className="mt-16 grid grid-cols-2 gap-8">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-[28px] bg-paper/75 p-10 shadow-[0_20px_40px_-24px_rgba(0,0,0,.35)]">
            <dd className="font-mono text-[96px] leading-none">{value}</dd>
            <dt className="mt-4 text-[30px] uppercase tracking-[0.15em] text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>
      {s.reading[0] && (
        <p className="mt-14 text-[40px] leading-snug">
          Next chapter: <span className="font-serif text-[46px]">{s.reading[0].title}</span>
        </p>
      )}
      </div>
    </>
  );
}

/**
 * "Your year, wrapped": four story cards (1080 × 1920) about one reading year, in the colours of
 * the reader's room: the year in numbers with a shelf of its books, the book of the year, month by
 * month, and a few more facts. Each card downloads or shares as an image.
 */
export function WrappedSheet({
  open,
  onClose,
  books,
  styleId,
  room,
  owner,
  publicUrl,
}: {
  open: boolean;
  onClose: () => void;
  books: Book[];
  styleId: ShelfStyle;
  room?: RoomSettings | null;
  owner?: string | null;
  publicUrl?: string | null;
}) {
  const years = useMemo(() => wrapYears(books), [books]);
  const [year, setYear] = useState<number | null>(null);
  const shownYear = year ?? years[0] ?? new Date().getFullYear();
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<Map<string, string | null> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);

  const stats = useMemo(() => yearStats(books, shownYear), [books, shownYear]);

  // Covers as data URLs, so they can be drawn into the image.
  useEffect(() => {
    if (!open) return setImages(null);
    let alive = true;
    const wanted = [...stats.done.slice(0, 40), ...(stats.favourite ? [stats.favourite] : [])];
    Promise.all(
      wanted.map(async (b) => {
        const src = coverImageOf(b);
        return [b.id, src ? await toDataUrl(src) : null] as const;
      }),
    ).then((entries) => alive && setImages(new Map(entries)));
    return () => {
      alive = false;
    };
  }, [open, stats]);

  useEffect(() => setIndex(0), [shownYear]);

  const withImage = (b: Book): Book => (images ? { ...b, cover_url: images.get(b.id) ?? null, uploaded_cover: null } : b);
  const s: Stats = useMemo(
    () => ({ ...stats, done: stats.done.map(withImage), favourite: stats.favourite && withImage(stats.favourite) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, images],
  );

  const slides = [
    { key: "intro", label: "The year", node: <IntroCard s={s} year={shownYear} owner={owner} /> },
    ...(s.favourite ? [{ key: "favourite", label: "Book of the year", node: <FavouriteCard s={s} /> }] : []),
    { key: "months", label: "Month by month", node: <MonthsCard s={s} /> },
    { key: "more", label: "And also", node: <MoreCard s={s} /> },
  ];
  const current = Math.min(index, slides.length - 1);

  const render = async (i: number) => {
    const el = cards.current[i];
    if (!el) throw new Error("no card");
    await document.fonts?.ready;
    await Promise.all(Array.from(el.querySelectorAll("img")).map((img) => (img.complete ? null : img.decode().catch(() => null))));
    await flattenTextures(el);
    return toPng(el, { width: W, height: H, pixelRatio: 1 });
  };
  const fileName = (i: number) => `${shownYear}-wrapped-${i + 1}-${slides[i].key}.png`;
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((x) => (x === m ? null : x)), 2200);
  };

  const download = async (all: boolean) => {
    setBusy(true);
    try {
      for (const i of all ? slides.map((_, k) => k) : [current]) {
        const a = document.createElement("a");
        a.href = await render(i);
        a.download = fileName(i);
        a.click();
      }
    } catch {
      flash("Couldn’t make the image. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const files = await Promise.all(slides.map(async (_, i) => new File([await (await fetch(await render(i))).blob()], fileName(i), { type: "image/png" })));
      if (navigator.canShare?.({ files })) await navigator.share({ files, title: `My ${shownYear} in books` });
      else await download(true);
    } catch {
      /* closed the share sheet */
    } finally {
      setBusy(false);
    }
  };

  const scale = 0.27;
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator;

  return (
    <Sheet open={open} onClose={onClose} title={`Your ${shownYear}, wrapped`}>
      {years.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Year">
          {years.map((y) => (
            <button key={y} type="button" role="radio" aria-checked={y === shownYear} onClick={() => setYear(y)} className={`rounded-full border px-4 py-1.5 font-mono text-sm ${y === shownYear ? "border-accent bg-accent/10" : "border-line text-ink-soft"}`}>
              {y}
            </button>
          ))}
        </div>
      )}
      {stats.done.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-4xl" aria-hidden>
            📚
          </p>
          <p className="mt-3 font-serif text-2xl">Nothing to wrap yet</p>
          <p className="mx-auto mt-1 max-w-sm text-ink-soft">Mark books as Finished, with the date you finished them, and your year in books will appear here.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            {slides.length} story cards about your {shownYear}, in the colours of your room. Tap the arrows to see each one.
          </p>
          <div className="relative mx-auto mt-4" style={{ width: W * scale, height: H * scale }}>
            {slides.map((sl, i) => (
              <div
                key={sl.key}
                aria-hidden={i !== current}
                className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[40px] shadow-xl ring-1 ring-line"
                style={{ transform: `scale(${scale})`, visibility: i === current ? "visible" : "hidden" }}
              >
                <Card styleId={styleId} room={room} cardRef={(el) => (cards.current[i] = el)}>
                  {sl.node}
                  <Footer year={shownYear} owner={owner} link={shownLink(publicUrl)} />
                </Card>
              </div>
            ))}
            <button type="button" aria-label="Previous card" disabled={current === 0} onClick={() => setIndex(current - 1)} className="absolute -left-12 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-xl shadow ring-1 ring-line disabled:opacity-30">
              ‹
            </button>
            <button type="button" aria-label="Next card" disabled={current === slides.length - 1} onClick={() => setIndex(current + 1)} className="absolute -right-12 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-xl shadow ring-1 ring-line disabled:opacity-30">
              ›
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-ink-soft" aria-live="polite">
            {current + 1} of {slides.length} · {slides[current].label}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="btn-primary py-3" disabled={busy || !images} onClick={() => download(false)}>
              <DownloadIcon width={16} height={16} /> {busy ? "Making…" : "Download this card"}
            </button>
            {canShare ? (
              <button type="button" className="btn-ghost py-3" disabled={busy || !images} onClick={share}>
                Share all {slides.length}…
              </button>
            ) : (
              <button type="button" className="btn-ghost py-3" disabled={busy || !images} onClick={() => download(true)}>
                Download all {slides.length}
              </button>
            )}
          </div>
          {msg && (
            <p role="status" className="mt-3 text-center text-sm text-ink-soft">
              {msg}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}

