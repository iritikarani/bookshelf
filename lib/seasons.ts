/**
 * Seasonal touches around the window, switched on by the date: festivals first (Diwali's toran
 * and diyas, Eid's crescent and lanterns, Sankranti kites…), then the seasons in between.
 */

export type Season =
  | "newyear"
  | "kites"
  | "valentine"
  | "holi"
  | "eid"
  | "rakhi"
  | "onam"
  | "ganesh"
  | "navratri"
  | "halloween"
  | "diwali"
  | "gurpurab"
  | "christmas"
  | "winter"
  | "spring"
  | "summer"
  | "monsoon"
  | "autumn";

export const SEASONS: Record<Season, { name: string; icon: string }> = {
  newyear: { name: "New Year", icon: "🎆" },
  kites: { name: "Lohri, Sankranti & Pongal", icon: "🪁" },
  valentine: { name: "Valentine's Day", icon: "💌" },
  holi: { name: "Holi", icon: "🎨" },
  eid: { name: "Eid", icon: "🌙" },
  rakhi: { name: "Raksha Bandhan", icon: "🎀" },
  onam: { name: "Onam", icon: "🌼" },
  ganesh: { name: "Ganesh Chaturthi", icon: "🌺" },
  navratri: { name: "Navratri & Durga Puja", icon: "💃" },
  halloween: { name: "Halloween", icon: "🎃" },
  diwali: { name: "Diwali", icon: "🪔" },
  gurpurab: { name: "Gurpurab", icon: "✨" },
  christmas: { name: "Christmas", icon: "🎄" },
  winter: { name: "Winter frost", icon: "❄️" },
  spring: { name: "Spring blossom", icon: "🌸" },
  summer: { name: "Summer mangoes", icon: "🥭" },
  monsoon: { name: "Monsoon rain", icon: "🌧️" },
  autumn: { name: "Autumn leaves", icon: "🍂" },
};

interface Festival {
  season: Season;
  /** Main day each year (moon-based festivals), or a fixed month and day. */
  dates?: string[];
  fixed?: [month: number, day: number];
  /** Days shown before and after the main day. */
  before: number;
  after: number;
}

// In order of priority, for the rare years two overlap. Moon-based dates are for India, to 2030.
const FESTIVALS: Festival[] = [
  { season: "diwali", dates: ["2025-10-20", "2026-11-08", "2027-10-29", "2028-10-17", "2029-11-05", "2030-10-26"], before: 4, after: 2 },
  { season: "holi", dates: ["2026-03-04", "2027-03-22", "2028-03-11", "2029-03-01", "2030-03-20"], before: 1, after: 1 },
  // Eid al-Fitr and Eid al-Adha (Bakrid)
  {
    season: "eid",
    dates: ["2026-03-20", "2026-05-27", "2027-03-09", "2027-05-16", "2028-02-26", "2028-05-05", "2029-02-14", "2029-04-24", "2030-02-04", "2030-04-13"],
    before: 1,
    after: 2,
  },
  { season: "navratri", dates: ["2026-10-11", "2027-09-30", "2028-09-19", "2029-10-08", "2030-09-28"], before: 0, after: 9 },
  { season: "onam", dates: ["2026-08-26", "2027-09-12", "2028-09-01", "2029-08-22", "2030-09-09"], before: 3, after: 1 },
  { season: "ganesh", dates: ["2026-09-14", "2027-09-04", "2028-08-23", "2029-09-11", "2030-08-31"], before: 1, after: 9 },
  { season: "rakhi", dates: ["2026-08-28", "2027-08-17", "2028-08-05", "2029-08-24", "2030-08-13"], before: 1, after: 1 },
  { season: "gurpurab", dates: ["2026-11-24", "2027-11-14", "2028-11-02", "2029-11-21", "2030-11-10"], before: 1, after: 1 },
  { season: "christmas", fixed: [12, 24], before: 4, after: 2 },
  { season: "newyear", fixed: [12, 31], before: 0, after: 1 },
  { season: "kites", fixed: [1, 14], before: 2, after: 2 },
  { season: "valentine", fixed: [2, 14], before: 1, after: 0 },
  { season: "halloween", fixed: [10, 31], before: 2, after: 0 },
];

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Each main day of a festival around a date (fixed ones in last, this and next year). */
const mainDays = (f: Festival, date: Date) =>
  f.dates ? f.dates.map(parse) : [-1, 0, 1].map((dy) => Date.UTC(date.getFullYear() + dy, f.fixed![0] - 1, f.fixed![1]));

/** The seasonal touch for a date, or null for none. */
export function seasonAt(date: Date): Season | null {
  const today = dayOf(date);
  for (const f of FESTIVALS) {
    if (mainDays(f, date).some((t) => today >= t - f.before * DAY && today <= t + f.after * DAY)) return f.season;
  }
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 || m === 1 || (m === 2 && d <= 15)) return "winter";
  if (m === 3 || m === 4) return "spring";
  if (m === 5 || (m === 6 && d < 15)) return "summer";
  if (m === 7 || m === 8 || (m === 6 && d >= 15) || (m === 9 && d <= 15)) return "monsoon";
  if (m === 10 || (m === 11 && d <= 20)) return "autumn";
  return null;
}

/** The next festival coming up within ~6 weeks, to mention in the editor. */
export function nextFestival(date: Date): { season: Season; date: Date } | null {
  const today = dayOf(date);
  const upcoming = FESTIVALS.flatMap((f) => mainDays(f, date).map((t) => ({ season: f.season, t: t - f.before * DAY })))
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
