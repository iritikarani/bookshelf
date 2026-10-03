"use client";

import { useState, type FormEvent } from "react";
import { useLibrary } from "@/lib/library";
import { normalizeUsername } from "@/lib/username";
import { Sheet } from "./Sheet";
import { UsernameField, usernameOk, type UsernameStatus } from "./UsernameField";

/**
 * Choose (first visit after Google sign-in) or change (from Settings) the username.
 */
export function UsernameDialog({ open, onClose, firstTime }: { open: boolean; onClose: () => void; firstTime?: boolean }) {
  const { profile, setUsername } = useLibrary();
  const [value, setValue] = useState(profile?.username ?? "");
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!usernameOk(status)) return;
    setBusy(true);
    setError(null);
    try {
      await setUsername(normalizeUsername(value));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that username.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={firstTime ? "Choose your username" : "Change username"}>
      <form onSubmit={submit} className="space-y-4">
        {firstTime && <p className="text-sm text-ink-soft">One last thing: pick the name that goes on your bookplate and your shared shelf.</p>}
        <UsernameField id="dialog-username" value={value} onChange={setValue} onStatus={setStatus} current={profile?.username} autoFocus />
        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {firstTime ? "Not now" : "Cancel"}
          </button>
          <button type="submit" className="btn-primary px-6" disabled={busy || !usernameOk(status)}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
