import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AuthUser, Book, Decor, GuestNote, Profile, PublicShelf, PublicShelfCard, Room, Shelf } from "../types";
import type { Store } from "./types";
import { siteUrl } from "../basePath";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}

const toUser = (u: User | null | undefined): AuthUser | null => (u ? { id: u.id, email: u.email ?? null } : null);

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/**
 * Leave current_page out unless it has a value, so saving books keeps working on databases that
 * haven't run migration 0005 yet (only recording a page needs the new column).
 */
function withoutEmptyPage<T extends { current_page?: number | null }>(row: T): T {
  if (row.current_page != null || !("current_page" in row)) return row;
  const rest = { ...row };
  delete rest.current_page;
  return rest;
}

const DEFAULT_SHELVES = [
  { name: "Top shelf", position: 0 },
  { name: "Middle shelf", position: 1 },
  { name: "Bottom shelf", position: 2 },
];

export const supabaseStore: Store = {
  mode: "supabase",
  async getUser() {
    const { data } = await getSupabase().auth.getSession();
    return toUser(data.session?.user);
  },
  onAuthChange(cb) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },
  async signInWithEmail(email, password) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  async signUpWithEmail(email, password, username) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: siteUrl("/"), data: username ? { username } : undefined },
    });
    // The profile insert fails if someone took the username a moment earlier.
    if (error) throw new Error(/database error saving new user/i.test(error.message) ? "That username was just taken. Try another." : error.message);
    return { needsConfirmation: !data.session };
  },
  async signInWithGoogle() {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: siteUrl("/") },
    });
    if (error) throw new Error(error.message);
  },
  async signOut() {
    await getSupabase().auth.signOut();
  },

  async load(user) {
    const sb = getSupabase();
    // All four at once: one round trip of waiting instead of four.
    const [p, s, b, d, r] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      sb.from("shelves").select("*").order("position"),
      sb.from("books").select("*").order("position"),
      sb.from("decor").select("*").order("position"),
      sb.from("rooms").select("*").order("position"),
    ]);
    // Before migration 0011 there's no rooms table: everything is in the first room.
    const rooms = r.error ? [] : ((r.data ?? []) as Room[]);
    let profile = check(p) as Profile | null;
    let shelves = check(s) as Shelf[];
    const books = check(b) as Book[];
    const decor = check(d) as Decor[];
    // The signup trigger normally creates these; this covers accounts made before the trigger existed.
    if (!profile) {
      profile = check(await sb.from("profiles").insert({ id: user.id }).select().single()) as Profile;
    }
    if (shelves.length === 0) {
      shelves = check(
        await sb.from("shelves").insert(DEFAULT_SHELVES.map((s) => ({ ...s, user_id: user.id }))).select(),
      ) as Shelf[];
    }
    return { profile, shelves, books, decor, rooms };
  },
  async insertBook(userId, draft, position) {
    return check(await getSupabase().from("books").insert({ ...withoutEmptyPage(draft), user_id: userId, position }).select().single()) as Book;
  },
  async insertBooks(userId, books) {
    const sb = getSupabase();
    // Every row carries the same columns: tags only when some book has them (so a database
    // without the tags column still takes imports without any).
    const anyTags = books.some((b) => b.tags?.length);
    const out: Book[] = [];
    // Chunks keep each request small for big libraries.
    for (let i = 0; i < books.length; i += 100) {
      const chunk = books.slice(i, i + 100).map(({ tags, current_page, ...b }) => ({
        ...b,
        ...(current_page != null ? { current_page } : {}),
        ...(anyTags ? { tags: tags ?? [] } : {}),
        user_id: userId,
      }));
      out.push(...(check(await sb.from("books").insert(chunk).select()) as Book[]));
    }
    return out;
  },
  async updateBook(id, patch) {
    // A progress update ({current_page, pages}) may clear the page; full edits drop an empty one.
    const isProgress = Object.keys(patch).every((k) => k === "current_page" || k === "pages");
    return check(await getSupabase().from("books").update(isProgress ? patch : withoutEmptyPage(patch)).eq("id", id).select().single()) as Book;
  },
  async updatePositions(updates) {
    const sb = getSupabase();
    const results = await Promise.all(
      updates.map((u) =>
        sb.from(u.kind === "book" ? "books" : "decor").update({ shelf_id: u.shelf_id, position: u.position }).eq("id", u.id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  },
  async deleteBook(id) {
    check(await getSupabase().from("books").delete().eq("id", id));
  },
  async insertDecor(userId, decor) {
    return check(await getSupabase().from("decor").insert({ ...decor, user_id: userId }).select().single()) as Decor;
  },
  async deleteDecor(id) {
    check(await getSupabase().from("decor").delete().eq("id", id));
  },
  async insertShelf(userId, { room_id, ...shelf }) {
    // Shelves in the first room leave room_id out, so this works before migration 0011 too.
    return check(await getSupabase().from("shelves").insert({ ...shelf, ...(room_id ? { room_id } : {}), user_id: userId }).select().single()) as Shelf;
  },
  async insertRoom(userId, room) {
    const { data, error } = await getSupabase().from("rooms").insert({ ...room, user_id: userId }).select().single();
    if (error) throw new Error(/rooms|relation|schema cache/i.test(error.message) ? "Rooms need one Supabase step first (migration 0011)." : error.message);
    return data as Room;
  },
  async updateRoom(id, patch) {
    check(await getSupabase().from("rooms").update(patch).eq("id", id));
  },
  async deleteRoom(id) {
    check(await getSupabase().from("rooms").delete().eq("id", id));
  },
  async updateShelves(updates) {
    const sb = getSupabase();
    const results = await Promise.all(
      updates.map(({ id, ...patch }) => sb.from("shelves").update(patch).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  },
  async deleteShelf(id) {
    check(await getSupabase().from("shelves").delete().eq("id", id));
  },
  async updateProfile(userId, patch) {
    return check(await getSupabase().from("profiles").update(patch).eq("id", userId).select().single()) as Profile;
  },
  async uploadCover(userId, blob) {
    const sb = getSupabase();
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from("covers").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    return sb.storage.from("covers").getPublicUrl(path).data.publicUrl;
  },
  async getPublicShelf(slug) {
    const { data, error } = await getSupabase().rpc("get_public_shelf", { slug });
    if (error) throw new Error(error.message);
    return (data as PublicShelf | null) ?? null;
  },
  async signGuestbook(slug, note) {
    const { data, error } = await getSupabase().rpc("sign_guestbook", { slug, guest_name: note.name, note: note.message, with_heart: note.heart });
    if (error) throw new Error(error.message);
    return Boolean(data);
  },
  async listGuestbook(userId) {
    return check(await getSupabase().from("guestbook").select("*").eq("owner_id", userId).order("created_at", { ascending: false }).limit(300)) as GuestNote[];
  },
  async deleteGuestNote(id) {
    check(await getSupabase().from("guestbook").delete().eq("id", id));
  },
  async listPublicShelves(max = 12) {
    const { data, error } = await getSupabase().rpc("list_public_shelves", { max_count: max });
    if (error) return [];
    return (data ?? []) as PublicShelfCard[];
  },
};

/** Email a password-reset link that brings the reader back to the login page. */
export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: siteUrl("/login/?reset=1") });
  if (error) throw new Error(error.message);
}

/** Set a new password for the signed-in (recovering) user. */
export async function setNewPassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/** Whether a username is free (works before signing in). */
export async function isUsernameAvailable(name: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("username_available", { name });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Set or change the signed-in reader's username (also used as their display name). */
export async function saveUsername(userId: string, username: string) {
  const { error } = await getSupabase().from("profiles").update({ username, display_name: username }).eq("id", userId);
  if (error) throw new Error(error.code === "23505" ? "That username is taken. Try another." : error.message);
}
