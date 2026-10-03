import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AuthUser, Book, Profile, PublicShelf, Shelf } from "../types";
import type { Store } from "./types";

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

const DEFAULT_SHELVES = [
  { name: "Favourites", position: 0, is_want_to_read: false },
  { name: "Read", position: 1, is_want_to_read: false },
  { name: "Want to read", position: 2, is_want_to_read: true },
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
  async signUpWithEmail(email, password) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  },
  async signInWithGoogle() {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
  },
  async signOut() {
    await getSupabase().auth.signOut();
  },

  async load(user) {
    const sb = getSupabase();
    let profile = check(await sb.from("profiles").select("*").eq("id", user.id).maybeSingle()) as Profile | null;
    let shelves = check(await sb.from("shelves").select("*").order("position")) as Shelf[];
    // The signup trigger normally creates these; this covers accounts made before the trigger existed.
    if (!profile) {
      profile = check(await sb.from("profiles").insert({ id: user.id }).select().single()) as Profile;
    }
    if (shelves.length === 0) {
      shelves = check(
        await sb.from("shelves").insert(DEFAULT_SHELVES.map((s) => ({ ...s, user_id: user.id }))).select(),
      ) as Shelf[];
    }
    const books = check(await sb.from("books").select("*").order("position")) as Book[];
    return { profile, shelves, books };
  },
  async insertBook(userId, draft, position) {
    return check(await getSupabase().from("books").insert({ ...draft, user_id: userId, position }).select().single()) as Book;
  },
  async updateBook(id, patch) {
    return check(await getSupabase().from("books").update(patch).eq("id", id).select().single()) as Book;
  },
  async updatePositions(updates) {
    const sb = getSupabase();
    const results = await Promise.all(
      updates.map((u) => sb.from("books").update({ shelf_id: u.shelf_id, position: u.position }).eq("id", u.id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
  },
  async deleteBook(id) {
    check(await getSupabase().from("books").delete().eq("id", id));
  },
  async insertShelf(userId, shelf) {
    return check(await getSupabase().from("shelves").insert({ ...shelf, user_id: userId }).select().single()) as Shelf;
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
};
