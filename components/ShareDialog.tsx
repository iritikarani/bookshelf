"use client";

import { toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { coverColorOf, coverImageOf } from "@/lib/covers";
import { summary } from "@/lib/stats";
import type { Book, Shelf, WoodTheme } from "@/lib/types";
import { GeneratedCover } from "./BookCover";
import { DownloadIcon } from "./Icons";
import { Sheet } from "./Sheet";

const W = 1080;
const H = 1920;

async function toDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") || blob.size < 200) return null;
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

export function ShareDialog({ open, onClose, shelves, booksByShelf, books, wood, owner }: {
  open: boolean;
  onClose: () => void;
  shelves: Shelf[];
  booksByShelf: Map<string, Book[]>;
  books: Book[];
  wood: WoodTheme;
  owner?: string | null;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Map<string, string | null> | null>(null);
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefer read shelves; show up to 4 non-empty shelves, 6 covers each.
  const picked = [...shelves]
    .filter((s) => (booksByShelf.get(s.id) ?? []).length)
    .sort((a, b) => Number(a.is_want_to_read) - Number(b.is_want_to_read) || a.position - b.position)
    .slice(0, 4)
    .sort((a, b) => a.position - b.position);
  const shown = picked.flatMap((s) => (booksByShelf.get(s.id) ?? []).slice(0, 6));
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
      const entries = await Promise.all(
        shown.map(async (b) => {
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

  useEffect(() => {
    if (!images || !nodeRef.current) return;
    let alive = true;
    (async () => {
      try {
        await document.fonts?.ready;
        const url = await toPng(nodeRef.current!, { width: W, height: H, pixelRatio: 1, cacheBust: false });
        if (alive) setPng(url);
      } catch (e) {
        console.error(e);
        if (alive) setError("Couldn't render the image. Try again in a moment.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [images]);

  return (
    <Sheet open={open} onClose={onClose} title="Share my shelf">
      <p className="text-sm text-ink-soft">A 1080 × 1920 image, sized for Instagram stories.</p>
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
        <a
          className={`btn-primary px-6 ${png ? "" : "pointer-events-none opacity-50"}`}
          href={png ?? undefined}
          download="ex-libris-shelf.png"
          aria-disabled={!png}
        >
          <DownloadIcon width={16} height={16} /> Download image
        </a>
      </div>

      {/* Off-screen render target */}
      {open && images && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div
            ref={nodeRef}
            data-wood={wood}
            style={{ ["--back-dark" as string]: "var(--back)", ["--frame-light" as string]: "color-mix(in srgb, var(--frame) 70%, white)", width: W, height: H, background: "radial-gradient(ellipse 70% 40% at 0% 0%, #ffffff, transparent 70%), linear-gradient(180deg,#f7f3ec 0%,#efe8dd 100%)", color: "#2f2a28", fontFamily: '"Libre Franklin", sans-serif' }}
            className="flex flex-col px-[80px] py-[110px]"
          >
            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, letterSpacing: 6, color: "#547562" }}>EX LIBRIS</p>
            <h1 style={{ fontFamily: '"Gloock", serif', fontSize: 104, lineHeight: 1, marginTop: 18 }}>
              {owner ? `${owner}'s shelf` : "My bookshelf"}
            </h1>
            <div className="mt-[44px] flex gap-[56px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {[
                [stats.booksRead, "books read"],
                [stats.avgRating === null ? "–" : `${stats.avgRating.toFixed(1)}★`, "avg rating"],
                [stats.linesKept, "lines kept"],
              ].map(([v, l]) => (
                <div key={String(l)}>
                  <div style={{ fontSize: 60, fontWeight: 500 }}>{v}</div>
                  <div style={{ fontSize: 22, color: "#5c5c54", textTransform: "uppercase", letterSpacing: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="bookcase mt-[110px]" style={{ padding: "0 26px" }}>
              <div className="case-top" style={{ margin: "0 -26px", height: 30 }} />
              {picked.map((s, i) => (
                <div key={s.id}>
                  <div className="case-cell" style={{ padding: "22px 28px 0" }}>
                    <p style={{ fontFamily: '"Gloock", serif', fontSize: 38, marginBottom: 18 }}>{s.name}</p>
                    <div className="flex items-end gap-[22px]" style={{ height: 222 }}>
                      {(booksByShelf.get(s.id) ?? []).slice(0, 6).map((b) => {
                        const data = images.get(b.id);
                        return (
                          <div key={b.id} style={{ width: 132, height: 198, boxShadow: "0 14px 18px -8px rgba(0,0,0,.4)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                            {data ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <GeneratedCover title={b.title} author={b.author} color={coverColorOf(b)} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {i < picked.length - 1 && <div className="plank" style={{ height: 24 }} />}
                </div>
              ))}
              <div className="case-base" style={{ margin: "0 -26px", height: 36 }} />
            </div>

            <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 22, color: "#68615c", marginTop: "auto", letterSpacing: 2 }}>
              {stats.booksRead} finished · made with Ex Libris
            </p>
          </div>
        </div>
      )}
    </Sheet>
  );
}
