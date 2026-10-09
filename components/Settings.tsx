"use client";

import { useState } from "react";
import { useColorMode, type ColorMode } from "@/lib/colorMode";
import { useLibrary } from "@/lib/library";
import { useRouter } from "next/navigation";
import { publicUrlOf } from "@/lib/publicLink";
import { hasSupabase, setGuest, store } from "@/lib/store";
import { LinkIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { UsernameDialog } from "./UsernameDialog";

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, setPublic } = useLibrary();
  const { mode, setMode } = useColorMode();
  const [copied, setCopied] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const router = useRouter();
  const publicUrl = (profile && publicUrlOf({ ...profile, is_public: true })) ?? "";

  return (
    <>
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-7">
        <fieldset>
          <legend className="label">Appearance</legend>
          <p className="mb-2 text-sm text-ink-soft">The room and shelf style live under the brush icon in the header.</p>
          <div className="inline-flex rounded-full border border-line p-1" role="radiogroup" aria-label="Colour mode">
            {(["light", "dark", "system"] as ColorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize ${mode === m ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Sharing</legend>
          {hasSupabase && store.mode === "local" ? (
            // A guest shelf lives only in this browser, so a link to it can't open anywhere else.
            <div className="space-y-3 text-sm">
              <p>
                <span className="block font-medium">Public shelf</span>
                <span className="block text-ink-soft">
                  You’re using a guest shelf, which is saved only on this device, so a link to it won’t open on anyone else’s phone. Create an account (free) to share your shelf.
                </span>
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setGuest(false);
                  router.push("/login/?signup=1");
                }}
              >
                Create an account to share
              </button>
            </div>
          ) : (
            <>
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span>
                <span className="block font-medium">Public shelf</span>
                <span className="block text-sm text-ink-soft">Anyone with this link can view your shelf, but cannot make changes. When it’s off, your shelf is private: only you can see it.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={Boolean(profile?.is_public)}
                onChange={(e) => setPublic(e.target.checked)}
              />
              <span aria-hidden className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-ink/20 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
            </label>
            {profile?.is_public && (
              <div className="mt-3 flex items-center gap-2">
                <input readOnly className="field flex-1 font-mono text-xs" value={publicUrl} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(publicUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    } catch {}
                  }}
                >
                  <LinkIcon width={16} height={16} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            {profile?.is_public && store.mode === "local" && (
              <p className="mt-2 text-xs text-ink-soft">Demo mode: this link only works in this browser. Connect Supabase to share it for real.</p>
            )}
            </>
          )}
        </fieldset>

        <fieldset>
          <legend className="label">Account</legend>
          {store.mode === "supabase" ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="truncate">
                  {profile?.username ? <span className="font-medium">@{profile.username}</span> : <span className="text-ink-soft">No username yet</span>}
                  <button type="button" className="ml-2 text-xs text-accent underline-offset-2 hover:underline" onClick={() => { setUsernameOpen(true); onClose(); }}>
                    {profile?.username ? "Change" : "Choose one"}
                  </button>
                </p>
                <p className="truncate text-xs text-ink-soft">{user?.email}</p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  await store.signOut();
                  router.replace("/login/");
                }}
              >
                Sign out
              </button>
            </div>
          ) : hasSupabase ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                You’re a <strong>guest</strong>: this shelf is saved in this browser only. Create an account to keep your books safe and see them on any device.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setGuest(false);
                  router.push("/login/?signup=1");
                }}
              >
                Sign in or create an account
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              Your shelf is saved in this browser. Accounts, Google sign-in and syncing switch on once the site is connected to Supabase (see the README).
            </p>
          )}
        </fieldset>
      </div>
    </Sheet>
    {usernameOpen && <UsernameDialog open onClose={() => setUsernameOpen(false)} />}
    </>
  );
}
