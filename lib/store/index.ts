import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const GUEST_KEY = "exlibris:guest";

/** Guests keep their shelf in this browser instead of an account. */
export function isGuest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuest(on: boolean) {
  try {
    if (on) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage blocked: guest mode simply won't stick */
  }
}

/** Accounts when Supabase is configured and the visitor isn't a guest; otherwise this browser. */
function current(): Store {
  return hasSupabase && !isGuest() ? supabaseStore : localStore;
}

/** The active store, chosen at call time so switching to/from guest mode needs no reload. */
export const store: Store = new Proxy({} as Store, {
  get(_target, prop) {
    const s = current();
    const value = s[prop as keyof Store];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(s) : value;
  },
});

export type { Store, LibraryData, PositionUpdate } from "./types";
