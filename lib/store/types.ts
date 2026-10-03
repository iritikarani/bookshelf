import type { AuthUser, Book, BookDraft, Profile, PublicShelf, Shelf } from "../types";

export interface LibraryData {
  profile: Profile;
  shelves: Shelf[];
  books: Book[];
}

export interface PositionUpdate {
  id: string;
  shelf_id: string;
  position: number;
}

export interface Store {
  mode: "supabase" | "local";
  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;

  load(user: AuthUser): Promise<LibraryData>;
  insertBook(userId: string, draft: BookDraft, position: number): Promise<Book>;
  updateBook(id: string, patch: Partial<BookDraft>): Promise<Book>;
  updatePositions(updates: PositionUpdate[]): Promise<void>;
  deleteBook(id: string): Promise<void>;
  insertShelf(userId: string, shelf: Pick<Shelf, "name" | "position" | "is_want_to_read">): Promise<Shelf>;
  updateShelves(updates: (Pick<Shelf, "id"> & Partial<Pick<Shelf, "name" | "position">>)[]): Promise<void>;
  deleteShelf(id: string): Promise<void>;
  updateProfile(userId: string, patch: Partial<Pick<Profile, "wood_theme" | "is_public">>): Promise<Profile>;
  uploadCover(userId: string, blob: Blob, dataUrl: string): Promise<string>;
  getPublicShelf(slug: string): Promise<PublicShelf | null>;
}
