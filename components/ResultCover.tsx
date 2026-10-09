"use client";

import { useEffect, useMemo, useState } from "react";
import { coverSources, defaultCoverColor, googleAtWidth, isGoogleCover } from "@/lib/covers";
import type { SearchResult } from "@/lib/search";
import { GeneratedCover } from "./BookCover";

/**
 * Sharp cover images to try, most reliable first:
 * - Open Library covers by cover ID (always there when listed, and not rate-limited),
 * - a larger Google Books image, then Google's own thumbnail,
 * - Open Library covers looked up by ISBN last (often missing, and rate-limited).
 */
function sharpCandidates(r: SearchResult, width: number): string[] {
  const all = [...r.covers, ...(r.thumbnail ? [r.thumbnail] : [])];
  const byId = all.filter((u) => u.includes("covers.openlibrary.org/b/id/"));
  const google = all.filter(isGoogleCover).flatMap((u) => [googleAtWidth(u, width * 3), u]);
  const byIsbn = all.filter((u) => u.includes("covers.openlibrary.org/b/isbn/"));
  return [...new Set([...byId, ...google, ...byIsbn])].slice(0, 5);
}

/**
 * A catalogue result's cover, filling its box. The catalogue's small thumbnail shows at once;
 * the sharp image fades in over it when it arrives (and the next candidate is tried if it
 * can't load), so a cover is never blank while the big image is on its way.
 */
export function ResultCover({ r, width }: { r: SearchResult; width: number }) {
  const candidates = useMemo(() => sharpCandidates(r, width), [r, width]);
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setI(0);
    setLoaded(false);
  }, [candidates]);
  const url = candidates[i];
  const quick = r.thumbnail;

  if (!url && !quick) return <GeneratedCover title={r.title} author={r.author} color={defaultCoverColor(r.title)} />;
  const next = () => {
    setLoaded(false);
    setI((n) => n + 1);
  };
  const { src, srcSet } = url ? coverSources(url, width) : { src: "", srcSet: undefined };
  return (
    <div className="relative h-full w-full">
      {quick ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={quick} alt="" aria-hidden decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0">
          <GeneratedCover title={r.title} author={r.author} color={defaultCoverColor(r.title)} />
        </div>
      )}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={src}
          srcSet={srcSet}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onError={next}
          onLoad={(e) => {
            // Open Library answers some missing covers with a 1×1 image; Google with a tiny placeholder.
            if (e.currentTarget.naturalWidth < 40) next();
            else setLoaded(true);
          }}
        />
      )}
    </div>
  );
}
