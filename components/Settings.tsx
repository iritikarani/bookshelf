"use client";

import { useState } from "react";
import { useColorMode, type ColorMode } from "@/lib/colorMode";
import { useLibrary } from "@/lib/library";
import { store } from "@/lib/store";
import { LinkIcon } from "./Icons";
import { Sheet } from "./Sheet";

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, setPublic } = useLibrary();
  const { mode, setMode } = useColorMode();
  const [copied, setCopied] = useState(false);
  const publicUrl = profile && typeof window !== "undefined" ? `${window.location.origin}/s/${profile.public_slug}` : "";

  return (
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
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block font-medium">Public read-only link</span>
              <span className="block text-sm text-ink-soft">Your shelf is private unless this is on. Anyone with the link can view, but not change, your books and notes.</span>
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
        </fieldset>

        <fieldset>
          <legend className="label">Account</legend>
          {store.mode === "local" ? (
            <p className="text-sm text-ink-soft">
              You're in <strong>demo mode</strong>: everything is saved in this browser. Add Supabase keys to enable accounts, Google sign-in and syncing.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm">
                Signed in as <span className="font-medium">{user?.email}</span>
              </p>
              <button type="button" className="btn-ghost" onClick={() => store.signOut()}>
                Sign out
              </button>
            </div>
          )}
        </fieldset>
      </div>
    </Sheet>
  );
}
