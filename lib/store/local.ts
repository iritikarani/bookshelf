import type { AuthUser, Book, Decor, GuestNote, Profile, PublicShelf, Room, Shelf } from "../types";
import type { LibraryData, Store } from "./types";

const KEY = "exlibris:local:v3";
const GUESTBOOK_KEY = "exlibris:local:guestbook";

function readNotes(): GuestNote[] {
  try {
    return JSON.parse(localStorage.getItem(GUESTBOOK_KEY) ?? "[]") as GuestNote[];
  } catch {
    return [];
  }
}
function writeNotes(notes: GuestNote[]) {
  try {
    localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(notes.slice(0, 300)));
  } catch {}
}
const LOCAL_USER: AuthUser = { id: "local-user", email: null };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function fresh(): LibraryData {
  const user_id = LOCAL_USER.id;
  return {
    profile: { id: user_id, display_name: "Reader", shelf_style: "pastel", is_public: false, public_slug: uid().slice(0, 12) },
    shelves: [
      { id: uid(), user_id, name: "Top shelf", position: 0 },
      { id: uid(), user_id, name: "Middle shelf", position: 1 },
      { id: uid(), user_id, name: "Bottom shelf", position: 2 },
    ],
    books: [],
    decor: [],
  };
}

function read(): LibraryData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as LibraryData;
      d.decor ??= [];
      return d;
    }
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
/** Does a public link ("@username" or the random slug) point at this profile? */
const ownsLink = (p: Profile, slug: string) =>
  p.is_public && (slug.startsWith("@") ? Boolean(p.username) && p.username === slug.slice(1).toLowerCase() : p.public_slug === slug);

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
  async insertBooks(userId, books) {
    const now = new Date().toISOString();
    const rows: Book[] = books.map((b) => ({ ...b, id: uid(), user_id: userId, created_at: now, updated_at: now }));
    mutate((d) => d.books.push(...rows));
    return rows;
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
        const row = u.kind === "book" ? d.books.find((x) => x.id === u.id) : d.decor.find((x) => x.id === u.id);
        if (row) Object.assign(row, { shelf_id: u.shelf_id, position: u.position });
      }
    });
  },
  async insertDecor(userId, decor) {
    const row: Decor = { ...decor, id: uid(), user_id: userId, created_at: new Date().toISOString() };
    mutate((d) => d.decor.push(row));
    return row;
  },
  async deleteDecor(id) {
    mutate((d) => {
      d.decor = d.decor.filter((x) => x.id !== id);
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
  async insertRoom(userId, room) {
    const r: Room = { ...room, room: null, id: uid(), user_id: userId, created_at: new Date().toISOString() };
    mutate((d) => (d.rooms = [...(d.rooms ?? []), r]));
    return r;
  },
  async updateRoom(id, patch) {
    mutate((d) => {
      const r = d.rooms?.find((x) => x.id === id);
      if (r) Object.assign(r, patch);
    });
  },
  async deleteRoom(id) {
    mutate((d) => {
      const gone = new Set(d.shelves.filter((s) => s.room_id === id).map((s) => s.id));
      d.rooms = (d.rooms ?? []).filter((r) => r.id !== id);
      d.shelves = d.shelves.filter((s) => !gone.has(s.id));
      d.books = d.books.filter((b) => !gone.has(b.shelf_id));
      d.decor = d.decor.filter((x) => !gone.has(x.shelf_id));
    });
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
      d.decor = d.decor.filter((x) => x.shelf_id !== id);
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
    if (!ownsLink(d.profile, slug)) return null;
    return {
      profile: {
        display_name: d.profile.display_name,
        username: d.profile.username ?? null,
        bio: d.profile.bio ?? null,
        avatar_url: d.profile.avatar_url ?? null,
        guestbook_enabled: d.profile.guestbook_enabled !== false,
        share_journal: d.profile.share_journal !== false,
        shelf_style: d.profile.shelf_style,
        room: d.profile.room ?? null,
      },
      rooms: d.rooms ?? [],
      shelves: d.shelves,
      // Kept private when the owner chose not to share what they wrote.
      books: d.profile.share_journal === false ? d.books.map((b) => ({ ...b, what_i_liked: null, favourite_line: null, quotes: [] })) : d.books,
      decor: d.decor,
    };
  },
  async signGuestbook(slug, note) {
    const d = read();
    if (!ownsLink(d.profile, slug) || d.profile.guestbook_enabled === false) return false;
    const message = note.message.trim().slice(0, 280);
    if (!message && !note.heart) return false;
    const entry: GuestNote = { id: uid(), owner_id: d.profile.id, name: note.name.trim().slice(0, 40) || "A friend", message, heart: note.heart, created_at: new Date().toISOString() };
    writeNotes([entry, ...readNotes()]);
    return true;
  },
  async listGuestbook() {
    return readNotes();
  },
  async deleteGuestNote(id) {
    writeNotes(readNotes().filter((n) => n.id !== id));
  },
  async listPublicShelves() {
    return [];
  },
};
