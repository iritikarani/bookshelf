import type { CSSProperties } from "react";
import type { Aesthetic, Structure } from "./themes";

/**
 * Room customisation on top of a room style: each choice is optional and, when set, wins over
 * the style's own look. Stored on the profile as `room`.
 */
export interface RoomSettings {
  wall?: string;
  pattern?: string;
  floor?: string;
  rug?: string;
  curtains?: string;
  structure?: Structure;
  finish?: string;
  /** Shelves in each bookcase before a new one starts. */
  perCase?: 2 | 3 | 4;
}

interface Swatch {
  id: string;
  name: string;
  color: string;
}

/** Light walls keep dark ink; dark walls switch the room's text to light. */
export const WALLS: (Swatch & { dark?: boolean })[] = [
  { id: "cream", name: "Cream", color: "#f6efe2" },
  { id: "blush", name: "Blush", color: "#f6e1dc" },
  { id: "sage", name: "Sage", color: "#d5dfcc" },
  { id: "dustyblue", name: "Dusty blue", color: "#cfdbe4" },
  { id: "lavender", name: "Lavender", color: "#e2dcef" },
  { id: "mustard", name: "Mustard", color: "#e7cc8c" },
  { id: "terracotta", name: "Terracotta", color: "#c98a6e" },
  { id: "forest", name: "Forest", color: "#2b3930", dark: true },
  { id: "navy", name: "Midnight", color: "#18203d", dark: true },
  { id: "oxblood", name: "Oxblood", color: "#5a1f24", dark: true },
  { id: "charcoal", name: "Charcoal", color: "#2e2c2b", dark: true },
];

/** Patterns use soft light/dark overlays, so they work on any wall colour. */
export const PATTERNS: { id: string; name: string; css: string }[] = [
  { id: "plain", name: "Plain", css: "linear-gradient(transparent, transparent)" },
  { id: "dots", name: "Dots", css: "radial-gradient(circle at 3px 3px, rgba(0, 0, 0, 0.09) 1.4px, transparent 2px) 0 0 / 22px 22px" },
  { id: "stripes", name: "Stripes", css: "repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.16) 0 26px, rgba(0, 0, 0, 0.035) 26px 52px)" },
  {
    id: "panels",
    name: "Panels",
    css: "linear-gradient(180deg, transparent 0 calc(100% - 340px), rgba(0, 0, 0, 0.04) calc(100% - 340px)), repeating-linear-gradient(90deg, transparent 0 138px, rgba(0, 0, 0, 0.06) 138px 140px)",
  },
  {
    id: "brick",
    name: "Brick",
    css: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='M0 1h64M0 17h64M1 1v16M33 17v16'/%3E%3C/g%3E%3C/svg%3E\")",
  },
  {
    id: "floral",
    name: "Floral",
    css: "radial-gradient(circle at 9px 9px, rgba(224, 146, 158, 0.38) 2.6px, transparent 3.2px) 0 0 / 44px 44px, radial-gradient(ellipse 2px 4px at 15px 11px, rgba(120, 160, 110, 0.4) 99%, transparent) 0 0 / 44px 44px, radial-gradient(circle at 31px 31px, rgba(239, 196, 120, 0.4) 2.2px, transparent 2.8px) 0 0 / 44px 44px",
  },
  {
    id: "stars",
    name: "Stars",
    css: "radial-gradient(circle at 12px 18px, rgba(255, 240, 200, 0.9) 0.9px, transparent 1.5px) 0 0 / 97px 83px, radial-gradient(circle at 60px 50px, rgba(255, 255, 255, 0.7) 0.7px, transparent 1.3px) 0 0 / 97px 83px, radial-gradient(circle at 34px 70px, rgba(255, 230, 170, 0.55) 1.2px, transparent 2px) 0 0 / 131px 109px",
  },
];

export const FLOORS: Swatch[] = [
  { id: "lightoak", name: "Light oak", color: "#e2d1b2" },
  { id: "honey", name: "Honey", color: "#c99f72" },
  { id: "ash", name: "Grey ash", color: "#b9b0a5" },
  { id: "walnut", name: "Walnut", color: "#6b4a33" },
  { id: "ebony", name: "Dark", color: "#3d291d" },
];

export const RUGS: (Swatch & { accent: string })[] = [
  { id: "none", name: "No rug", color: "transparent", accent: "transparent" },
  { id: "cream", name: "Cream", color: "#e6dfd3", accent: "#d4cabc" },
  { id: "rose", name: "Rose", color: "#ecc9c5", accent: "#f8ebe8" },
  { id: "sage", name: "Sage", color: "#c8d6b5", accent: "#efe5cf" },
  { id: "teal", name: "Teal", color: "#4d6e68", accent: "#e6c46c" },
  { id: "navy", name: "Navy", color: "#3b467e", accent: "#d9b964" },
  { id: "burgundy", name: "Burgundy", color: "#6a2b2d", accent: "#a1703e" },
];

export const CURTAINS: Swatch[] = [
  { id: "none", name: "No curtains", color: "transparent" },
  { id: "linen", name: "Linen", color: "#f3f1ec" },
  { id: "blush", name: "Blush", color: "#f4d8d4" },
  { id: "sage", name: "Sage", color: "#c9d6bd" },
  { id: "rust", name: "Rust", color: "#d4713c" },
  { id: "navy", name: "Navy", color: "#2c3566" },
  { id: "emerald", name: "Emerald", color: "#1f3a30" },
  { id: "wine", name: "Wine", color: "#6a2b2d" },
];

/** Shelf wood or paint. Dark finishes get light text inside the compartments. */
export const FINISHES: (Swatch & { grain: boolean; dark?: boolean })[] = [
  { id: "oak", name: "Oak", color: "#c8a27a", grain: true },
  { id: "teak", name: "Teak", color: "#985631", grain: true },
  { id: "walnut", name: "Walnut", color: "#4c2f1f", grain: true, dark: true },
  { id: "black", name: "Black", color: "#262321", grain: true, dark: true },
  { id: "white", name: "White", color: "#f8f7f4", grain: false },
  { id: "blush", name: "Blush", color: "#ebc4c1", grain: false },
  { id: "sage", name: "Sage", color: "#a9b998", grain: false },
  { id: "navy", name: "Navy", color: "#222b52", grain: true, dark: true },
];

export const STRUCTURES: { id: Structure; name: string; blurb: string }[] = [
  { id: "case", name: "Bookcase", blurb: "A standing case with compartments" },
  { id: "floating", name: "Floating", blurb: "Boards on wall brackets" },
  { id: "hanging", name: "Rope-hung", blurb: "Boards hung on ropes" },
  { id: "pipe", name: "Iron pipe", blurb: "Reclaimed boards on black pipes" },
];

const find = <T extends { id: string }>(list: T[], id?: string) => (id ? list.find((x) => x.id === id) : undefined);

const LIGHT_INK = { "--ink": "47 42 40", "--ink-soft": "86 79 74", "--paper": "255 253 249", "--line": "226 218 207", "--wall": "245 241 234", colorScheme: "light" };
const DARK_INK = { "--ink": "238 233 218", "--ink-soft": "192 188 177", "--paper": "40 44 50", "--line": "78 82 90", "--wall": "34 36 40", colorScheme: "dark" };

export const structureOf = (aesthetic: Aesthetic, room?: RoomSettings | null): Structure => room?.structure ?? aesthetic.structure;
export const perCaseOf = (room?: RoomSettings | null) => room?.perCase ?? 3;
export const hasRoomChanges = (room?: RoomSettings | null) => Boolean(room && Object.values(room).some((v) => v !== undefined));

/** The room's choices as CSS variables, to put on the element that carries data-style. */
export function roomStyle(room?: RoomSettings | null): CSSProperties {
  if (!room) return {};
  const vars: Record<string, string> = {};
  const wall = find(WALLS, room.wall);
  if (wall) {
    vars["--room-wall"] = wall.color;
    Object.assign(vars, wall.dark ? DARK_INK : LIGHT_INK);
  }
  const pattern = find(PATTERNS, room.pattern);
  if (pattern) vars["--room-pattern"] = pattern.css;
  const floor = find(FLOORS, room.floor);
  if (floor) vars["--floor"] = floor.color;
  const rug = find(RUGS, room.rug);
  if (rug && rug.id !== "none") {
    vars["--rug"] = rug.color;
    vars["--rug-2"] = rug.accent;
  }
  const curtains = find(CURTAINS, room.curtains);
  if (curtains && curtains.id !== "none") vars["--curtain"] = curtains.color;
  const finish = find(FINISHES, room.finish);
  if (finish) {
    vars["--frame-base"] = finish.color;
    vars["--board-base"] = finish.color;
    vars["--frame-light"] = `color-mix(in srgb, ${finish.color} 72%, white)`;
    vars["--frame-dark"] = `color-mix(in srgb, ${finish.color} 76%, black)`;
    vars["--frame-tex-v"] = finish.grain ? (finish.dark ? "var(--tex-grain-v-light), var(--tex-grain-v)" : "var(--tex-grain-v)") : "var(--tex-paint)";
    vars["--frame-tex-h"] = finish.grain ? (finish.dark ? "var(--tex-grain-h-light), var(--tex-grain-h)" : "var(--tex-grain-h)") : "var(--tex-paint)";
    vars["--board-tex"] = vars["--frame-tex-h"];
    vars["--back"] = finish.dark ? `color-mix(in srgb, ${finish.color} 88%, black)` : `color-mix(in srgb, ${finish.color} 25%, #fbf8f3)`;
    vars["--cell-ink"] = finish.dark ? "#f1ede6" : "#2f2a28";
    vars["--grain"] = finish.grain ? (finish.dark ? "rgba(255, 255, 255, 0.03)" : "rgba(90, 60, 30, 0.12)") : "transparent";
  }
  return vars as CSSProperties;
}

/** data- attributes that switch parts of the room on or off. */
export function roomAttrs(room?: RoomSettings | null): Record<string, string> {
  const a: Record<string, string> = {};
  if (room?.rug) a["data-rug"] = room.rug === "none" ? "none" : "on";
  if (room?.curtains) a["data-curtains"] = room.curtains === "none" ? "none" : "on";
  return a;
}
