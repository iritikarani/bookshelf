"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Soft little sounds for handling books: a muffled wooden "tock" when a book is put on or back on
 * the shelf, and a papery rustle when one is opened. Made live with the Web Audio API (no files),
 * quiet, and off unless switched on in Settings. They only ever play in answer to a tap, so the
 * browser's autoplay rules are never an issue.
 */

const KEY = "exlibris:bookSounds";
const EVENT = "exlibris:bookSounds";

export function bookSoundsOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useBookSounds(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(bookSoundsOn());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    setOn(next);
    window.dispatchEvent(new Event(EVENT));
    if (next) playBookSound("place"); // a sample, so the reader hears what they switched on
  }, []);
  return [on, set];
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noise(c: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

/** "place": a book set down on wood. "open": a cover and a few pages turning. */
export function playBookSound(kind: "place" | "open") {
  if (!bookSoundsOn()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.22;
  out.connect(c.destination);

  if (kind === "place") {
    // A low knock (the board) under a short, dull tap (the book's edge).
    const knock = c.createOscillator();
    knock.type = "sine";
    knock.frequency.setValueAtTime(150, t);
    knock.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const kg = c.createGain();
    kg.gain.setValueAtTime(0.0001, t);
    kg.gain.exponentialRampToValueAtTime(0.9, t + 0.006);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    knock.connect(kg).connect(out);
    knock.start(t);
    knock.stop(t + 0.2);

    const tap = noise(c, 0.06);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 1.2;
    const tg = c.createGain();
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    tap.connect(bp).connect(tg).connect(out);
    tap.start(t);
    return;
  }

  // Three soft, papery swishes in quick succession.
  for (let i = 0; i < 3; i++) {
    const s = t + i * 0.07;
    const swish = noise(c, 0.18);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800 + i * 400;
    const g = c.createGain();
    const peak = 0.35 - i * 0.08;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(peak, s + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.16);
    swish.connect(hp).connect(g).connect(out);
    swish.start(s);
  }
}
