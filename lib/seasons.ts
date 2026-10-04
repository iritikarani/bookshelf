/**
 * Seasonal touches around the window, switched on by the date: autumn leaves, Diwali's toran and
 * diyas, a Christmas wreath, winter frost, Holi colours and spring blossom.
 */

export type Season = "autumn" | "diwali" | "christmas" | "winter" | "holi" | "spring";

export const SEASONS: Record<Season, { name: string; icon: string }> = {
  autumn: { name: "Autumn leaves", icon: "🍂" },
  diwali: { name: "Diwali", icon: "🪔" },
  christmas: { name: "Christmas", icon: "🎄" },
  winter: { name: "Winter frost", icon: "❄️" },
  holi: { name: "Holi", icon: "🎨" },
  spring: { name: "Spring blossom", icon: "🌸" },
};

// Festivals that follow the lunar calendar (main day).
const DIWALI = ["2025-10-20", "2026-11-08", "2027-10-29", "2028-10-17", "2029-11-05", "2030-10-26"];
const HOLI = ["2026-03-04", "2027-03-22", "2028-03-11", "2029-03-01", "2030-03-20"];

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
/** Days from the festival's main day to `date`, for the nearest listed one. */
const offsetFrom = (list: string[], date: Date) =>
  list.map((iso) => Math.round((dayOf(date) - parse(iso)) / DAY)).reduce((best, x) => (Math.abs(x) < Math.abs(best) ? x : best), Infinity);

/** The seasonal touch for a date, or null for none (summer and the monsoon keep the room as it is). */
export function seasonAt(date: Date): Season | null {
  const diwali = offsetFrom(DIWALI, date);
  if (diwali >= -4 && diwali <= 2) return "diwali";
  const holi = offsetFrom(HOLI, date);
  if (holi >= -1 && holi <= 1) return "holi";
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 && d >= 20 && d <= 26) return "christmas";
  if (m === 12 || m === 1 || (m === 2 && d <= 15)) return "winter";
  if (m === 3 || m === 4) return "spring";
  if (m === 10 || (m === 11 && d <= 20)) return "autumn";
  return null;
}

/** The next festival coming up within ~6 weeks, to mention in the editor. */
export function nextFestival(date: Date): { season: Season; date: Date } | null {
  const today = dayOf(date);
  const upcoming = [
    ...DIWALI.map((iso) => ({ season: "diwali" as Season, t: parse(iso) - 4 * DAY })),
    ...HOLI.map((iso) => ({ season: "holi" as Season, t: parse(iso) - DAY })),
    ...[date.getFullYear(), date.getFullYear() + 1].map((y) => ({ season: "christmas" as Season, t: Date.UTC(y, 11, 20) })),
  ]
    .filter((x) => x.t > today && x.t - today < 45 * DAY)
    .sort((a, b) => a.t - b.t)[0];
  if (!upcoming) return null;
  const t = new Date(upcoming.t);
  return { season: upcoming.season, date: new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) };
}

/** The season showing right now. `?season=diwali` in the address previews one. */
export function currentSeason(now: Date = new Date()): Season | null {
  if (typeof window !== "undefined") {
    const preview = new URLSearchParams(window.location.search).get("season");
    if (preview && preview in SEASONS) return preview as Season;
    if (preview === "none") return null;
  }
  return seasonAt(now);
}
