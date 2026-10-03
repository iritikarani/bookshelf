import type { AuthUser, Book, BookDraft, Decor, DecorKind, Profile, PublicShelf, Shelf } from "../types";

export interface LibraryData {
  profile: Profile;
  shelves: Shelf[];
  books: Book[];
  decor: Decor[];
}

export interface PositionUpdate {
  kind: "book" | "decor";
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
  insertDecor(userId: string, decor: { shelf_id: string; kind: DecorKind; position: number }): Promise<Decor>;
  deleteDecor(id: string): Promise<void>;
  insertShelf(userId: string, shelf: Pick<Shelf, "name" | "position">): Promise<Shelf>;
  updateShelves(updates: (Pick<Shelf, "id"> & Partial<Pick<Shelf, "name" | "position">>)[]): Promise<void>;
  deleteShelf(id: string): Promise<void>;
  updateProfile(userId: string, patch: Partial<Pick<Profile, "shelf_style" | "is_public">>): Promise<Profile>;
  uploadCover(userId: string, blob: Blob, dataUrl: string): Promise<string>;
  getPublicShelf(slug: string): Promise<PublicShelf | null>;
}
