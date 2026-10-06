"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { compressCover } from "@/lib/image";
import { useLibrary } from "@/lib/library";
import { publicUrlOf } from "@/lib/publicLink";
import { store } from "@/lib/store";
import { Avatar } from "./Avatar";
import { LinkIcon, UploadIcon } from "./Icons";
import { Sheet } from "./Sheet";

/** Edit profile: picture, name, @username, bio, reading goal, and who can see the shelf. */
export function EditProfile({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (msg: string) => void }) {
  const { profile, saveProfile, uploadCover } = useLibrary();
  const accounts = store.mode === "supabase";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [goal, setGoal] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [guestbook, setGuestbook] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !profile) return;
    setName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setGoal(profile.reading_goal ? String(profile.reading_goal) : "");
    setAvatar(profile.avatar_url ?? null);
    setIsPublic(Boolean(profile.is_public));
    setGuestbook(profile.guestbook_enabled !== false);
    setError(null);
    setBusy(false);
    // Only when the sheet opens: keep edits while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!profile) return null;
  const link = publicUrlOf({ ...profile, is_public: true });

  const pickPicture = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose a picture (JPG, PNG or WebP).");
    if (file.size > 15 * 1024 * 1024) return setError("That picture is too large. Please choose one under 15 MB.");
    setError(null);
    setUploading(true);
    try {
      const { blob, dataUrl } = await compressCover(file, 320, 0.85);
      setAvatar(await uploadCover(blob, dataUrl));
    } catch {
      setError("Couldn’t upload that picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || uploading) return;
    const n = goal.trim() ? parseInt(goal, 10) : null;
    if (n !== null && (!Number.isFinite(n) || n < 1 || n > 1000)) return setError("A reading goal is between 1 and 1000 books.");
    setBusy(true);
    const err = await saveProfile({
      display_name: name.trim().slice(0, 40) || null,
      ...(accounts ? { username: username.trim().toLowerCase() } : {}),
      bio: bio.trim().slice(0, 300) || null,
      reading_goal: n,
      avatar_url: avatar,
      ...(accounts ? { is_public: isPublic } : {}),
      guestbook_enabled: guestbook,
    });
    setBusy(false);
    if (err) return setError(err);
    onSaved?.("Profile saved");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="flex items-center gap-4">
          <Avatar name={name || profile.username} src={avatar} size={80} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <UploadIcon width={16} height={16} /> {uploading ? "Uploading…" : avatar ? "Change picture" : "Add a picture"}
            </button>
            {avatar && (
              <button type="button" className="btn-ghost text-danger" onClick={() => setAvatar(null)}>
                Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickPicture(e.target.files?.[0])} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pf-name">
            Name
          </label>
          <input id="pf-name" className="field" maxLength={40} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="How you’d like to be called" />
        </div>

        {accounts && (
          <div>
            <label className="label" htmlFor="pf-username">
              Username
            </label>
            <div className="flex items-center rounded-lg border border-line bg-paper focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
              <span className="pl-3 font-mono text-ink-soft">@</span>
              <input
                id="pf-username"
                className="w-full bg-transparent px-1 py-2 font-mono focus:outline-none"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              />
            </div>
            <p className="mt-1 text-xs text-ink-soft">Your shelf’s link uses it. 3–20 letters, numbers, “_” or “.”.</p>
          </div>
        )}

        <div>
          <label className="label" htmlFor="pf-bio">
            Bio
          </label>
          <textarea id="pf-bio" rows={3} maxLength={300} className="field resize-y" placeholder="A line about you and the books you love" value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="mt-1 text-right font-mono text-xs text-ink-soft">{bio.length}/300</p>
        </div>

        <div>
          <label className="label" htmlFor="pf-goal">
            Reading goal for {new Date().getFullYear()}
          </label>
          <div className="flex items-center gap-2">
            <input id="pf-goal" inputMode="numeric" className="field w-28 font-mono" placeholder="e.g. 24" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            <span className="text-sm text-ink-soft">books</span>
          </div>
        </div>

        <fieldset className="space-y-4 border-t border-line pt-5">
          <legend className="label">Sharing</legend>
          {accounts ? (
            <>
              <Toggle checked={isPublic} onChange={setIsPublic} title="Public shelf" text="Anyone with the link can see your shelf and journal, but never change anything. Off means only you can see it." />
              {isPublic && link && (
                <div className="flex items-center gap-2">
                  <input readOnly className="field flex-1 font-mono text-xs" value={link} aria-label="Your shelf’s link" onFocus={(e) => e.currentTarget.select()} />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1800);
                      } catch {}
                    }}
                  >
                    <LinkIcon width={16} height={16} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-soft">A guest shelf is saved only in this browser. Create an account to share your shelf.</p>
          )}
          <Toggle checked={guestbook} onChange={setGuestbook} title="Guest book" text="Visitors to your public shelf can leave you a note or a heart. Only you can read them." />
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1 py-3" disabled={busy || uploading}>
            {busy ? "Saving…" : "Save profile"}
          </button>
          <button type="button" className="btn-ghost py-3" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function Toggle({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-ink-soft">{text}</span>
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-ink/20 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2"
      />
    </label>
  );
}
