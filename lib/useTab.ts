"use client";

import { useEffect, useState } from "react";
import type { Tab } from "@/components/Header";

const fromHash = (): Tab => {
  const h = typeof window === "undefined" ? "" : window.location.hash.slice(1);
  return h === "quotes" || h === "year" ? h : "shelf";
};

/** Current tab, mirrored in the URL hash so it survives reloads and back/forward. */
export function useTab() {
  const [tab, setTabState] = useState<Tab>("shelf");
  useEffect(() => {
    setTabState(fromHash());
    const onHash = () => setTabState(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const setTab = (t: Tab) => {
    setTabState(t);
    const url = t === "shelf" ? window.location.pathname + window.location.search : `#${t}`;
    window.history.pushState(null, "", url);
  };
  return [tab, setTab] as const;
}
