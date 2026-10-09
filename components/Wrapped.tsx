"use client";

import { getFontEmbedCSS, toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { coverImageOf } from "@/lib/covers";
import { MONTH_NAMES, monthOf, yearOf } from "@/lib/date";
import { roomAttrs, roomStyle, type RoomSettings } from "@/lib/room";
import { shareFiles, shareMessage } from "@/lib/shareMessage";
import { averageRating, bestMonthRun, firstAuthor, hasLine, topCounts } from "@/lib/stats";
import { quotesOf } from "@/lib/quotes";
import type { Book, ShelfStyle } from "@/lib/types";
import { BookCover } from "./BookCover";
import { BookSpine, spineWidthPx } from "./BookSpine";
import { DownloadIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { flattenTextures, shownLink, toDataUrl } from "./ShareDialog";
import { StarDisplay } from "./StarRating";
import { useCoverColor } from "@/lib/useCoverColor";

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
  // The most memorable quote: the one with a note, else the longest-kept line, from the best-rated book.
  const quotes = [...done].sort((a, b) => b.rating - a.rating).flatMap((b) => quotesOf(b).map((q) => ({ book: b, q })));
  const memorable = quotes.find((x) => x.q.note) ?? quotes[0] ?? null;
  const authorsAll = topCounts(done.map(firstAuthor), 1)[0];
  return {
    genres: topCounts(done.map((b) => b.genre), 3),
    mostAuthor: authorsAll ? { name: authorsAll[0], count: authorsAll[1] } : null,
    topRated: [...done].filter((b) => b.rating > 0).sort((a, b) => b.rating - a.rating || (b.date_finished ?? "").localeCompare(a.date_finished ?? "")).slice(0, 3),
    monthsActive: perMonth.filter(Boolean).length,
    bestRun: bestMonthRun(done, year),
    memorable,
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

/**
 * One 1080 × 1920 story card, laid out like the title page of a fine book: the reader's room as
 * the paper, a double rule framing the page, and everything set in one book typeface.
 */
function Card({ styleId, room, children, cardRef }: { styleId: ShelfStyle; room?: RoomSettings | null; children: ReactNode; cardRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={cardRef}
      data-style={styleId}
      {...roomAttrs(room)}
      className="wrapped-card room relative flex flex-col items-center overflow-hidden text-center font-book text-ink"
      style={{ ...roomStyle(room), width: W, height: H, padding: "150px 120px 110px", backgroundAttachment: "scroll" }}
    >
      {/* a soft pool of light and a double rule round the page */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(255,255,255,.4), transparent 70%), radial-gradient(ellipse 120% 90% at 50% 50%, transparent 60%, rgba(0,0,0,.12))" }} />
      <div aria-hidden className="pointer-events-none absolute inset-[48px] rounded-[6px] border-[2px] border-ink/25" />
      <div aria-hidden className="pointer-events-none absolute inset-[60px] rounded-[4px] border border-ink/15" />
      <div className="relative flex w-full flex-1 flex-col items-center">{children}</div>
    </div>
  );
}

/** A small typographic flourish: rule, diamond, rule. */
const Ornament = ({ className = "" }: { className?: string }) => (
  <div aria-hidden className={`flex items-center justify-center gap-5 text-ink/45 ${className}`}>
    <span className="h-px w-[120px] bg-current" />
    <span className="text-[28px] leading-none">◆</span>
    <span className="h-px w-[120px] bg-current" />
  </div>
);

const Kicker = ({ children }: { children: ReactNode }) => <p className="text-[34px] font-semibold uppercase tracking-[0.42em] text-ink-soft">{children}</p>;

const Footer = ({ year, link }: { year: number; link: string }) => (
  <div className="relative mt-auto text-ink-soft">
    <Ornament className="mb-8" />
    <p className="text-[34px] font-semibold uppercase tracking-[0.3em]">Cosmic Space</p>
    {link && <p className="mt-2 break-all text-[28px] italic tracking-[0.04em]">{link}</p>}
    <p className="sr-only">{year}</p>
  </div>
);

const Big = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`font-medium leading-[0.9] [font-variant-numeric:lining-nums] ${className}`}>{children}</p>
);

/** A shelf of the year's books, standing on a board. */
function YearShelf({ books }: { books: Book[] }) {
  let used = 0;
  const shown: Book[] = [];
  for (const b of books) {
    const w = spineWidthPx(b.pages) * 1.9 + 4;
    if (used + w > W - 2 * 120 - 40) break;
    used += w;
    shown.push(b);
  }
  return (
    <div className="relative w-full" style={{ "--cover-h": "300px", "--cover-w": "200px", "--spine-scale": 1.9 } as CSSProperties}>
      <div className="flex items-end justify-center gap-[4px] px-5">
        {shown.map((b) => (
          <div key={b.id} className="shelf-item-shadow shrink-0" style={{ width: `calc(${spineWidthPx(b.pages)}px * 1.9)`, height: `calc(300px * ${(0.9 + (Math.min(Math.max((b.pages ?? 280) - 80, 0), 820) / 820) * 0.12).toFixed(3)})` }}>
            <BookSpine book={b} />
          </div>
        ))}
      </div>
      <div className="h-[26px] rounded-[4px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.3), transparent 30%, rgba(0,0,0,.25)), var(--board)", boxShadow: "0 22px 26px -14px rgba(0,0,0,.5)" }} />
    </div>
  );
}

function IntroCard({ s, year, owner }: { s: Stats; year: number; owner?: string | null }) {
  return (
    <>
      <Kicker>{owner ? `${owner}’s year in books` : "My year in books"}</Kicker>
      <Big className="mt-10 text-[170px] italic">{year}</Big>
      <Ornament className="mt-14" />
      <Big className="mt-16 text-[380px]">{s.done.length}</Big>
      <p className="mt-6 text-[72px] font-medium italic leading-tight">{s.done.length === 1 ? "book finished" : "books finished"}</p>
      {s.pages > 0 && <p className="mt-6 text-[40px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{s.pages.toLocaleString()} pages turned</p>}
      <div className="mt-auto mb-14 w-full">
        <YearShelf books={s.done} />
      </div>
    </>
  );
}

function FavouriteCard({ s }: { s: Stats }) {
  const b = s.favourite!;
  const quote = s.line ? quotesOf(s.line)[0]?.text : undefined;
  return (
    <>
      <Kicker>{b.rating > 0 ? "Book of the year" : "A book to remember"}</Kicker>
      <div className="flex w-full flex-1 flex-col items-center justify-center pb-10">
        <div className="relative">
          {/* the cover glows in its own colour */}
          <div aria-hidden className="absolute -inset-16 rounded-full opacity-60 blur-[50px]" style={{ background: "rgb(var(--accent) / .35)" }} />
          <div className="relative w-[440px] overflow-hidden rounded-[6px] shadow-[0_50px_70px_-24px_rgba(0,0,0,.55)] ring-1 ring-black/10" style={{ aspectRatio: "2 / 3" }}>
            <BookCover book={b} size="L" />
          </div>
        </div>
        <p className="mt-16 text-[84px] font-semibold leading-[1.02]">{b.title}</p>
        {b.author && <p className="mt-4 text-[40px] font-semibold uppercase tracking-[0.22em] text-ink-soft">{b.author}</p>}
        {b.rating > 0 && (
          <div className="mt-10 flex justify-center">
            <StarDisplay rating={b.rating} size={60} />
          </div>
        )}
        {quote && (
          <blockquote className="mt-12 max-w-[800px] text-[50px] font-medium italic leading-[1.25]">
            “{quote.length > 160 ? `${quote.slice(0, 157)}…` : quote}”
            {s.line && s.line.id !== b.id && <span className="mt-4 block text-[32px] not-italic uppercase tracking-[0.2em] text-ink-soft">{s.line.title}</span>}
          </blockquote>
        )}
      </div>
    </>
  );
}

/** One finished book lying flat, in its own colour: the month chart is made of little piles. */
function FlatBook({ book, i, height }: { book: Book; i: number; height: number }) {
  const color = useCoverColor(book);
  return (
    <div
      className="shrink-0 rounded-[4px] shadow-[0_3px_3px_rgba(0,0,0,.25)]"
      style={{
        height,
        width: `${92 - ((i * 7) % 3) * 8}%`,
        transform: `translateX(${((i * 5) % 3) - 1}px)`,
        background: `linear-gradient(180deg, rgba(255,255,255,.3), transparent 35%, rgba(0,0,0,.18)), ${color}`,
      }}
    />
  );
}

function MonthsCard({ s }: { s: Stats }) {
  const byMonth = Array.from({ length: 12 }, (_, m) => s.done.filter((b) => monthOf(b.date_finished) === m));
  // Books are as thick as the busiest month allows: a pile of 3 reaches most of the chart.
  const most = Math.max(1, ...byMonth.map((l) => l.length));
  const thick = Math.max(12, Math.min(150, Math.floor(520 / Math.max(most, 3)) - 6));
  return (
    <>
      <Kicker>Month by month</Kicker>
      <div className="flex w-full flex-1 flex-col items-center justify-center pb-10">
        {s.busiest !== null && (
          <p className="text-[96px] font-semibold leading-[1.02]">
            <span className="italic">{MONTH_FULL[s.busiest]}</span> was your
            <br />
            biggest month
          </p>
        )}
        {s.busiest !== null && (
          <p className="mt-6 text-[40px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
            {s.perMonth[s.busiest]} {s.perMonth[s.busiest] === 1 ? "book" : "books"} finished
          </p>
        )}
        {/* each month a little pile of the books finished in it */}
        <div className="mt-16 flex h-[560px] w-full items-end gap-[10px] border-b-[3px] border-ink/30 pb-2">
          {byMonth.map((list, m) => (
            <div key={m} className="flex h-full flex-1 flex-col-reverse items-center gap-[4px]">
              {list.slice(0, 40).map((b, i) => (
                <FlatBook key={b.id} book={b} i={i + m} height={thick} />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex w-full gap-[10px]">
          {MONTH_NAMES.map((name, m) => (
            <span key={m} className={`flex-1 text-[28px] font-semibold uppercase ${m === s.busiest ? "text-ink" : "text-ink-soft"}`}>
              {name.slice(0, 1)}
            </span>
          ))}
        </div>
        {s.longest && (
          <p className="mt-16 text-[44px] leading-snug">
            The longest, <span className="font-semibold italic">{s.longest.title}</span>,
            <br />
            at {s.longest.pages?.toLocaleString()} pages.
          </p>
        )}
      </div>
    </>
  );
}

function RatedCard({ s }: { s: Stats }) {
  return (
    <>
      <Kicker>Highest rated</Kicker>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-14 pb-10">
        {s.topRated.map((b, i) => (
          <div key={b.id} className="flex w-full items-center gap-12 text-left">
            <span className="w-[70px] shrink-0 text-center text-[90px] font-medium italic text-ink-soft">{i + 1}</span>
            <div className="w-[200px] shrink-0 overflow-hidden rounded-[5px] shadow-[0_24px_40px_-18px_rgba(0,0,0,.55)]" style={{ aspectRatio: "2 / 3" }}>
              <BookCover book={b} size="L" />
            </div>
            <div className="min-w-0">
              <p className="text-[60px] font-semibold leading-[1.05]">{b.title}</p>
              {b.author && <p className="mt-3 text-[32px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{b.author}</p>}
              <div className="mt-5">
                <StarDisplay rating={b.rating} size={44} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TasteCard({ s }: { s: Stats }) {
  return (
    <>
      <Kicker>What you read</Kicker>
      <div className="flex w-full flex-1 flex-col items-center justify-center pb-10">
        {s.genres.length > 0 && (
          <>
            <p className="text-[40px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Favourite genres</p>
            <ol className="mt-8 space-y-4">
              {s.genres.map(([g, n], i) => (
                <li key={g} className={`${i === 0 ? "text-[110px]" : "text-[70px]"} font-semibold italic leading-[1.05]`}>
                  {g} <span className="text-[36px] not-italic text-ink-soft">· {n}</span>
                </li>
              ))}
            </ol>
            <Ornament className="my-16" />
          </>
        )}
        {s.mostAuthor && (
          <>
            <p className="text-[40px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Most-read author</p>
            <p className="mt-6 text-[96px] font-semibold italic leading-[1]">{s.mostAuthor.name}</p>
            <p className="mt-4 text-[40px]">
              {s.mostAuthor.count} {s.mostAuthor.count === 1 ? "book" : "books"}
            </p>
          </>
        )}
        <Ornament className="my-16" />
        <p className="text-[40px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Consistency</p>
        <p className="mt-6 text-[84px] font-semibold leading-[1.05]">
          {s.monthsActive} of 12 months
        </p>
        <p className="mt-4 text-[44px] italic">
          {s.bestRun > 1 ? `with a ${s.bestRun}-month reading streak` : "with a finished book"}
        </p>
      </div>
    </>
  );
}

function QuoteCard({ s }: { s: Stats }) {
  const m = s.memorable!;
  const text = m.q.text.length > 280 ? `${m.q.text.slice(0, 277)}…` : m.q.text;
  return (
    <>
      <Kicker>Most memorable line</Kicker>
      <div className="flex w-full flex-1 flex-col items-center justify-center pb-10">
        <span aria-hidden className="text-[260px] leading-none text-ink/25">“</span>
        <blockquote className={`-mt-20 font-medium italic leading-[1.22] ${text.length > 160 ? "text-[62px]" : "text-[84px]"}`}>{text}</blockquote>
        {m.q.note && <p className="mt-12 max-w-[820px] text-[40px] leading-snug text-ink-soft">{m.q.note}</p>}
        <Ornament className="my-14" />
        <p className="text-[56px] font-semibold">{m.book.title}</p>
        <p className="mt-3 text-[34px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
          {m.book.author}
          {m.q.page ? ` · p. ${m.q.page}` : ""}
        </p>
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
      <div className="flex w-full flex-1 flex-col items-center justify-center pb-10">
        {s.topAuthor ? (
          <>
            <p className="text-[40px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Author of the year</p>
            <p className="mt-6 text-[110px] font-semibold italic leading-[1]">{s.topAuthor.name}</p>
            <p className="mt-6 text-[44px]">{s.topAuthor.count} books, and counting</p>
          </>
        ) : (
          <p className="text-[96px] font-semibold italic leading-[1.05]">
            {s.done.length} {s.done.length === 1 ? "story" : "stories"},
            <br />
            one cosy shelf
          </p>
        )}
        <Ornament className="my-16" />
        <dl className="grid w-full grid-cols-2 gap-x-10 gap-y-16">
          {tiles.map(([label, value]) => (
            <div key={label}>
              <dd className="text-[120px] font-medium leading-none [font-variant-numeric:lining-nums]">{value}</dd>
              <dt className="mt-4 text-[30px] font-semibold uppercase tracking-[0.22em] text-ink-soft">{label}</dt>
            </div>
          ))}
        </dl>
        {s.reading[0] && (
          <p className="mt-20 text-[44px] leading-snug">
            Next chapter: <span className="font-semibold italic">{s.reading[0].title}</span>
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
  const fontCSS = useRef<Promise<string> | null>(null);

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
    ...(s.topRated.length > 1 ? [{ key: "rated", label: "Highest rated", node: <RatedCard s={s} /> }] : []),
    { key: "months", label: "Month by month", node: <MonthsCard s={s} /> },
    ...(s.genres.length || s.mostAuthor ? [{ key: "taste", label: "What you read", node: <TasteCard s={s} /> }] : []),
    ...(s.memorable ? [{ key: "quote", label: "Memorable line", node: <QuoteCard s={s} /> }] : []),
    { key: "more", label: "And also", node: <MoreCard s={s} /> },
  ];
  const current = Math.min(index, slides.length - 1);

  const render = async (i: number) => {
    const el = cards.current[i];
    if (!el) throw new Error("no card");
    await document.fonts?.ready;
    await Promise.all(Array.from(el.querySelectorAll("img")).map((img) => (img.complete ? null : img.decode().catch(() => null))));
    await flattenTextures(el);
    // Embed the web fonts once and reuse them for every card, so all four always match.
    fontCSS.current ??= getFontEmbedCSS(el).catch(() => "");
    return toPng(el, { width: W, height: H, pixelRatio: 1, fontEmbedCSS: await fontCSS.current });
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
      if ((await shareFiles(files, shareMessage({ publicUrl }), `My ${shownYear} in books`)) === "unsupported") await download(true);
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
                  <Footer year={shownYear} link={shownLink(publicUrl)} />
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

