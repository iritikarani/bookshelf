"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { COVER_SWATCHES, defaultCoverColor, probeImage } from "@/lib/covers";
import { todayISO } from "@/lib/date";
import { compressCover } from "@/lib/image";
import { useLibrary } from "@/lib/library";
import { fetchWorkDescription, searchBooks, type SearchResult } from "@/lib/search";
import type { Book, BookDisplay, BookDraft, ReadStatus } from "@/lib/types";
import { MarkPicker } from "./Marks";
import { BookCover, GeneratedCover } from "./BookCover";
import { BookFinder } from "./BookFinder";
import { ChevronLeft, SearchIcon, UploadIcon } from "./Icons";
import { Sheet } from "./Sheet";
import { StarInput } from "./StarRating";

type CoverChoice =
  | { kind: "url"; url: string }
  | { kind: "generated" }
  | { kind: "upload"; dataUrl: string; blob: Blob | null };

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Book | null;
  defaultShelfId?: string;
  onSaved?: (book: Book | null) => void;
}

/**
 * Adding starts with the finder (search any book or author, or browse Indian authors);
 * picking a book opens the form with its details filled in. Editing goes straight to the form.
 */
export function AddBookDialog({ open, onClose, editing, defaultShelfId, onSaved }: Props) {
  // undefined = still finding; null = adding by hand; a result = the picked book.
  const [picked, setPicked] = useState<SearchResult | null | undefined>(undefined);
  useEffect(() => {
    if (!open) setPicked(undefined);
  }, [open]);
  const finding = !editing && picked === undefined;

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit book" : picked ? "Your notes on it" : "Add a book"} wide>
      {open &&
        (finding ? (
          <BookFinder onPick={(r) => setPicked(r)} onManual={() => setPicked(null)} />
        ) : (
          <>
            {!editing && (
              <button type="button" onClick={() => setPicked(undefined)} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
                <ChevronLeft width={16} height={16} /> Back to search
              </button>
            )}
            <AddBookForm
              key={editing?.id ?? picked?.key ?? "manual"}
              editing={editing ?? null}
              prefill={picked ?? null}
              defaultShelfId={defaultShelfId}
              onDone={(b) => {
                onSaved?.(b);
                onClose();
              }}
            />
          </>
        ))}
    </Sheet>
  );
}

function AddBookForm({ editing, prefill, defaultShelfId, onDone }: { editing: Book | null; prefill: SearchResult | null; defaultShelfId?: string; onDone: (b: Book | null) => void }) {
  const { shelves, addBook, updateBook, uploadCover } = useLibrary();
  const listId = useId();

  const [title, setTitle] = useState(editing?.title ?? "");
  const [author, setAuthor] = useState(editing?.author ?? "");
  const [year, setYear] = useState(editing?.year_published?.toString() ?? "");
  const [pages, setPages] = useState(editing?.pages?.toString() ?? "");
  const [genre, setGenre] = useState(editing?.genre ?? "");
  const [description, setDescription] = useState(editing?.short_description ?? "");
  const [shelfId, setShelfId] = useState(editing?.shelf_id ?? defaultShelfId ?? shelves[0]?.id ?? "");
  const [dateFinished, setDateFinished] = useState(editing?.date_finished ?? todayISO());
  const [rating, setRating] = useState(editing?.rating ?? 0);
  const [liked, setLiked] = useState(editing?.what_i_liked ?? "");
  const [line, setLine] = useState(editing?.favourite_line ?? "");
  const [display, setDisplay] = useState<BookDisplay>(editing?.display ?? "spine");
  const [status, setStatus] = useState<ReadStatus>(editing?.status ?? "read");
  const [favourite, setFavourite] = useState(editing?.favourite ?? false);

  const [covers, setCovers] = useState<string[]>(editing?.cover_url ? [editing.cover_url] : []);
  const [probing, setProbing] = useState(false);
  const [swatch, setSwatch] = useState(editing?.cover_color ?? defaultCoverColor(editing?.title ?? "book"));
  const [choice, setChoice] = useState<CoverChoice>(() =>
    editing?.uploaded_cover
      ? { kind: "upload", dataUrl: editing.uploaded_cover, blob: null }
      : editing?.cover_url
        ? { kind: "url", url: editing.cover_url }
        : { kind: "generated" },
  );

  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [touched, setTouched] = useState(false); // only search after the user types
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(editing));
  const pickToken = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const finished = status === "read";

  // Debounced search across Google Books + Open Library.
  useEffect(() => {
    if (!touched || title.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const r = await searchBooks(title, author, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setResults(r);
          setHighlight(-1);
          setShowResults(true);
        }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [title, author, touched]);

  async function pick(r: SearchResult) {
    const token = ++pickToken.current;
    setShowResults(false);
    setTouched(false);
    setTitle(r.title);
    setAuthor(r.author);
    setYear(r.year?.toString() ?? "");
    setPages(r.pages?.toString() ?? "");
    setGenre(r.genre ?? "");
    setDescription(r.description ?? "");
    setSwatch(defaultCoverColor(r.title));
    setCovers([]);
    setProbing(true);
    setChoice({ kind: "generated" });

    if (!r.description && r.olWorkKey) {
      fetchWorkDescription(r.olWorkKey).then((d) => {
        if (d && token === pickToken.current) setDescription((cur) => cur || d);
      });
    }
    const candidates = r.covers.slice(0, 8);
    const ok = await Promise.all(candidates.map((u) => probeImage(u)));
    if (token !== pickToken.current) return;
    const valid = candidates.filter((_, i) => ok[i]).slice(0, 4);
    setCovers(valid);
    setProbing(false);
    setChoice((c) => (c.kind === "upload" ? c : valid[0] ? { kind: "url", url: valid[0] } : { kind: "generated" }));
  }

  // Picked in the finder: fill everything in from the chosen book straight away.
  useEffect(() => {
    if (prefill) pick(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setFormError(null);
    try {
      const { blob, dataUrl } = await compressCover(file);
      setChoice({ kind: "upload", dataUrl, blob });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't read that image.");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setFormError("Add a title first.");
    if (!shelfId) return setFormError("Pick a shelf.");
    setSaving(true);
    setFormError(null);
    try {
      let uploaded: string | null = null;
      if (choice.kind === "upload") uploaded = choice.blob ? await uploadCover(choice.blob, choice.dataUrl) : choice.dataUrl;
      const toInt = (s: string) => (s.trim() && Number.isFinite(Number(s)) ? Math.round(Number(s)) : null);
      const draft: BookDraft = {
        shelf_id: shelfId,
        title: title.trim(),
        author: author.trim(),
        cover_url: choice.kind === "url" ? choice.url : null,
        uploaded_cover: uploaded,
        cover_color: choice.kind === "generated" ? swatch : null,
        display,
        status,
        favourite,
        year_published: toInt(year),
        pages: toInt(pages),
        genre: genre.trim() || null,
        short_description: description.trim() || null,
        rating: finished ? rating : 0,
        what_i_liked: liked.trim() || null,
        favourite_line: line.trim() || null,
        date_finished: finished ? dateFinished || null : null,
      };
      if (editing) {
        await updateBook(editing.id, draft);
        onDone(null);
      } else {
        onDone(await addBook(draft));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save that book.");
    } finally {
      setSaving(false);
    }
  }

  const coverOptions = useMemo(() => {
    const urls = [...covers];
    if (choice.kind === "url" && !urls.includes(choice.url)) urls.unshift(choice.url);
    return urls;
  }, [covers, choice]);

  const previewBook = { title: title || "Untitled", author, cover_color: swatch, cover_url: null, uploaded_cover: null };
  const activeDescendant = highlight >= 0 ? `${listId}-opt-${highlight}` : undefined;

  return (
    <form onSubmit={submit} className="space-y-6 pt-1" noValidate>
      {/* ── Search ── */}
      <div className="relative">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ab-title">Title</label>
            <div className="relative">
              <input
                id="ab-title"
                data-autofocus
                className="field pr-9"
                value={title}
                autoComplete="off"
                placeholder="e.g. Jane Eyre"
                role="combobox"
                aria-expanded={showResults && results.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeDescendant}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTouched(true);
                }}
                onFocus={() => results.length && setShowResults(true)}
                onKeyDown={(e) => {
                  if (!showResults || !results.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => (h + 1) % results.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1));
                  } else if (e.key === "Enter" && highlight >= 0) {
                    e.preventDefault();
                    pick(results[highlight]);
                  } else if (e.key === "Escape") {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    setShowResults(false);
                  }
                }}
              />
              <SearchIcon className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft ${searching ? "animate-pulse" : ""}`} width={16} height={16} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ab-author">Author</label>
            <input
              id="ab-author"
              className="field"
              value={author}
              autoComplete="off"
              placeholder="e.g. Charlotte Brontë"
              onChange={(e) => {
                setAuthor(e.target.value);
                if (title.trim().length >= 2) setTouched(true);
              }}
            />
          </div>
        </div>
        <p className="mt-1.5 text-xs text-ink-soft" aria-live="polite">
          {searching ? "Searching Open Library and Google Books…" : touched && title.trim().length >= 2 && !results.length ? "No matches. You can still add it by hand." : "Start typing to search; pick a match to fill in the details."}
        </p>

        {showResults && results.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching books"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-line bg-paper p-1 shadow-xl"
          >
            {results.map((r, i) => (
              <li
                key={r.key}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 ${i === highlight ? "bg-accent/10" : ""}`}
              >
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-ink/10">
                  {r.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  ) : (
                    <GeneratedCover title={r.title} author="" color={defaultCoverColor(r.title)} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-sm text-ink-soft">
                    {r.author || "Unknown author"}
                    {r.year && <span className="font-mono"> · {r.year}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Cover ── */}
      <fieldset>
        <legend className="label">Cover</legend>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1.5 pb-2 pt-1.5 no-scrollbar" role="radiogroup" aria-label="Choose a cover">
          {probing &&
            [0, 1, 2].map((i) => <div key={i} className="h-[108px] w-[72px] shrink-0 animate-pulse rounded bg-ink/10" aria-hidden />)}
          {coverOptions.map((url, i) => (
            <CoverOption key={url} selected={choice.kind === "url" && choice.url === url} label={`Edition cover ${i + 1}`} onSelect={() => setChoice({ kind: "url", url })}>
              <BookCover book={{ ...previewBook, cover_url: url }} />
            </CoverOption>
          ))}
          <CoverOption selected={choice.kind === "generated"} label="Designed cover" onSelect={() => setChoice({ kind: "generated" })}>
            <GeneratedCover title={title || "Your book"} author={author} color={swatch} />
          </CoverOption>
          {choice.kind === "upload" && (
            <CoverOption selected label="Your photo" onSelect={() => {}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={choice.dataUrl} alt="" className="h-full w-full object-cover" />
            </CoverOption>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-[108px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-line text-center text-[11px] text-ink-soft hover:border-accent hover:text-accent"
          >
            <UploadIcon width={18} height={18} />
            Upload photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => onUpload(e.target.files?.[0])} aria-label="Upload a photo of the cover" />
        </div>
        {choice.kind === "generated" && (
          <div className="mt-2">
            <p className="mb-1.5 text-xs text-ink-soft">{!probing && !coverOptions.length && title ? "No cover found, so we designed one. Pick a colour:" : "Cover colour:"}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cover colour">
              {COVER_SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  role="radio"
                  aria-checked={swatch === s.hex}
                  aria-label={s.name}
                  title={s.name}
                  onClick={() => setSwatch(s.hex)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${swatch === s.hex ? "border-ink ring-2 ring-accent ring-offset-2 ring-offset-paper" : "border-ink/10"}`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>
        )}
      </fieldset>

      {/* ── Book details (auto-filled, editable) ── */}
      <details open={detailsOpen} onToggle={(e) => setDetailsOpen(e.currentTarget.open)} className="rounded-xl border border-line px-4 py-3">
        <summary className="cursor-pointer select-none text-sm font-medium">
          Book details{" "}
          <span className="font-mono text-xs font-normal text-ink-soft">{[year, pages && `${pages}p`, genre].filter(Boolean).join(" · ")}</span>
        </summary>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="ab-year">Year</label>
            <input id="ab-year" className="field font-mono" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/[^0-9-]/g, ""))} />
          </div>
          <div>
            <label className="label" htmlFor="ab-pages">Pages</label>
            <input id="ab-pages" className="field font-mono" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label className="label" htmlFor="ab-genre">Genre</label>
            <input id="ab-genre" className="field" value={genre} onChange={(e) => setGenre(e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="label" htmlFor="ab-desc">About the book</label>
            <textarea id="ab-desc" rows={2} className="field resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
      </details>

      {/* ── Journal ── */}
      <div>
        <span className="label">Marks</span>
        <MarkPicker favourite={favourite} status={status} onFavourite={setFavourite} onStatus={setStatus} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ab-shelf">Shelf</label>
          <select id="ab-shelf" className="field" value={shelfId} onChange={(e) => setShelfId(e.target.value)}>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {finished && (
          <div>
            <label className="label" htmlFor="ab-date">Date finished</label>
            <input id="ab-date" type="date" className="field font-mono" value={dateFinished} max={todayISO()} onChange={(e) => setDateFinished(e.target.value)} />
          </div>
        )}
      </div>

      <div>
        <span className="label" id="ab-display">Stand it on the shelf</span>
        <div className="inline-flex rounded-full border border-line p-1" role="radiogroup" aria-labelledby="ab-display">
          {(["spine", "cover"] as BookDisplay[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={display === d}
              onClick={() => setDisplay(d)}
              className={`rounded-full px-3.5 py-1.5 text-sm ${display === d ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {d === "spine" ? "Spine out" : "Cover facing out"}
            </button>
          ))}
        </div>
      </div>

      {finished && (
        <div>
          <span className="label" id="ab-rating">Rating</span>
          <StarInput value={rating} onChange={setRating} />
        </div>
      )}

      <div>
        <label className="label" htmlFor="ab-liked">{status === "to_read" ? "Why I want to read it" : status === "reading" ? "What I'm enjoying so far" : "What I liked"}</label>
        <textarea
          id="ab-liked"
          rows={3}
          className="field resize-y"
          placeholder={status === "to_read" ? "Who recommended it, what drew you in…" : "The part, character or moment that stayed with you"}
          value={liked}
          onChange={(e) => setLiked(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="ab-line">Favourite line</label>
        <textarea id="ab-line" rows={2} className="field resize-y font-serif text-lg" placeholder="A sentence worth keeping" value={line} onChange={(e) => setLine(e.target.value)} />
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
      )}

      <div className="sticky -bottom-6 -mx-5 -mb-6 flex justify-end gap-2 border-t border-line bg-paper px-5 py-3">
        <button type="button" className="btn-ghost" onClick={() => onDone(null)}>Cancel</button>
        <button type="submit" className="btn-primary px-6" disabled={saving || !title.trim()}>
          {saving ? "Saving…" : editing ? "Save changes" : "Put it on the shelf"}
        </button>
      </div>
    </form>
  );
}

function CoverOption({ selected, label, onSelect, children }: { selected: boolean; label: string; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={`relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded shadow transition ${selected ? "ring-[3px] ring-accent ring-offset-2 ring-offset-paper" : "opacity-80 hover:opacity-100"}`}
    >
      {children}
    </button>
  );
}
