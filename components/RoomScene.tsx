"use client";

import { useEffect, useState, type ReactNode } from "react";
import { WindowView } from "./WindowView";

const LAMP_KEY = "exlibris:lamp";

/** Whether the reading lamp is switched on. Remembered per browser. */
function useLamp(): [boolean, () => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      const v = localStorage.getItem(LAMP_KEY);
      if (v !== null) setOn(v === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setOn((v) => {
      try {
        localStorage.setItem(LAMP_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  return [on, toggle];
}

/** A window with curtains: daylight sky with a branch, or a night sky with the moon in dark mode. */
export function RoomWindow({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={`room-window relative ${className}`} aria-hidden>
      <div className="window-rod" />
      <div className="window-frame">
        <div className="window-sky">
          <WindowView />
        </div>
        <div className="window-glass" />
        <div className={`window-mullions ${compact ? "window-mullions--wide" : ""}`} />
      </div>
      <div className="window-sill" />
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
          <radialGradient id="lamp-pool" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#fff3cf" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
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
            <stop offset="0" stopColor="#fff6d8" stopOpacity=".95" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity=".15" />
          </radialGradient>
          <radialGradient id="lamp-base" cx="40%" cy="30%" r="70%">
            <stop offset="0" stopColor="#fff" stopOpacity=".45" />
            <stop offset="1" stopColor="#000" stopOpacity=".3" />
          </radialGradient>
        </defs>
        {/* shadow on the floor */}
        <ellipse cx="62" cy="414" rx="46" ry="7" fill="rgba(0,0,0,.22)" />
        {on && <ellipse cx="55" cy="130" rx="74" ry="80" fill="url(#lamp-pool)" className="lamp-cone" />}
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
        {on && <ellipse cx="55" cy="81" rx="26" ry="5" fill="#fff4d6" />}
        <circle cx="70" cy="140" r="3" fill="var(--lamp-metal)" />
        <path d="M70 140 v26" stroke="var(--lamp-metal)" strokeWidth="1.5" />
        <circle cx="70" cy="168" r="2.5" fill="var(--lamp-metal)" />
      </svg>
    </button>
  );
}

function PendantLamp({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={on ? "Turn the lamp off" : "Turn the lamp on"} className="relative -mt-4 block h-28 w-14 shrink-0">
      <svg viewBox="0 0 56 112" className="h-full w-full overflow-visible" aria-hidden>
        <path d="M28 0 v62" stroke="var(--lamp-metal)" strokeWidth="1.5" />
        {on && <ellipse cx="28" cy="96" rx="38" ry="30" fill="#ffe2a0" opacity=".35" />}
        <path d="M10 86 Q28 52 46 86 Z" fill="var(--lamp-shade)" stroke="rgba(0,0,0,.12)" />
        {on && <ellipse cx="28" cy="87" rx="11" ry="3" fill="#fff4d6" />}
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
    <div className="room-stage relative" data-lamp={lampOn ? "on" : "off"}>
      <div aria-hidden className="lamp-glow pointer-events-none absolute inset-0 -z-0" />
      <div aria-hidden className="window-beam hidden lg:block" />

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
