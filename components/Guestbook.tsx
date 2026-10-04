"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { GuestNote } from "@/lib/types";
import { Sheet } from "./Sheet";

const NAME_KEY = "exlibris:guestName";
const MAX = 280;

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** For visitors to a public shelf: leave a note, or just a heart. No account needed. */
export function SignGuestbook({
  open,
  onClose,
  ownerName,
  onSign,
}: {
  open: boolean;
  onClose: () => void;
  ownerName?: string | null;
  onSign: (note: { name: string; message: string; heart: boolean }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [heart, setHeart] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    setState("idle");
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, [open]);

  const who = ownerName ? ownerName : "the owner";
  const empty = !message.trim() && !heart;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (empty || state === "sending") return;
    setState("sending");
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
    try {
      const ok = await onSign({ name: name.trim(), message: message.trim(), heart });
      setState(ok ? "sent" : "error");
      if (ok) setMessage("");
    } catch {
      setState("error");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Leave a note">
      {state === "sent" ? (
        <div className="py-6 text-center">
          <p className="text-4xl" aria-hidden>
            💌
          </p>
          <p className="mt-3 font-serif text-2xl">Your note is in {ownerName ? `${ownerName}’s` : "the"} guest book</p>
          <p className="mt-1 text-ink-soft">Only {who} can read it.</p>
          <button type="button" className="btn-primary mt-6" onClick={onClose}>
            Back to the shelf
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-ink-soft">Say hello, recommend a book, or tell {who} what you loved on their shelf. Only {who} will see it.</p>
          <div>
            <label className="label" htmlFor="gb-name">
              Your name
            </label>
            <input id="gb-name" className="field" maxLength={40} placeholder="A friend" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="gb-message">
              Your note
            </label>
            <textarea
              id="gb-message"
              className="field resize-none font-serif text-lg"
              rows={4}
              maxLength={MAX}
              placeholder="Your shelf is so cosy! You have to read…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="mt-1 text-right font-mono text-xs text-ink-soft">
              {message.length}/{MAX}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={heart}
            onClick={() => setHeart((h) => !h)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${heart ? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200" : "border-line text-ink-soft"}`}
          >
            <span aria-hidden>{heart ? "❤️" : "🤍"}</span> Leave a heart too
          </button>
          {state === "error" && (
            <p role="alert" className="text-sm text-danger">
              Couldn’t leave your note just now. Please try again in a little while.
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={empty || state === "sending"}>
            {state === "sending" ? "Leaving your note…" : message.trim() ? "Leave note" : "Leave a heart"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

/** The owner's guest book: notes and hearts from visitors, newest first. */
export function GuestbookSheet({
  open,
  onClose,
  notes,
  isPublic,
  onDelete,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  notes: GuestNote[] | null;
  isPublic: boolean;
  onDelete: (id: string) => void;
  onShare: () => void;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const hearts = (notes ?? []).filter((n) => n.heart).length;

  return (
    <Sheet open={open} onClose={onClose} title="Guest book" wide>
      {notes === null ? (
        <p className="py-8 text-center text-ink-soft">The guest book couldn’t be opened just now.</p>
      ) : notes.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-4xl" aria-hidden>
            📖
          </p>
          <p className="mt-3 font-serif text-2xl">No notes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-ink-soft">
            {isPublic ? "When friends visit your public shelf, they can leave you a note or a heart. Share your link to invite them." : "Turn on your public shelf and share the link. Friends who visit can leave you a note or a heart."}
          </p>
          <button type="button" className="btn-primary mt-5" onClick={onShare}>
            {isPublic ? "Share your shelf" : "Set up sharing"}
          </button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-ink-soft">
            {notes.length} {notes.length === 1 ? "visit" : "visits"} · {hearts} {hearts === 1 ? "heart" : "hearts"} <span aria-hidden>❤️</span>
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {notes.map((n, i) => (
              <li
                key={n.id}
                className="guest-note relative rounded-lg p-4 shadow-md ring-1 ring-black/5"
                style={{ transform: `rotate(${[-1.2, 0.8, -0.4, 1.1][i % 4]}deg)` }}
              >
                {n.heart && (
                  <span className="absolute right-3 top-2 text-lg" aria-label="Left a heart">
                    ❤️
                  </span>
                )}
                {n.message ? <p className="whitespace-pre-line pr-6 font-serif text-lg leading-snug text-[#3a302a]">{n.message}</p> : <p className="font-serif text-lg italic text-[#3a302a]/70">Left you a heart</p>}
                <p className="mt-3 text-sm text-[#3a302a]/70">
                  — {n.name} · {when(n.created_at)}
                </p>
                <div className="mt-2 text-right">
                  {confirm === n.id ? (
                    <span className="inline-flex gap-2 text-sm">
                      <button type="button" className="rounded-full px-3 py-1 text-danger hover:bg-danger/10" onClick={() => (onDelete(n.id), setConfirm(null))}>
                        Delete note
                      </button>
                      <button type="button" className="rounded-full px-3 py-1 text-[#3a302a]/70 hover:bg-black/5" onClick={() => setConfirm(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="rounded-full px-3 py-1 text-sm text-[#3a302a]/60 hover:bg-black/5" onClick={() => setConfirm(n.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
