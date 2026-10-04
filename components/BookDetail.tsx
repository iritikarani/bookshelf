"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date";
import type { Book, BookDisplay, ReadStatus, Shelf } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import { BookCover } from "./BookCover";
import { ChevronLeft, ChevronRight, PencilIcon, TrashIcon } from "./Icons";
import { MARKS, MarkChips, MarkPicker } from "./Marks";
import { ReadingProgress } from "./ReadingProgress";
import { Sheet } from "./Sheet";
import { StarDisplay, StarInput } from "./StarRating";

interface BookDetailProps {
  book: Book | null;
  shelves: Shelf[];
  /** The book's spot among everything on its shelf, for the ← → controls. */
  index: number;
  shelfSize: number;
  onClose: () => void;
  onEdit?: (book: Book) => void;
  onMove?: (book: Book, shelfId: string) => void;
  onNudge?: (book: Book, dir: -1 | 1) => void;
  onDisplay?: (book: Book, display: BookDisplay) => void;
  onMarks?: (book: Book, patch: { favourite?: boolean; status?: ReadStatus }) => void;
  onRate?: (book: Book, rating: number) => void;
  onProgress?: (book: Book, patch: { current_page: number | null; pages: number | null }) => void;
  onRemove?: (book: Book) => Promise<void>;
  ownerName?: string | null;
  readOnly?: boolean;
  example?: boolean;
}

/** Opening a book: a two-page spread. Left page is the book itself, right page is your journal. */
export function BookDetail(props: BookDetailProps) {
  const { book, shelves, index, shelfSize, onClose, onEdit, onMove, onNudge, onDisplay, onMarks, onRate, onProgress, onRemove, ownerName, readOnly, example } = props;
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const color = useCoverColor(book);

  useEffect(() => setConfirming(false), [book?.id]);

  if (!book) return null;
  const shelf = shelves.find((s) => s.id === book.shelf_id);
  const meta = [book.year_published, book.pages ? `${book.pages} pages` : null, book.genre].filter(Boolean);
  const canEdit = !readOnly && !example;
  const finished = book.status === "read";
  const hasJournal = Boolean(book.what_i_liked?.trim() || book.favourite_line?.trim());

  return (
    <Sheet open onClose={onClose} title={book.title} variant="book" hideTitle>
      <article className="grid md:min-h-[560px] md:grid-cols-2">
        {/* ── Left page: the book ── */}
        <section className="relative flex flex-col bg-paper px-6 pb-8 pt-8 md:px-9 md:shadow-[inset_-28px_0_30px_-26px_rgba(0,0,0,0.22)]">
          <div className="flex gap-5 md:flex-col md:items-center md:text-center">
            <div className="w-28 shrink-0 md:w-40">
              <div className="aspect-[2/3] overflow-hidden rounded-[3px] shadow-[0_14px_26px_-10px_rgba(0,0,0,0.55)]">
                <BookCover book={book} size="L" />
              </div>
            </div>
            <div className="min-w-0 md:mt-1">
              <h2 className="font-serif text-2xl leading-tight md:text-3xl">{book.title}</h2>
              {book.author && <p className="mt-1 text-ink-soft">{book.author}</p>}
              {meta.length > 0 && <p className="mt-2 font-mono text-xs text-ink-soft">{meta.join(" · ")}</p>}
              <MarkChips book={book} className="mt-3 md:justify-center" />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line/80 bg-wall/40 p-4 text-center">
            {finished ? (
              <>
                <p className="label !mb-2">My rating</p>
                {canEdit ? (
                  <div className="flex justify-center">
                    <StarInput value={book.rating} onChange={(r) => onRate?.(book, r)} />
                  </div>
                ) : book.rating ? (
                  <StarDisplay rating={book.rating} size={24} />
                ) : (
                  <p className="text-sm text-ink-soft">Not rated</p>
                )}
                {book.date_finished && (
                  <p className="mt-2 text-sm">
                    Finished <span className="font-mono">{formatDate(book.date_finished)}</span>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-serif text-lg" style={{ color: MARKS[book.status === "read" ? "to_read" : book.status].color }}>
                  {book.status === "reading" ? "📖 Reading it now" : book.status === "dnf" ? "⏸ Didn’t finish" : "🔖 Want to read"}
                </p>
                {book.status === "reading" && (
                  <ReadingProgress book={book} color={MARKS.reading.color} onSave={canEdit && onProgress ? (patch) => onProgress(book, patch) : undefined} />
                )}
              </>
            )}
          </div>

          {book.short_description?.trim() && (
            <section className="mt-6">
              <h3 className="label">About the book</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{book.short_description}</p>
            </section>
          )}

          {/* On phones the bookplate moves to the very end, after the journal */}
          <div className="mt-auto hidden pt-8 md:block">
            <Bookplate owner={ownerName} date={finished ? book.date_finished : null} status={book.status} />
          </div>
        </section>

        {/* ── Right page: the journal ── */}
        <section
          className="relative flex flex-col border-t border-line bg-paper px-6 pb-8 pt-8 md:border-l md:border-t-0 md:px-9 md:shadow-[inset_28px_0_30px_-26px_rgba(0,0,0,0.22)]"
          style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 31px, rgb(var(--line) / 0.55) 31px 32px)", backgroundPositionY: "18px" }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-soft">My journal</p>

          {book.what_i_liked?.trim() && (
            <section className="mt-5">
              <h3 className="label">{book.status === "to_read" ? "Why I want to read it" : book.status === "reading" ? "Enjoying so far" : "What I liked"}</h3>
              <p className="whitespace-pre-line font-serif text-lg leading-8">{book.what_i_liked}</p>
            </section>
          )}

          {book.favourite_line?.trim() && (
            <section className="mt-6">
              <h3 className="label">Favourite line</h3>
              <blockquote className="border-l-4 py-1 pl-4 font-serif text-2xl leading-snug" style={{ borderColor: color }}>
                “{book.favourite_line.trim()}”
              </blockquote>
            </section>
          )}

          {!hasJournal && (
            <p className="mt-5 font-serif text-lg italic leading-8 text-ink-soft">
              Nothing written yet.{canEdit ? " Tap Edit to add what stayed with you and a line worth keeping." : ""}
            </p>
          )}

          {canEdit && (
            <div className="mt-auto space-y-5 pt-8">
              <fieldset className="rounded-xl bg-paper/90 p-1">
                <legend className="label">Marks</legend>
                <MarkPicker
                  favourite={book.favourite}
                  status={book.status}
                  onFavourite={(favourite) => onMarks?.(book, { favourite })}
                  onStatus={(status) => onMarks?.(book, { status })}
                />
              </fieldset>

              <fieldset className="rounded-xl bg-paper/90 p-1">
                <legend className="label">On the shelf</legend>
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
                  <select className="field flex-1" aria-label="Move to shelf" value={book.shelf_id} onChange={(e) => onMove?.(book, e.target.value)}>
                    {shelves.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-ghost px-3" aria-label="Move left on shelf" disabled={index <= 0} onClick={() => onNudge?.(book, -1)}>
                    <ChevronLeft />
                  </button>
                  <button type="button" className="btn-ghost px-3" aria-label="Move right on shelf" disabled={index >= shelfSize - 1} onClick={() => onNudge?.(book, 1)}>
                    <ChevronRight />
                  </button>
                </div>
                <p className="mt-1 font-mono text-xs text-ink-soft">
                  Spot {index + 1} of {shelfSize} on {shelf?.name}
                </p>
              </fieldset>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <button type="button" className="btn-ghost bg-paper" onClick={() => onEdit?.(book)}>
                  <PencilIcon width={16} height={16} /> Edit
                </button>
                {!confirming && (
                  <button type="button" className="btn-ghost bg-paper text-danger" onClick={() => setConfirming(true)}>
                    <TrashIcon width={16} height={16} /> Remove
                  </button>
                )}
              </div>

              {confirming && (
                <div role="alertdialog" aria-label="Remove this book?" className="rounded-xl border border-danger/40 bg-paper p-4">
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
            </div>
          )}
          <div className="pt-10 md:hidden">
            <Bookplate owner={ownerName} date={finished ? book.date_finished : null} status={book.status} />
          </div>
          {example && (
            <p className="mt-6 rounded-lg md:mt-auto bg-paper p-3 text-sm text-ink-soft ring-1 ring-line">This is an example book. It disappears when you add your first one.</p>
          )}
        </section>
      </article>
    </Sheet>
  );
}

function Bookplate({ owner, date, status }: { owner?: string | null; date: string | null; status: ReadStatus }) {
  const line = date ? `Read ${formatDate(date)}` : status === "reading" ? "Reading now" : status === "to_read" ? "To be read" : status === "dnf" ? "Set aside" : "Read";
  return (
    <div className="flex justify-center" aria-label={`Ex libris${owner ? ` ${owner}` : ""}, ${line}`} role="img">
      <div className="-rotate-2 rounded-sm border-2 border-accent/70 p-1 text-accent opacity-90">
        <div className="flex min-w-[200px] flex-col items-center border border-dashed border-accent/60 px-6 py-3">
          <span className="text-[11px] tracking-[0.4em]">✦ ✦ ✦</span>
          <span className="font-serif text-2xl tracking-[0.25em]">EX LIBRIS</span>
          {owner && <span className="mt-0.5 font-serif text-sm italic">{owner}</span>}
          <span className="mt-1 font-mono text-xs uppercase tracking-widest">{line}</span>
        </div>
      </div>
    </div>
  );
}
