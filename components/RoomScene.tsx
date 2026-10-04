"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { WindowView } from "./WindowView";

const LAMP_KEY = "exlibris:lamp";

const LAMP_EVENT = "exlibris:lamp";

/** Whether the reading lamp is switched on. Remembered per browser, and kept in step everywhere it's shown. */
export function useLamp(): [boolean, () => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const read = () => {
      try {
        const v = localStorage.getItem(LAMP_KEY);
        setOn(v === null || v === "1");
      } catch {}
    };
    read();
    window.addEventListener(LAMP_EVENT, read);
    return () => window.removeEventListener(LAMP_EVENT, read);
  }, []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(LAMP_KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(LAMP_EVENT));
  };
  return [on, toggle];
}

/** A string of fairy lights across the wall (shown when the room has them). */
export function FairyLights({ className = "" }: { className?: string }) {
  return (
    <div className={`fairy-lights ${className}`} aria-hidden>
      <div className="fairy-wire" />
      <div className="fairy-bulbs fairy-bulbs--a" />
      <div className="fairy-bulbs fairy-bulbs--b" />
    </div>
  );
}

/** A clay diya with a flickering flame. */
function Diya() {
  return (
    <svg viewBox="0 0 24 22" className="diya" aria-hidden>
      <circle cx="12" cy="7" r="7" fill="rgba(255, 196, 90, 0.35)" className="diya-glow" />
      <path d="M12 2 Q15.5 7 12 11 Q8.5 7 12 2 Z" fill="#ffb938" className="diya-flame" />
      <path d="M12 5 Q13.6 8 12 10.4 Q10.4 8 12 5 Z" fill="#fff4c9" />
      <path d="M1.5 12 H22.5 Q21 20 12 20.5 Q3 20 1.5 12 Z" fill="#b5562b" />
      <path d="M1.5 12 H22.5 Q22 13.6 20.6 14.2 H3.4 Q2 13.6 1.5 12 Z" fill="#d9763f" />
      <path d="M6 16.5 Q12 18.5 18 16.5" stroke="#f2c14e" strokeWidth="0.9" fill="none" />
    </svg>
  );
}

/**
 * Seasonal touches around the window (see lib/seasons.ts). Everything is drawn always and shown by
 * CSS for the room's data-season, so the static page needs no date logic.
 */
function SeasonTouches() {
  return (
    <>
      <div className="season-bunting" aria-hidden />
      <div className="season-toran" aria-hidden />
      <div className="season-diyas" aria-hidden>
        <Diya />
        <Diya />
        <Diya />
      </div>
      {/* Christmas wreath */}
      <svg viewBox="0 0 40 44" className="season-wreath" aria-hidden>
        <circle cx="20" cy="18" r="12" fill="none" stroke="#335c3b" strokeWidth="7" />
        <circle cx="20" cy="18" r="12" fill="none" stroke="#4f8a4f" strokeWidth="4" strokeDasharray="3 2.4" />
        {[
          [9, 12],
          [27, 8],
          [31, 22],
          [14, 28],
          [22, 6.5],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#c8323a" />
        ))}
        <path d="M20 30 L12 37 L13 28 Z M20 30 L28 37 L27 28 Z" fill="#c8323a" />
        <circle cx="20" cy="30" r="2.6" fill="#a8262e" />
      </svg>
      {/* Eid: a crescent and star hanging in the middle, lanterns at the sides */}
      <svg viewBox="0 0 30 50" className="season-crescent" aria-hidden>
        <path d="M15 0 V15" stroke="#b08a3e" strokeWidth="0.8" />
        <path d="M17 16.2 A11 11 0 1 0 17 37.8 A13 13 0 0 1 17 16.2 Z" fill="#e6b84a" />
        <path d="M23 24 l1.2 2.6 2.8.3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3 z" fill="#f3d27a" />
      </svg>
      {[0, 1].map((i) => (
        <svg key={i} viewBox="0 0 20 48" className={`season-lantern season-lantern--${i ? "right" : "left"}`} aria-hidden>
          <path d="M10 0 V9" stroke="#8a6a3a" strokeWidth="0.8" />
          <circle cx="10" cy="26" r="9" fill="rgba(255, 200, 90, 0.35)" className="lantern-glow" />
          <path d="M6 9 H14 L16 14 H4 Z" fill="#a57a2c" />
          <path d="M4 14 H16 L17.5 30 L10 36 L2.5 30 Z" fill="#c6923a" />
          <path d="M6.5 16 H13.5 L14.5 28 L10 32 L5.5 28 Z" fill="#ffd77a" />
          <path d="M10 16 V32 M6 22 H14" stroke="#a57a2c" strokeWidth="0.7" />
          <path d="M10 36 V44" stroke="#c0392b" strokeWidth="1.4" />
        </svg>
      ))}
      {/* Raksha Bandhan: a rakhi tied across the window */}
      <svg viewBox="0 0 70 22" className="season-rakhi" aria-hidden>
        <path d="M0 11 Q35 15 70 11" stroke="#d9452f" strokeWidth="1.6" fill="none" />
        <path d="M0 11 Q35 15 70 11" stroke="#f2c14e" strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
        {Array.from({ length: 10 }, (_, k) => (
          <ellipse key={k} cx={35 + 6.5 * Math.cos((k * Math.PI) / 5)} cy={12 + 6.5 * Math.sin((k * Math.PI) / 5)} rx="3.2" ry="2" transform={`rotate(${k * 36} ${35 + 6.5 * Math.cos((k * Math.PI) / 5)} ${12 + 6.5 * Math.sin((k * Math.PI) / 5)})`} fill={k % 2 ? "#f28c28" : "#e8456b"} />
        ))}
        <circle cx="35" cy="12" r="4.4" fill="#f2c14e" />
        <circle cx="35" cy="12" r="2" fill="#2f7fbf" />
      </svg>
      {/* Onam: a flower pookalam on the sill */}
      <svg viewBox="0 0 64 16" className="season-pookalam" aria-hidden>
        <ellipse cx="32" cy="8" rx="31" ry="7.5" fill="#4f8a3c" />
        <ellipse cx="32" cy="8" rx="27" ry="6.4" fill="#f28c28" />
        <ellipse cx="32" cy="8" rx="21" ry="5" fill="#f6c23e" />
        <ellipse cx="32" cy="8" rx="15" ry="3.6" fill="#d9452f" />
        <ellipse cx="32" cy="8" rx="9" ry="2.2" fill="#8e44ad" />
        <ellipse cx="32" cy="8" rx="3.5" ry="1" fill="#fff8e6" />
      </svg>
      {/* Halloween: a carved pumpkin on the sill */}
      <svg viewBox="0 0 30 26" className="season-pumpkin" aria-hidden>
        <path d="M15 5 q1 -4 4 -4" stroke="#4f7a2c" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="9" cy="16" rx="7.5" ry="9" fill="#d9661f" />
        <ellipse cx="21" cy="16" rx="7.5" ry="9" fill="#d9661f" />
        <ellipse cx="15" cy="16" rx="7.5" ry="9.6" fill="#ec7a2a" />
        <path d="M9 13 l2.5 -3 2.5 3 z M16 13 l2.5 -3 2.5 3 z M8.5 18 q6.5 5 13 0 l-2 1.2 -1.6 -1.3 -1.6 1.4 -1.8 -1.4 -1.6 1.4 -1.6 -1.3 z" fill="#ffd24a" className="pumpkin-glow" />
      </svg>
    </>
  );
}

/** Kites in the sky for Lohri, Makar Sankranti and Pongal. */
function Kites() {
  const kite = (x: number, y: number, c1: string, c2: string, r: number, k: number) => (
    <g key={k} className={`kite kite--${k}`} transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M0 -9 L6 0 L0 11 L-6 0 Z" fill={c1} />
      <path d="M0 -9 L6 0 L0 0 Z M0 0 L-6 0 L0 11 Z" fill={c2} />
      <path d="M0 11 q3 6 -1 11 q-4 5 0 10" stroke="rgba(60,50,40,.5)" strokeWidth="0.6" fill="none" />
      <path d="M-1.5 15 l3 1 M-2 20 l3 1" stroke={c2} strokeWidth="1.4" />
    </g>
  );
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMin meet" className="season-kites" aria-hidden>
      {kite(24, 22, "#e8456b", "#f6c23e", -12, 0)}
      {kite(70, 14, "#2f7fbf", "#f28c28", 10, 1)}
      {kite(98, 34, "#4f8a3c", "#f6efe0", -6, 2)}
    </svg>
  );
}

/** Summer: a mango branch reaching across the top corner of the window. */
function MangoBranch() {
  return (
    <svg viewBox="0 0 70 50" className="season-mango" aria-hidden>
      <path d="M70 4 Q46 6 30 18 Q20 26 12 26" stroke="#6b4a2b" strokeWidth="2.2" fill="none" />
      {[
        [56, 4, -20],
        [44, 10, 30],
        [36, 12, -40],
        [26, 22, 20],
        [16, 24, -30],
        [50, 14, 60],
      ].map(([x, y, r], k) => (
        <ellipse key={k} cx={x} cy={y} rx="7" ry="2.4" transform={`rotate(${r} ${x} ${y})`} fill={k % 2 ? "#3f7a3a" : "#4f9446"} />
      ))}
      <path d="M38 17 v6" stroke="#4f7a2c" strokeWidth="0.8" />
      <ellipse cx="38" cy="28" rx="4.2" ry="5.6" fill="#f2b233" />
      <ellipse cx="37" cy="27" rx="1.4" ry="2.2" fill="#fbd56b" />
      <path d="M24 25 v5" stroke="#4f7a2c" strokeWidth="0.8" />
      <ellipse cx="24" cy="34" rx="3.6" ry="4.8" fill="#e99a2a" />
    </svg>
  );
}

/** A window with curtains: daylight sky with a branch, or a night sky with the moon in dark mode. */
export function RoomWindow({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={`room-window relative ${className}`} aria-hidden>
      <div className="window-rod" />
      <div className="window-frame">
        <div className="window-sky">
          <WindowView />
          <div className="window-tint" />
          <div className="window-weather" />
          <div className="season-outside" />
          <Kites />
        </div>
        <div className="window-glass" />
        <div className="season-frost" />
        <MangoBranch />
        <div className={`window-mullions ${compact ? "window-mullions--wide" : ""}`} />
      </div>
      <div className="window-sill" />
      <SeasonTouches />
      <div className="curtain curtain-left" />
      <div className="curtain curtain-right" />
    </div>
  );
}

function FloorLamp({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? "Turn the reading lamp off" : "Turn the reading lamp on"}
      title="Reading lamp"
      className="floor-lamp group relative block h-[420px] w-[110px] rounded-lg"
      data-on={on}
    >
      <svg viewBox="0 0 110 420" className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="lamp-pool" cx="50%" cy="0%" r="66%">
            <stop offset="0%" style={{ stopColor: "rgb(var(--lamp-hi))" }} stopOpacity="0.9" />
            <stop offset="100%" style={{ stopColor: "rgb(var(--lamp-lo))" }} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lamp-pole" x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".35" />
            <stop offset=".35" stopColor="#fff" stopOpacity=".45" />
            <stop offset="1" stopColor="#000" stopOpacity=".4" />
          </linearGradient>
          <linearGradient id="lamp-shade" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".35" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".22" />
          </linearGradient>
          <radialGradient id="lamp-lit" cx="50%" cy="100%" r="90%">
            <stop offset="0" style={{ stopColor: "rgb(var(--lamp-hi))" }} stopOpacity=".95" />
            <stop offset="1" style={{ stopColor: "rgb(var(--lamp-lo))" }} stopOpacity=".15" />
          </radialGradient>
          <radialGradient id="lamp-base" cx="40%" cy="30%" r="70%">
            <stop offset="0" stopColor="#fff" stopOpacity=".45" />
            <stop offset="1" stopColor="#000" stopOpacity=".3" />
          </radialGradient>
        </defs>
        {/* shadow on the floor */}
        <ellipse cx="62" cy="414" rx="46" ry="7" fill="rgba(0,0,0,.22)" />
        {on && <ellipse cx="55" cy="172" rx="78" ry="96" fill="url(#lamp-pool)" className="lamp-cone" />}
        <rect x="52" y="70" width="6" height="335" rx="3" fill="var(--lamp-metal)" />
        <rect x="52" y="70" width="6" height="335" rx="3" fill="url(#lamp-pole)" />
        <ellipse cx="55" cy="408" rx="32" ry="8" fill="var(--lamp-metal)" />
        <ellipse cx="55" cy="408" rx="32" ry="8" fill="url(#lamp-base)" />
        <ellipse cx="55" cy="406" rx="24" ry="5" fill="rgba(255,255,255,.12)" />
        <path d="M20 80 L34 18 H76 L90 80 Z" fill="var(--lamp-shade)" />
        {on && <path d="M20 80 L34 18 H76 L90 80 Z" fill="url(#lamp-lit)" opacity=".75" />}
        <path d="M20 80 L34 18 H76 L90 80 Z" fill="url(#lamp-shade)" />
        <path d="M34 18 H76" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
        <path d="M20 80 H90" stroke="rgba(0,0,0,.2)" strokeWidth="2.5" />
        {on && <ellipse cx="55" cy="81" rx="26" ry="5" style={{ fill: "rgb(var(--lamp-hi))" }} />}
        <circle cx="70" cy="140" r="3" fill="var(--lamp-metal)" />
        <path d="M70 140 v26" stroke="var(--lamp-metal)" strokeWidth="1.5" />
        <circle cx="70" cy="168" r="2.5" fill="var(--lamp-metal)" />
      </svg>
    </button>
  );
}

function PendantLamp({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const glow = `pendant-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={on ? "Turn the lamp off" : "Turn the lamp on"} className="relative -mt-4 block h-28 w-14 shrink-0">
      <svg viewBox="0 0 56 112" className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id={glow}>
            <stop offset="0" style={{ stopColor: "rgb(var(--lamp-hi))" }} stopOpacity=".9" />
            <stop offset=".45" style={{ stopColor: "rgb(var(--lamp-lo))" }} stopOpacity=".45" />
            <stop offset="1" style={{ stopColor: "rgb(var(--lamp-lo))" }} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M28 0 v62" stroke="var(--lamp-metal)" strokeWidth="1.5" />
        {on && <ellipse cx="28" cy="92" rx="46" ry="38" fill={`url(#${glow})`} style={{ opacity: "min(1, calc(.75 * var(--lamp-level)))" }} />}
        <path d="M10 86 Q28 52 46 86 Z" fill="var(--lamp-shade)" stroke="rgba(0,0,0,.12)" />
        {on && <ellipse cx="28" cy="87" rx="11" ry="3" style={{ fill: "rgb(var(--lamp-hi))" }} />}
      </svg>
    </button>
  );
}

/**
 * A corner of a home: window on the left, the shelves in the middle, a reading lamp on the
 * right, a rug on the floor. On phones the window sits above the shelves with a pendant lamp.
 */
export function RoomScene({ children, standing }: { children: ReactNode; standing: boolean }) {
  const [lampOn, toggleLamp] = useLamp();
  return (
    <div className="room-stage relative flex flex-1 flex-col" data-lamp={lampOn ? "on" : "off"}>
      <div aria-hidden className="lamp-glow pointer-events-none absolute inset-0 -z-0" />
      <div aria-hidden className="window-beam hidden lg:block" />
      <FairyLights />

      {/* phones & tablets: window and pendant above the shelves */}
      <div className="mb-8 flex items-start gap-8 pl-4 lg:hidden">
        <RoomWindow compact className="h-28 flex-1 sm:h-36" />
        <PendantLamp on={lampOn} onToggle={toggleLamp} />
      </div>

      <div className="relative flex items-end gap-8 xl:gap-12">
        <RoomWindow className="mt-16 hidden h-[340px] w-[210px] shrink-0 self-start lg:block" />
        <div className={`relative z-[1] min-w-0 flex-1 ${standing ? "" : "pb-16"}`}>{children}</div>
        <div className="hidden shrink-0 lg:block">
          <FloorLamp on={lampOn} onToggle={toggleLamp} />
        </div>
      </div>

      <div className="room-floor" aria-hidden>
        <div className="skirting" />
        <div className="floor-plane">
          <div className="floor-sun" />
          <div className="room-rug" />
        </div>
      </div>
    </div>
  );
}
