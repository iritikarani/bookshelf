"use client";

import { StarIcon } from "./Icons";

/** "4.5" → "4½"-style label text for screen readers and the little score. */
export const formatRating = (r: number) => (Number.isInteger(r) ? String(r) : r.toFixed(1));

/** One star filled 0, ½ or all the way. */
function Star({ fill, size, emptyClass }: { fill: 0 | 0.5 | 1; size: number; emptyClass: string }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <StarIcon width={size} height={size} filled={fill === 1} className={fill === 1 ? "" : emptyClass} />
      {fill === 0.5 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: size / 2 }}>
          <StarIcon width={size} height={size} filled />
        </span>
      )}
    </span>
  );
}

const fillFor = (n: number, rating: number): 0 | 0.5 | 1 => (rating >= n ? 1 : rating >= n - 0.5 ? 0.5 : 0);

export function StarDisplay({ rating, size = 18, className = "" }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-500 dark:text-amber-400 ${className}`} role="img" aria-label={`${formatRating(rating)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} fill={fillFor(n, rating)} size={size} emptyClass="text-ink-soft/40" />
      ))}
    </span>
  );
}

/**
 * Half-star rating, 0.5 to 5. Tap the left half of a star for a half, the right half for a whole.
 * Tapping the current rating again clears it. Arrow keys step by a half.
 */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(value === v ? 0 : v);
  const step = (d: number) => onChange(Math.min(5, Math.max(0, value + d)));
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative rounded p-1 text-amber-500 transition-transform hover:scale-110 dark:text-amber-400">
          <Star fill={fillFor(n, value)} size={28} emptyClass="text-ink-soft/50" />
          {[n - 0.5, n].map((v, half) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              aria-label={`${formatRating(v)} star${v === 1 ? "" : "s"}${value === v ? " (tap again to clear)" : ""}`}
              onClick={() => set(v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  step(0.5);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  step(-0.5);
                }
              }}
              className={`absolute inset-y-0 w-1/2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${half ? "right-0" : "left-0"}`}
            />
          ))}
        </span>
      ))}
      <span className="ml-2 font-mono text-xs text-ink-soft">{value ? `${formatRating(value)}/5` : "no rating"}</span>
    </div>
  );
}
