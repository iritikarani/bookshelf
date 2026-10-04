"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Room sounds, made live with the Web Audio API (no audio files): rain on the window, a crackling
 * fire, ocean waves, night crickets. Switched on and off in Decorate room → Lighting, remembered on
 * this device; the speaker button in the room plays and pauses. Browsers only allow sound after a
 * tap, so it starts on the first tap once switched on.
 */

export type SoundKind = "auto" | "rain" | "fire" | "waves" | "crickets";

export const SOUNDS: { id: SoundKind; name: string; icon: string }[] = [
  { id: "auto", name: "Match the room", icon: "✨" },
  { id: "rain", name: "Rain", icon: "🌧️" },
  { id: "fire", name: "Fireplace", icon: "🔥" },
  { id: "waves", name: "Ocean waves", icon: "🌊" },
  { id: "crickets", name: "Night crickets", icon: "🦗" },
];

interface SoundPrefs {
  on: boolean;
  kind: SoundKind;
  volume: number; // 0..1
}
const KEY = "exlibris:sound";
const EVENT = "exlibris:sound";
const DEFAULTS: SoundPrefs = { on: false, kind: "auto", volume: 0.5 };

function readPrefs(): SoundPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<SoundPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

// ── the engine (one per page) ──
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: { kind: Exclude<SoundKind, "auto">; stop: () => void } | null = null;
let playing = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

function noiseBuffer(c: AudioContext, colour: "white" | "pink" | "brown", seconds = 4): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (colour === "white") d[i] = w;
    else if (colour === "pink") {
      b0 = 0.997 * b0 + w * 0.029591;
      b1 = 0.985 * b1 + w * 0.032534;
      b2 = 0.95 * b2 + w * 0.048056;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 3;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function loop(c: AudioContext, buf: AudioBuffer, out: AudioNode, ...chain: AudioNode[]) {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  let node: AudioNode = src;
  for (const n of chain) {
    node.connect(n);
    node = n;
  }
  node.connect(out);
  src.start();
  return src;
}

const filter = (c: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) => {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
};
const gain = (c: AudioContext, v: number) => {
  const g = c.createGain();
  g.gain.value = v;
  return g;
};

/** Build one soundscape into `out`; returns how to stop it. */
function build(c: AudioContext, kind: Exclude<SoundKind, "auto">, out: AudioNode): () => void {
  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  if (kind === "rain") {
    sources.push(loop(c, noiseBuffer(c, "pink"), out, filter(c, "highpass", 500), filter(c, "lowpass", 7000), gain(c, 0.55)));
    sources.push(loop(c, noiseBuffer(c, "brown"), out, filter(c, "lowpass", 600), gain(c, 0.35)));
    // drops tapping on the glass
    const drop = () => {
      const t = c.currentTime;
      const o = c.createBufferSource();
      o.buffer = noiseBuffer(c, "white", 0.05);
      const g = gain(c, 0);
      g.gain.setValueAtTime(0.25 * Math.random(), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(filter(c, "bandpass", 2500 + Math.random() * 3000, 3)).connect(g).connect(out);
      o.start(t);
      timers.push(window.setTimeout(drop, 40 + Math.random() * 160));
    };
    drop();
  } else if (kind === "fire") {
    sources.push(loop(c, noiseBuffer(c, "brown"), out, filter(c, "lowpass", 380), gain(c, 0.8)));
    const crackle = () => {
      const t = c.currentTime;
      const o = c.createBufferSource();
      o.buffer = noiseBuffer(c, "white", 0.08);
      const g = gain(c, 0);
      const peak = Math.random() < 0.15 ? 0.6 : 0.18 * Math.random();
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.01 + Math.random() * 0.05);
      o.connect(filter(c, "highpass", 1200 + Math.random() * 2500)).connect(g).connect(out);
      o.start(t);
      timers.push(window.setTimeout(crackle, Math.random() < 0.2 ? 20 + Math.random() * 60 : 120 + Math.random() * 600));
    };
    crackle();
  } else if (kind === "waves") {
    const swell = gain(c, 0.25);
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.09; // a wave every ~11 s
    const depth = gain(c, 0.35);
    lfo.connect(depth).connect(swell.gain);
    lfo.start();
    sources.push(lfo);
    sources.push(loop(c, noiseBuffer(c, "pink"), out, filter(c, "lowpass", 1400), swell));
    sources.push(loop(c, noiseBuffer(c, "brown"), out, filter(c, "lowpass", 300), gain(c, 0.25)));
  } else {
    // crickets over a quiet night hush
    sources.push(loop(c, noiseBuffer(c, "brown"), out, filter(c, "lowpass", 500), gain(c, 0.12)));
    const chirp = (pitch: number, pan: number) => {
      const t = c.currentTime;
      const osc = c.createOscillator();
      osc.frequency.value = pitch;
      const g = gain(c, 0);
      const p = c.createStereoPanner();
      p.pan.value = pan;
      for (let k = 0; k < 3; k++) {
        const s = t + k * 0.06;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.05, s + 0.01);
        g.gain.linearRampToValueAtTime(0, s + 0.04);
      }
      osc.connect(g).connect(p).connect(out);
      osc.start(t);
      osc.stop(t + 0.25);
      timers.push(window.setTimeout(() => chirp(pitch, pan), 700 + Math.random() * 900));
    };
    chirp(4400, -0.5);
    timers.push(window.setTimeout(() => chirp(4950, 0.6), 450));
  }
  return () => {
    timers.forEach((t) => window.clearTimeout(t));
    sources.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
  };
}

/** Play `kind` at `volume`, fading between soundscapes. */
function play(kind: Exclude<SoundKind, "auto">, volume: number) {
  ctx ??= new AudioContext();
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  void ctx.resume();
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(volume * 0.6, t, 0.6);
  if (current?.kind !== kind) {
    const old = current;
    const bus = ctx.createGain();
    bus.connect(master);
    current = { kind, stop: build(ctx, kind, bus) };
    if (old) window.setTimeout(old.stop, 50);
  }
  playing = true;
  notify();
}

function pause() {
  if (ctx && master) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    const stopping = current;
    current = null;
    window.setTimeout(() => stopping?.stop(), 1500);
  }
  playing = false;
  notify();
}

/** What "Match the room" plays: rain when it's raining, crickets at night, otherwise the fire. */
export function soundFor(kind: SoundKind, room: { weather?: string; time?: string; season?: string | null }): Exclude<SoundKind, "auto"> {
  if (kind !== "auto") return kind;
  if (room.weather === "rain" || room.season === "monsoon") return "rain";
  if (room.time === "night") return "crickets";
  if (room.season === "summer") return "waves";
  return "fire";
}

/** Room-sound settings for this device, kept in step everywhere they're shown. */
export function useRoomSound() {
  const [prefs, setPrefs] = useState<SoundPrefs>(DEFAULTS);
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    const read = () => setPrefs(readPrefs());
    const sync = () => setIsPlaying(playing);
    read();
    sync();
    window.addEventListener(EVENT, read);
    listeners.add(sync);
    return () => {
      window.removeEventListener(EVENT, read);
      listeners.delete(sync);
    };
  }, []);
  const save = useCallback((patch: Partial<SoundPrefs>) => {
    const next = { ...readPrefs(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
    if (patch.on === false) pause();
  }, []);
  return { ...prefs, playing: isPlaying, save, play, pause };
}
