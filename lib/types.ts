export type WoodTheme = "sage" | "blush" | "powder" | "butter" | "lavender" | "birch" | "walnut" | "slate";

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
  wood_theme: WoodTheme;
  is_public: boolean;
  public_slug: string;
}

export interface PublicShelf {
  profile: { display_name: string | null; wood_theme: WoodTheme };
  shelves: Shelf[];
  books: Book[];
}

export interface AuthUser {
  id: string;
  email: string | null;
}
