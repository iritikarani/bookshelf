import type { ShelfStyle } from "./types";

export const DEFAULT_STYLE: ShelfStyle = "pastel";

/**
 * How the shelves are built:
 * - case: a boxed bookcase standing on the floor
 * - floating: wall-mounted boards on brackets
 * - hanging: boards hung on ropes
 * - pipe: reclaimed boards on black iron pipes
 */
export type Structure = "case" | "floating" | "hanging" | "pipe";

export interface Aesthetic {
  id: ShelfStyle;
  name: string;
  blurb: string;
  structure: Structure;
}

/** Ten room aesthetics. Colours, wall patterns and floors live in globals.css under [data-style]. */
export const AESTHETICS: Aesthetic[] = [
  { id: "pastel", name: "Pastel dream", blurb: "Blush bookcase, cream walls", structure: "case" },
  { id: "modern", name: "Modern black", blurb: "Black case, panelled white room", structure: "case" },
  { id: "scandi", name: "Scandi", blurb: "White case, pale oak shelves", structure: "case" },
  { id: "japandi", name: "Japandi", blurb: "Floating ash shelves, limewash", structure: "floating" },
  { id: "academia", name: "Dark academia", blurb: "Walnut, forest green, brass", structure: "case" },
  { id: "cottage", name: "Cottagecore", blurb: "Sage paint, floral wallpaper", structure: "case" },
  { id: "midcentury", name: "Mid-century", blurb: "Teak shelves, mustard wall", structure: "floating" },
  { id: "coastal", name: "Coastal", blurb: "Whitewash and beadboard blue", structure: "case" },
  { id: "boho", name: "Boho", blurb: "Rope-hung shelves, terracotta", structure: "hanging" },
  { id: "industrial", name: "Industrial", blurb: "Iron pipes, reclaimed wood, brick", structure: "pipe" },
];

export const aestheticOf = (id: ShelfStyle | null | undefined): Aesthetic =>
  AESTHETICS.find((a) => a.id === id) ?? AESTHETICS[0];
