"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXAMPLE_BOOKS, EXAMPLE_ITEMS, EXAMPLE_SHELF, isExample } from "@/lib/examples";
import { LibraryProvider, useLibrary } from "@/lib/library";
import { siteUrl } from "@/lib/basePath";
import { store } from "@/lib/store";
import { summary } from "@/lib/stats";
import { finishedCount, newlyUnlocked } from "@/lib/rewards";
import { perCaseOf, roomAttrs, roomStyle, structureOf } from "@/lib/room";
import { useRoomClock, useSeason } from "@/lib/useClock";
import { aestheticOf } from "@/lib/themes";
import type { Book, GuestNote, ShelfItem } from "@/lib/types";
import { useTab } from "@/lib/useTab";
import { todayISO } from "@/lib/date";
import { MARKS, matchesFilter, type MarkFilter } from "./Marks";
import { RoomScene } from "./RoomScene";
import { AddBookDialog } from "./AddBookDialog";
import { ArrangeSheet } from "./ArrangeSheet";
import { BookDetail } from "./BookDetail";
import { DecorSheet } from "./DecorSheet";
import { UsernameDialog } from "./UsernameDialog";
import { EditShelves } from "./EditShelves";
import { shelfSummary } from "./Header";
import { BottomNav, PageTitle, TopBar } from "./AppNav";
import { DiscoverPage } from "./DiscoverPage";
import { HomePage } from "./HomePage";
import { JournalPage } from "./JournalPage";
import { Landing } from "./Landing";
import { ProfilePage } from "./ProfilePage";
import type { SearchResult } from "@/lib/search";
import { MoreMenu } from "./MoreMenu";
import { Onboarding } from "./Onboarding";
import { BrushIcon, GearIcon, MailIcon, PlusIcon, ShareIcon, ShelvesIcon, XIcon } from "./Icons";
import { GuestbookSheet } from "./Guestbook";
import { RoomSwitcher } from "./RoomSwitcher";
import { SoundButton } from "./SoundButton";
import { Settings } from "./Settings";
import { WrappedSheet } from "./Wrapped";
import { ShareDialog } from "./ShareDialog";
import { ShelfWall } from "./ShelfWall";
import { StatusShelves, type MarkPatch } from "./StatusShelves";

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
  useRoomClock(profile?.room);
  const season = useSeason(profile?.room);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // A book picked on the Discover page, opened straight to its details.
  const [discovered, setDiscovered] = useState<SearchResult | null>(null);
  // A short message after adding, e.g. "your bookcase was full, so a new one was added".
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);
  // Reading rewards: celebrate once when finishing books unlocks something new for the room.
  const finished = finishedCount(lib.books);
  useEffect(() => {
    if (loading || !user || !lib.profile) return;
    const key = `exlibris:rewardsSeen:${user.id}`;
    let seen: number | null = null;
    try {
      const raw = localStorage.getItem(key);
      seen = raw === null ? null : Number(raw);
    } catch {}
    // First visit after this feature: remember where the reader is, without a burst of old news.
    if (seen !== null && finished > seen) {
      const fresh = newlyUnlocked(seen, finished);
      const top = fresh[fresh.length - 1];
      if (top) setNotice(`${top.emoji} You unlocked ${top.type === "room" ? "a new room: " : ""}${top.name}! Find it in ••• → Decorate room.`);
    }
    if (seen === null || finished > seen) {
      try {
        localStorage.setItem(key, String(finished));
      } catch {}
    }
  }, [finished, loading, user, lib.profile]);
  const [shelvesOpen, setShelvesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);

  // Guest book: notes friends left on the public shelf. Before the guest book's database table
  // exists (or offline) it simply stays empty.
  const [guestNotes, setGuestNotes] = useState<GuestNote[] | null>([]);
  const [guestbookOpen, setGuestbookOpen] = useState(false);
  const [guestSeen, setGuestSeen] = useState<string | null>(null);
  useEffect(() => {
    if (!user || loading) return;
    let alive = true;
    try {
      setGuestSeen(localStorage.getItem(`exlibris:guestbookSeen:${user.id}`));
    } catch {}
    store
      .listGuestbook(user.id)
      .then((notes) => alive && setGuestNotes(notes))
      .catch(() => alive && setGuestNotes([]));
    return () => {
      alive = false;
    };
  }, [user, loading]);
  const newNotes = (guestNotes ?? []).filter((n) => !guestSeen || n.created_at > guestSeen).length;
  const announcedNotes = useRef(false);
  useEffect(() => {
    if (newNotes > 0 && !announcedNotes.current) {
      announcedNotes.current = true;
      setNotice(`💌 ${newNotes} new ${newNotes === 1 ? "note" : "notes"} in your guest book. Open ••• → Guest book.`);
    }
  }, [newNotes]);
  const openGuestbook = () => {
    setGuestbookOpen(true);
    setNotice((n) => (n?.startsWith("💌") ? null : n));
    const now = new Date().toISOString();
    setGuestSeen(now);
    try {
      if (user) localStorage.setItem(`exlibris:guestbookSeen:${user.id}`, now);
    } catch {}
  };
  const deleteGuestNote = (id: string) => {
    setGuestNotes((ns) => (ns ?? []).filter((n) => n.id !== id));
    store.deleteGuestNote(id).catch(() => {});
  };
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [decorId, setDecorId] = useState<string | null>(null);
  const aesthetic = aestheticOf(profile?.shelf_style);
  const structure = structureOf(aesthetic, profile?.room);

  const [filter, setFilter] = useState<MarkFilter>("all");
  // My Shelf as the room, or as status shelves (Reading / Want to Read / Finished / Favourites).
  const [shelfView, setShelfView] = useState<"room" | "status">("room");
  useEffect(() => {
    try {
      if (localStorage.getItem("exlibris:shelfView") === "status") setShelfView("status");
    } catch {}
  }, []);
  const pickShelfView = (v: "room" | "status") => {
    setShelfView(v);
    try {
      localStorage.setItem("exlibris:shelfView", v);
    } catch {}
  };
  // Accounts made with Google have no username yet: ask once per visit.
  const [usernameSkipped, setUsernameSkipped] = useState(false);
  const showExamples = !loading && books.length === 0 && lib.decor.length === 0;
  const exampleMap = useMemo(() => new Map<string, ShelfItem[]>([[EXAMPLE_SHELF.id, EXAMPLE_ITEMS]]), []);
  // Quote wall & reading year show the examples too until the first real book arrives.
  const viewShelves = showExamples ? [EXAMPLE_SHELF, ...lib.allShelves] : lib.allShelves;
  const viewBooks = showExamples ? EXAMPLE_BOOKS : books;
  // The books in the room you're in (the shelf tab's filter counts these).
  const roomBooks = useMemo(() => {
    if (showExamples) return EXAMPLE_BOOKS;
    const here = new Set(shelves.map((s) => s.id));
    return books.filter((b) => here.has(b.shelf_id));
  }, [showExamples, shelves, books]);
  // Every shelf, labelled with its room, so a book can move to another room.
  const labelledShelves = useMemo(() => lib.allShelves.map((s) => ({ ...s, name: lib.shelfLabel(s) })), [lib]);
  const stats = summary(books);
  // Welcome onboarding: once, for a brand-new empty shelf, after the username question.
  const welcomeKey = user ? `exlibris:welcomed:${user.id}` : null;
  const [welcomed, setWelcomed] = useState(true);
  useEffect(() => {
    if (!welcomeKey) return;
    try {
      setWelcomed(localStorage.getItem(welcomeKey) === "1");
    } catch {}
  }, [welcomeKey]);
  const finishWelcome = () => {
    setWelcomed(true);
    try {
      if (welcomeKey) localStorage.setItem(welcomeKey, "1");
    } catch {}
  };
  const needsUsername = store.mode === "supabase" && Boolean(profile) && !profile?.username && !usernameSkipped;
  // Once it has started it stays open while the first books go on the shelf.
  const welcomeStarted = useRef(false);
  const showWelcome = !welcomed && !loading && Boolean(profile) && !needsUsername && (showExamples || welcomeStarted.current);
  if (showWelcome) welcomeStarted.current = true;
  // Readers who already have books never need the welcome.
  useEffect(() => {
    if (welcomeKey && !loading && !welcomed && !welcomeStarted.current && books.length > 0) finishWelcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeKey, loading, welcomed, books.length]);
  const ownerName = profile?.username ?? (store.mode === "supabase" ? profile?.display_name : null) ?? null;

  if (!authReady) return <Splash />;
  // Signed out with accounts switched on: the front door.
  if (!user && store.mode === "supabase") return <Landing />;

  const openBook = openId ? (viewBooks.find((b) => b.id === openId) ?? null) : null;
  const openList = openBook ? (isExample(openBook) ? exampleMap.get(EXAMPLE_SHELF.id) : itemsByShelf.get(openBook.shelf_id)) ?? [] : [];
  const openDecor = decorId ? (lib.decor.find((d) => d.id === decorId) ?? null) : null;
  const openIndex = openBook ? openList.findIndex((b) => b.id === openBook.id) : 0;

  // Status changes keep the rating and finish date honest: only finished books keep a rating.
  const markBook = (b: Book, patch: MarkPatch) =>
    lib.updateBook(b.id, patch.status && patch.status !== "read" ? { ...patch, rating: 0, date_finished: null } : patch.status === "read" && !b.date_finished ? { ...patch, date_finished: todayISO() } : patch);
  const startAdd = () => {
    setEditing(null);
    setDiscovered(null);
    setAddOpen(true);
  };
  const publicUrl = store.mode === "supabase" && profile?.is_public ? siteUrl(`/s/?u=${profile.public_slug}`) : null;
  const quoteLook = { styleId: aesthetic.id, room: profile?.room, publicUrl };

  return (
    <div data-style={aesthetic.id} {...roomAttrs(profile?.room, undefined, season)} style={roomStyle(profile?.room)} className="room flex min-h-dvh flex-col pb-28 md:pb-12">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2">
        Skip to shelves
      </a>
      <TopBar
        tab={tab}
        onTab={setTab}
        actions={
          <>
            <button type="button" className="btn-primary h-11 w-11 px-0 sm:w-auto sm:px-4" onClick={startAdd} aria-label="Add a book">
              <PlusIcon width={18} height={18} /> <span className="hidden sm:inline">Add a book</span>
            </button>
            <MoreMenu
              items={[
                { label: "Decorate room", icon: <BrushIcon width={18} height={18} />, onSelect: () => (setTab("shelf"), setArrangeOpen(true)) },
                { label: "Edit shelves", icon: <ShelvesIcon width={18} height={18} />, onSelect: () => setShelvesOpen(true) },
                { label: "Share shelf", icon: <ShareIcon width={18} height={18} />, onSelect: () => setShareOpen(true), disabled: books.length === 0 },
                { label: "Your year, wrapped", icon: <span className="inline-block w-[18px] text-center" aria-hidden>✨</span>, onSelect: () => setWrappedOpen(true) },
                { label: newNotes ? `Guest book · ${newNotes} new` : "Guest book", icon: <MailIcon width={18} height={18} />, onSelect: openGuestbook },
                { label: "Settings", icon: <GearIcon width={18} height={18} />, onSelect: () => setSettingsOpen(true) },
              ]}
            />
          </>
        }
      />

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 md:px-8 md:pt-10">
        {loading ? (
          <ShelfSkeleton />
        ) : tab === "home" ? (
          <HomePage books={books} name={profile?.display_name ?? ownerName} rooms={lib.rooms.length} example={showExamples} onOpen={(b) => setOpenId(b.id)} onAdd={startAdd} onTab={setTab} />
        ) : tab === "discover" ? (
          <DiscoverPage
            books={books}
            onAdd={(r) => {
              setEditing(null);
              setDiscovered(r);
              setAddOpen(true);
            }}
          />
        ) : tab === "journal" ? (
          <>
            {showExamples && <ExampleNote />}
            <JournalPage books={viewBooks} look={quoteLook} onOpen={(b) => setOpenId(b.id)} onShelf={() => setTab("shelf")} />
          </>
        ) : tab === "profile" ? (
          <>
            {showExamples && <ExampleNote />}
            <ProfilePage
              name={profile?.display_name ?? ownerName}
              username={profile?.username}
              books={viewBooks}
              shelves={viewShelves}
              newNotes={newNotes}
              onOpen={(b) => setOpenId(b.id)}
              onSettings={() => setSettingsOpen(true)}
              onShare={books.length ? () => setShareOpen(true) : undefined}
              onWrapped={showExamples ? undefined : () => setWrappedOpen(true)}
              onGuestbook={openGuestbook}
            />
          </>
        ) : (
          <>
            <PageTitle title={ownerName ? `${ownerName}’s bookshelf` : "My bookshelf"} sub={showExamples ? "Your shelf is ready for its first book" : shelfSummary(books)}>
              <div role="radiogroup" aria-label="Show my shelf" className="inline-flex gap-1 rounded-full bg-paper/70 p-1 ring-1 ring-line/70 backdrop-blur">
                {(
                  [
                    ["room", "My room"],
                    ["status", "By status"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={shelfView === id}
                    onClick={() => pickShelfView(id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${shelfView === id ? "bg-ink text-wall" : "text-ink-soft hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </PageTitle>
            {showExamples && (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-ink-soft/40 bg-paper/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-soft">These are example books. They disappear when you add your first one.</p>
                <button type="button" className="btn-primary shrink-0" onClick={startAdd}>
                  <PlusIcon width={16} height={16} /> Add my first book
                </button>
              </div>
            )}
            {shelfView === "status" ? (
              <StatusShelves books={showExamples ? EXAMPLE_BOOKS : books} onOpen={(b) => setOpenId(b.id)} onMark={markBook} readOnly={showExamples} />
            ) : (
              <>
                {!showExamples && <RoomSwitcher />}
                <MarkFilterBar value={filter} onChange={setFilter} books={roomBooks} />
                <RoomScene standing={structure === "case"}>
                  {showExamples ? (
                    <ShelfWall
                      shelves={[EXAMPLE_SHELF]}
                      itemsByShelf={exampleMap}
                      structure={structure}
                      onOpenBook={(b) => setOpenId(b.id)}
                      filter={filter}
                      floor={false}
                      readOnly
                    />
                  ) : (
                    <ShelfWall
                      shelves={shelves}
                      itemsByShelf={itemsByShelf}
                      structure={structure}
                      onOpenBook={(b) => setOpenId(b.id)}
                      onOpenDecor={(d) => setDecorId(d.id)}
                      perCase={perCaseOf(profile?.room)}
                      onMove={(id, shelfId, index) => lib.moveItem(id, shelfId, index)}
                      justAddedId={lib.justAddedId}
                      filter={filter}
                      floor={false}
                    />
                  )}
                </RoomScene>
              </>
            )}

          </>
        )}
      </main>

      <BookDetail
        book={openBook}
        shelves={isExample(openBook ?? { id: "" }) ? [EXAMPLE_SHELF] : labelledShelves}
        index={openIndex}
        shelfSize={openList.length}
        example={openBook ? isExample(openBook) : false}
        ownerName={profile?.username ?? profile?.display_name}
        onClose={() => setOpenId(null)}
        onEdit={(b) => {
          setEditing(b);
          setAddOpen(true);
        }}
        onMove={(b, shelfId) => lib.sendToShelf(b.id, shelfId)}
        onNudge={(b, dir) => lib.nudgeItem(b.id, dir)}
        onDisplay={(b, display) => lib.updateBook(b.id, { display })}
        onMarks={markBook}
        onRate={(b, rating) => lib.updateBook(b.id, { rating })}
        onProgress={(b, patch) => lib.updateBook(b.id, patch)}
        onRemove={(b) => lib.removeBook(b.id)}
      />

      <AddBookDialog
        open={addOpen}
        editing={editing}
        initialResult={discovered}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
          setDiscovered(null);
        }}
        onSaved={(b, note) => {
          // Added from Discover: stay and keep browsing.
          if (b && tab === "discover") {
            setNotice(note ?? `“${b.title}” is on your shelf now.`);
            return;
          }
          if (note) setNotice(note);
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
      {showWelcome && <Onboarding name={ownerName} onDone={finishWelcome} />}
      {store.mode === "supabase" && profile && !profile.username && !usernameSkipped && (
        <UsernameDialog open firstTime onClose={() => setUsernameSkipped(true)} />
      )}
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
      {!loading && tab === "shelf" && <SoundButton room={profile?.room} season={season} />}
      <BottomNav tab={tab} onTab={setTab} />

      <GuestbookSheet
        open={guestbookOpen}
        onClose={() => setGuestbookOpen(false)}
        notes={guestNotes}
        isPublic={Boolean(profile?.is_public)}
        onDelete={deleteGuestNote}
        onShare={() => {
          setGuestbookOpen(false);
          if (profile?.is_public && books.length) setShareOpen(true);
          else setSettingsOpen(true);
        }}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shelves={shelves}
        itemsByShelf={itemsByShelf}
        books={books}
        styleId={aesthetic.id}
        room={profile?.room}
        owner={store.mode === "supabase" ? (profile?.username ?? profile?.display_name ?? null) : null}
        publicUrl={publicUrl}
      />

      <WrappedSheet
        open={wrappedOpen}
        onClose={() => setWrappedOpen(false)}
        books={books}
        styleId={aesthetic.id}
        room={profile?.room}
        owner={store.mode === "supabase" ? (profile?.username ?? profile?.display_name ?? null) : null}
        publicUrl={publicUrl}
      />

      {notice && !lib.error && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md animate-fade-in items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-wall shadow-2xl sm:bottom-6">
          <p className="flex-1">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <XIcon width={18} height={18} />
          </button>
        </div>
      )}
      {lib.error && (
        <div role="alert" className="fixed inset-x-4 bottom-24 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-wall shadow-2xl sm:bottom-6">
          <p className="flex-1">{lib.error}</p>
          <button type="button" onClick={lib.clearError} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <XIcon width={18} height={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function MarkFilterBar({ value, onChange, books }: { value: MarkFilter; onChange: (f: MarkFilter) => void; books: Book[] }) {
  const options: { id: MarkFilter; label: string; icon?: string; color?: string }[] = [
    { id: "all", label: "All books" },
    { id: "favourite", label: "Favourites", icon: MARKS.favourite.icon, color: MARKS.favourite.color },
    { id: "reading", label: "Reading", icon: MARKS.reading.icon, color: MARKS.reading.color },
    { id: "to_read", label: "Want to read", icon: MARKS.to_read.icon, color: MARKS.to_read.color },
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
            <span className="font-mono text-xs opacity-70">{count}</span>
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
