"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { motionLevel } from "@/lib/motion";

/** A small, repeatable spread of numbers (no Math.random, so server and phone draw the same thing). */
const seeded = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A breath of dust: a dozen soft motes drifting out and fading. "base" puffs out along the shelf
 * board (a book set down); "behind" rises around a book being drawn out. Fewer motes on "gentle".
 */
export function DustPuff({ at = "base" }: { at?: "base" | "behind" }) {
  const level = motionLevel();
  if (level === "off") return null;
  const count = level === "gentle" ? 5 : 11;
  const motes = Array.from({ length: count }, (_, i) => {
    const r = (n: number) => seeded(i, n + (at === "base" ? 1 : 7));
    const side = i % 2 ? 1 : -1;
    const style =
      at === "base"
        ? // sideways along the board, lifting a little
          { "--dx": `${side * (10 + r(1) * 26)}px`, "--dy": `${-4 - r(2) * 16}px` }
        : // up and out around the book
          { "--dx": `${side * (6 + r(1) * 22)}px`, "--dy": `${-14 - r(2) * 30}px` };
    return {
      ...style,
      "--s": `${2 + r(3) * 3.5}px`,
      "--d": `${Math.round(r(4) * 120)}ms`,
      "--t": `${700 + Math.round(r(5) * 450)}ms`,
    } as CSSProperties;
  });
  return (
    <span aria-hidden className="dust-puff" data-at={at}>
      {motes.map((style, i) => (
        <span key={i} className="dust-mote" style={style} />
      ))}
    </span>
  );
}

/** A tiny ring of sparkles, for a book that's just become a favourite. */
export function SparkleBurst({ color }: { color: string }) {
  if (motionLevel() === "off") return null;
  const points = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const dist = 16 + seeded(i, 3) * 10;
    return { "--dx": `${Math.cos(a) * dist}px`, "--dy": `${Math.sin(a) * dist}px`, "--d": `${Math.round(seeded(i, 9) * 90)}ms` } as CSSProperties;
  });
  return (
    <span aria-hidden className="sparkle-burst" style={{ color }}>
      {points.map((style, i) => (
        <span key={i} style={style} />
      ))}
    </span>
  );
}

/** Shows a short-lived effect: `fire()` mounts it afresh, and it removes itself after `ms`. */
export function useBurst(ms = 1100): [number | null, () => void] {
  const [id, setId] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const fire = useCallback(() => {
    window.clearTimeout(timer.current);
    setId(Date.now());
    timer.current = window.setTimeout(() => setId(null), ms);
  }, [ms]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [id, fire];
}

/**
 * Dust drifting slowly through the sunbeam from the window. Only on "full", only in daylight, and
 * paused while the tab is hidden (all in living.css). A dozen motes, so it costs next to nothing.
 */
export function SunMotes() {
  const motes = Array.from({ length: 12 }, (_, i) => {
    const r = (n: number) => seeded(i, n + 20);
    return {
      left: `${6 + r(1) * 46}%`,
      top: `${10 + r(2) * 70}%`,
      "--s": `${1.5 + r(3) * 2.5}px`,
      "--dx": `${18 + r(4) * 40}px`,
      "--dy": `${-20 - r(5) * 50}px`,
      "--t": `${11 + r(6) * 10}s`,
      "--d": `${-r(7) * 18}s`,
    } as CSSProperties;
  });
  return (
    <div aria-hidden className="sun-motes">
      {motes.map((style, i) => (
        <span key={i} className="sun-mote" style={style} />
      ))}
    </div>
  );
}
