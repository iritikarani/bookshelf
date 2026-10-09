"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/lib/types";

/** 0–100, or null when we don't know both numbers. */
export function progressPercent(book: Pick<Book, "current_page" | "pages">): number | null {
  if (!book.pages || book.current_page == null) return null;
  return Math.max(0, Math.min(100, Math.round((book.current_page / book.pages) * 100)));
}

export function ProgressBar({ percent, color, className = "" }: { percent: number; color: string; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-ink/10 ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Reading progress">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  );
}

/**
 * "I'm on page [ 120 ] of [ 340 ]" with a progress bar. Saves when a box loses focus or Enter is
 * pressed; read-only shelves just show the numbers.
 */
export function ReadingProgress({ book, color, onSave }: { book: Book; color: string; onSave?: (patch: { current_page: number | null; pages: number | null }) => void }) {
  const [page, setPage] = useState(book.current_page?.toString() ?? "");
  const [total, setTotal] = useState(book.pages?.toString() ?? "");
  useEffect(() => {
    setPage(book.current_page?.toString() ?? "");
    setTotal(book.pages?.toString() ?? "");
  }, [book.id, book.current_page, book.pages]);

  const percent = progressPercent(book);

  if (!onSave) {
    return book.current_page != null ? (
      <div className="mt-3 text-left">
        <p className="text-center text-sm">
          On page <span className="font-mono">{book.current_page}</span>
          {book.pages ? <> of <span className="font-mono">{book.pages}</span></> : null}
        </p>
        {percent !== null && <ProgressBar percent={percent} color={color} className="mt-2" />}
      </div>
    ) : null;
  }

  const save = () => {
    const toNum = (s: string) => (s.trim() ? Math.max(0, parseInt(s, 10)) : null);
    let p = toNum(page);
    const t = toNum(total) || null;
    if (p !== null && t !== null && p > t) p = t;
    if (p !== book.current_page || t !== book.pages) onSave({ current_page: p, pages: t });
  };
  const box = "w-[4.5rem] rounded-lg border border-line bg-paper px-2 py-1 text-center font-mono text-sm";

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <label htmlFor={`page-${book.id}`}>I’m on page</label>
        <input
          id={`page-${book.id}`}
          className={box}
          inputMode="numeric"
          placeholder="0"
          value={page}
          onChange={(e) => setPage(e.target.value.replace(/\D/g, ""))}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
        />
        <label htmlFor={`pages-${book.id}`}>of</label>
        <input
          id={`pages-${book.id}`}
          className={box}
          inputMode="numeric"
          placeholder="pages"
          value={total}
          onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())}
        />
      </div>
      {Number(total) > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={Number(total)}
            value={Math.min(Number(page) || 0, Number(total))}
            aria-label="Pages read"
            className="h-6 flex-1 cursor-pointer"
            style={{ accentColor: color }}
            onChange={(e) => setPage(e.target.value)}
            onPointerUp={save}
            onKeyUp={save}
            onBlur={save}
          />
          <span className="w-10 text-right font-mono text-xs text-ink-soft">{Math.round(((Number(page) || 0) / Number(total)) * 100)}%</span>
        </div>
      )}
    </div>
  );
}
