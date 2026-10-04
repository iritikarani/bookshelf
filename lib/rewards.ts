import type { Book, DecorKind, ShelfStyle } from "./types";

/**
 * Small, optional rewards for reading: finish books and new things appear for your room.
 * Nothing is ever taken away, and everything else stays free.
 */
export interface Reward {
  /** Finished books needed. */
  at: number;
  type: "decor" | "room";
  id: DecorKind | ShelfStyle;
  name: string;
  emoji: string;
}

export const REWARDS: Reward[] = [
  { at: 1, type: "decor", id: "cactus", name: "Little cactus", emoji: "🌵" },
  { at: 5, type: "decor", id: "monstera", name: "Monstera", emoji: "🪴" },
  { at: 10, type: "decor", id: "brasslamp", name: "Brass reading lamp", emoji: "💡" },
  { at: 25, type: "room", id: "starlit", name: "Starlit library", emoji: "🌌" },
  { at: 50, type: "room", id: "gilded", name: "Gilded study", emoji: "✨" },
  { at: 100, type: "decor", id: "goldenbook", name: "The golden book", emoji: "📖" },
];

export const finishedCount = (books: Pick<Book, "status">[]) => books.filter((b) => b.status === "read").length;

export const rewardFor = (id: string) => REWARDS.find((r) => r.id === id);

/** True for anything that isn't a reward, or a reward already earned. */
export const isUnlocked = (id: string, finished: number) => (rewardFor(id)?.at ?? 0) <= finished;

export const nextReward = (finished: number) => REWARDS.find((r) => r.at > finished) ?? null;

/** Rewards earned since `before` finished books, now at `after`. */
export const newlyUnlocked = (before: number, after: number) => REWARDS.filter((r) => r.at > before && r.at <= after);
