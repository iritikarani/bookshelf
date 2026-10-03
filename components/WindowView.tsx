import { useId } from "react";

/**
 * The view through the window: a mountain valley with a lake. Layered ridges fade into the haze
 * (atmospheric perspective), a pine forest in front, the sky reflected in the water.
 * Two versions are drawn; CSS shows the night one in dark mode.
 */

// Small deterministic random, so the stars and trees are the same on every render.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const W = 400;
const H = 300;
const HORIZON = 212; // lake line

// Pine silhouettes along the near shore.
function pines(seed: number) {
  const r = rng(seed);
  const trees: string[] = [];
  let x = -6;
  while (x < W + 6) {
    const h = 16 + r() * 26;
    const w = h * (0.32 + r() * 0.08);
    const base = HORIZON + 1 - r() * 3;
    trees.push(`M${x.toFixed(1)} ${base.toFixed(1)} L${(x + w / 2).toFixed(1)} ${(base - h).toFixed(1)} L${(x + w).toFixed(1)} ${base.toFixed(1)} Z`);
    x += w * (0.45 + r() * 0.35);
  }
  return trees.join(" ");
}

const FOREST = pines(7);
const STARS = (() => {
  const r = rng(42);
  return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * 150, r: r() < 0.12 ? 1.1 : 0.45 + r() * 0.4, o: 0.4 + r() * 0.6 }));
})();

// Mountain ridges, far to near.
const RIDGE_FAR = "M0 150 C40 132 70 128 105 140 C135 120 160 104 196 122 C226 108 250 112 278 128 C312 112 350 118 400 136 L400 212 L0 212 Z";
const RIDGE_MID = "M0 168 C30 156 58 150 90 162 C120 146 142 140 170 156 C205 150 228 160 252 168 C282 150 320 144 352 160 C372 156 388 158 400 162 L400 212 L0 212 Z";
const RIDGE_NEAR = "M0 186 C34 178 60 172 96 182 C130 170 162 168 196 180 C232 176 262 184 292 186 C322 174 360 170 400 182 L400 212 L0 212 Z";

export function WindowView() {
  // Unique ids per window: the phone and desktop windows can both be in the page.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (name: string) => `wv-${uid}-${name}`;
  const ref = (name: string) => `url(#${id(name)})`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        {/* ── day ── */}
        <linearGradient id={id("sky-day")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fc3e6" />
          <stop offset="0.45" stopColor="#cddff0" />
          <stop offset="0.7" stopColor="#f6dcd0" />
          <stop offset="1" stopColor="#fbe3c8" />
        </linearGradient>
        <radialGradient id={id("sun-glow")} cx="0.59" cy="0.35" r="0.5">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#ffe7c2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe7c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("lake-day")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d9cc" />
          <stop offset="0.35" stopColor="#bcd3e6" />
          <stop offset="1" stopColor="#7f9fc0" />
        </linearGradient>
        {/* ── night ── */}
        <linearGradient id={id("sky-night")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1328" />
          <stop offset="0.55" stopColor="#1d2a52" />
          <stop offset="1" stopColor="#3d4677" />
        </linearGradient>
        <radialGradient id={id("moon-glow")} cx="0.56" cy="0.22" r="0.3">
          <stop offset="0" stopColor="#f6f0d8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f6f0d8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("lake-night")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#323b68" />
          <stop offset="1" stopColor="#0d1530" />
        </linearGradient>
        <filter id={id("soft")} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={id("haze")} x="0" y="-10%" width="100%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* ═════ day ═════ */}
      <g className="window-view-day">
        <rect width={W} height={H} fill={ref("sky-day")} />
        <rect width={W} height={H} fill={ref("sun-glow")} />
        <circle cx="236" cy="104" r="12" fill="#fff8e6" />
        {/* cloud wisps */}
        <g filter={ref("soft")} opacity="0.85">
          <ellipse cx="80" cy="62" rx="58" ry="7" fill="#ffffff" />
          <ellipse cx="118" cy="54" rx="34" ry="6" fill="#ffffff" />
          <ellipse cx="300" cy="88" rx="64" ry="6" fill="#fff4ec" />
          <ellipse cx="220" cy="38" rx="40" ry="4" fill="#ffffff" opacity="0.7" />
        </g>
        {/* birds */}
        <path d="M150 92 q4 -4 8 0 q4 -4 8 0 M172 82 q3 -3 6 0 q3 -3 6 0" stroke="#6e7a96" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* ridges, fading into the haze */}
        <path d={RIDGE_FAR} fill="#c9cbe4" filter={ref("haze")} />
        <path d={RIDGE_MID} fill="#a6b2d4" />
        <rect y="150" width={W} height="40" fill="#f6dcd0" opacity="0.25" filter={ref("soft")} />
        <path d={RIDGE_NEAR} fill="#7f93b8" />
        {/* lake reflecting the sky, with the sun's glitter */}
        <rect y={HORIZON} width={W} height={H - HORIZON} fill={ref("lake-day")} />
        <g opacity="0.75">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={226 - i * 3} y={HORIZON + 6 + i * 8} width={20 + i * 6} height="1.4" rx="0.7" fill="#fff6e4" />
          ))}
        </g>
        <path d="M0 236 h120 M170 252 h90 M300 268 h80 M40 280 h70" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
        {/* the pine forest on the near shore, and its dark reflection */}
        <path d={FOREST} fill="#3f5a55" />
        <path d={FOREST} fill="#3f5a55" opacity="0.25" transform={`translate(0 ${HORIZON * 2 + 2}) scale(1 -1)`} />
        <rect y={HORIZON - 2} width={W} height="5" fill="#3f5a55" />
      </g>

      {/* ═════ night ═════ */}
      <g className="window-view-night">
        <rect width={W} height={H} fill={ref("sky-night")} />
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
        ))}
        <rect width={W} height={H} fill={ref("moon-glow")} />
        <circle cx="224" cy="66" r="15" fill="#f6efd6" />
        <circle cx="218" cy="62" r="3" fill="#e4dcc0" opacity="0.6" />
        <circle cx="229" cy="72" r="2" fill="#e4dcc0" opacity="0.5" />
        <path d={RIDGE_FAR} fill="#2f3866" filter={ref("haze")} />
        <path d={RIDGE_MID} fill="#232b52" />
        <path d={RIDGE_NEAR} fill="#1a2142" />
        <rect y={HORIZON} width={W} height={H - HORIZON} fill={ref("lake-night")} />
        <g opacity="0.8">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={216 - i * 2.5} y={HORIZON + 6 + i * 9} width={16 + i * 5} height="1.3" rx="0.6" fill="#f6efd6" opacity={0.9 - i * 0.1} />
          ))}
        </g>
        <path d={FOREST} fill="#0f1528" />
        <rect y={HORIZON - 2} width={W} height="5" fill="#0f1528" />
      </g>
    </svg>
  );
}
