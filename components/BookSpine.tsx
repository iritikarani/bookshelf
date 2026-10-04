"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { hashString, heightFactor, mixHex, textColorFor } from "@/lib/covers";
import type { Book, BookDisplay } from "@/lib/types";
import { useCoverPalette } from "@/lib/useCoverColor";

/** Spine thickness in px at desktop scale, from page count. */
export function spineWidthPx(pages: number | null | undefined): number {
  const p = pages && pages > 0 ? pages : 280;
  return Math.round(Math.min(46, Math.max(20, 15 + p / 22)));
}

/** The ways a book can sit on the shelf, for pickers. */
export const DISPLAY_OPTIONS: { id: BookDisplay; name: string }[] = [
  { id: "spine", name: "Standing" },
  { id: "lean", name: "Leaning" },
  { id: "stack", name: "Lying in a pile" },
  { id: "cover", name: "Cover out" },
];

/** A tiny drawing of each pose, for the pickers. */
export function PoseIcon({ pose }: { pose: BookDisplay }) {
  return (
    <svg viewBox="0 0 20 16" className="h-4 w-5 shrink-0" fill="currentColor" aria-hidden>
      {pose === "spine" && (
        <>
          <rect x="4" y="2" width="4" height="13" rx="0.8" />
          <rect x="9" y="4" width="3.5" height="11" rx="0.8" opacity=".6" />
          <rect x="13.5" y="1" width="3" height="14" rx="0.8" />
        </>
      )}
      {pose === "lean" && (
        <>
          <rect x="3" y="2" width="4" height="13" rx="0.8" />
          <rect x="8.4" y="2.4" width="3.6" height="13" rx="0.8" transform="rotate(16 12 15)" opacity=".75" />
        </>
      )}
      {pose === "stack" && (
        <>
          <rect x="2" y="12" width="16" height="3" rx="0.8" />
          <rect x="3.5" y="8.4" width="13" height="3" rx="0.8" opacity=".7" />
          <rect x="2.6" y="4.8" width="14" height="3" rx="0.8" />
        </>
      )}
      {pose === "cover" && <rect x="5" y="1.5" width="10" height="13.5" rx="1" />}
    </svg>
  );
}

/** How far a leaning book tilts, and the extra room its top needs (≈ sin of the angle). */
export const LEAN_DEG = 9;
const LEAN_REACH = 0.16;
/** Flat books piled on top of each other, at most this many to a pile. */
export const PILE_MAX = 4;

const spineW = (pages: number | null | undefined) => `calc(${spineWidthPx(pages)}px * var(--spine-scale))`;
const spineH = (pages: number | null | undefined) => `calc(var(--cover-h) * ${heightFactor(pages).toFixed(3)})`;

/** A leaning book's slot: its spine plus room for the top to tip over. */
export function leanSize(book: Pick<Book, "pages">): CSSProperties {
  return { width: `calc(${spineWidthPx(book.pages)}px * var(--spine-scale) + var(--cover-h) * ${(heightFactor(book.pages) * LEAN_REACH).toFixed(3)})`, height: spineH(book.pages) };
}

/** A book lying flat: as long as the book is tall, as high as its spine is thick. */
export function stackSize(book: Pick<Book, "pages">): CSSProperties {
  return { width: spineH(book.pages), height: spineW(book.pages) };
}

export function spineSize(book: Pick<Book, "pages">): CSSProperties {
  return {
    width: `calc(${spineWidthPx(book.pages)}px * var(--spine-scale))`,
    height: `calc(var(--cover-h) * ${heightFactor(book.pages).toFixed(3)})`,
  };
}

type TextStyle = "serif" | "sans" | "caps" | "authorCaps";
const FONTS: Record<TextStyle, string> = {
  serif: '400 100px "Gloock", "DM Serif Display", Georgia, serif',
  sans: '600 100px "Libre Franklin", system-ui, sans-serif',
  caps: '400 100px "Gloock", "DM Serif Display", Georgia, serif',
  authorCaps: '400 100px "Libre Franklin", system-ui, sans-serif',
};
const TRACKING: Record<TextStyle, number> = { serif: 0, sans: -0.025, caps: 0.05, authorCaps: 0.025 };
let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * How long a line of text is, in ems. Measured with the real fonts once they've loaded (`measured`),
 * and estimated before that so the first render matches the prebuilt page.
 */
function emWidth(text: string, style: TextStyle, measured: boolean): number {
  const t = style === "caps" || style === "authorCaps" ? text.toUpperCase() : text;
  if (measured && typeof document !== "undefined") {
    measureCtx ??= document.createElement("canvas").getContext("2d");
    if (measureCtx) {
      measureCtx.font = FONTS[style];
      return measureCtx.measureText(t).width / 100 + t.length * TRACKING[style];
    }
  }
  return t.length * (style === "serif" ? 0.52 : style === "sans" ? 0.6 : 0.74);
}

/** True once the web fonts have loaded, so spine text can be measured exactly. */
let fontsLoaded = false;
function useFontsMeasured(): boolean {
  const [ready, setReady] = useState(fontsLoaded);
  useEffect(() => {
    if (fontsLoaded) return setReady(true);
    let alive = true;
    document.fonts.ready.then(() => {
      fontsLoaded = true;
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

type SpineBook = Pick<Book, "title" | "author" | "cover_color" | "cover_url" | "uploaded_cover" | "pages"> & Partial<Pick<Book, "year_published" | "status">>;
type SpineKind = "paperback" | "hardback" | "leather";

/** Old books are bound in leather, long ones are hardbacks, the rest paperbacks. */
function spineKind(book: SpineBook): SpineKind {
  if (book.year_published && book.year_published > 0 && book.year_published < 1930) return "leather";
  if ((book.pages ?? 0) >= 420) return "hardback";
  if ((book.pages ?? 0) >= 320 && hashString(book.title) % 3 === 0) return "hardback";
  return "paperback";
}

/** A long title on a wide spine goes onto two lines, split at the space nearest the middle. */
function titleLines(title: string, twoLines: boolean): string[] {
  if (!twoLines) return [title];
  const mid = title.length / 2;
  let best = -1;
  for (let i = 0; i < title.length; i++) if (title[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best > 0 ? [title.slice(0, best), title.slice(best + 1)] : [title];
}

/** The little publisher's mark at the foot of a spine. */
function PublisherMark({ variant, color, size }: { variant: number; color: string; size: string }) {
  return (
    <svg viewBox="0 0 10 10" className="relative mt-auto shrink-0" style={{ width: size, height: size }} aria-hidden>
      {variant === 0 && <ellipse cx="5" cy="5" rx="4.4" ry="4.4" fill={color} />}
      {variant === 1 && <rect x="1" y="1" width="8" height="8" rx="1.6" fill={color} />}
      {variant === 2 && <ellipse cx="5" cy="5" rx="3.4" ry="4.6" fill={color} />}
      {variant === 3 && <path d="M5 0.8 L9.2 4.4 V9.2 H0.8 V4.4 Z" fill={color} />}
      <circle cx="5" cy="5.4" r="1.4" fill="rgba(255,255,255,.85)" />
    </svg>
  );
}

/**
 * A book standing spine-out, drawn like the real thing: the cover's own colours; a paperback with
 * a publisher's mark (and reading creases once it's been read), a hardback with headbands and
 * rules, or an old book in leather with raised bands and gold lettering. Long titles wrap onto two
 * lines and shrink to fit rather than being cut off.
 */
export function BookSpine({ book }: { book: SpineBook }) {
  const palette = useCoverPalette(book);
  const kind = spineKind(book);
  const variant = hashString(book.title + book.author);
  const w = spineWidthPx(book.pages);
  const gold = "#dcbc66";
  const base = kind === "leather" ? mixHex(palette.base, "#1d120c", 0.42) : palette.base;
  const ink = kind === "leather" ? gold : textColorFor(base);
  const accent = palette.accent;

  const serif = kind !== "paperback" || variant % 2 === 0;
  const style: TextStyle = kind === "leather" ? "caps" : serif ? "serif" : "sans";
  const measured = useFontsMeasured();

  // Fit the title: the room along the spine for it, and how long its longest line is.
  const hf = heightFactor(book.pages);
  const along = 129 * hf * (kind === "leather" ? 0.36 : kind === "hardback" ? 0.45 : 0.56);
  const fits = (lines: string[], across: number) => Math.min(across, along / Math.max(...lines.map((l) => emWidth(l, style, measured))), 14);
  let lines = titleLines(book.title, false);
  let size = fits(lines, w * 0.42);
  if (size < 10 && w >= 26 && book.title.includes(" ")) {
    const two = titleLines(book.title, true);
    const twoSize = fits(two, w * 0.3);
    if (twoSize > size) {
      lines = two;
      size = twoSize;
    }
  }
  const fontSize = `calc(${Math.max(6.5, size).toFixed(1)}px * var(--spine-scale))`;

  // The author's full name when it fits, else just the surname.
  const names = book.author.split(",")[0].trim().split(/\s+/).filter(Boolean);
  const authorRoom = 129 * hf * 0.25;
  const authorFit = (name: string) => Math.min(w * 0.22, 8, authorRoom / Math.max(emWidth(name, "authorCaps", measured), 0.1));
  const full = names.join(" ");
  const surname = names[names.length - 1] ?? "";
  const author = names.length > 1 && authorFit(full) >= 5.5 ? full : surname;
  const authorSize = `calc(${Math.max(5.5, authorFit(author)).toFixed(1)}px * var(--spine-scale))`;
  const band = kind === "paperback" && variant % 3 === 0;

  return (
    <div className={`spine spine--${kind}`} style={{ backgroundColor: base, color: ink }}>
      {kind === "hardback" && (
        <>
          <span aria-hidden className="spine-cap top-0" />
          <span aria-hidden className="spine-cap bottom-0" />
          <span aria-hidden className="absolute inset-x-[18%] top-[6%] h-px opacity-60" style={{ background: variant % 2 ? accent : "currentColor" }} />
        </>
      )}
      {kind === "leather" && (
        <>
          {[11, 19, 74, 82].map((top) => (
            <span key={top} aria-hidden className="spine-rib" style={{ top: `${top}%` }} />
          ))}
          <span aria-hidden className="spine-label" style={{ top: "26%", bottom: "30%" }} />
        </>
      )}
      {band && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[24%]" style={{ background: accent }} />}
      {kind === "paperback" && book.status === "read" && <span aria-hidden className="spine-creases" />}

      <span
        className={`spine-title ${serif ? "font-serif" : "font-sans font-semibold tracking-tight"} ${kind === "leather" ? "uppercase tracking-wider" : ""}`}
        style={{ fontSize, ...(kind === "leather" ? { marginTop: "18%", flex: "0 1 auto", maxHeight: "40%" } : {}) }}
      >
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden text-ellipsis">
            {line}
          </span>
        ))}
      </span>
      {author && w >= 22 && (
        <span
          className={`spine-author relative font-sans uppercase tracking-wide ${kind === "leather" ? "mt-[30%]" : "mt-[7%]"}`}
          style={{ fontSize: authorSize, ...(band ? { color: textColorFor(accent) } : {}) }}
        >
          {author}
        </span>
      )}
      {kind !== "leather" && w >= 24 && (
        <PublisherMark variant={variant % 4} color={band ? textColorFor(accent) : kind === "hardback" ? ink : accent} size={`calc(${(w * 0.4).toFixed(1)}px * var(--spine-scale))`} />
      )}
    </div>
  );
}
