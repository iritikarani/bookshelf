"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * How lively the library is. "full": every touch (books sliding out and settling, dust, drifting
 * motes in the sunbeam). "gentle": the same book movements, softer and without the ambient layer.
 * "off": nothing moves. A phone set to reduce motion starts on "off". Remembered on this device and
 * written to <html data-motion>, so the CSS can switch whole groups of effects on and off.
 */
export type MotionLevel = "full" | "gentle" | "off";

const KEY = "exlibris:motion";
const EVENT = "exlibris:motion";

export const MOTION_LEVELS: { id: MotionLevel; label: string; hint: string }[] = [
  { id: "full", label: "Full", hint: "Books slide, settle and raise a little dust; dust drifts in the sunlight." },
  { id: "gentle", label: "Gentle", hint: "Books still slide and settle, more softly. No drifting dust." },
  { id: "off", label: "Off", hint: "Nothing moves." },
];

const systemReduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function readMotion(): MotionLevel {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "full" || saved === "gentle" || saved === "off") return saved;
  } catch {}
  return systemReduced() ? "off" : "full";
}

/** The level as the page uses it right now (read straight from <html>, so it's cheap anywhere). */
export function motionLevel(): MotionLevel {
  if (typeof document === "undefined") return "off";
  const v = document.documentElement.dataset.motion;
  return v === "full" || v === "gentle" || v === "off" ? v : readMotion();
}

function apply(level: MotionLevel) {
  if (typeof document !== "undefined") document.documentElement.dataset.motion = level;
}

let started = false;
/** Sets <html data-motion> and pauses ambient effects while the tab is hidden. Safe to call often. */
export function startMotion() {
  if (started || typeof document === "undefined") return;
  started = true;
  apply(readMotion());
  const onVisibility = () => (document.documentElement.dataset.tabHidden = document.hidden ? "true" : "false");
  onVisibility();
  document.addEventListener("visibilitychange", onVisibility);
  // Follow the phone's setting while the reader hasn't chosen one here.
  window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {}
    apply(readMotion());
    window.dispatchEvent(new Event(EVENT));
  });
}

export function useMotion(): [MotionLevel, (level: MotionLevel) => void] {
  const [level, setLevel] = useState<MotionLevel>("full");
  useEffect(() => {
    startMotion();
    const sync = () => setLevel(readMotion());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const set = useCallback((next: MotionLevel) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    apply(next);
    setLevel(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [level, set];
}
