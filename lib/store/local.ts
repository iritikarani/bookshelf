import type { AuthUser, Book, Profile, PublicShelf, Shelf } from "../types";
import type { LibraryData, Store } from "./types";

const KEY = "exlibris:local:v1";
const LOCAL_USER: AuthUser = { id: "local-user", email: null };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function fresh(): LibraryData {
  const user_id = LOCAL_USER.id;
  return {
    profile: { id: user_id, display_name: "Reader", wood_theme: "sage", is_public: false, public_slug: uid().slice(0, 12) },
    shelves: [
      { id: uid(), user_id, name: "Favourites", position: 0, is_want_to_read: false },
      { id: uid(), user_id, name: "Read", position: 1, is_want_to_read: false },
      { id: uid(), user_id, name: "Want to read", position: 2, is_want_to_read: true },
    ],
    books: [],
  };
}

function read(): LibraryData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as LibraryData;
  } catch {
    /* fall through to a fresh library */
  }
  const data = fresh();
  write(data);
  return data;
}

function write(data: LibraryData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    throw new Error("Couldn't save in this browser (storage may be full or blocked).", { cause: e });
  }
}

function mutate<T>(fn: (d: LibraryData) => T): T {
  const d = read();
  const out = fn(d);
  write(d);
  return out;
}

/** Browser-only store used when Supabase isn't configured. Same API, data in localStorage. */
export const localStore: Store = {
  mode: "local",
  async getUser() {
    return LOCAL_USER;
  },
  onAuthChange() {
    return () => {};
  },
  async signInWithEmail() {},
  async signUpWithEmail() {
    return { needsConfirmation: false };
  },
  async signInWithGoogle() {},
  async signOut() {},

  async load() {
    return read();
  },
  async insertBook(userId, draft, position) {
    const now = new Date().toISOString();
    const book: Book = { ...draft, id: uid(), user_id: userId, position, created_at: now, updated_at: now };
    mutate((d) => d.books.push(book));
    return book;
  },
  async updateBook(id, patch) {
    return mutate((d) => {
      const b = d.books.find((x) => x.id === id);
      if (!b) throw new Error("Book not found");
      Object.assign(b, patch, { updated_at: new Date().toISOString() });
      return { ...b };
    });
  },
  async updatePositions(updates) {
    mutate((d) => {
      for (const u of updates) {
        const b = d.books.find((x) => x.id === u.id);
        if (b) Object.assign(b, { shelf_id: u.shelf_id, position: u.position });
      }
    });
  },
  async deleteBook(id) {
    mutate((d) => {
      d.books = d.books.filter((b) => b.id !== id);
    });
  },
  async insertShelf(userId, shelf) {
    const s: Shelf = { ...shelf, id: uid(), user_id: userId };
    mutate((d) => d.shelves.push(s));
    return s;
  },
  async updateShelves(updates) {
    mutate((d) => {
      for (const u of updates) {
        const s = d.shelves.find((x) => x.id === u.id);
        if (s) Object.assign(s, u);
      }
    });
  },
  async deleteShelf(id) {
    mutate((d) => {
      if (d.books.some((b) => b.shelf_id === id)) throw new Error("Only empty shelves can be deleted.");
      d.shelves = d.shelves.filter((s) => s.id !== id);
    });
  },
  async updateProfile(_userId, patch) {
    return mutate((d) => {
      Object.assign(d.profile, patch);
      return { ...d.profile } as Profile;
    });
  },
  async uploadCover(_userId, _blob, dataUrl) {
    return dataUrl;
  },
  async getPublicShelf(slug): Promise<PublicShelf | null> {
    const d = read();
    if (d.profile.public_slug !== slug || !d.profile.is_public) return null;
    return { profile: { display_name: d.profile.display_name, wood_theme: d.profile.wood_theme }, shelves: d.shelves, books: d.books };
  },
};
