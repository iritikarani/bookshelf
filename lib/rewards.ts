import type { Book } from "./types";

/**
 * SelfShelf once unlocked a few rooms and objects as you finished books. It no longer keeps score:
 * every room style and object is open to everyone from the start (the Starlit library, the Gilded
 * study, the brass lamp and the rest are ordinary choices now). These helpers stay so the room
 * editor's code reads the same, and so nothing anyone already placed changes.
 */
export const finishedCount = (books: Pick<Book, "status">[]) => books.filter((b) => b.status === "read").length;

/** Everything is open. */
export const isUnlocked = (_id: string, _finished: number) => true;

/** Nothing is a reward any more. */
export const rewardFor = (_id: string): { at: number; emoji: string } | undefined => undefined;
