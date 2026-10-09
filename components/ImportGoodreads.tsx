"use client";

import { useRef, useState } from "react";
import { findCover, readGoodreadsExport, type GoodreadsImport, type ImportedBook } from "@/lib/goodreads";
import { useLibrary } from "@/lib/library";
import { UploadIcon } from "./Icons";
import { Sheet } from "./Sheet";

type Stage = { kind: "pick" } | { kind: "covers"; done: number; found: number } | { kind: "saving" } | { kind: "done"; added: number; skipped: number; covers: number };

/** Bring a reader's whole Goodreads library in from their export file. */
export function ImportGoodreads({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const { importBooks, books, shelves, rooms, activeRoomId } = useLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<AbortController | null>(null);
  const skipRef = useRef(false);
  const [parsed, setParsed] = useState<GoodreadsImport | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const roomName = rooms.find((r) => r.id === activeRoomId)?.name ?? "your room";

  const reset = () => {
    stopRef.current?.abort();
    setParsed(null);
    setFileName("");
    setError(null);
    setStage({ kind: "pick" });
  };
  const close = () => {
    if (stage.kind === "saving") return;
    reset();
    onClose();
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    reset();
    setFileName(file.name);
    if (file.size > 20 * 1024 * 1024) return setError("That file is too large to be a Goodreads export.");
    try {
      setParsed(readGoodreadsExport(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t read that file.");
    }
  }

  async function runImport() {
    if (!parsed) return;
    setError(null);
    skipRef.current = false;
    const ctrl = new AbortController();
    stopRef.current = ctrl;
    // 1. Covers: looked up two at a time; "Skip" imports straight away with designed covers.
    const list: ImportedBook[] = parsed.books.map((b) => ({ ...b }));
    let done = 0;
    let found = 0;
    setStage({ kind: "covers", done, found });
    let next = 0;
    const worker = async () => {
      while (next < list.length && !skipRef.current && !ctrl.signal.aborted) {
        const b = list[next++];
        const url = await findCover(b, ctrl.signal);
        if (url) {
          b.cover_url = url;
          found++;
        }
        done++;
        setStage({ kind: "covers", done, found });
      }
    };
    await Promise.all([worker(), worker()]);
    if (ctrl.signal.aborted) return;
    // 2. Save, spread across the shelves of the room you're in.
    setStage({ kind: "saving" });
    try {
      const result = await importBooks(
        list.map(({ isbn: _isbn, ...b }) => b),
        shelves.map((s) => s.id),
      );
      setStage({ kind: "done", ...result, covers: found });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed. Please try again.");
      setStage({ kind: "pick" });
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Import from Goodreads">
      {stage.kind === "done" ? (
        <div className="space-y-4 py-2">
          <p className="font-serif text-2xl">
            {stage.added} {stage.added === 1 ? "book is" : "books are"} on your shelves 📚
          </p>
          {stage.skipped > 0 && <p className="text-sm text-ink-soft">{stage.skipped} were already on your shelves, so they were skipped.</p>}
          <p className="text-sm text-ink-soft">
            Your ratings, reviews, dates read and Goodreads shelves (as tags) came along. Books without a cover found got a designed cover in their own colour; you can change any cover by opening the book and tapping Edit.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              reset();
              onClose();
              onDone?.();
            }}
          >
            See my shelf
          </button>
        </div>
      ) : stage.kind === "covers" || stage.kind === "saving" ? (
        <div className="space-y-4 py-2" aria-live="polite">
          <p className="font-serif text-2xl">{stage.kind === "saving" ? "Putting them on the shelves…" : "Finding covers…"}</p>
          {stage.kind === "covers" && parsed && (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={parsed.books.length} aria-valuenow={stage.done}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(stage.done / parsed.books.length) * 100}%` }} />
              </div>
              <p className="text-sm text-ink-soft">
                {stage.done} of {parsed.books.length} books checked · {stage.found} covers found
              </p>
              <button type="button" className="btn-ghost" onClick={() => (skipRef.current = true)}>
                Skip the rest and import now
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <ol className="space-y-2 text-sm">
            <li>
              <span className="font-medium">1.</span> On a computer or in your phone’s browser, open{" "}
              <a className="text-accent underline underline-offset-2" href="https://www.goodreads.com/review/import" target="_blank" rel="noreferrer">
                goodreads.com → My Books → Import and export
              </a>{" "}
              and tap <strong>Export Library</strong>.
            </li>
            <li>
              <span className="font-medium">2.</span> When the link appears, download the file (it ends in <code className="rounded bg-ink/5 px-1">.csv</code>).
            </li>
            <li>
              <span className="font-medium">3.</span> Choose that file here.
            </li>
          </ol>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center text-ink-soft transition hover:border-accent hover:text-accent"
          >
            <UploadIcon width={22} height={22} />
            <span className="font-medium">{fileName || "Choose your Goodreads export"}</span>
            <span className="text-xs">goodreads_library_export.csv</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} aria-label="Goodreads export file" />

          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {parsed && (
            <div className="rounded-xl bg-wall/50 p-4 ring-1 ring-line">
              <p className="font-serif text-xl">{parsed.books.length} books found</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <li>
                  ✓ Read: <span className="font-mono">{parsed.counts.read}</span>
                </li>
                <li>
                  📖 Reading: <span className="font-mono">{parsed.counts.reading}</span>
                </li>
                <li>
                  🔖 Want to read: <span className="font-mono">{parsed.counts.toRead}</span>
                </li>
                <li>
                  ❤ Favourites: <span className="font-mono">{parsed.counts.favourites}</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-ink-soft">
                They’ll go on the shelves in <strong>{roomName}</strong>
                {books.length ? ", and books already on your shelves will be skipped" : ""}. You can rearrange them afterwards.
              </p>
              <button type="button" className="btn-primary mt-4 w-full py-2.5" onClick={runImport}>
                Import {parsed.books.length} books
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
