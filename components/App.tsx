"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EXAMPLE_BOOKS, EXAMPLE_ITEMS, EXAMPLE_SHELF, isExample } from "@/lib/examples";
import { LibraryProvider, useLibrary } from "@/lib/library";
import { store } from "@/lib/store";
import { summary } from "@/lib/stats";
import { aestheticOf } from "@/lib/themes";
import type { Book, ShelfItem } from "@/lib/types";
import { useTab } from "@/lib/useTab";
import { todayISO } from "@/lib/date";
import { MARKS, matchesFilter, type MarkFilter } from "./Marks";
import { RoomScene } from "./RoomScene";
import { AddBookDialog } from "./AddBookDialog";
import { ArrangeSheet } from "./ArrangeSheet";
import { BookDetail } from "./BookDetail";
import { DecorSheet } from "./DecorSheet";
import { EditShelves } from "./EditShelves";
import { Header } from "./Header";
import { BrushIcon, GearIcon, PlusIcon, ShareIcon, ShelvesIcon, XIcon } from "./Icons";
import { QuoteWall } from "./QuoteWall";
import { ReadingYear } from "./ReadingYear";
import { Settings } from "./Settings";
import { ShareDialog } from "./ShareDialog";
import { ShelfWall } from "./ShelfWall";

export function App() {
  return (
    <LibraryProvider>
      <AppInner />
    </LibraryProvider>
  );
}

function AppInner() {
  const lib = useLibrary();
  const { user, authReady, loading, profile, shelves, books, itemsByShelf } = lib;
  const [tab, setTab] = useTab();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shelvesOpen, setShelvesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [decorId, setDecorId] = useState<string | null>(null);
  const aesthetic = aestheticOf(profile?.shelf_style);

  const [filter, setFilter] = useState<MarkFilter>("all");
  const router = useRouter();
  // Signed out with accounts switched on: the front door is the login page.
  useEffect(() => {
    if (authReady && !user && store.mode === "supabase") router.replace("/login/");
  }, [authReady, user, router]);
  const showExamples = !loading && books.length === 0 && lib.decor.length === 0;
  const exampleMap = useMemo(() => new Map<string, ShelfItem[]>([[EXAMPLE_SHELF.id, EXAMPLE_ITEMS]]), []);
  // Quote wall & reading year show the examples too until the first real book arrives.
  const viewShelves = showExamples ? [EXAMPLE_SHELF, ...shelves] : shelves;
  const viewBooks = showExamples ? EXAMPLE_BOOKS : books;
  const stats = summary(books);

  if (!authReady) return <Splash />;
  if (!user && store.mode === "supabase") return <Splash />; // on its way to /login

  const openBook = openId ? (viewBooks.find((b) => b.id === openId) ?? null) : null;
  const openList = openBook ? (isExample(openBook) ? exampleMap.get(EXAMPLE_SHELF.id) : itemsByShelf.get(openBook.shelf_id)) ?? [] : [];
  const openDecor = decorId ? (lib.decor.find((d) => d.id === decorId) ?? null) : null;
  const openIndex = openBook ? openList.findIndex((b) => b.id === openBook.id) : 0;

  const startAdd = () => {
    setEditing(null);
    setAddOpen(true);
  };

  return (
    <div data-style={aesthetic.id} className="room min-h-dvh pb-24">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2">
        Skip to shelves
      </a>
      <Header
        stats={stats}
        tab={tab}
        onTab={setTab}
        actions={
          <>
            <button type="button" className="btn-primary hidden sm:inline-flex" onClick={startAdd}>
              <PlusIcon width={16} height={16} /> Add a book
            </button>
            <IconButton label="Arrange: aesthetic and decor" onClick={() => setArrangeOpen(true)}>
              <BrushIcon />
            </IconButton>
            <IconButton label="Share my shelf" onClick={() => setShareOpen(true)} disabled={books.length === 0}>
              <ShareIcon />
            </IconButton>
            <IconButton label="Edit shelves" onClick={() => setShelvesOpen(true)}>
              <ShelvesIcon />
            </IconButton>
            <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
              <GearIcon />
            </IconButton>
          </>
        }
      />

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        {loading ? (
          <ShelfSkeleton />
        ) : tab === "shelf" ? (
          <>
            {showExamples && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-ink-soft/40 bg-paper/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-soft">These are example books. They disappear when you add your first one.</p>
                <button type="button" className="btn-primary shrink-0" onClick={startAdd}>
                  <PlusIcon width={16} height={16} /> Add my first book
                </button>
              </div>
            )}
            <MarkFilterBar value={filter} onChange={setFilter} books={viewBooks} />
            <RoomScene standing={aesthetic.structure === "case"}>
              {showExamples ? (
                <ShelfWall
                  shelves={[EXAMPLE_SHELF]}
                  itemsByShelf={exampleMap}
                  structure={aesthetic.structure}
                  onOpenBook={(b) => setOpenId(b.id)}
                  filter={filter}
                  floor={false}
                  readOnly
                />
              ) : (
                <ShelfWall
                  shelves={shelves}
                  itemsByShelf={itemsByShelf}
                  structure={aesthetic.structure}
                  onOpenBook={(b) => setOpenId(b.id)}
                  onOpenDecor={(d) => setDecorId(d.id)}
                  onMove={(id, shelfId, index) => lib.moveItem(id, shelfId, index)}
                  justAddedId={lib.justAddedId}
                  filter={filter}
                  floor={false}
                />
              )}
            </RoomScene>
            <p className="mt-4 hidden text-center text-xs text-ink-soft md:block">
              Tip: drag books and objects to rearrange them. Click the lamp to switch it on or off. The brush changes the room.
            </p>
          </>
        ) : tab === "quotes" ? (
          <>
            {showExamples && <ExampleNote />}
            <QuoteWall books={viewBooks} onOpen={(b) => setOpenId(b.id)} />
          </>
        ) : (
          <>
            {showExamples && <ExampleNote />}
            <ReadingYear shelves={viewShelves} books={viewBooks} onOpen={(b) => setOpenId(b.id)} />
          </>
        )}
      </main>

      {/* Mobile floating add button */}
      <button
        type="button"
        onClick={startAdd}
        className="btn-primary fixed bottom-5 right-5 z-30 px-5 py-3 shadow-xl sm:hidden"
        aria-label="Add a book"
      >
        <PlusIcon width={18} height={18} /> Add a book
      </button>

      <BookDetail
        book={openBook}
        shelves={isExample(openBook ?? { id: "" }) ? [EXAMPLE_SHELF] : shelves}
        index={openIndex}
        shelfSize={openList.length}
        example={openBook ? isExample(openBook) : false}
        ownerName={profile?.display_name}
        onClose={() => setOpenId(null)}
        onEdit={(b) => {
          setEditing(b);
          setAddOpen(true);
        }}
        onMove={(b, shelfId) => lib.sendToShelf(b.id, shelfId)}
        onNudge={(b, dir) => lib.nudgeItem(b.id, dir)}
        onDisplay={(b, display) => lib.updateBook(b.id, { display })}
        onMarks={(b, patch) => lib.updateBook(b.id, patch.status && patch.status !== "read" ? { ...patch, rating: 0, date_finished: null } : patch.status === "read" && !b.date_finished ? { ...patch, date_finished: todayISO() } : patch)}
        onRate={(b, rating) => lib.updateBook(b.id, { rating })}
        onRemove={(b) => lib.removeBook(b.id)}
      />

      <AddBookDialog
        open={addOpen}
        editing={editing}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        onSaved={(b) => {
          if (b) {
            setOpenId(null);
            setTab("shelf");
            // Bring the new book into view once it lands.
            window.setTimeout(() => {
              document.querySelector(`[data-item-id="${b.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            }, 80);
          }
        }}
      />
      <ArrangeSheet open={arrangeOpen} onClose={() => setArrangeOpen(false)} />
      <DecorSheet
        decor={openDecor}
        shelves={shelves}
        itemsByShelf={itemsByShelf}
        onClose={() => setDecorId(null)}
        onNudge={(id, dir) => lib.nudgeItem(id, dir)}
        onSend={(id, shelfId) => lib.sendToShelf(id, shelfId)}
        onRemove={(id) => lib.removeDecor(id)}
      />
      <EditShelves open={shelvesOpen} onClose={() => setShelvesOpen(false)} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shelves={shelves}
        itemsByShelf={itemsByShelf}
        books={books}
        styleId={aesthetic.id}
        owner={profile?.display_name && store.mode === "supabase" ? profile.display_name : null}
      />

      {lib.error && (
        <div role="alert" className="fixed inset-x-4 bottom-20 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-wall shadow-2xl sm:bottom-6">
          <p className="flex-1">{lib.error}</p>
          <button type="button" onClick={lib.clearError} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <XIcon width={18} height={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="rounded-full p-2.5 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40">
      {children}
    </button>
  );
}

function MarkFilterBar({ value, onChange, books }: { value: MarkFilter; onChange: (f: MarkFilter) => void; books: Book[] }) {
  const options: { id: MarkFilter; label: string; icon?: string; color?: string }[] = [
    { id: "all", label: "All books" },
    { id: "favourite", label: "Favourites", icon: MARKS.favourite.icon, color: MARKS.favourite.color },
    { id: "reading", label: "Reading now", icon: MARKS.reading.icon, color: MARKS.reading.color },
    { id: "to_read", label: "To read", icon: MARKS.to_read.icon, color: MARKS.to_read.color },
  ];
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="radiogroup" aria-label="Highlight books by mark">
      {options.map((o) => {
        const on = value === o.id;
        const count = o.id === "all" ? books.length : books.filter((b) => matchesFilter(b, o.id)).length;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm backdrop-blur transition ${on ? "shadow-sm" : "border-line bg-paper/50 text-ink-soft hover:text-ink"}`}
            style={on ? { borderColor: o.color ?? "rgb(var(--accent))", backgroundColor: o.color ? `${o.color}22` : "rgb(var(--accent) / 0.12)", color: o.color ?? "rgb(var(--ink))" } : undefined}
          >
            {o.icon && <span aria-hidden>{o.icon}</span>}
            {o.label}
            <span className="font-mono text-[11px] opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ExampleNote() {
  return <p className="mb-5 rounded-xl border border-dashed border-ink-soft/40 bg-paper/50 p-3 text-sm text-ink-soft">Showing the example books. Add your first book to make this page yours.</p>;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="animate-pulse font-serif text-3xl">Cosmic Space</p>
    </div>
  );
}

export function ShelfSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading shelves">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="mb-3 h-6 w-32 animate-pulse rounded bg-ink/10" />
          <div className="flex items-end gap-3 px-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="animate-pulse rounded-[3px] bg-ink/10" style={{ width: "var(--cover-w)", height: "var(--cover-h)" }} />
            ))}
          </div>
          <div className="h-3.5 rounded-sm bg-ink/10" />
        </div>
      ))}
    </div>
  );
}
