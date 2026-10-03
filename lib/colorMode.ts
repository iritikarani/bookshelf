"use client";

import { useCallback, useEffect, useState } from "react";

export type ColorMode = "light" | "dark" | "system";
const KEY = "exlibris:mode";

function apply(mode: ColorMode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useColorMode() {
  const [mode, setModeState] = useState<ColorMode>("system");

  useEffect(() => {
    let stored: ColorMode = "system";
    try {
      stored = (localStorage.getItem(KEY) as ColorMode) || "system";
    } catch {
      /* storage blocked */
    }
    setModeState(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let current: ColorMode = "system";
      try {
        current = (localStorage.getItem(KEY) as ColorMode) || "system";
      } catch {}
      if (current === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setMode = useCallback((m: ColorMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
    apply(m);
  }, []);

  return { mode, setMode };
}
