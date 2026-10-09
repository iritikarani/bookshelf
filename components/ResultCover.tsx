"use client";

import { useEffect, useMemo, useState } from "react";
import { coverSources, defaultCoverColor } from "@/lib/covers";
import type { SearchResult } from "@/lib/search";
import { GeneratedCover } from "./BookCover";

/** Cover images to try, sharpest first: the catalogue's large covers, then its thumbnail. */
function coverCandidates(r: SearchResult): string[] {
  const all = [...r.covers, ...(r.thumbnail ? [r.thumbnail] : [])];
  return [...new Set(all)].slice(0, 4);
}

/**
 * A catalogue result's cover, filling its box: sharp on phones (the large image where the screen
 * has the pixels for it), falling back through the other candidates, then a designed cover.
 */
export function ResultCover({ r, width }: { r: SearchResult; width: number }) {
  const candidates = useMemo(() => coverCandidates(r), [r]);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [candidates]);
  const url = candidates[i];
  if (!url) return <GeneratedCover title={r.title} author={r.author} color={defaultCoverColor(r.title)} />;
  const { src, srcSet } = coverSources(url, width);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={url}
      src={src}
      srcSet={srcSet}
      alt=""
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => setI((n) => n + 1)}
      // Open Library answers some missing covers with a 1×1 image.
      onLoad={(e) => e.currentTarget.naturalWidth < 10 && setI((n) => n + 1)}
    />
  );
}
