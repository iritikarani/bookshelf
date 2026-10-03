"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date";
import type { Book, BookDisplay, Shelf } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { BookCover } from "./BookCover";
import { ChevronLeft, ChevronRight, PencilIcon, TrashIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { StarDisplay } from "./StarRating";

interface BookDetailProps {
  book: Book | null;
  shelves: Shelf[];
  /** Index of the book on its shelf and the shelf's size, for the ← → controls. */
  index: number;
  shelfSize: number;
  onClose: () => void;
  onEdit?: (book: Book) => void;
  onMove?: (book: Book, shelfId: string) => void;
  onNudge?: (book: Book, dir: -1 | 1) => void;
  onDisplay?: (book: Book, display: BookDisplay) => void;
  onRemove?: (book: Book) => Promise<void>;
  ownerName?: string | null;
  readOnly?: boolean;
  example?: boolean;
}

export function BookDetail({ book, shelves, index, shelfSize, onClose, onEdit, onMove, onNudge, onDisplay, onRemove, ownerName, readOnly, example }: BookDetailProps) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const color = useCoverColor(book);

  useEffect(() => setConfirming(false), [book?.id]);

  if (!book) return null;
  const shelf = shelves.find((s) => s.id === book.shelf_id);
  const notRead = Boolean(shelf?.is_want_to_read);
  const meta = [book.year_published, book.pages ? `${book.pages} pages` : null, book.genre].filter(Boolean);
  const canEdit = !readOnly && !example;

  return (
    <Sheet open onClose={onClose} title={book.title} variant="panel" hideTitle>
      <article className="pt-6">
        <div className="flex gap-4 md:flex-col md:items-center md:text-center">
          <div className="w-28 shrink-0 md:w-44">
            <div className="aspect-[2/3] overflow-hidden rounded shadow-[0_12px_24px_-10px_rgba(0,0,0,0.55)]">
              <BookCover book={book} />
            </div>
          </div>
          <div className="min-w-0 pt-1">
            <h2 className="font-serif text-2xl leading-tight md:text-3xl">{book.title}</h2>
            {book.author && <p className="mt-1 text-ink-soft">{book.author}</p>}
            {meta.length > 0 && <p className="mt-2 font-mono text-xs text-ink-soft">{meta.join(" · ")}</p>}
            <div className="mt-3">
              {notRead ? (
                <span className="inline-block rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-soft">Not read yet</span>
              ) : book.rating ? (
                <StarDisplay rating={book.rating} />
              ) : (
                <span className="text-xs text-ink-soft">No rating</span>
              )}
            </div>
            {!notRead && book.date_finished && (
              <p className="mt-2 text-sm">
                Finished <span className="font-mono">{formatDate(book.date_finished)}</span>
              </p>
            )}
          </div>
        </div>

        {book.what_i_liked?.trim() && (
          <section className="mt-7">
            <h3 className="label">What I liked</h3>
            <p className="whitespace-pre-line leading-relaxed">{book.what_i_liked}</p>
          </section>
        )}

        {book.favourite_line?.trim() && (
          <section className="mt-7">
            <h3 className="label">Favourite line</h3>
            <blockquote className="border-l-4 py-1 pl-4 font-serif text-xl leading-snug md:text-2xl" style={{ borderColor: color }}>
              “{book.favourite_line.trim()}”
            </blockquote>
          </section>
        )}

        {book.short_description?.trim() && (
          <section className="mt-7">
            <h3 className="label">About the book</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{book.short_description}</p>
          </section>
        )}

        <Bookplate owner={ownerName} date={notRead ? null : book.date_finished} />

        {canEdit && (
          <div className="mt-6 space-y-4 border-t border-line pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost" onClick={() => onEdit?.(book)}>
                <PencilIcon width={16} height={16} /> Edit
              </button>
              {!confirming && (
                <button type="button" className="btn-ghost text-danger" onClick={() => setConfirming(true)}>
                  <TrashIcon width={16} height={16} /> Remove
                </button>
              )}
            </div>

            {confirming && (
              <div role="alertdialog" aria-label="Remove this book?" className="rounded-xl border border-danger/40 bg-danger/5 p-4">
                <p className="font-medium">Remove this book?</p>
                <p className="mt-1 text-sm text-ink-soft">Your journal entry for it will be deleted too.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={removing}
                    onClick={async () => {
                      setRemoving(true);
                      try {
                        await onRemove?.(book);
                        onClose();
                      } finally {
                        setRemoving(false);
                      }
                    }}
                  >
                    {removing ? "Removing…" : "Remove"}
                  </button>
                  <button type="button" className="btn-ghost" autoFocus onClick={() => setConfirming(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            )}

            <fieldset>
              <legend className="label">Arrange</legend>
              <div className="mb-3 inline-flex rounded-full border border-line p-1" role="radiogroup" aria-label="Show on the shelf as">
                {(["spine", "cover"] as BookDisplay[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={book.display === d}
                    onClick={() => onDisplay?.(book, d)}
                    className={`rounded-full px-3.5 py-1.5 text-sm ${book.display === d ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"}`}
                  >
                    {d === "spine" ? "Spine out" : "Cover facing out"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="field flex-1"
                  aria-label="Move to shelf"
                  value={book.shelf_id}
                  onChange={(e) => onMove?.(book, e.target.value)}
                >
                  {shelves.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost px-3" aria-label="Move left on shelf" disabled={index <= 0} onClick={() => onNudge?.(book, -1)}>
                  <ChevronLeft />
                </button>
                <button type="button" className="btn-ghost px-3" aria-label="Move right on shelf" disabled={index >= shelfSize - 1} onClick={() => onNudge?.(book, 1)}>
                  <ChevronRight />
                </button>
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-soft">
                Spot {index + 1} of {shelfSize} on {shelf?.name}
              </p>
            </fieldset>
          </div>
        )}
        {example && (
          <p className="mt-6 rounded-lg bg-ink/5 p-3 text-sm text-ink-soft">This is an example book. It disappears when you add your first one.</p>
        )}
      </article>
    </Sheet>
  );
}

function Bookplate({ owner, date }: { owner?: string | null; date: string | null }) {
  return (
    <div className="mt-10 flex justify-center" aria-label={`Ex libris${owner ? ` ${owner}` : ""}${date ? `, read ${formatDate(date)}` : ""}`} role="img">
      <div className="-rotate-2 rounded-sm border-2 border-accent/70 p-1 text-accent opacity-90">
        <div className="flex min-w-[200px] flex-col items-center border border-dashed border-accent/60 px-6 py-3">
          <span className="text-[10px] tracking-[0.4em]">✦ ✦ ✦</span>
          <span className="font-serif text-2xl tracking-[0.25em]">EX LIBRIS</span>
          {owner && <span className="mt-0.5 font-serif text-sm italic">{owner}</span>}
          <span className="mt-1 font-mono text-[11px] uppercase tracking-widest">{date ? `Read ${formatDate(date)}` : "To be read"}</span>
        </div>
      </div>
    </div>
  );
}
