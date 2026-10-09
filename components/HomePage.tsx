"use client";

import type { ReactNode } from "react";
import { yearOf } from "@/lib/date";
import { averageRating, monthStreak } from "@/lib/stats";
import { quotesOf } from "@/lib/quotes";
import type { Book } from "@/lib/types";
import { useCoverColor } from "@/lib/useCoverColor";
import type { AppTab } from "@/lib/useTab";
import { EmptyState } from "./AppNav";
import { GoalProgress } from "./ProfilePage";
import { BookCover } from "./BookCover";
import { PlusIcon } from "./Icons";
import { ProgressBar, progressPercent } from "./ReadingProgress";
import { StarDisplay } from "./StarRating";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const newest = (a: Book, b: Book) => b.created_at.localeCompare(a.created_at);

/** Home: what you're reading, what's next, and the way into your room. Never anything made up. */
export function HomePage({
  books,
  name,
  rooms,
  goal,
  onSetGoal,
  example,
  onOpen,
  onAdd,
  onTab,
}: {
  books: Book[];
  name?: string | null;
  rooms: number;
  goal?: number | null;
  onSetGoal?: () => void;
  example: boolean;
  onOpen: (b: Book) => void;
  onAdd: () => void;
  onTab: (t: AppTab) => void;
}) {
  const now = new Date();
  const reading = books.filter((b) => b.status === "reading").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const next = books.filter((b) => b.status === "to_read").sort(newest);
  const finished = books
    .filter((b) => b.status === "read")
    .sort((a, b) => (b.date_finished ?? b.created_at).localeCompare(a.date_finished ?? a.created_at));
  const thisYear = finished.filter((b) => yearOf(b.date_finished) === now.getFullYear());
  const pages = thisYear.reduce((s, b) => s + (b.pages ?? 0), 0);
  const avg = averageRating(thisYear);
  const recent = [...books].sort(newest).slice(0, 12);
  const streak = monthStreak(books);
  // The favourite to show: the most recently finished favourite, else any favourite.
  const favourite = books.filter((b) => b.favourite).sort((a, b) => (b.date_finished ?? b.updated_at).localeCompare(a.date_finished ?? a.updated_at))[0];

  return (
    <div className="space-y-10 md:space-y-12">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-soft">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-2 font-serif text-[34px] leading-[1.05] tracking-tight md:text-5xl">
          {greeting(now)}
          {name ? `, ${name}` : ""}.
        </h1>
      </div>

      {example ? (
        <EmptyState
          title="Your shelves are waiting for their first story."
          action={
            <button type="button" className="btn-primary px-5 py-3" onClick={onAdd}>
              <PlusIcon width={16} height={16} /> Add a Book
            </button>
          }
        >
          Add the book you’re reading now, or one you loved. It goes straight onto the shelf in your room.
        </EmptyState>
      ) : (
        <>
          <ShelfCard books={recent} total={books.length} rooms={rooms} onOpen={() => onTab("shelf")} />

          <Section title="Continue reading" count={reading.length}>
            {reading.length ? (
              <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
                {reading.map((b) => (
                  <li key={b.id} className="w-[78%] max-w-[340px] shrink-0 snap-start md:w-auto md:max-w-none">
                    <ReadingCard book={b} onOpen={() => onOpen(b)} />
                  </li>
                ))}
              </ul>
            ) : (
              <Quiet>
                <span className="font-serif text-lg text-ink">Pick a story for tonight.</span> Open a book from <em>Up next</em> and mark it <strong>Reading</strong>.
              </Quiet>
            )}
          </Section>

          <Section title="Up next" count={next.length}>
            {next.length ? <CoverRow books={next} onOpen={onOpen} /> : <Quiet>Books you want to read will wait for you here.</Quiet>}
          </Section>

          <Section title="Recently finished" count={finished.length}>
            {finished.length ? <CoverRow books={finished.slice(0, 16)} onOpen={onOpen} rated /> : <Quiet>Finish a book and it’ll show up here, with your rating.</Quiet>}
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <section aria-labelledby="home-year" className="rounded-3xl bg-paper/80 p-5 ring-1 ring-line/70 md:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="home-year" className="font-serif text-2xl">
                  {now.getFullYear()} so far
                </h2>
                <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={() => onTab("profile")}>
                  All my stats ›
                </button>
              </div>
              <div className="mt-4">
                <GoalProgress goal={goal} books={books} onSet={onSetGoal} />
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Pages" value={pages.toLocaleString()} />
                <Stat label="Avg rating" value={avg === null ? "–" : `${avg.toFixed(1)}★`} />
                <Stat label="Streak" value={`${streak} mo`} />
              </dl>
            </section>
            <FavouriteCard book={favourite} onOpen={onOpen} />
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 flex items-baseline gap-2 font-serif text-2xl">
        {title}
        {count > 0 && <span className="font-mono text-sm text-ink-soft">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-ink-soft/30 px-4 py-5 text-sm text-ink-soft">{children}</p>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dd className="font-mono text-2xl font-medium">{value}</dd>
      <dt className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">{label}</dt>
    </div>
  );
}

/** The way into the room: the newest books standing on a little shelf. */
function ShelfCard({ books, total, rooms, onOpen }: { books: Book[]; total: number; rooms: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-3xl bg-paper/80 text-left shadow-sm ring-1 ring-line/70 transition hover:shadow-md"
    >
      <div className="flex items-end gap-1.5 overflow-hidden px-5 pt-6 md:gap-2 md:px-6" aria-hidden>
        {books.map((b, i) => (
          <div
            key={b.id}
            className="h-[88px] w-[58px] shrink-0 overflow-hidden rounded-[2px] shadow-md transition-transform duration-300 group-hover:-translate-y-1 md:h-[112px] md:w-[74px]"
            style={{ transitionDelay: `${i * 25}ms` }}
          >
            <BookCover book={b} />
          </div>
        ))}
      </div>
      <div className="plank mx-3 rounded-sm" aria-hidden />
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <div>
          <p className="font-serif text-xl">My Shelf</p>
          <p className="text-sm text-ink-soft">
            {total} {total === 1 ? "book" : "books"}
            {rooms > 1 ? ` in ${rooms} rooms` : ""}
          </p>
        </div>
        <span className="btn-primary pointer-events-none">Open my room ›</span>
      </div>
    </button>
  );
}

function ReadingCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const color = useCoverColor(book);
  const pct = progressPercent(book);
  return (
    <button type="button" onClick={onOpen} className="flex w-full gap-4 rounded-2xl bg-paper/90 p-3.5 text-left ring-1 ring-line/70 transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none">
      <div className="h-[104px] w-[70px] shrink-0 overflow-hidden rounded-[3px] shadow-md">
        <BookCover book={book} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 font-medium leading-snug">{book.title}</p>
        {book.author && <p className="truncate text-sm text-ink-soft">{book.author}</p>}
        <div className="mt-auto pt-2">
          {pct !== null ? (
            <>
              <p className="mb-1.5 flex justify-between text-xs text-ink-soft">
                <span>
                  Page <span className="font-mono">{book.current_page}</span> of <span className="font-mono">{book.pages}</span>
                </span>
                <span className="font-mono">{pct}%</span>
              </p>
              <ProgressBar percent={pct} color={color} />
            </>
          ) : (
            <p className="text-xs font-medium text-accent">Add the page you’re on ›</p>
          )}
        </div>
      </div>
    </button>
  );
}

export function CoverRow({ books, onOpen, rated }: { books: Book[]; onOpen: (b: Book) => void; rated?: boolean }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {books.map((b) => (
        <li key={b.id} className="w-[92px] shrink-0 snap-start md:w-[110px]">
          <button type="button" onClick={() => onOpen(b)} className="group block w-full text-left" aria-label={`${b.title}${b.author ? ` by ${b.author}` : ""}`}>
            <div className="aspect-[2/3] overflow-hidden rounded-[3px] shadow-md transition group-hover:-translate-y-1 group-hover:shadow-lg motion-reduce:transform-none">
              <BookCover book={b} />
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{b.title}</p>
            {rated && b.rating > 0 && <StarDisplay rating={b.rating} size={11} className="mt-0.5" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

function FavouriteCard({ book, onOpen }: { book?: Book; onOpen: (b: Book) => void }) {
  if (!book) {
    return (
      <section aria-label="Favourite book" className="flex flex-col justify-center rounded-3xl border border-dashed border-ink-soft/35 p-5 text-center md:p-6">
        <p className="text-2xl" aria-hidden>
          ❤
        </p>
        <p className="mt-2 font-serif text-xl">Your favourite stories will live here.</p>
        <p className="mt-1 text-sm text-ink-soft">Tap ❤ on a book you love.</p>
      </section>
    );
  }
  const line = quotesOf(book)[0]?.text;
  return (
    <section aria-labelledby="home-fav" className="rounded-3xl bg-paper/80 p-5 ring-1 ring-line/70 md:p-6">
      <h2 id="home-fav" className="font-serif text-2xl">
        A favourite
      </h2>
      <button type="button" onClick={() => onOpen(book)} className="group mt-4 flex w-full gap-4 text-left">
        <div className="h-[108px] w-[72px] shrink-0 overflow-hidden rounded-[3px] shadow-md transition group-hover:-translate-y-0.5">
          <BookCover book={book} />
        </div>
        <div className="min-w-0">
          <p className="font-medium leading-snug group-hover:underline">{book.title}</p>
          {book.author && <p className="text-sm text-ink-soft">{book.author}</p>}
          {book.rating > 0 && <StarDisplay rating={book.rating} size={13} className="mt-1" />}
          {line && <p className="mt-2 line-clamp-3 font-book text-[17px] italic leading-snug">“{line}”</p>}
        </div>
      </button>
    </section>
  );
}
