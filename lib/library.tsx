"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { store, type LibraryData, type PositionUpdate } from "./store";
import type { AuthUser, Book, BookDraft, Profile, Shelf, WoodTheme } from "./types";

interface LibraryContextValue {
  user: AuthUser | null;
  authReady: boolean;
  loading: boolean;
  profile: Profile | null;
  shelves: Shelf[];
  books: Book[];
  booksByShelf: Map<string, Book[]>;
  justAddedId: string | null;
  error: string | null;
  clearError(): void;

  addBook(draft: BookDraft): Promise<Book>;
  updateBook(id: string, patch: Partial<BookDraft>): Promise<void>;
  removeBook(id: string): Promise<void>;
  moveBook(id: string, toShelfId: string, toIndex: number): Promise<void>;
  nudgeBook(id: string, dir: -1 | 1): Promise<void>;
  uploadCover(blob: Blob, dataUrl: string): Promise<string>;

  addShelf(name: string): Promise<void>;
  renameShelf(id: string, name: string): Promise<void>;
  moveShelf(id: string, dir: -1 | 1): Promise<void>;
  deleteShelf(id: string): Promise<void>;

  setWoodTheme(theme: WoodTheme): Promise<void>;
  setPublic(isPublic: boolean): Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function groupByShelf(shelves: Shelf[], books: Book[]): Map<string, Book[]> {
  const map = new Map<string, Book[]>(shelves.map((s) => [s.id, []]));
  for (const b of books) map.get(b.shelf_id)?.push(b);
  for (const list of map.values()) list.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  return map;
}

/** Renumber every shelf's books 0..n and return only the rows whose shelf/position changed. */
function diffPositions(before: Book[], after: Map<string, Book[]>): { books: Book[]; updates: PositionUpdate[] } {
  const prev = new Map(before.map((b) => [b.id, b]));
  const updates: PositionUpdate[] = [];
  const books: Book[] = [];
  for (const [shelfId, list] of after) {
    list.forEach((b, position) => {
      const old = prev.get(b.id);
      const next = { ...b, shelf_id: shelfId, position };
      if (!old || old.shelf_id !== shelfId || old.position !== position) updates.push({ id: b.id, shelf_id: shelfId, position });
      books.push(next);
    });
  }
  return { books, updates };
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

  /** Apply an optimistic change, persist it, and roll back by reloading if persisting fails. */
  const run = useCallback(
    async (optimistic: ((d: LibraryData) => LibraryData) | null, persist: () => Promise<void>) => {
      if (optimistic) setData((d) => (d ? optimistic(d) : d));
      try {
        await persist();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong saving that.");
        if (user) await reload(user);
        throw e;
      }
    },
    [user, reload],
  );

  const shelves = useMemo(() => [...(data?.shelves ?? [])].sort((a, b) => a.position - b.position), [data?.shelves]);
  const books = data?.books ?? [];
  const booksByShelf = useMemo(() => groupByShelf(shelves, data?.books ?? []), [shelves, data?.books]);

  const requireUser = () => {
    if (!user) throw new Error("Please sign in first.");
    return user;
  };

  const addBook = useCallback(
    async (draft: BookDraft) => {
      const u = requireUser();
      const position = (groupByShelf(dataRef.current?.shelves ?? [], dataRef.current?.books ?? []).get(draft.shelf_id) ?? []).length;
      try {
        const book = await store.insertBook(u.id, draft, position);
        setData((d) => (d ? { ...d, books: [...d.books, book] } : d));
        setJustAddedId(book.id);
        window.setTimeout(() => setJustAddedId((id) => (id === book.id ? null : id)), 1500);
        return book;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that book.");
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const moveBook = useCallback(
    async (id: string, toShelfId: string, toIndex: number) => {
      const d = dataRef.current;
      if (!d) return;
      const grouped = groupByShelf(d.shelves, d.books);
      const book = d.books.find((b) => b.id === id);
      if (!book || !grouped.has(toShelfId)) return;
      const from = grouped.get(book.shelf_id)!;
      const fromIndex = from.findIndex((b) => b.id === id);
      from.splice(fromIndex, 1);
      const target = grouped.get(toShelfId)!;
      const index = Math.max(0, Math.min(toIndex, target.length));
      target.splice(index, 0, book);
      const { books: nextBooks, updates } = diffPositions(d.books, grouped);
      if (updates.length === 0) return;
      await run((cur) => ({ ...cur, books: nextBooks }), () => store.updatePositions(updates)).catch(() => {});
    },
    [run],
  );

  const updateBook = useCallback(
    async (id: string, patch: Partial<BookDraft>) => {
      const d = dataRef.current;
      const current = d?.books.find((b) => b.id === id);
      if (!d || !current) return;
      const { shelf_id, ...rest } = patch;
      await run(
        (cur) => ({ ...cur, books: cur.books.map((b) => (b.id === id ? { ...b, ...rest } : b)) }),
        async () => {
          if (Object.keys(rest).length) await store.updateBook(id, rest);
        },
      );
      if (shelf_id && shelf_id !== current.shelf_id) {
        const count = (groupByShelf(d.shelves, d.books).get(shelf_id) ?? []).length;
        await moveBook(id, shelf_id, count);
      }
    },
    [run, moveBook],
  );

  const removeBook = useCallback(
    async (id: string) => {
      const d = dataRef.current;
      if (!d) return;
      const remaining = d.books.filter((b) => b.id !== id);
      const { books: nextBooks, updates } = diffPositions(remaining, groupByShelf(d.shelves, remaining));
      await run(
        (cur) => ({ ...cur, books: nextBooks }),
        async () => {
          await store.deleteBook(id);
          if (updates.length) await store.updatePositions(updates);
        },
      );
    },
    [run],
  );

  const nudgeBook = useCallback(
    async (id: string, dir: -1 | 1) => {
      const d = dataRef.current;
      const book = d?.books.find((b) => b.id === id);
      if (!d || !book) return;
      const list = groupByShelf(d.shelves, d.books).get(book.shelf_id) ?? [];
      const index = list.findIndex((b) => b.id === id);
      const next = index + dir;
      if (next < 0 || next >= list.length) return;
      await moveBook(id, book.shelf_id, next);
    },
    [moveBook],
  );

  const uploadCover = useCallback(
    async (blob: Blob, dataUrl: string) => store.uploadCover(requireUser().id, blob, dataUrl),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const addShelf = useCallback(
    async (name: string) => {
      const u = requireUser();
      const position = Math.max(-1, ...(dataRef.current?.shelves ?? []).map((s) => s.position)) + 1;
      try {
        const shelf = await store.insertShelf(u.id, { name, position, is_want_to_read: false });
        setData((d) => (d ? { ...d, shelves: [...d.shelves, shelf] } : d));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that shelf.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

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
        setError("Only empty shelves can be deleted. Move its books first.");
        return;
      }
      await run((cur) => ({ ...cur, shelves: cur.shelves.filter((s) => s.id !== id) }), () => store.deleteShelf(id)).catch(() => {});
    },
    [run],
  );

  const setWoodTheme = useCallback(
    async (wood_theme: WoodTheme) => {
      const u = requireUser();
      await run(
        (cur) => ({ ...cur, profile: { ...cur.profile, wood_theme } }),
        async () => {
          await store.updateProfile(u.id, { wood_theme });
        },
      ).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, user],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, user],
  );

  const value: LibraryContextValue = {
    user,
    authReady,
    loading: loading || (Boolean(user) && !data),
    profile: data?.profile ?? null,
    shelves,
    books,
    booksByShelf,
    justAddedId,
    error,
    clearError: () => setError(null),
    addBook,
    updateBook,
    removeBook,
    moveBook,
    nudgeBook,
    uploadCover,
    addShelf,
    renameShelf,
    moveShelf,
    deleteShelf,
    setWoodTheme,
    setPublic,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}
