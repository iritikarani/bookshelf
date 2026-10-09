"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatDate, todayISO } from "@/lib/date";
import { quotesOf } from "@/lib/quotes";
import type { Book, BookDraft, Quote } from "@/lib/types";
import { PencilIcon, PlusIcon, ShareIcon, TrashIcon, XIcon } from "./Icons";

export type BookPatch = Partial<BookDraft>;
type Save = (patch: BookPatch) => void;

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

export const MAX_TAGS = 20;
const TAG_MAX = 30;
export const cleanTag = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase().slice(0, TAG_MAX);

/** Started / finished dates, editable in place. */
export function BookDates({ book, onSave }: { book: Book; onSave?: Save }) {
  const started = book.date_started ?? "";
  const finished = book.date_finished ?? "";
  const showFinished = book.status === "read";
  if (!onSave) {
    if (!started && !(showFinished && finished)) return null;
    return (
      <p className="mt-3 text-sm text-ink-soft">
        {started && (
          <>
            Started <span className="font-mono">{formatDate(started)}</span>
          </>
        )}
        {started && showFinished && finished && " · "}
        {showFinished && finished && (
          <>
            Finished <span className="font-mono">{formatDate(finished)}</span>
          </>
        )}
      </p>
    );
  }
  const today = todayISO();
  return (
    <div className={`mt-4 grid gap-3 text-left ${showFinished ? "grid-cols-2" : "grid-cols-1"}`}>
      <label className="text-sm">
        <span className="label">Date started</span>
        <input
          type="date"
          className="field font-mono text-sm"
          value={started}
          max={finished && showFinished ? finished : today}
          onChange={(e) => onSave({ date_started: e.target.value || null })}
        />
      </label>
      {showFinished && (
        <label className="text-sm">
          <span className="label">Date finished</span>
          <input type="date" className="field font-mono text-sm" value={finished} min={started || undefined} max={today} onChange={(e) => onSave({ date_finished: e.target.value || null })} />
        </label>
      )}
    </div>
  );
}

/** Genre plus your own tags, added and removed in place. */
export function BookTags({ book, onSave }: { book: Book; onSave?: Save }) {
  const tags = book.tags ?? [];
  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(""), [book.id]);
  if (!onSave && !tags.length && !book.genre) return null;
  const add = (e?: FormEvent) => {
    e?.preventDefault();
    const t = cleanTag(draft);
    if (!t || tags.includes(t) || tags.length >= MAX_TAGS) return setDraft("");
    onSave?.({ tags: [...tags, t] });
    setDraft("");
  };
  return (
    <section className="mt-6">
      <h3 className="label">Genre &amp; tags</h3>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
        {book.genre && <li className="rounded-full bg-ink/[0.07] px-3 py-1 text-sm">{book.genre}</li>}
        {tags.map((t) => (
          <li key={t} className="flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1 text-sm">
            #{t}
            {onSave && (
              <button type="button" aria-label={`Remove tag ${t}`} className="-mr-1 rounded-full p-0.5 text-ink-soft hover:text-danger" onClick={() => onSave({ tags: tags.filter((x) => x !== t) })}>
                <XIcon width={13} height={13} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {onSave && tags.length < MAX_TAGS && (
        <form onSubmit={add} className="mt-2 flex gap-2">
          <label htmlFor={`tag-${book.id}`} className="sr-only">
            Add a tag
          </label>
          <input id={`tag-${book.id}`} className="field h-9 flex-1 py-1 text-sm" placeholder="Add a tag, e.g. comfort read" maxLength={TAG_MAX} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="btn-ghost h-9 px-3" disabled={!cleanTag(draft)}>
            Add
          </button>
        </form>
      )}
    </section>
  );
}

/** Your thoughts on the book, written right on the journal page. */
export function BookNotes({ book, onSave }: { book: Book; onSave?: Save }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(book.what_i_liked ?? "");
  useEffect(() => {
    setEditing(false);
    setText(book.what_i_liked ?? "");
  }, [book.id, book.what_i_liked]);
  const label = book.status === "to_read" ? "Why I want to read it" : book.status === "reading" ? "My thoughts so far" : "My thoughts";
  const has = Boolean(book.what_i_liked?.trim());
  if (!onSave && !has) return null;

  if (editing) {
    return (
      <section className="mt-5">
        <label htmlFor={`notes-${book.id}`} className="label">
          {label}
        </label>
        <textarea
          id={`notes-${book.id}`}
          autoFocus
          rows={6}
          maxLength={4000}
          className="field resize-y bg-paper/95 font-serif text-lg leading-8"
          placeholder="What stayed with you?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onSave?.({ what_i_liked: text.trim() || null });
              setEditing(false);
            }}
          >
            Save
          </button>
          <button type="button" className="btn-ghost bg-paper" onClick={() => (setText(book.what_i_liked ?? ""), setEditing(false))}>
            Cancel
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="label">{label}</h3>
        {onSave && has && (
          <button type="button" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline" onClick={() => setEditing(true)}>
            <PencilIcon width={13} height={13} /> Edit
          </button>
        )}
      </div>
      {has ? (
        <p className="whitespace-pre-line font-serif text-lg leading-8">{book.what_i_liked}</p>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="w-full rounded-lg border border-dashed border-ink-soft/40 bg-paper/80 px-4 py-3 text-left font-serif text-lg italic text-ink-soft hover:border-accent hover:text-ink">
          Nothing stayed with you yet? Write a few lines…
        </button>
      )}
    </section>
  );
}

/** Saved quotes: each with an optional page number and a note. */
export function BookQuotes({ book, color, onSave, onShare }: { book: Book; color: string; onSave?: Save; onShare?: (q: Quote) => void }) {
  const all = quotesOf(book);
  const [form, setForm] = useState<{ id: string | null; text: string; page: string; note: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    setForm(null);
    setConfirm(null);
  }, [book.id]);
  if (!onSave && !all.length) return null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form || !form.text.trim()) return;
    const page = form.page.trim() ? Math.max(1, Math.min(99999, parseInt(form.page, 10) || 0)) || null : null;
    const note = form.note.trim().slice(0, 500) || null;
    const text = form.text.trim().slice(0, 1000);
    if (form.id === "favourite-line") {
      // Turn the old single line into a full quote so it can carry a page and note.
      onSave?.({ favourite_line: null, quotes: [{ id: newId(), text, page, note, created_at: book.date_finished ?? book.created_at }, ...(book.quotes ?? [])] });
    } else if (form.id) {
      onSave?.({ quotes: (book.quotes ?? []).map((q) => (q.id === form.id ? { ...q, text, page, note } : q)) });
    } else {
      onSave?.({ quotes: [...(book.quotes ?? []), { id: newId(), text, page, note, created_at: new Date().toISOString() }] });
    }
    setForm(null);
  };
  const remove = (id: string) => {
    if (id === "favourite-line") onSave?.({ favourite_line: null });
    else onSave?.({ quotes: (book.quotes ?? []).filter((q) => q.id !== id) });
    setConfirm(null);
  };

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="label">Quotes{all.length > 1 ? ` · ${all.length}` : ""}</h3>
        {onSave && !form && (
          <button type="button" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline" onClick={() => setForm({ id: null, text: "", page: "", note: "" })}>
            <PlusIcon width={13} height={13} /> Save a quote
          </button>
        )}
      </div>
      <ul className="space-y-4">
        {all.map((q) =>
          form?.id === q.id ? null : (
            <li key={q.id}>
              <blockquote className="border-l-4 py-1 pl-4 font-serif text-xl leading-snug md:text-2xl" style={{ borderColor: color }}>
                “{q.text}”
              </blockquote>
              {(q.page || q.note) && (
                <p className="mt-1 pl-5 text-sm text-ink-soft">
                  {q.page ? <span className="font-mono">p. {q.page}</span> : null}
                  {q.page && q.note ? " · " : null}
                  {q.note}
                </p>
              )}
              {(onSave || onShare) && (
                <div className="mt-1 flex flex-wrap items-center gap-1 pl-4 text-xs">
                  {onShare && (
                    <button type="button" className="flex items-center gap-1 rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5 hover:text-ink" onClick={() => onShare(q)}>
                      <ShareIcon width={13} height={13} /> Share
                    </button>
                  )}
                  {onSave && (
                    <>
                      <button type="button" className="flex items-center gap-1 rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5 hover:text-ink" onClick={() => setForm({ id: q.id, text: q.text, page: q.page ? String(q.page) : "", note: q.note ?? "" })}>
                        <PencilIcon width={13} height={13} /> Edit
                      </button>
                      {confirm === q.id ? (
                        <span className="flex items-center gap-1">
                          <button type="button" className="rounded-full px-2 py-1 font-medium text-danger hover:bg-danger/10" onClick={() => remove(q.id)}>
                            Delete quote
                          </button>
                          <button type="button" className="rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5" onClick={() => setConfirm(null)}>
                            Keep
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="flex items-center gap-1 rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5 hover:text-danger" onClick={() => setConfirm(q.id)}>
                          <TrashIcon width={13} height={13} /> Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          ),
        )}
      </ul>
      {!all.length && !form && onSave && (
        <button type="button" onClick={() => setForm({ id: null, text: "", page: "", note: "" })} className="w-full rounded-lg border border-dashed border-ink-soft/40 bg-paper/80 px-4 py-3 text-left font-serif text-lg italic text-ink-soft hover:border-accent hover:text-ink">
          A line worth keeping? Save it here…
        </button>
      )}
      {form && (
        <form onSubmit={save} className="mt-3 space-y-2 rounded-xl bg-paper/95 p-3 ring-1 ring-line">
          <label htmlFor={`q-${book.id}`} className="label">
            {form.id ? "Edit quote" : "New quote"}
          </label>
          <textarea id={`q-${book.id}`} autoFocus rows={3} maxLength={1000} className="field resize-y font-serif text-lg" placeholder="The line, as it’s written" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <div className="grid grid-cols-[96px_1fr] gap-2">
            <input aria-label="Page number" inputMode="numeric" className="field font-mono" placeholder="Page" value={form.page} onChange={(e) => setForm({ ...form, page: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
            <input aria-label="Your note (optional)" maxLength={500} className="field" placeholder="Your note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={!form.text.trim()}>
              Save quote
            </button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
