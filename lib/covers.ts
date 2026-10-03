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

/** Resolve whether an image URL actually yields a real cover (not a 1×1 placeholder). */
export function probeImage(url: string, timeoutMs = 4000): Promise<boolean> {
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
    img.src = url;
  });
}

/**
 * The same Open Library cover at another size. Shelves draw covers ~90px wide, so the medium
 * image (~15 KB) looks the same as the large one (~100 KB) and loads far faster.
 */
export function sizedCover(url: string, size: "S" | "M" | "L"): string {
  return url.startsWith("https://covers.openlibrary.org/") ? url.replace(/-[SML]\.jpg/, `-${size}.jpg`) : url;
}

const COLOR_KEY = "exlibris:coverColors";
// Remembered between visits, so spines get their colours instantly instead of re-downloading covers.
const colorCache = new Map<string, string | null>(
  (() => {
    try {
      return typeof window === "undefined" ? [] : (JSON.parse(localStorage.getItem(COLOR_KEY) ?? "[]") as [string, string][]);
    } catch {
      return [];
    }
  })(),
);
let saveTimer: number | undefined;
function rememberColor(url: string, hex: string | null) {
  colorCache.set(url, hex);
  if (hex === null || typeof window === "undefined") return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const entries = [...colorCache].filter((e): e is [string, string] => e[1] !== null).slice(-600);
      localStorage.setItem(COLOR_KEY, JSON.stringify(entries));
    } catch {}
  }, 500);
}

/** Average colour of a cover image, or null when the image can't be read (e.g. CORS). */
export function averageImageColor(url: string): Promise<string | null> {
  if (colorCache.has(url)) return Promise.resolve(colorCache.get(url)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 12;
        c.height = 18;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, 12, 18);
        const data = ctx.getImageData(0, 0, 12, 18).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        const hex = "#" + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
        rememberColor(url, hex);
        resolve(hex);
      } catch {
        rememberColor(url, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      rememberColor(url, null);
      resolve(null);
    };
    // A small copy is plenty for an average colour.
    img.src = sizedCover(url, "S");
  });
}
