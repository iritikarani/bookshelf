import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const store: Store = hasSupabase ? supabaseStore : localStore;
export type { Store, LibraryData, PositionUpdate } from "./types";
