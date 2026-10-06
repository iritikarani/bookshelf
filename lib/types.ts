import type { RoomSettings } from "./room";

export type ShelfStyle =
  | "pastel"
  | "modern"
  | "scandi"
  | "japandi"
  | "academia"
  | "cottage"
  | "midcentury"
  | "coastal"
  | "boho"
  | "industrial"
  // reading rewards
  | "starlit"
  | "gilded";

/** Where a book is in your reading life. Shown as a ribbon mark on the shelf. */
/** "read" is Finished; "dnf" is Did not finish. */
export type ReadStatus = "read" | "reading" | "to_read" | "dnf";

/** How a book sits on the shelf: standing spine-out, leaning on its neighbour, lying flat in a pile, or cover facing out. */
export type BookDisplay = "spine" | "lean" | "stack" | "cover";

export type DecorKind =
  | "plant"
  | "succulent"
  | "pampas"
  | "candles"
  | "frame"
  | "globe"
  | "calendar"
  | "camera"
  | "stack"
  | "chai"
  | "glasses"
  | "hourglass"
  | "diya"
  | "typewriter"
  | "cat"
  | "quill"
  | "fairyjar"
  // reading rewards
  | "cactus"
  | "monstera"
  | "brasslamp"
  | "goldenbook";

export interface Decor {
  id: string;
  user_id: string;
  shelf_id: string;
  kind: DecorKind;
  position: number;
  created_at: string;
}

export interface Shelf {
  id: string;
  user_id: string;
  name: string;
  position: number;
  /** The room it stands in; empty for the first room (the profile's own). */
  room_id?: string | null;
}

/** An extra room, with its own shelves and look. The first room is the profile itself. */
export interface Room {
  id: string;
  user_id: string;
  name: string;
  position: number;
  shelf_style: ShelfStyle;
  room: RoomSettings | null;
  created_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  shelf_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  uploaded_cover: string | null;
  cover_color: string | null;
  display: BookDisplay;
  status: ReadStatus;
  favourite: boolean;
  year_published: number | null;
  pages: number | null;
  /** Reading now: the page the reader is on. */
  current_page?: number | null;
  genre: string | null;
  short_description: string | null;
  position: number;
  rating: number;
  what_i_liked: string | null;
  favourite_line: string | null;
  date_finished: string | null; // YYYY-MM-DD
  /** When you started reading it (YYYY-MM-DD). */
  date_started?: string | null;
  /** Your own tags, e.g. "comfort read", "book club". */
  tags?: string[];
  /** Lines saved from the book, each with an optional page and note. */
  quotes?: Quote[];
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  text: string;
  page?: number | null;
  note?: string | null;
  created_at: string;
}

export type BookDraft = Omit<Book, "id" | "user_id" | "position" | "created_at" | "updated_at">;

export interface Profile {
  id: string;
  display_name: string | null;
  /** Chosen at sign-up (or on first visit after Google sign-in). Null in browser-only mode. */
  username?: string | null;
  shelf_style: ShelfStyle;
  /** Room editor choices layered on the room style (wall, floor, shelves…). */
  room?: RoomSettings | null;
  is_public: boolean;
  public_slug: string;
  bio?: string | null;
  avatar_url?: string | null;
  /** Books to finish this year. */
  reading_goal?: number | null;
  /** Visitors may sign the guest book (on by default). */
  guestbook_enabled?: boolean;
}

/** A public shelf as listed on Discover. */
export interface PublicShelfCard {
  display_name: string | null;
  username: string | null;
  slug: string;
  avatar_url: string | null;
  shelf_style: ShelfStyle;
  book_count: number;
  books: Pick<Book, "title" | "author" | "cover_url" | "cover_color">[];
}

export interface PublicShelf {
  profile: {
    display_name: string | null;
    username?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    guestbook_enabled?: boolean;
    shelf_style: ShelfStyle;
    room?: RoomSettings | null;
  };
  rooms?: Room[];
  shelves: Shelf[];
  books: Book[];
  decor: Decor[];
}

/** A note (or just a heart) left in a public shelf's guest book. Only the owner sees these. */
export interface GuestNote {
  id: string;
  owner_id: string;
  name: string;
  message: string;
  heart: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Anything that takes up a spot on a shelf. Books and decor share one ordering per shelf. */
export type ShelfItem =
  | { type: "book"; id: string; shelf_id: string; position: number; created_at: string; book: Book }
  | { type: "decor"; id: string; shelf_id: string; position: number; created_at: string; decor: Decor };
