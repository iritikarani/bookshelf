"use client";

import { useRef, useState } from "react";
import { readGoodreadsExport, type GoodreadsImport } from "@/lib/goodreads";
import { useLibrary } from "@/lib/library";
import { UploadIcon } from "./Icons";
import { Sheet } from "./Sheet";

/** Bring a reader's whole Goodreads library in from their export file. */
export function ImportGoodreads({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { importBooks, books } = useLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<GoodreadsImport | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(null);

  const reset = () => {
    setParsed(null);
    setFileName("");
    setError(null);
    setDone(null);
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    reset();
    setFileName(file.name);
    try {
      setParsed(readGoodreadsExport(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  async function runImport() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      setDone(await importBooks(parsed.books));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import from Goodreads"
    >
      {done ? (
        <div className="space-y-4 py-2">
          <p className="font-serif text-2xl">
            {done.added} {done.added === 1 ? "book" : "books"} on your shelves 📚
          </p>
          {done.skipped > 0 && <p className="text-sm text-ink-soft">{done.skipped} were already there, so I skipped them.</p>}
          <p className="text-sm text-ink-soft">Your ratings, reviews and dates came along. Books you hadn’t finished are marked 📖 Reading now or 🔖 To read.</p>
          <button type="button" className="btn-primary" onClick={() => { reset(); onClose(); }}>
            See my shelf
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <ol className="space-y-2 text-sm">
            <li>
              <span className="font-medium">1.</span> On <a className="text-accent underline underline-offset-2" href="https://www.goodreads.com/review/import" target="_blank" rel="noreferrer">goodreads.com → My Books → Import and export</a>, tap <strong>Export Library</strong>.
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
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} aria-label="Goodreads export file" />

          {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          {parsed && (
            <div className="rounded-xl bg-wall/50 p-4 ring-1 ring-line">
              <p className="font-serif text-xl">{parsed.books.length} books found</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <li>✓ Read: <span className="font-mono">{parsed.counts.read}</span></li>
                <li>📖 Reading now: <span className="font-mono">{parsed.counts.reading}</span></li>
                <li>🔖 To read: <span className="font-mono">{parsed.counts.toRead}</span></li>
                <li>❤ Favourites: <span className="font-mono">{parsed.counts.favourites}</span></li>
              </ul>
              <p className="mt-3 text-xs text-ink-soft">
                They’ll be spread across your shelves{books.length ? ", and any already on them will be skipped" : ""}. You can rearrange them afterwards.
              </p>
              <button type="button" className="btn-primary mt-4 w-full py-2.5" onClick={runImport} disabled={busy}>
                {busy ? "Putting them on the shelves…" : `Import ${parsed.books.length} books`}
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
