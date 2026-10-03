import type { CSSProperties, ReactNode } from "react";
import type { DecorKind } from "@/lib/types";

interface DecorSpec {
  kind: DecorKind;
  name: string;
  /** Height as a fraction of the cover height, so decor scales with the shelf. */
  h: number;
  viewBox: [number, number];
  art: ReactNode;
}

const POT = "#c9785a";
const POT_DARK = "#a85f45";
const LEAF = "#5f8f5a";
const LEAF_LIGHT = "#86b17a";

export const DECOR: DecorSpec[] = [
  {
    kind: "plant",
    name: "Trailing plant",
    h: 0.95,
    viewBox: [80, 110],
    art: (
      <>
        <path d="M14 66c-4 14-2 30 2 42" stroke={LEAF} strokeWidth="1.6" fill="none" />
        <path d="M66 66c5 12 4 24 0 36" stroke={LEAF} strokeWidth="1.6" fill="none" />
        {[[16, 80], [13, 92], [17, 104], [67, 78], [69, 90], [66, 100]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="4.5" ry="3" fill={i % 2 ? LEAF_LIGHT : LEAF} transform={`rotate(${i % 2 ? 30 : -30} ${x} ${y})`} />
        ))}
        {[[40, 22, 0], [28, 30, -35], [52, 30, 35], [20, 44, -60], [60, 44, 60], [34, 40, -15], [46, 40, 15], [40, 34, 0]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="7" ry="11" fill={i % 3 === 0 ? LEAF_LIGHT : LEAF} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <path d="M18 56h44l-5 40H23z" fill={POT} />
        <rect x="15" y="52" width="50" height="9" rx="2" fill={POT_DARK} />
      </>
    ),
  },
  {
    kind: "succulent",
    name: "Succulent",
    h: 0.42,
    viewBox: [50, 50],
    art: (
      <>
        {[-60, -30, 0, 30, 60].map((r, i) => (
          <ellipse key={i} cx="25" cy="18" rx="5" ry="12" fill={i % 2 ? "#8fbf9f" : "#6fa588"} transform={`rotate(${r} 25 26)`} />
        ))}
        <ellipse cx="25" cy="22" rx="4" ry="7" fill="#a9d3b4" />
        <path d="M9 28h32l-4 20H13z" fill="#f1ece4" />
        <path d="M9 28h32l-1 4H10z" fill="#d9d1c5" />
      </>
    ),
  },
  {
    kind: "pampas",
    name: "Pampas vase",
    h: 1.05,
    viewBox: [56, 130],
    art: (
      <>
        <path d="M28 70L18 18M28 70L28 10M28 70L40 20" stroke="#b49a76" strokeWidth="1.2" />
        {[[18, 22, -12], [28, 14, 0], [40, 24, 14]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="6" ry="16" fill={["#ecdcc0", "#f3e7d3", "#e5d1b0"][i]} transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <path d="M22 72c-12 8-14 40-6 56h24c8-16 6-48-6-56z" fill="#e8e1d6" />
        <path d="M22 72h12c1 3 0 5-2 6h-8c-2-1-3-3-2-6z" fill="#d5ccbf" />
        <path d="M18 100c6 3 14 3 20 0" stroke="#cfc4b5" strokeWidth="1.5" fill="none" />
      </>
    ),
  },
  {
    kind: "candles",
    name: "Candles",
    h: 0.5,
    viewBox: [60, 60],
    art: (
      <>
        <path d="M17 8c3 4 3 7 0 9-3-2-3-5 0-9z" fill="#f5b942" />
        <path d="M40 18c3 4 3 7 0 9-3-2-3-5 0-9z" fill="#f5b942" />
        <rect x="11" y="18" width="12" height="34" rx="2" fill="#f4ede2" />
        <rect x="34" y="28" width="12" height="24" rx="2" fill="#efd6d0" />
        <path d="M17 17v2M40 27v2" stroke="#3a332e" strokeWidth="1" />
        <rect x="4" y="51" width="52" height="6" rx="3" fill="#c7a46c" />
      </>
    ),
  },
  {
    kind: "frame",
    name: "Photo frame",
    h: 0.62,
    viewBox: [60, 76],
    art: (
      <>
        <rect x="2" y="2" width="56" height="72" rx="2" fill="#2f2b28" />
        <rect x="7" y="7" width="46" height="62" fill="#f8f4ec" />
        <rect x="12" y="12" width="36" height="46" fill="#cfe1ea" />
        <circle cx="38" cy="22" r="4" fill="#f7d68a" />
        <path d="M12 58l10-16 8 10 6-7 12 13z" fill="#8fb49a" />
      </>
    ),
  },
  {
    kind: "globe",
    name: "Globe",
    h: 0.82,
    viewBox: [60, 90],
    art: (
      <>
        <circle cx="30" cy="34" r="24" fill="#a9cfe0" />
        <path d="M16 22c6-2 10 2 9 8s-8 6-10 12c-4-4-4-14 1-20zM34 14c6 0 12 6 12 10-4 2-6-2-10 0s-6-6-2-10zM36 40c6-2 12 2 10 8-3 4-8 4-10 0s-2-6 0-8z" fill="#9cc18c" />
        <path d="M8 22a28 28 0 0 0 30 40" stroke="#b08a52" strokeWidth="3" fill="none" />
        <path d="M30 60v14" stroke="#b08a52" strokeWidth="3" />
        <path d="M16 86c0-8 28-8 28 0z" fill="#8d6b3f" />
      </>
    ),
  },
  {
    kind: "calendar",
    name: "Flip calendar",
    h: 0.5,
    viewBox: [56, 56],
    art: (
      <>
        <rect x="3" y="8" width="50" height="46" rx="4" fill="#f7f3ec" stroke="#d6cdc0" />
        <rect x="3" y="8" width="50" height="12" rx="4" fill="#2f2b28" />
        <text x="28" y="17.5" textAnchor="middle" fontSize="8" fill="#f7f3ec" fontFamily="JetBrains Mono, monospace">NOV</text>
        <text x="28" y="46" textAnchor="middle" fontSize="24" fill="#2f2b28" fontFamily="JetBrains Mono, monospace" fontWeight="600">05</text>
        <path d="M3 33h50" stroke="#e3dbcf" />
        <path d="M16 4v8M40 4v8" stroke="#8a8178" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    kind: "bust",
    name: "Classical bust",
    h: 0.88,
    viewBox: [56, 96],
    art: (
      <>
        <path d="M20 4c10-4 22 2 22 14 0 6-2 10-4 14l-1 8h-14l-1-8c-4-4-8-10-6-18 1-5 2-8 4-10z" fill="#ece8e1" />
        <path d="M20 8c4-4 14-6 20 0-2 4-8 4-12 2-2 2-6 2-8-2z" fill="#dcd6cc" />
        <path d="M22 40h14l2 8c10 2 16 8 16 18H2c0-10 6-16 16-18z" fill="#e6e1d8" />
        <path d="M14 66h28l-2 8H16z" fill="#d6cfc3" />
        <rect x="12" y="74" width="32" height="18" rx="1" fill="#cfc7ba" />
        <rect x="9" y="90" width="38" height="5" rx="1" fill="#bdb4a6" />
      </>
    ),
  },
  {
    kind: "camera",
    name: "Vintage camera",
    h: 0.4,
    viewBox: [72, 50],
    art: (
      <>
        <rect x="12" y="6" width="16" height="8" rx="2" fill="#3a3531" />
        <rect x="2" y="12" width="68" height="36" rx="5" fill="#2f2b28" />
        <rect x="2" y="22" width="68" height="18" fill="#7a5b44" />
        <circle cx="38" cy="30" r="13" fill="#d8d3cc" />
        <circle cx="38" cy="30" r="9" fill="#1f1c1a" />
        <circle cx="35" cy="27" r="2.5" fill="#6d7f8f" />
        <rect x="56" y="15" width="9" height="5" rx="1" fill="#d8d3cc" />
      </>
    ),
  },
  {
    kind: "stack",
    name: "Stacked books",
    h: 0.4,
    viewBox: [92, 44],
    art: (
      <>
        <rect x="10" y="2" width="70" height="12" rx="1.5" fill="#c8cbf0" />
        <rect x="74" y="4" width="4" height="8" fill="#f8f4ec" />
        <rect x="4" y="15" width="80" height="13" rx="1.5" fill="#f2c4c0" />
        <rect x="78" y="17" width="4" height="9" fill="#f8f4ec" />
        <rect x="8" y="29" width="78" height="14" rx="1.5" fill="#bfe3cf" />
        <rect x="80" y="31" width="4" height="10" fill="#f8f4ec" />
        <path d="M18 8h30M14 21h40M18 36h36" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      </>
    ),
  },
];

export const decorSpec = (kind: DecorKind) => DECOR.find((d) => d.kind === kind) ?? DECOR[0];

/** Size in shelf units: height follows the cover height so decor scales on phones. */
export function decorSize(kind: DecorKind): CSSProperties {
  const d = decorSpec(kind);
  return { height: `calc(var(--cover-h) * ${d.h})`, aspectRatio: `${d.viewBox[0]} / ${d.viewBox[1]}` };
}

export function DecorArt({ kind, className = "" }: { kind: DecorKind; className?: string }) {
  const d = decorSpec(kind);
  return (
    <svg viewBox={`0 0 ${d.viewBox[0]} ${d.viewBox[1]}`} className={`block h-full w-full ${className}`} aria-hidden>
      {d.art}
    </svg>
  );
}
