"use client";

import { useState } from "react";
import { defaultCoverColor, textColorFor } from "@/lib/covers";

/** A reader's picture, or the first letter of their name on a soft colour. */
export function Avatar({ name, src, size = 80, className = "" }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const shown = name?.trim() || "Reader";
  const bg = defaultCoverColor(shown);
  if (src && broken !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(src)}
        className={`shrink-0 rounded-full object-cover ring-4 ring-paper ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-serif ring-4 ring-paper ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45, backgroundColor: bg, color: textColorFor(bg) }}
    >
      {shown.charAt(0).toUpperCase()}
    </span>
  );
}
