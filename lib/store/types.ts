import type { AuthUser, Book, BookDraft, Decor, DecorKind, GuestNote, Profile, PublicShelf, PublicShelfCard, Room, Shelf } from "../types";

/** What the reader can change about their profile. */
export type ProfilePatch = Partial<Pick<Profile, "shelf_style" | "is_public" | "room" | "display_name" | "username" | "bio" | "avatar_url" | "reading_goal" | "guestbook_enabled">>;

export interface LibraryData {
  profile: Profile;
  shelves: Shelf[];
  books: Book[];
  decor: Decor[];
  /** Extra rooms (empty before migration 0011). */
  rooms?: Room[];
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
  signUpWithEmail(email: string, password: string, username?: string): Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;

  load(user: AuthUser): Promise<LibraryData>;
  insertBook(userId: string, draft: BookDraft, position: number): Promise<Book>;
  updateBook(id: string, patch: Partial<BookDraft>): Promise<Book>;
  updatePositions(updates: PositionUpdate[]): Promise<void>;
  deleteBook(id: string): Promise<void>;
  insertDecor(userId: string, decor: { shelf_id: string; kind: DecorKind; position: number }): Promise<Decor>;
  deleteDecor(id: string): Promise<void>;
  insertShelf(userId: string, shelf: Pick<Shelf, "name" | "position" | "room_id">): Promise<Shelf>;
  insertRoom(userId: string, room: Pick<Room, "name" | "position" | "shelf_style">): Promise<Room>;
  updateRoom(id: string, patch: Partial<Pick<Room, "name" | "position" | "shelf_style" | "room">>): Promise<void>;
  deleteRoom(id: string): Promise<void>;
  updateShelves(updates: (Pick<Shelf, "id"> & Partial<Pick<Shelf, "name" | "position">>)[]): Promise<void>;
  deleteShelf(id: string): Promise<void>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<Profile>;
  uploadCover(userId: string, blob: Blob, dataUrl: string): Promise<string>;
  getPublicShelf(slug: string): Promise<PublicShelf | null>;
  /** Leave a note in a public shelf's guest book (no account needed). False if it wasn't accepted. */
  signGuestbook(slug: string, note: { name: string; message: string; heart: boolean }): Promise<boolean>;
  listGuestbook(userId: string): Promise<GuestNote[]>;
  deleteGuestNote(id: string): Promise<void>;
  /** Public shelves to discover (never private ones). Empty when unavailable. */
  listPublicShelves(max?: number): Promise<PublicShelfCard[]>;
}
