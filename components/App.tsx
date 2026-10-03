"use client";

import { DEFAULT_THEME } from "@/lib/themes";
import { useMemo, useState } from "react";
import { EXAMPLE_BOOKS, EXAMPLE_SHELF, isExample } from "@/lib/examples";
import { LibraryProvider, groupByShelf, useLibrary } from "@/lib/library";
import { store } from "@/lib/store";
import { summary } from "@/lib/stats";
import type { Book } from "@/lib/types";
import { useTab } from "@/lib/useTab";
import { AddBookDialog } from "./AddBookDialog";
import { AuthScreen } from "./AuthScreen";
import { BookDetail } from "./BookDetail";
import { EditShelves } from "./EditShelves";
import { Header } from "./Header";
import { GearIcon, PlusIcon, ShareIcon, ShelvesIcon, XIcon } from "./Icons";
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
  const { user, authReady, loading, profile, shelves, books, booksByShelf } = lib;
  const [tab, setTab] = useTab();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shelvesOpen, setShelvesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const showExamples = !loading && books.length === 0;
  const exampleMap = useMemo(() => groupByShelf([EXAMPLE_SHELF], EXAMPLE_BOOKS), []);
  // Quote wall & reading year show the examples too until the first real book arrives.
  const viewShelves = showExamples ? [EXAMPLE_SHELF, ...shelves] : shelves;
  const viewBooks = showExamples ? EXAMPLE_BOOKS : books;
  const stats = summary(shelves, books);

  if (!authReady) return <Splash />;
  if (!user && store.mode === "supabase") return <AuthScreen />;

  const openBook = openId ? (viewBooks.find((b) => b.id === openId) ?? null) : null;
  const openList = openBook ? (isExample(openBook) ? exampleMap.get(EXAMPLE_SHELF.id) : booksByShelf.get(openBook.shelf_id)) ?? [] : [];
  const openIndex = openBook ? openList.findIndex((b) => b.id === openBook.id) : 0;

  const startAdd = () => {
    setEditing(null);
    setAddOpen(true);
  };

  return (
    <div data-wood={profile?.wood_theme ?? DEFAULT_THEME} className="min-h-dvh pb-24">
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
            {showExamples ? (
              <ShelfWall
                shelves={[EXAMPLE_SHELF]}
                booksByShelf={exampleMap}
                onOpen={(b) => setOpenId(b.id)}
                readOnly
                shelfNote={() => (
                  <div className="mb-2 flex flex-col gap-3 rounded-xl border border-dashed border-ink-soft/40 bg-paper/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-ink-soft">These are example books. They disappear when you add your first one.</p>
                    <button type="button" className="btn-primary shrink-0" onClick={startAdd}>
                      <PlusIcon width={16} height={16} /> Add my first book
                    </button>
                  </div>
                )}
              />
            ) : null}
            <div className={showExamples ? "mt-10" : ""}>
              <ShelfWall
                shelves={shelves}
                booksByShelf={booksByShelf}
                onOpen={(b) => setOpenId(b.id)}
                onMove={(id, shelfId, index) => lib.moveBook(id, shelfId, index)}
                justAddedId={lib.justAddedId}
              />
            </div>
            <p className="mt-8 hidden text-center text-xs text-ink-soft md:block">Tip: drag covers to reorder them or move them between shelves.</p>
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
        onMove={(b, shelfId) => {
          const count = booksByShelf.get(shelfId)?.length ?? 0;
          lib.moveBook(b.id, shelfId, count);
        }}
        onNudge={(b, dir) => lib.nudgeBook(b.id, dir)}
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
              document.querySelector(`[data-book-id="${b.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            }, 80);
          }
        }}
      />
      <EditShelves open={shelvesOpen} onClose={() => setShelvesOpen(false)} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shelves={shelves}
        booksByShelf={booksByShelf}
        books={books}
        wood={profile?.wood_theme ?? DEFAULT_THEME}
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

function ExampleNote() {
  return <p className="mb-5 rounded-xl border border-dashed border-ink-soft/40 bg-paper/50 p-3 text-sm text-ink-soft">Showing the example books. Add your first book to make this page yours.</p>;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="animate-pulse font-serif text-3xl">Ex Libris</p>
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
          <div className="plank" />
        </div>
      ))}
    </div>
  );
}
