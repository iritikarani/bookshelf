"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { store, type LibraryData, type PositionUpdate } from "./store";
import { saveUsername } from "./store/supabase";
import { DECOR } from "@/components/Decor";
import type { AuthUser, Book, BookDraft, Decor, DecorKind, Profile, Shelf, ShelfItem, ShelfStyle } from "./types";

interface LibraryContextValue {
  user: AuthUser | null;
  authReady: boolean;
  loading: boolean;
  profile: Profile | null;
  shelves: Shelf[];
  books: Book[];
  decor: Decor[];
  /** Books only, per shelf, in shelf order. */
  booksByShelf: Map<string, Book[]>;
  /** Books and decor together, per shelf, in shelf order. */
  itemsByShelf: Map<string, ShelfItem[]>;
  justAddedId: string | null;
  error: string | null;
  clearError(): void;

  addBook(draft: BookDraft): Promise<Book>;
  updateBook(id: string, patch: Partial<BookDraft>): Promise<void>;
  removeBook(id: string): Promise<void>;
  /** Move a book or decor item to `toIndex` among all items on `toShelfId`. */
  moveItem(id: string, toShelfId: string, toIndex: number): Promise<void>;
  /** Swap an item with its neighbour on the same shelf. */
  nudgeItem(id: string, dir: -1 | 1): Promise<void>;
  /** Move an item to the end of another shelf. */
  sendToShelf(id: string, shelfId: string): Promise<void>;
  uploadCover(blob: Blob, dataUrl: string): Promise<string>;

  addDecor(kind: DecorKind, shelfId: string): Promise<void>;
  removeDecor(id: string): Promise<void>;

  /** Resolves to the new shelf, or null if it couldn't be saved. */
  addShelf(name: string): Promise<Shelf | null>;
  renameShelf(id: string, name: string): Promise<void>;
  moveShelf(id: string, dir: -1 | 1): Promise<void>;
  deleteShelf(id: string): Promise<void>;

  setShelfStyle(style: ShelfStyle): Promise<void>;
  setPublic(isPublic: boolean): Promise<void>;
  /** Accounts only: choose or change the reader's username. Throws with a readable message. */
  setUsername(username: string): Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const byOrder = (a: { position: number; created_at: string }, b: { position: number; created_at: string }) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at);

export function groupByShelf(shelves: Shelf[], books: Book[]): Map<string, Book[]> {
  const map = new Map<string, Book[]>(shelves.map((s) => [s.id, []]));
  for (const b of books) map.get(b.shelf_id)?.push(b);
  for (const list of map.values()) list.sort(byOrder);
  return map;
}

const DECOR_KINDS = new Set<string>(DECOR.map((d) => d.kind));

export function groupItems(shelves: Shelf[], books: Book[], decor: Decor[]): Map<string, ShelfItem[]> {
  const map = new Map<string, ShelfItem[]>(shelves.map((s) => [s.id, []]));
  for (const b of books) map.get(b.shelf_id)?.push({ type: "book", id: b.id, shelf_id: b.shelf_id, position: b.position, created_at: b.created_at, book: b });
  // Skip objects that were retired (like the old bust).
  for (const d of decor) if (DECOR_KINDS.has(d.kind)) map.get(d.shelf_id)?.push({ type: "decor", id: d.id, shelf_id: d.shelf_id, position: d.position, created_at: d.created_at, decor: d });
  for (const list of map.values()) list.sort(byOrder);
  return map;
}

/** Renumber every shelf's items 0..n; return the new rows and only the rows whose shelf/position changed. */
function renumber(d: LibraryData, grouped: Map<string, ShelfItem[]>) {
  const updates: PositionUpdate[] = [];
  const books: Book[] = [];
  const decor: Decor[] = [];
  for (const [shelfId, list] of grouped) {
    list.forEach((item, position) => {
      const changed = item.shelf_id !== shelfId || item.position !== position;
      if (changed) updates.push({ kind: item.type, id: item.id, shelf_id: shelfId, position });
      if (item.type === "book") books.push({ ...item.book, shelf_id: shelfId, position });
      else decor.push({ ...item.decor, shelf_id: shelfId, position });
    });
  }
  // Keep rows that belong to shelves we don't know about (shouldn't happen, but never drop data).
  const known = new Set(grouped.keys());
  books.push(...d.books.filter((b) => !known.has(b.shelf_id)));
  decor.push(...d.decor.filter((x) => !known.has(x.shelf_id)));
  return { books, decor, updates };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LibraryData | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<LibraryData | null>(null);
  dataRef.current = data;
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    store.getUser().then((u) => {
      if (cancelled) return;
      setUser(u);
      setAuthReady(true);
    });
    const unsubscribe = store.onAuthChange((u) => {
      setUser((prev) => (prev?.id === u?.id ? prev : u));
      setAuthReady(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const reload = useCallback(async (u: AuthUser) => {
    setLoading(true);
    try {
      setData(await store.load(u));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your shelves.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) reload(user);
    else setData(null);
  }, [user, reload]);

  const fail = (e: unknown, fallback: string) => setError(e instanceof Error ? e.message : fallback);

  /** Apply an optimistic change, persist it, and reload from the server if persisting fails. */
  const run = useCallback(
    async (optimistic: ((d: LibraryData) => LibraryData) | null, persist: () => Promise<void>) => {
      if (optimistic) setData((d) => (d ? optimistic(d) : d));
      try {
        await persist();
      } catch (e) {
        fail(e, "Something went wrong saving that.");
        if (userRef.current) await reload(userRef.current);
        throw e;
      }
    },
    [reload],
  );

  const requireUser = () => {
    if (!userRef.current) throw new Error("Please sign in first.");
    return userRef.current;
  };

  const shelves = useMemo(() => [...(data?.shelves ?? [])].sort((a, b) => a.position - b.position), [data?.shelves]);
  const books = data?.books ?? [];
  const decor = data?.decor ?? [];
  const booksByShelf = useMemo(() => groupByShelf(shelves, data?.books ?? []), [shelves, data?.books]);
  const itemsByShelf = useMemo(() => groupItems(shelves, data?.books ?? [], data?.decor ?? []), [shelves, data?.books, data?.decor]);

  const itemsNow = () => {
    const d = dataRef.current!;
    return groupItems(d.shelves, d.books, d.decor);
  };

  const addBook = useCallback(async (draft: BookDraft) => {
    const u = requireUser();
    const position = (itemsNow().get(draft.shelf_id) ?? []).length;
    try {
      const book = await store.insertBook(u.id, draft, position);
      setData((d) => (d ? { ...d, books: [...d.books, book] } : d));
      setJustAddedId(book.id);
      window.setTimeout(() => setJustAddedId((id) => (id === book.id ? null : id)), 1500);
      return book;
    } catch (e) {
      fail(e, "Couldn't add that book.");
      throw e;
    }
  }, []);

  const moveItem = useCallback(
    async (id: string, toShelfId: string, toIndex: number) => {
      const d = dataRef.current;
      if (!d) return;
      const grouped = itemsNow();
      let item: ShelfItem | undefined;
      for (const list of grouped.values()) {
        const i = list.findIndex((x) => x.id === id);
        if (i >= 0) [item] = list.splice(i, 1);
      }
      const target = grouped.get(toShelfId);
      if (!item || !target) return;
      target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, item);
      const next = renumber(d, grouped);
      if (!next.updates.length) return;
      await run((cur) => ({ ...cur, books: next.books, decor: next.decor }), () => store.updatePositions(next.updates)).catch(() => {});
    },
    [run],
  );

  const sendToShelf = useCallback(
    async (id: string, shelfId: string) => {
      const count = (itemsNow().get(shelfId) ?? []).filter((x) => x.id !== id).length;
      await moveItem(id, shelfId, count);
    },
    [moveItem],
  );

  const nudgeItem = useCallback(
    async (id: string, dir: -1 | 1) => {
      for (const [shelfId, list] of itemsNow()) {
        const i = list.findIndex((x) => x.id === id);
        if (i < 0) continue;
        const j = i + dir;
        if (j >= 0 && j < list.length) await moveItem(id, shelfId, j);
        return;
      }
    },
    [moveItem],
  );

  const updateBook = useCallback(
    async (id: string, patch: Partial<BookDraft>) => {
      const current = dataRef.current?.books.find((b) => b.id === id);
      if (!current) return;
      const { shelf_id, ...rest } = patch;
      await run(
        (cur) => ({ ...cur, books: cur.books.map((b) => (b.id === id ? { ...b, ...rest } : b)) }),
        async () => {
          if (Object.keys(rest).length) await store.updateBook(id, rest);
        },
      );
      if (shelf_id && shelf_id !== current.shelf_id) await sendToShelf(id, shelf_id);
    },
    [run, sendToShelf],
  );

  const removeBook = useCallback(
    async (id: string) => {
      const d = dataRef.current;
      if (!d) return;
      const without = { ...d, books: d.books.filter((b) => b.id !== id) };
      const next = renumber(without, groupItems(without.shelves, without.books, without.decor));
      await run(
        (cur) => ({ ...cur, books: next.books, decor: next.decor }),
        async () => {
          await store.deleteBook(id);
          if (next.updates.length) await store.updatePositions(next.updates);
        },
      );
    },
    [run],
  );

  const uploadCover = useCallback(async (blob: Blob, dataUrl: string) => store.uploadCover(requireUser().id, blob, dataUrl), []);

  const addDecor = useCallback(async (kind: DecorKind, shelfId: string) => {
    const u = requireUser();
    const position = (itemsNow().get(shelfId) ?? []).length;
    try {
      const row = await store.insertDecor(u.id, { shelf_id: shelfId, kind, position });
      setData((d) => (d ? { ...d, decor: [...d.decor, row] } : d));
      setJustAddedId(row.id);
      window.setTimeout(() => setJustAddedId((x) => (x === row.id ? null : x)), 1500);
    } catch (e) {
      fail(e, "Couldn't place that.");
    }
  }, []);

  const removeDecor = useCallback(
    async (id: string) => {
      const d = dataRef.current;
      if (!d) return;
      const without = { ...d, decor: d.decor.filter((x) => x.id !== id) };
      const next = renumber(without, groupItems(without.shelves, without.books, without.decor));
      await run(
        (cur) => ({ ...cur, books: next.books, decor: next.decor }),
        async () => {
          await store.deleteDecor(id);
          if (next.updates.length) await store.updatePositions(next.updates);
        },
      ).catch(() => {});
    },
    [run],
  );

  const addShelf = useCallback(async (name: string) => {
    const u = requireUser();
    const position = Math.max(-1, ...(dataRef.current?.shelves ?? []).map((s) => s.position)) + 1;
    try {
      const shelf = await store.insertShelf(u.id, { name, position });
      setData((d) => (d ? { ...d, shelves: [...d.shelves, shelf] } : d));
      // Callers may add a book to it straight away, before React re-renders.
      if (dataRef.current) dataRef.current = { ...dataRef.current, shelves: [...dataRef.current.shelves, shelf] };
      return shelf;
    } catch (e) {
      fail(e, "Couldn't add that shelf.");
      return null;
    }
  }, []);

  const renameShelf = useCallback(
    async (id: string, name: string) => {
      await run(
        (cur) => ({ ...cur, shelves: cur.shelves.map((s) => (s.id === id ? { ...s, name } : s)) }),
        () => store.updateShelves([{ id, name }]),
      ).catch(() => {});
    },
    [run],
  );

  const moveShelf = useCallback(
    async (id: string, dir: -1 | 1) => {
      const d = dataRef.current;
      if (!d) return;
      const sorted = [...d.shelves].sort((a, b) => a.position - b.position);
      const i = sorted.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      const renumbered = sorted.map((s, position) => ({ ...s, position }));
      const changed = renumbered.filter((s) => d.shelves.find((o) => o.id === s.id)?.position !== s.position);
      await run(
        (cur) => ({ ...cur, shelves: renumbered }),
        () => store.updateShelves(changed.map(({ id, position }) => ({ id, position }))),
      ).catch(() => {});
    },
    [run],
  );

  const deleteShelf = useCallback(
    async (id: string) => {
      const d = dataRef.current;
      if (!d) return;
      if (d.books.some((b) => b.shelf_id === id)) {
        setError("Only shelves without books can be deleted. Move its books first.");
        return;
      }
      await run(
        (cur) => ({ ...cur, shelves: cur.shelves.filter((s) => s.id !== id), decor: cur.decor.filter((x) => x.shelf_id !== id) }),
        () => store.deleteShelf(id),
      ).catch(() => {});
    },
    [run],
  );

  const setShelfStyle = useCallback(
    async (shelf_style: ShelfStyle) => {
      const u = requireUser();
      await run(
        (cur) => ({ ...cur, profile: { ...cur.profile, shelf_style } }),
        async () => {
          await store.updateProfile(u.id, { shelf_style });
        },
      ).catch(() => {});
    },
    [run],
  );

  const setPublic = useCallback(
    async (is_public: boolean) => {
      const u = requireUser();
      await run(
        (cur) => ({ ...cur, profile: { ...cur.profile, is_public } }),
        async () => {
          await store.updateProfile(u.id, { is_public });
        },
      ).catch(() => {});
    },
    [run],
  );

  const setUsername = useCallback(async (username: string) => {
    const u = requireUser();
    await saveUsername(u.id, username);
    setData((d) => (d ? { ...d, profile: { ...d.profile, username, display_name: username } } : d));
  }, []);

  const value: LibraryContextValue = {
    user,
    authReady,
    loading: loading || (Boolean(user) && !data),
    profile: data?.profile ?? null,
    shelves,
    books,
    decor,
    booksByShelf,
    itemsByShelf,
    justAddedId,
    error,
    clearError: () => setError(null),
    addBook,
    updateBook,
    removeBook,
    moveItem,
    nudgeItem,
    sendToShelf,
    uploadCover,
    addDecor,
    removeDecor,
    addShelf,
    renameShelf,
    moveShelf,
    deleteShelf,
    setShelfStyle,
    setPublic,
    setUsername,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
