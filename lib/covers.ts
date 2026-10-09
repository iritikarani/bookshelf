import type { Book } from "./types";

/** Swatches for designed covers: soft pastels that carry dark serif text. */
export const COVER_SWATCHES = [
  { name: "Blush", hex: "#f2c4c0" },
  { name: "Peach", hex: "#f7d3b5" },
  { name: "Butter", hex: "#f3e3a2" },
  { name: "Pistachio", hex: "#d4e5b9" },
  { name: "Mint", hex: "#bfe3cf" },
  { name: "Sky", hex: "#bfd8ee" },
  { name: "Periwinkle", hex: "#c8cbf0" },
  { name: "Lavender", hex: "#dccbee" },
  { name: "Rose", hex: "#ecc5dc" },
  { name: "Oat", hex: "#e6dccb" },
] as const;

/** Dark ink on light covers, white on dark ones (older saved colours may be dark). */
export function textColorFor(hex: string): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "#2f2a28";
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.35 ? "#2f2a28" : "#ffffff";
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic swatch for a title, used when a book has no chosen colour. */
export function defaultCoverColor(title: string): string {
  return COVER_SWATCHES[hashString(title.toLowerCase()) % COVER_SWATCHES.length].hex;
}

export function coverImageOf(book: Pick<Book, "uploaded_cover" | "cover_url">): string | null {
  return book.uploaded_cover || book.cover_url || null;
}

export function coverColorOf(book: Pick<Book, "cover_color" | "title">): string {
  return book.cover_color || defaultCoverColor(book.title);
}

/** Height multiplier from page count, so a shelf of covers isn't perfectly uniform. */
export function heightFactor(pages: number | null | undefined): number {
  if (!pages || pages <= 0) return 0.97;
  const clamped = Math.min(Math.max(pages, 80), 900);
  return 0.9 + ((clamped - 80) / (900 - 80)) * 0.12; // 0.90 → 1.02
}

/** Open Library cover URLs. `default=false` makes missing covers 404 instead of a 1px gif. */
export const olCoverById = (id: number | string, size: "S" | "M" | "L" = "L") =>
  `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
export const olCoverByIsbn = (isbn: string, size: "S" | "M" | "L" = "L") =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;

/**
 * Resolve whether an image URL actually yields a real cover (not a 1×1 placeholder).
 * Open Library covers are checked at the medium size: the same cover ID or ISBN has all sizes,
 * and the large image (often 100 KB+) used to miss the time limit on phones, so real covers
 * were wrongly treated as missing.
 */
export function probeImage(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 10 && img.naturalHeight > 10);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = sizedCover(url, "M");
  });
}

/**
 * The same Open Library cover at another size. Shelves draw covers ~90px wide, so the medium
 * image (~15 KB) looks the same as the large one (~100 KB) and loads far faster.
 */
export function sizedCover(url: string, size: "S" | "M" | "L"): string {
  return url.startsWith("https://covers.openlibrary.org/") ? url.replace(/-[SML]\.jpg/, `-${size}.jpg`) : url;
}

const isOL = (url: string) => url.startsWith("https://covers.openlibrary.org/");
export const isGoogleCover = (url: string) => /^https:\/\/books\.google(apis)?\.com\/books\/(content|publisher)/.test(url);

/** A Google Books thumbnail asked for at a given width (they default to ~128px, blurry on phones). */
export function googleAtWidth(url: string, width: number): string {
  const u = url.replace(/&zoom=\d/, "").replace(/&fife=[^&]*/, "");
  return `${u}${u.includes("?") ? "&" : "?"}fife=w${width}`;
}

/**
 * src + srcset for a cover drawn about `cssWidth` px wide: sharp on high-density phone screens
 * (2× and 3×) without making ordinary screens download the big image.
 */
export function coverSources(url: string, cssWidth = 100): { src: string; srcSet?: string } {
  if (isOL(url)) {
    // Open Library: M is ~180px wide, L ~500px.
    const m = sizedCover(url, "M");
    return cssWidth <= 90 ? { src: m, srcSet: `${m} 1x, ${sizedCover(url, "L")} 2x` } : { src: m, srcSet: `${sizedCover(url, "L")} 1.5x` };
  }
  // Google Books thumbnails are used as given; a larger one is tried separately (see ResultCover).
  return { src: url };
}

export interface Palette {
  /** The cover's main colour, used for the spine. */
  base: string;
  /** A second colour from the cover, for bands, labels and the publisher mark. */
  accent: string;
}

const PALETTE_KEY = "exlibris:coverPalette";
// Remembered between visits, so spines get their colours instantly instead of re-downloading covers.
const paletteCache = new Map<string, Palette | null>(
  (() => {
    try {
      if (typeof window === "undefined") return [];
      localStorage.removeItem("exlibris:coverColors"); // the older one-colour cache
      return JSON.parse(localStorage.getItem(PALETTE_KEY) ?? "[]") as [string, Palette][];
    } catch {
      return [];
    }
  })(),
);
let saveTimer: number | undefined;
function rememberPalette(url: string, palette: Palette | null) {
  paletteCache.set(url, palette);
  if (palette === null || typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const entries = [...paletteCache].filter((e): e is [string, Palette] => e[1] !== null).slice(-600);
      localStorage.setItem(PALETTE_KEY, JSON.stringify(entries));
    } catch {}
  }, 500);
}

const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string): [number, number, number] | null => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
};

/** Mix two hex colours: `t` of the second into the first. */
export function mixHex(a: string, b: string, t: number): string {
  const x = fromHex(a);
  const y = fromHex(b);
  if (!x || !y) return a;
  return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}

/** A second colour that sits well with a cover colour that has no image to take one from. */
export function accentFor(base: string): string {
  return textColorFor(base) === "#ffffff" ? mixHex(base, "#f1e2bd", 0.7) : mixHex(base, "#2b2420", 0.62);
}

/**
 * The main and second colour of a cover image, or null when it can't be read (e.g. CORS).
 * Colours are grouped into buckets; the main colour is the biggest bucket (vivid colours count a
 * little more, near-white and near-black a lot less), the second the most different sizeable one.
 */
export function coverPalette(url: string): Promise<Palette | null> {
  if (paletteCache.has(url)) return Promise.resolve(paletteCache.get(url)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const W = 24;
        const H = 36;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;
        const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
          const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
          e.n++;
          e.r += r;
          e.g += g;
          e.b += b;
          buckets.set(key, e);
          total++;
        }
        const groups = [...buckets.values()].map((e) => {
          const [r, g, b] = [e.r / e.n, e.g / e.n, e.b / e.n];
          const max = Math.max(r, g, b) / 255;
          const min = Math.min(r, g, b) / 255;
          const l = (max + min) / 2;
          const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
          const extreme = l > 0.93 || l < 0.07 ? 0.2 : 1;
          return { r, g, b, n: e.n, score: e.n * (0.6 + 0.8 * sat) * extreme, sat };
        });
        groups.sort((a, b) => b.score - a.score);
        const main = groups[0];
        if (!main) throw new Error("empty");
        const dist = (a: typeof main, b: typeof main) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
        const second = groups
          .slice(1)
          .filter((g) => g.n >= total * 0.03 && dist(g, main) > 70)
          .sort((a, b) => dist(b, main) * Math.sqrt(b.n) * (0.4 + b.sat) - dist(a, main) * Math.sqrt(a.n) * (0.4 + a.sat))[0];
        const base = toHex(main.r, main.g, main.b);
        const palette = { base, accent: second ? toHex(second.r, second.g, second.b) : accentFor(base) };
        rememberPalette(url, palette);
        resolve(palette);
      } catch {
        rememberPalette(url, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      rememberPalette(url, null);
      resolve(null);
    };
    // A small copy is plenty for picking colours.
    img.src = sizedCover(url, "S");
  });
}
