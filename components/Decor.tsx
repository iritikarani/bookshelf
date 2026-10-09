"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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
    name: "Bibliophile frame",
    h: 0.66,
    viewBox: [60, 80],
    art: (
      <>
        <rect x="1" y="1" width="58" height="78" rx="2" fill="#3a2f28" />
        <rect x="3.5" y="3.5" width="53" height="73" rx="1" fill="none" stroke="#b08a52" strokeWidth="1" />
        <rect x="6" y="6" width="48" height="68" fill="#f8f4ec" />
        {/* the illustration: someone curled up with a book under a crescent moon */}
        <rect x="10" y="10" width="40" height="44" fill="#f3d6d0" />
        <rect x="10" y="38" width="40" height="16" fill="#e9c3bb" />
        <path d="M41 14a6 6 0 1 0 4 10 5 5 0 1 1-4-10z" fill="#fbe7a8" />
        <circle cx="16" cy="16" r="0.9" fill="#fff8e6" />
        <circle cx="24" cy="13" r="0.7" fill="#fff8e6" />
        <circle cx="33" cy="19" r="0.8" fill="#fff8e6" />
        {/* stack of books she sits on */}
        <rect x="14" y="47" width="22" height="4" rx="0.8" fill="#8fb49a" />
        <rect x="16" y="43" width="19" height="4" rx="0.8" fill="#c8cbf0" />
        {/* reader */}
        <path d="M19 43c0-7 3-12 7-12s7 5 7 12z" fill="#5f6f9a" />
        <circle cx="26" cy="27" r="4" fill="#e8b996" />
        <path d="M22 27c0-4 2-6 4.5-6s4.5 2 4 5c-1-2-3-3-5-2-1 1-2 2-3.5 3z" fill="#3a2a22" />
        <circle cx="29.5" cy="21.5" r="2" fill="#3a2a22" />
        {/* open book */}
        <path d="M21 36l5 2 5-2v5l-5 2-5-2z" fill="#fffaf0" stroke="#c9785a" strokeWidth="0.6" />
        <path d="M26 38v5" stroke="#c9785a" strokeWidth="0.5" />
        <rect x="38" y="44" width="3" height="7" rx="0.6" fill="#c9785a" />
        <path d="M39.5 44c-2-3 0-6 2-7-1 3 2 4-2 7z" fill="#86b17a" />
        <text x="30" y="66" textAnchor="middle" fontSize="7.2" fontStyle="italic" fill="#3a2f28" fontFamily="Gloock, Georgia, serif" letterSpacing="0.2">
          bibliophile
        </text>
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
<TodayCalendar />
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
  {
    kind: "chai",
    name: "Kulhad chai",
    h: 0.36,
    viewBox: [60, 52],
    art: (
      <>
        <path d="M20 8c-3 4 3 6 0 10M28 6c-3 4 3 6 0 10M36 8c-3 4 3 6 0 10" stroke="#cfc6bb" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="30" cy="48" rx="24" ry="3.5" fill="#d9c7b0" />
        <path d="M13 22h34l-4 24H17z" fill="#b5653f" />
        <path d="M13 22h34l-0.8 4.5H13.8z" fill="#9a5235" />
        <ellipse cx="30" cy="22" rx="17" ry="3" fill="#c98a4b" />
        <ellipse cx="30" cy="22" rx="14" ry="2" fill="#d9a066" />
        <path d="M19 31h22" stroke="#c97d55" strokeWidth="1" />
      </>
    ),
  },
  {
    kind: "glasses",
    name: "Reading glasses",
    h: 0.26,
    viewBox: [72, 30],
    art: (
      <>
        <ellipse cx="36" cy="28" rx="34" ry="2" fill="rgba(0,0,0,.12)" />
        <circle cx="20" cy="15" r="11" fill="rgba(190,220,235,.45)" stroke="#5a4232" strokeWidth="3" />
        <circle cx="52" cy="15" r="11" fill="rgba(190,220,235,.45)" stroke="#5a4232" strokeWidth="3" />
        <path d="M31 14c2-3 8-3 10 0" stroke="#5a4232" strokeWidth="2.5" fill="none" />
        <path d="M15 10c2-2 5-2 7-1M47 10c2-2 5-2 7-1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
        <path d="M9 13L2 26M63 13l7 13" stroke="#5a4232" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    kind: "hourglass",
    name: "Hourglass",
    h: 0.62,
    viewBox: [44, 80],
    art: (
      <>
        <rect x="4" y="2" width="36" height="6" rx="1.5" fill="#8d6b3f" />
        <rect x="4" y="72" width="36" height="6" rx="1.5" fill="#8d6b3f" />
        <path d="M7 8v64M37 8v64" stroke="#b08a52" strokeWidth="2.5" />
        <path d="M11 8h22c0 14-8 22-10 32 2 10 10 18 10 32H11c0-14 8-22 10-32-2-10-10-18-10-32z" fill="rgba(210,230,240,.55)" stroke="#c9d8de" />
        <path d="M15 20h14c-2 6-5 10-7 14-2-4-5-8-7-14z" fill="#e2b979" />
        <path d="M22 40v20" stroke="#e2b979" strokeWidth="1" />
        <path d="M12 72c2-8 6-12 10-12s8 4 10 12z" fill="#e2b979" />
      </>
    ),
  },
  {
    kind: "diya",
    name: "Brass diya",
    h: 0.42,
    viewBox: [60, 58],
    art: (
      <>
        <path d="M30 4c6 8 7 13 4 17-2 2-6 2-8 0-3-4-2-9 4-17z" fill="#ffc94d" />
        <path d="M30 11c3 5 3 8 1.5 10-1 1-2 1-3 0-1.5-2-1-5 1.5-10z" fill="#fff1b8" />
        <ellipse cx="30" cy="18" rx="16" ry="12" fill="rgba(255,205,90,.18)" />
        <path d="M6 30c2 10 12 16 24 16s22-6 24-16z" fill="#c9952e" />
        <path d="M6 30h48c-1 3-3 5-6 7H12c-3-2-5-4-6-7z" fill="#e0b04a" />
        <path d="M24 46h12l3 7H21z" fill="#b07f25" />
        <rect x="17" y="52" width="26" height="4" rx="1.5" fill="#c9952e" />
      </>
    ),
  },
  {
    kind: "typewriter",
    name: "Typewriter",
    h: 0.5,
    viewBox: [84, 62],
    art: (
      <>
        <rect x="22" y="2" width="40" height="16" fill="#f8f4ec" />
        <path d="M27 7h28M27 11h22" stroke="#b9b0a4" strokeWidth="1" />
        <rect x="10" y="16" width="64" height="8" rx="4" fill="#3a3531" />
        <circle cx="8" cy="20" r="4" fill="#5a524b" />
        <circle cx="76" cy="20" r="4" fill="#5a524b" />
        <path d="M8 24h68l6 32H2z" fill="#6f8f88" />
        <path d="M14 34h56l3 16H11z" fill="#3f4f4b" />
        <g fill="#f3efe7">
          <circle cx="20" cy="38" r="2" /><circle cx="27" cy="38" r="2" /><circle cx="34" cy="38" r="2" /><circle cx="41" cy="38" r="2" /><circle cx="48" cy="38" r="2" /><circle cx="55" cy="38" r="2" /><circle cx="62" cy="38" r="2" />
          <circle cx="23" cy="44" r="2" /><circle cx="30" cy="44" r="2" /><circle cx="37" cy="44" r="2" /><circle cx="44" cy="44" r="2" /><circle cx="51" cy="44" r="2" /><circle cx="58" cy="44" r="2" />
        </g>
        <rect x="28" y="48" width="26" height="2.5" rx="1" fill="#f3efe7" />
        <rect x="2" y="56" width="80" height="5" rx="1.5" fill="#2f3a37" />
      </>
    ),
  },
  {
    kind: "cat",
    name: "Sleeping cat",
    h: 0.44,
    viewBox: [90, 50],
    art: (
      <>
        <ellipse cx="46" cy="47" rx="40" ry="3" fill="rgba(0,0,0,.14)" />
        <path d="M10 46c-6-14 6-30 30-30 20 0 36 8 38 22 1 6-3 8-8 8z" fill="#e7a35c" />
        <path d="M30 20c6 2 8 8 6 14M44 18c5 3 6 9 4 15M58 22c4 3 4 9 2 13" stroke="#cf8640" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M60 46c10 0 20-2 22-8 2-5-2-8-6-6" stroke="#e7a35c" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="20" cy="36" r="13" fill="#eeb06a" />
        <path d="M9 30l2-12 8 8zM31 30l-2-12-8 8z" fill="#eeb06a" />
        <path d="M11 23l1-3 3 4zM29 23l-1-3-3 4z" fill="#f4c7c0" />
        <path d="M13 36c2 2 4 2 6 0M21 36c2 2 4 2 6 0" stroke="#5a3a22" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M19 40l1 1 1-1z" fill="#d97a7a" />
        <text x="36" y="14" fontSize="7" fill="#9a8f84" fontFamily="Gloock, Georgia, serif">z</text>
        <text x="41" y="8" fontSize="9" fill="#9a8f84" fontFamily="Gloock, Georgia, serif">z</text>
      </>
    ),
  },
  {
    kind: "quill",
    name: "Quill & ink",
    h: 0.7,
    viewBox: [50, 90],
    art: (
      <>
        <path d="M38 2c8 10 6 26-6 40l-12 20c-1-14 2-30 18-60z" fill="#f4efe6" stroke="#d8cfc2" />
        <path d="M37 6L20 62" stroke="#b9ae9f" strokeWidth="1" />
        <path d="M21 58l-3 12" stroke="#3a3531" strokeWidth="1.5" />
        <rect x="8" y="66" width="30" height="20" rx="4" fill="#2c3a5a" />
        <rect x="14" y="60" width="18" height="8" rx="1.5" fill="#1f2a44" />
        <rect x="12" y="72" width="22" height="9" rx="1" fill="#f3e9d6" />
        <path d="M15 76h16" stroke="#9a8f84" strokeWidth="1" />
        <path d="M11 69c2-1 4-1 5 0" stroke="#fff" strokeWidth="1.2" opacity=".5" strokeLinecap="round" />
      </>
    ),
  },
  {
    kind: "fairyjar",
    name: "Fairy-light jar",
    h: 0.66,
    viewBox: [50, 80],
    art: (
      <>
        <ellipse cx="25" cy="44" rx="24" ry="30" fill="rgba(255,214,120,.16)" />
        <rect x="13" y="6" width="24" height="8" rx="2" fill="#b08a52" />
        <path d="M14 14h22v4c6 3 9 9 9 16v34c0 5-4 9-9 9H14c-5 0-9-4-9-9V34c0-7 3-13 9-16z" fill="rgba(215,235,240,.5)" stroke="#c9d8de" strokeWidth="1.5" />
        <path d="M10 64c8-6 22 4 30-6M10 50c10 4 22-8 30-2M11 38c8 2 18-6 28-1" stroke="#8a7f6e" strokeWidth="0.8" fill="none" />
        <g fill="#ffd36e">
          <circle cx="14" cy="62" r="2" /><circle cx="24" cy="63" r="2" /><circle cx="34" cy="60" r="2" />
          <circle cx="16" cy="52" r="2" /><circle cx="27" cy="49" r="2" /><circle cx="37" cy="48" r="2" />
          <circle cx="15" cy="39" r="2" /><circle cx="25" cy="37" r="2" /><circle cx="35" cy="36" r="2" />
        </g>
        <path d="M9 30c0-4 2-8 5-10" stroke="#fff" strokeWidth="1.5" opacity=".6" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  // ── Reading rewards (unlocked by finishing books, see lib/rewards.ts) ──
  {
    kind: "cactus",
    name: "Little cactus",
    h: 0.46,
    viewBox: [44, 64],
    art: (
      <>
        <path d="M18 44V14c0-6 8-6 8 0v30z" fill="#6f9e64" />
        <path d="M18 30h-5c-3 0-4-2-4-5v-7c0-4 5-4 5 0v6h4zM26 26h5v-6c0-4 5-4 5 0v6c0 3-1 5-4 5h-6z" fill="#7bab6e" />
        <path d="M21 16v26M23 18v24" stroke="#5a8650" strokeWidth="0.8" />
        <circle cx="22" cy="9" r="3.5" fill="#f08aa0" />
        <circle cx="22" cy="9" r="1.3" fill="#ffd36e" />
        <path d="M8 44h28l-3 18H11z" fill="#e8d3b8" />
        <path d="M8 44h28v4H8z" fill="#d9bf9e" />
        <path d="M13 54h18" stroke="#c9a77f" strokeWidth="1" />
      </>
    ),
  },
  {
    kind: "monstera",
    name: "Monstera",
    h: 1.05,
    viewBox: [90, 120],
    art: (
      <>
        <path d="M45 82C40 60 30 46 14 40M45 82c2-24 10-42 30-50M45 82c0-22-2-40-4-56" stroke="#4f7a45" strokeWidth="2" fill="none" />
        <path d="M14 40C2 36 0 22 10 16c10-6 22 2 22 14 0 8-8 12-18 10z" fill="#4f8a4a" />
        <path d="M10 22l9 6M7 30l11 3M16 17l6 9" stroke="#e9f2df" strokeWidth="2" strokeLinecap="round" />
        <path d="M75 32c12-6 16-20 6-27-10-6-24 2-25 14-1 9 8 16 19 13z" fill="#5c9a52" />
        <path d="M80 10l-8 9M86 18l-12 5M70 8l-3 11" stroke="#e9f2df" strokeWidth="2" strokeLinecap="round" />
        <path d="M41 26c-8-4-10-16-2-22 8-5 18 1 18 10 0 8-7 14-16 12z" fill="#6aa65d" />
        <path d="M42 8l3 10M50 10l-3 9" stroke="#e9f2df" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M22 82h46l-5 34H27z" fill="#f2efe8" />
        <path d="M22 82h46v5H22z" fill="#e2ddd2" />
        <path d="M27 98h36" stroke="#d6d0c4" strokeWidth="1.2" />
      </>
    ),
  },
  {
    kind: "brasslamp",
    name: "Brass reading lamp",
    h: 0.92,
    viewBox: [70, 100],
    art: (
      <>
        <ellipse cx="35" cy="40" rx="34" ry="22" fill="rgba(255, 214, 120, 0.22)" />
        <path d="M8 36c0-12 12-20 27-20s27 8 27 20z" fill="#2f5d48" />
        <path d="M8 36c0-12 12-20 27-20" stroke="#5c8c74" strokeWidth="2" fill="none" />
        <rect x="6" y="35" width="58" height="4" rx="2" fill="#c99a3e" />
        <path d="M14 39h42l-4 4H18z" fill="rgba(255, 236, 170, 0.9)" />
        <path d="M35 39v44" stroke="#c99a3e" strokeWidth="4" />
        <path d="M35 39v44" stroke="#f1d08a" strokeWidth="1.2" />
        <path d="M48 41v14" stroke="#b8893a" strokeWidth="1.5" />
        <circle cx="48" cy="57" r="2.2" fill="#d4af5a" />
        <path d="M16 96c0-10 8-14 19-14s19 4 19 14z" fill="#c99a3e" />
        <path d="M20 90c4-4 10-5 15-5" stroke="#f1d08a" strokeWidth="1.5" fill="none" />
      </>
    ),
  },
  {
    kind: "goldenbook",
    name: "The golden book",
    h: 0.66,
    viewBox: [90, 80],
    art: (
      <>
        <path d="M14 8l2 4 4 2-4 2-2 4-2-4-4-2 4-2zM78 4l1.5 3 3 1.5-3 1.5L78 13l-1.5-3-3-1.5 3-1.5zM70 30l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#f5d77a" />
        <path d="M22 72l23-12 23 12z" fill="#6b4a2f" />
        <path d="M45 60v14" stroke="#4e3420" strokeWidth="3" />
        <path d="M8 52c14-6 26-6 37 2V22c-11-8-23-8-37-2z" fill="#f6e7bf" stroke="#c9a04a" strokeWidth="2" />
        <path d="M82 52c-14-6-26-6-37 2V22c11-8 23-8 37-2z" fill="#fbf0d2" stroke="#c9a04a" strokeWidth="2" />
        <path d="M15 28c8-3 16-3 24 1M15 35c8-3 16-3 24 1M15 42c8-3 16-3 24 1M51 29c8-4 16-4 24-1M51 36c8-4 16-4 24-1M51 43c8-4 16-4 24-1" stroke="#d9c08a" strokeWidth="1.3" />
        <path d="M45 22v32" stroke="#b8893a" strokeWidth="1.5" />
        <path d="M6 54c15-7 27-7 39 1 12-8 24-8 39-1v4c-15-6-27-6-39 2-12-8-24-8-39-2z" fill="#d4af5a" />
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

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * The flip calendar shows today's date in the viewer's own time zone, and turns over at their
 * midnight. The date is only read in the browser (pages are built ahead of time on a server in
 * another time zone, so a date baked into the page could be a day off).
 */
function TodayCalendar() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    let timer: number;
    const schedule = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(() => {
        setToday(new Date());
        schedule();
      }, midnight.getTime() - now.getTime() + 1000);
    };
    schedule();
    // Coming back to the tab after a while (phones pause timers): check the date again.
    const onVisible = () => document.visibilityState === "visible" && setToday(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <>
      <rect x="3" y="8" width="50" height="46" rx="4" fill="#f7f3ec" stroke="#d6cdc0" />
      <rect x="3" y="8" width="50" height="12" rx="4" fill="#2f2b28" />
      <text x="28" y="17.5" textAnchor="middle" fontSize="8" fill="#f7f3ec" fontFamily="JetBrains Mono, monospace">
        {today ? MONTHS[today.getMonth()] : ""}
      </text>
      <text x="28" y="46" textAnchor="middle" fontSize="24" fill="#2f2b28" fontFamily="JetBrains Mono, monospace" fontWeight="600">
        {today ? String(today.getDate()).padStart(2, "0") : ""}
      </text>
      <path d="M3 33h50" stroke="#e3dbcf" />
      <path d="M16 4v8M40 4v8" stroke="#8a8178" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}
