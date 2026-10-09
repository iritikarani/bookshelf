"use client";

import { useEffect, useState } from "react";
import { searchBooks, type SearchResult } from "./search";

/**
 * Search-as-you-type for the "add a book" boxes: results, whether a search is running, and
 * whether the catalogues failed to answer (so the box can say so and offer "Try again"
 * instead of claiming there are no matches).
 */
export function useBookSearch(query: string, { publisher = "", enabled = true, limit }: { publisher?: string; enabled?: boolean; limit?: number } = {}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const searchable = query.trim().length >= 2 || publisher.trim().length >= 2;

  useEffect(() => {
    setFailed(false);
    if (!enabled || !searchable) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    const cut = (r: SearchResult[]) => (limit ? r.slice(0, limit) : r);
    setSearching(true);
    const t = window.setTimeout(async () => {
      let shown = false;
      try {
        // Show what's arrived so far; the full list replaces it moments later.
        const r = await searchBooks(query, "", ctrl.signal, publisher, (partial) => ((shown = true), setResults(cut(partial))));
        if (!ctrl.signal.aborted) setResults(cut(r));
      } catch {
        if (ctrl.signal.aborted) return;
        // Keep results that arrived for this search; drop ones left from an earlier search.
        if (!shown) setResults([]);
        setFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query, publisher, enabled, searchable, limit, attempt]);

  return { results, searching, failed, searchable, retry: () => setAttempt((n) => n + 1) };
}
