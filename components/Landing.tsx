"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { EXAMPLE_ITEMS, EXAMPLE_SHELF } from "@/lib/examples";
import type { ShelfItem } from "@/lib/types";
import { BooksIcon, BrushIcon, JournalIcon } from "./Icons";
import { RoomWindow } from "./RoomScene";
import { ShelfWall } from "./ShelfWall";

const ProgressIcon = (p: { width: number; height: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden {...p}>
    <path d="M4 19V5M4 19h16" />
    <path d="M8 15l3.5-4 3 2.5L19 8" />
  </svg>
);

const FEATURES: { title: string; text: string; icon: (p: { width: number; height: number }) => ReactNode }[] = [
  { title: "Build your bookshelf", text: "Spines, covers, leaning and stacked books, on shelves you name, in as many rooms as you like.", icon: BooksIcon },
  { title: "Track your reading", text: "What you’re reading, what’s next and what you’ve finished, with pages, progress and your year in books.", icon: ProgressIcon },
  { title: "Save your thoughts", text: "A journal for every book: what stayed with you, the line you underlined, and how you rated it.", icon: JournalIcon },
  { title: "Make your reading space yours", text: "Wallpaper, a reading lamp, the view from the window, the seasons and soft rain. A room that feels like home.", icon: BrushIcon },
];

/** The front door for visitors: what this is, a real shelf to look at, and one clear way in. */
export function Landing() {
  const examples = useMemo(() => new Map<string, ShelfItem[]>([[EXAMPLE_SHELF.id, EXAMPLE_ITEMS]]), []);
  return (
    <div data-style="pastel" className="room min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-5 md:px-8 md:pt-7">
        <p className="font-serif text-xl tracking-tight md:text-2xl">
          Cosmic Space<span className="text-accent">.</span>
        </p>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login/" className="btn px-3 text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <Link href="/login/?signup=1" className="btn-primary hidden sm:inline-flex">
            Create My Shelf
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:px-8 md:pt-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <h1 className="font-serif text-[52px] leading-[0.98] tracking-tight sm:text-7xl lg:text-[84px]">
              Your books.
              <br />
              Your shelf.
              <br />
              <span className="text-accent">Your space.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              Create your own digital bookshelf, organise the books you love, track your reading, and keep your thoughts in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login/?signup=1" className="btn-primary px-6 py-3 text-base">
                Create My Shelf
              </Link>
              <a href="#explore" className="btn-ghost px-6 py-3 text-base">
                Explore
              </a>
            </div>
          </div>

          {/* A real shelf, in a real room: the product itself, not a picture of it. */}
          <div className="relative overflow-hidden rounded-[28px] bg-paper/40 p-4 shadow-[0_40px_80px_-40px_rgba(60,40,30,0.55)] ring-1 ring-line/70 sm:p-6" aria-label="A bookshelf in Cosmic Space">
            <div className="flex items-end gap-5">
              <RoomWindow className="mb-8 hidden h-[200px] w-[130px] shrink-0 sm:block" />
              <div className="pointer-events-none min-w-0 flex-1 [--cover-h:112px] [--cover-w:76px] [--spine-scale:0.88] [&_.shelf-cell_h2]:hidden" aria-hidden>
                <ShelfWall shelves={[EXAMPLE_SHELF]} itemsByShelf={examples} structure="case" onOpenBook={() => {}} readOnly floor={false} />
              </div>
            </div>
          </div>
        </section>

        <section id="explore" className="scroll-mt-6 border-t border-line/70 bg-paper/50">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <h2 className="max-w-xl font-serif text-4xl leading-tight md:text-5xl">A home for every book you love.</h2>
            <ul className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper text-accent shadow-sm ring-1 ring-line">
                    <f.icon width={22} height={22} />
                  </span>
                  <div>
                    <h3 className="font-serif text-2xl">{f.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-ink-soft">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 text-center md:px-8 md:py-24">
          <h2 className="font-serif text-4xl md:text-5xl">Your shelf is waiting.</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">Free, private by default, and yours to arrange. Share it only if you want to.</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/login/?signup=1" className="btn-primary px-7 py-3 text-base">
              Create My Shelf
            </Link>
            <Link href="/login/" className="text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline">
              Already have a shelf? Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 py-8 text-center text-sm text-ink-soft">
        Cosmic Space<span className="text-accent">.</span> Your books. Your shelf. Your space.
      </footer>
    </div>
  );
}
