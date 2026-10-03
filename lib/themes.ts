import type { WoodTheme } from "./types";

export const DEFAULT_THEME: WoodTheme = "sage";

/** Bookcase finishes: five pastel paints plus the three classic woods. Colours live in globals.css. */
export const CASE_THEMES: { id: WoodTheme; name: string; note: string }[] = [
  { id: "sage", name: "Sage", note: "Pastel green" },
  { id: "blush", name: "Blush", note: "Pastel pink" },
  { id: "powder", name: "Powder", note: "Pastel blue" },
  { id: "butter", name: "Butter", note: "Pastel yellow" },
  { id: "lavender", name: "Lavender", note: "Pastel lilac" },
  { id: "birch", name: "Birch", note: "Light wood" },
  { id: "walnut", name: "Walnut", note: "Dark brown" },
  { id: "slate", name: "Painted slate", note: "Blue-grey" },
];
