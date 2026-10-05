"use client";

import { useEffect, useState } from "react";

/** The reader's own pages. "shelf" (the room) is the default, with no hash in the URL. */
export type AppTab = "home" | "shelf" | "discover" | "journal" | "profile";
/** A public shelf's pages. */
export type PublicTab = "shelf" | "quotes" | "year";

const APP_TABS: readonly AppTab[] = ["home", "shelf", "discover", "journal", "profile"];
const PUBLIC_TABS: readonly PublicTab[] = ["shelf", "quotes", "year"];
// Older links: the quote wall now lives in the journal, the reading year on the profile.
const APP_OLD: Record<string, AppTab> = { quotes: "journal", year: "profile" };

function useHashTab<T extends string>(tabs: readonly T[], aliases: Record<string, T> = {}) {
  const fallback = "shelf" as T;
  const read = (): T => {
    const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
    return aliases[h] ?? tabs.find((t) => t === h) ?? fallback;
  };
  const [tab, setTabState] = useState<T>(fallback);
  useEffect(() => {
    const sync = () => setTabState(read());
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setTab = (t: T) => {
    setTabState(t);
    const url = t === fallback ? window.location.pathname + window.location.search : `#${t}`;
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };
  return [tab, setTab] as const;
}

/** Current page of the reader's own app, mirrored in the URL hash (survives reloads, back/forward). */
export const useTab = () => useHashTab(APP_TABS, APP_OLD);
/** Current page of a public shelf. */
export const usePublicTab = () => useHashTab(PUBLIC_TABS);
