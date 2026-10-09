"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { coverColorOf, coverImageOf, coverSources, googleAtWidth, isGoogleCover, sizedCover, textColorFor } from "@/lib/covers";
import type { Book } from "@/lib/types";

type CoverBook = Pick<Book, "title" | "author" | "cover_url" | "uploaded_cover" | "cover_color">;

/** A designed cover: solid colour, title and author in serif. */
export function GeneratedCover({ title, author, color, className = "", style }: { title: string; author: string; color: string; className?: string; style?: CSSProperties }) {
  const long = title.length > 28;
  const ink = textColorFor(color);
  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-[9%] ${className}`}
      style={{ backgroundColor: color, color: ink, containerType: "inline-size", ...style }}
    >
      <div className="absolute inset-y-0 left-0 w-[6%] bg-black/10" aria-hidden />
      <div className="absolute inset-[5%] border border-current opacity-25" aria-hidden />
      <p className="relative z-10 pl-[4%] font-serif leading-[1.05] [overflow-wrap:anywhere]" style={{ fontSize: long ? "13cqw" : "16cqw" }}>
        {title}
      </p>
      <p className="relative z-10 pl-[4%] font-sans uppercase tracking-wider opacity-75" style={{ fontSize: "8.5cqw" }}>
        {author}
      </p>
    </div>
  );
}

/**
 * Images to try for a saved cover, sharpest first. A Google Books thumbnail is ~128px wide
 * (blurry on phones), so a larger copy of the same image is asked for first, with the original
 * thumbnail as the fallback if Google can't make one.
 */
function coverCandidates(full: string, size: "M" | "L"): string[] {
  if (isGoogleCover(full)) return [googleAtWidth(full, size === "L" ? 600 : 300), full];
  return [sizedCover(full, size)];
}

/** How far a cover's shape may differ from its box before it's shown whole instead of trimmed. */
const TRIM_LIMIT = 0.2;

/** size: "M" for shelves and lists (fast); "L" where the cover is shown big. */
export function BookCover({ book, className = "", sizes, size = "M" }: { book: CoverBook; className?: string; sizes?: string; size?: "M" | "L" }) {
  const full = coverImageOf(book);
  const candidates = useMemo(() => (full ? coverCandidates(full, size) : []), [full, size]);
  // Which candidate is showing, per cover (so a new cover starts again from the best one).
  const [state, setState] = useState<{ full: string | null; i: number; fit: boolean }>({ full, i: 0, fit: false });
  const current = state.full === full ? state : { full, i: 0, fit: false };
  const src = candidates[current.i];
  // Sharp on phones: the bigger image only where the screen has the pixels for it.
  const srcSet = src && size === "M" && src.startsWith("https://covers.openlibrary.org/") ? coverSources(src, 90).srcSet : undefined;
  const alt = `Cover of ${book.title}${book.author ? ` by ${book.author}` : ""}`;
  const next = () => setState({ full, i: current.i + 1, fit: false });

  if (!src) {
    return (
      <div role="img" aria-label={alt} className={`h-full w-full ${className}`}>
        <GeneratedCover title={book.title} author={book.author} color={coverColorOf(book)} />
      </div>
    );
  }
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      srcSet={srcSet}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={next}
      onLoad={(e) => {
        const el = e.currentTarget;
        // Open Library returns a 1×1 gif for some missing covers.
        if (el.naturalWidth < 10) return next();
        // A cover much wider or narrower than its box is shown whole, not cropped.
        const box = el.clientWidth / Math.max(1, el.clientHeight);
        const shape = el.naturalWidth / el.naturalHeight;
        const fit = Boolean(box) && Math.abs(shape / box - 1) > TRIM_LIMIT;
        if (fit !== current.fit) setState({ full, i: current.i, fit });
      }}
      className={current.fit ? "relative h-full w-full object-contain" : `h-full w-full object-cover ${className}`}
      // While a phone's sharper copy downloads, the medium one (quick, often cached) shows behind it.
      style={srcSet && !current.fit ? { background: `url("${src}") center / cover no-repeat` } : undefined}
    />
  );
  if (!current.fit) return img;
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {/* The same cover, softly blurred, fills the space around it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-md" />
      {img}
    </div>
  );
}
