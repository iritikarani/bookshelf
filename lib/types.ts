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
  | "industrial";

/** How a book stands on the shelf. */
export type BookDisplay = "spine" | "cover";

export type DecorKind =
  | "plant"
  | "succulent"
  | "pampas"
  | "candles"
  | "frame"
  | "globe"
  | "calendar"
  | "bust"
  | "camera"
  | "stack";

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
  is_want_to_read: boolean;
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
  year_published: number | null;
  pages: number | null;
  genre: string | null;
  short_description: string | null;
  position: number;
  rating: number;
  what_i_liked: string | null;
  favourite_line: string | null;
  date_finished: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type BookDraft = Omit<Book, "id" | "user_id" | "position" | "created_at" | "updated_at">;

export interface Profile {
  id: string;
  display_name: string | null;
  shelf_style: ShelfStyle;
  is_public: boolean;
  public_slug: string;
}

export interface PublicShelf {
  profile: { display_name: string | null; shelf_style: ShelfStyle };
  shelves: Shelf[];
  books: Book[];
  decor: Decor[];
}

export interface AuthUser {
  id: string;
  email: string | null;
}

/** Anything that takes up a spot on a shelf. Books and decor share one ordering per shelf. */
export type ShelfItem =
  | { type: "book"; id: string; shelf_id: string; position: number; created_at: string; book: Book }
  | { type: "decor"; id: string; shelf_id: string; position: number; created_at: string; decor: Decor };
