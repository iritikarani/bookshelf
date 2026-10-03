"use client";

import { StarIcon } from "./Icons";

export function StarDisplay({ rating, size = 18, className = "" }: { rating: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-500 dark:text-amber-400 ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} width={size} height={size} filled={n <= rating} className={n <= rating ? "" : "text-ink-soft/40"} />
      ))}
    </span>
  );
}

/** 1–5 stars as a radio group. Tapping the current rating again clears it to 0. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}${value === n ? " (tap again to clear)" : ""}`}
          onClick={() => onChange(value === n ? 0 : n)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(Math.min(5, value + 1));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.max(0, value - 1));
            }
          }}
          className="rounded p-1 text-amber-500 transition-transform hover:scale-110 dark:text-amber-400"
        >
          <StarIcon width={28} height={28} filled={n <= value} className={n <= value ? "" : "text-ink-soft/50"} />
        </button>
      ))}
      <span className="ml-2 font-mono text-xs text-ink-soft">{value ? `${value}/5` : "no rating"}</span>
    </div>
  );
}
