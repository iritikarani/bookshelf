"use client";

import { useEffect, useState } from "react";
import { defaultCoverColor, probeImage } from "@/lib/covers";
import { useLibrary } from "@/lib/library";
import { finishedCount, isUnlocked } from "@/lib/rewards";
import { type SearchResult } from "@/lib/search";
import { useBookSearch } from "@/lib/useBookSearch";
import { AESTHETICS } from "@/lib/themes";
import type { Book, DecorKind, ReadStatus } from "@/lib/types";
import { StylePreview } from "./ArrangeSheet";
import { BookCover } from "./BookCover";
import { DECOR, DecorArt } from "./Decor";
import { SearchIcon } from "./Icons";
import { ResultCover } from "./ResultCover";

const STEPS = ["Choose your room", "Add your first books", "Name your shelf", "Decorate"] as const;
const SHELF_IDEAS = ["Comfort Reads", "Books That Broke Me", `${new Date().getFullYear()} TBR`, "Fantasy Corner", "Romance", "Favourites"];
const FIRST_DECOR: DecorKind[] = ["plant", "candles", "cat", "chai", "frame", "glasses", "fairyjar", "typewriter", "calendar"];

/** The first cover candidate that actually loads, best first. */
async function bestCover(r: SearchResult): Promise<string | null> {
  const candidates = r.covers.slice(0, 4);
  const ok = await Promise.all(candidates.map((u) => probeImage(u)));
  return candidates.find((_, i) => ok[i]) ?? null;
}

/**
 * "Welcome to your little library": a short, skippable setup for a brand-new shelf.
 * Room → first books → shelf name → a few objects → "Your room is ready".
 */
export function Onboarding({ name, onDone }: { name?: string | null; onDone: () => void }) {
  const lib = useLibrary();
  const { profile, shelves, setShelfStyle, addBook, updateBook, renameShelf, addDecor } = lib;
  const [step, setStep] = useState(-1); // -1 welcome, 0..3 steps, 4 done
  const firstShelf = shelves[0];

  // step 2: books
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<Book[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  // step 3: shelf name
  const [shelfName, setShelfName] = useState("");
  // step 4: decor
  const [decor, setDecor] = useState<DecorKind[]>([]);
  const [finishing, setFinishing] = useState(false);

  const { results, searching, failed: searchFailed, offline, retry: retrySearch } = useBookSearch(query, { enabled: step === 1, limit: 6 });

  const add = async (r: SearchResult) => {
    if (!firstShelf || adding) return;
    setAdding(r.key);
    try {
      const cover = await bestCover(r);
      const book = await addBook({
        shelf_id: firstShelf.id,
        title: r.title,
        author: r.author,
        cover_url: cover,
        uploaded_cover: null,
        cover_color: cover ? null : defaultCoverColor(r.title),
        display: added.length === 1 ? "cover" : "spine", // one face-out cover makes the first shelf look styled
        status: "to_read", // never assume it's been read; the picker right below changes it
        favourite: false,
        year_published: r.year,
        pages: r.pages,
        genre: r.genre,
        short_description: r.description,
        rating: 0,
        what_i_liked: null,
        favourite_line: null,
        date_finished: null,
      });
      setAdded((a) => [...a, book]);
      setQuery("");
    } finally {
      setAdding(null);
    }
  };

  const setStatus = (b: Book, status: ReadStatus) => {
    setAdded((a) => a.map((x) => (x.id === b.id ? { ...x, status } : x)));
    updateBook(b.id, { status, rating: 0, date_finished: null });
  };

  const finish = async () => {
    setFinishing(true);
    try {
      const name = shelfName.trim();
      if (name && firstShelf) await renameShelf(firstShelf.id, name.slice(0, 60));
      // Spread the objects across the shelves so the whole room feels lived in.
      for (const [i, kind] of decor.entries()) {
        const shelf = shelves[i % Math.max(1, shelves.length)];
        if (shelf) await addDecor(kind, shelf.id);
      }
    } finally {
      setFinishing(false);
      setStep(4);
    }
  };

  const finished = finishedCount(lib.books);
  const next = () => (step === 3 ? finish() : setStep((s) => s + 1));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="flex max-h-[94dvh] w-full max-w-xl animate-fade-in flex-col overflow-hidden rounded-t-3xl bg-paper text-ink shadow-2xl sm:rounded-3xl">
        {/* top bar: progress + skip */}
        <div className="flex items-center gap-3 px-5 pt-5">
          {step >= 0 && step < 4 ? (
            <ol className="flex flex-1 gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((s, i) => (
                <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-ink/10"}`} aria-current={i === step ? "step" : undefined}>
                  <span className="sr-only">{s}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="flex-1" />
          )}
          {step < 4 && (
            <button type="button" className="text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline" onClick={onDone}>
              Skip for now
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4">
          {step === -1 && (
            <div className="py-6 text-center">
              <p className="text-5xl" aria-hidden>📚</p>
              <h2 id="welcome-title" className="mt-4 font-serif text-3xl leading-tight md:text-4xl">
                Welcome to your little library{name ? `, ${name}` : ""}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-lg text-ink-soft">Let’s build your reading space. It takes about a minute.</p>
              <ol className="mx-auto mt-6 max-w-xs space-y-2 text-left text-base">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm text-accent">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {step === 0 && (
            <section aria-labelledby="welcome-title">
              <h2 id="welcome-title" className="font-serif text-2xl">Choose your room</h2>
              <p className="mt-1 text-ink-soft">You can change it any time from Decorate room.</p>
              <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Room">
                {AESTHETICS.filter((a) => isUnlocked(a.id, finished)).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={profile?.shelf_style === a.id}
                    onClick={() => setShelfStyle(a.id)}
                    className={`rounded-xl border p-1.5 text-left transition ${profile?.shelf_style === a.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-ink-soft"}`}
                  >
                    <StylePreview a={a} />
                    <p className="mt-1.5 px-1 text-sm font-medium">{a.name}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="welcome-title">
              <h2 id="welcome-title" className="font-serif text-2xl">Add your first books</h2>
              <p className="mt-1 text-ink-soft">Three books you love, or whatever’s on your nightstand.</p>
              {added.length > 0 && (
                <ul className="mt-4 space-y-2" aria-label="Added so far">
                  {added.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-xl bg-wall/60 p-2 ring-1 ring-line/60">
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-sm shadow">
                        <BookCover book={b} />
                      </div>
                      <p className="min-w-0 flex-1 truncate font-medium">{b.title}</p>
                      <select className="field w-auto py-1.5 text-sm" aria-label={`Status of ${b.title}`} value={b.status} onChange={(e) => setStatus(b, e.target.value as ReadStatus)}>
                        <option value="to_read">Want to read</option>
                        <option value="reading">Reading</option>
                        <option value="read">Finished</option>
                      </select>
                    </li>
                  ))}
                </ul>
              )}
              {added.length < 3 ? (
                <>
                  <div className="relative mt-4">
                    <SearchIcon className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft ${searching ? "animate-pulse" : ""}`} width={20} height={20} />
                    <input
                      type="search"
                      className="field rounded-full py-3.5 pl-12 text-base"
                      placeholder={`Book ${added.length + 1}: search title or author…`}
                      aria-label="Search for a book"
                      autoComplete="off"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {searchFailed && !searching && (
                    <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-ink-soft">
                      <p>{offline ? "You’re offline. Connect to the internet to search for books." : "No matches yet. Try fewer words, the author’s name, or the ISBN."}</p>
                      <button type="button" className="font-medium text-accent underline-offset-2 hover:underline" onClick={retrySearch}>
                        Search again
                      </button>
                    </div>
                  )}
                  {!searchFailed && !searching && query.trim().length >= 2 && !results.length && (
                    <p className="mt-3 px-1 text-sm text-ink-soft" aria-live="polite">
                      No matches yet. Try fewer words, the author’s name, or the ISBN.
                    </p>
                  )}
                  {results.length > 0 && (
                    <ul className="mt-3 divide-y divide-line/70 overflow-hidden rounded-2xl ring-1 ring-line/70" aria-label="Matching books">
                      {results.map((r) => (
                        <li key={r.key}>
                          <button type="button" disabled={Boolean(adding)} onClick={() => add(r)} className="flex w-full items-center gap-3 p-2.5 text-left transition hover:bg-accent/5 disabled:opacity-60">
                            <div className="h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-ink/10">
                              <ResultCover r={r} width={40} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{r.title}</p>
                              <p className="truncate text-sm text-ink-soft">{r.author || "Unknown author"}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">{adding === r.key ? "Adding…" : "Add"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mt-4 rounded-xl bg-accent/10 p-3 text-center">Three books on the shelf. Lovely. 🌿</p>
              )}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="welcome-title">
              <h2 id="welcome-title" className="font-serif text-2xl">Name your shelf</h2>
              <p className="mt-1 text-ink-soft">Give your top shelf a name of its own. It shows on the wood.</p>
              <input
                className="field mt-4 font-serif text-xl"
                placeholder="e.g. Comfort Reads"
                aria-label="Shelf name"
                maxLength={60}
                value={shelfName}
                onChange={(e) => setShelfName(e.target.value)}
                autoFocus
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {SHELF_IDEAS.map((idea) => (
                  <button key={idea} type="button" onClick={() => setShelfName(idea)} className={`rounded-full border px-3 py-1.5 text-sm transition ${shelfName === idea ? "border-accent bg-accent/10" : "border-line text-ink-soft hover:border-accent hover:text-accent"}`}>
                    ♡ {idea}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="welcome-title">
              <h2 id="welcome-title" className="font-serif text-2xl">Decorate</h2>
              <p className="mt-1 text-ink-soft">Pick up to three things for your shelves. More unlock as you read.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {FIRST_DECOR.map((kind) => {
                  const d = DECOR.find((x) => x.kind === kind)!;
                  const on = decor.includes(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && decor.length >= 3}
                      onClick={() => setDecor((cur) => (on ? cur.filter((k) => k !== kind) : [...cur, kind]))}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition disabled:opacity-40 ${on ? "border-accent bg-accent/10 ring-2 ring-accent/40" : "border-line hover:border-accent"}`}
                    >
                      <span className="flex h-16 items-end">
                        <span style={{ height: Math.max(26, 60 * d.h), aspectRatio: `${d.viewBox[0]} / ${d.viewBox[1]}` }}>
                          <DecorArt kind={kind} />
                        </span>
                      </span>
                      <span className="text-xs leading-tight">{on ? "✓ " : ""}{d.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 4 && (
            <div className="py-8 text-center">
              <p className="text-5xl" aria-hidden>✨</p>
              <h2 id="welcome-title" className="mt-4 font-serif text-3xl">Your room is ready</h2>
              <p className="mx-auto mt-3 max-w-sm text-lg text-ink-soft">
                Add books whenever you finish one, drag things around to make it yours, and watch the room grow as you read.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          {step > 0 && step < 4 ? (
            <button type="button" className="btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step === -1 && (
            <button type="button" className="btn-primary px-6 py-3 text-base" onClick={() => setStep(0)}>
              Let’s start
            </button>
          )}
          {step >= 0 && step < 4 && (
            <button type="button" className="btn-primary px-6 py-3 text-base" disabled={finishing} onClick={next}>
              {step === 3 ? (finishing ? "Setting up…" : "Finish") : (step === 1 && !added.length) || (step === 2 && !shelfName.trim()) || (step === 3 && !decor.length) ? "Skip this step" : "Next"}
            </button>
          )}
          {step === 4 && (
            <button type="button" className="btn-primary px-6 py-3 text-base" onClick={onDone}>
              See my room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
