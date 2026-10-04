"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MAX_ROOMS, useLibrary, type RoomEntry } from "@/lib/library";
import { finishedCount, isUnlocked, rewardFor } from "@/lib/rewards";
import { AESTHETICS, aestheticOf } from "@/lib/themes";
import type { ShelfStyle } from "@/lib/types";
import { StylePreview } from "./ArrangeSheet";
import { PlusIcon } from "./Icons";
import { Sheet } from "./Sheet";

/** A row of room tabs above the shelves. Read-only on a public shelf (no new room, no editing). */
export function RoomTabs({
  rooms,
  active,
  onPick,
  onAdd,
  onEdit,
}: {
  rooms: RoomEntry[];
  active: string | null;
  onPick: (id: string | null) => void;
  onAdd?: () => void;
  onEdit?: (room: RoomEntry) => void;
}) {
  return (
    <nav aria-label="Rooms" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {rooms.map((r) => {
        const on = r.id === active;
        return (
          <button
            key={r.id ?? "first"}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => (on && onEdit ? onEdit(r) : onPick(r.id))}
            title={on && onEdit ? "Rename or remove this room" : `Go to ${r.name}`}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${on ? "border-ink bg-ink text-wall shadow" : "border-line bg-paper/70 text-ink hover:border-ink-soft"}`}
          >
            <span aria-hidden>🚪</span>
            {r.name}
            {on && onEdit && (
              <span aria-hidden className="opacity-70">
                ✎
              </span>
            )}
          </button>
        );
      })}
      {onAdd && (
        <button type="button" onClick={onAdd} className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-ink-soft/60 px-4 py-2 text-sm text-ink-soft hover:text-ink">
          <PlusIcon width={14} height={14} /> New room
        </button>
      )}
    </nav>
  );
}

/** Room tabs for the reader's own shelf, with the new-room and edit-room sheets. */
export function RoomSwitcher() {
  const { rooms, activeRoomId, setActiveRoom, addRoom, renameRoom, deleteRoom, books, allShelves } = useLibrary();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<RoomEntry | null>(null);
  return (
    <>
      <RoomTabs rooms={rooms} active={activeRoomId} onPick={setActiveRoom} onAdd={rooms.length < MAX_ROOMS ? () => setAdding(true) : undefined} onEdit={setEditing} />
      <NewRoomSheet open={adding} onClose={() => setAdding(false)} onCreate={addRoom} count={rooms.length} finished={finishedCount(books)} />
      <EditRoomSheet
        room={editing}
        onClose={() => setEditing(null)}
        onRename={renameRoom}
        onDelete={deleteRoom}
        bookCount={editing ? books.filter((b) => allShelves.some((s) => s.id === b.shelf_id && (s.room_id ?? null) === editing.id)).length : 0}
      />
    </>
  );
}

const IDEAS = ["Study", "Fiction corner", "Winter nook", "To-read pile", "Poetry room", "Childhood favourites", "Hindi books", "Book club"];

function NewRoomSheet({ open, onClose, onCreate, count, finished }: { open: boolean; onClose: () => void; onCreate: (name: string, style: ShelfStyle) => Promise<boolean>; count: number; finished: number }) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState<ShelfStyle>("cottage");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName("");
      setBusy(false);
    }
  }, [open]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const ok = await onCreate(name, style);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="A new room" wide>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-ink-soft">Each room has its own shelves, books and look, like rooms in a house. You can move books between rooms any time.</p>
        <div>
          <label className="label" htmlFor="room-name">
            Room name
          </label>
          <input id="room-name" className="field" maxLength={40} placeholder="e.g. Study" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS.map((idea) => (
              <button key={idea} type="button" onClick={() => setName(idea)} className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:text-ink">
                {idea}
              </button>
            ))}
          </div>
        </div>
        <fieldset>
          <legend className="label">Its look</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Room style">
            {AESTHETICS.map((a) => {
              const locked = !isUnlocked(a.id, finished);
              const reward = rewardFor(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={style === a.id}
                  aria-disabled={locked}
                  onClick={() => !locked && setStyle(a.id)}
                  className={`relative rounded-xl border p-1.5 text-left transition ${style === a.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-ink-soft"} ${locked ? "cursor-not-allowed" : ""}`}
                >
                  <div className={locked ? "opacity-45 grayscale-[60%]" : ""}>
                    <StylePreview a={a} />
                  </div>
                  <p className="mt-1.5 px-1 text-sm font-medium">{a.name}</p>
                  {locked && reward && <p className="px-1 pb-0.5 text-xs text-ink-soft">Finish {reward.at} books to unlock</p>}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-ink-soft">You can change everything later in ••• → Decorate room, while you’re in it.</p>
        </fieldset>
        <button type="submit" className="btn-primary w-full" disabled={!name.trim() || busy}>
          {busy ? "Building your room…" : `Make ${name.trim() ? `“${name.trim()}”` : "the room"}`}
        </button>
        <p className="text-center text-xs text-ink-soft">Room {count + 1} of up to {MAX_ROOMS}</p>
      </form>
    </Sheet>
  );
}

function EditRoomSheet({
  room,
  onClose,
  onRename,
  onDelete,
  bookCount,
}: {
  room: RoomEntry | null;
  onClose: () => void;
  onRename: (id: string | null, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  bookCount: number;
}) {
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setName(room?.name ?? "");
    setConfirm(false);
  }, [room]);
  if (!room) return <Sheet open={false} onClose={onClose} title="Room">{null}</Sheet>;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== room.name) await onRename(room.id, name);
    onClose();
  };
  return (
    <Sheet open={Boolean(room)} onClose={onClose} title={room.name}>
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm text-ink-soft">
          {aestheticOf(room.shelf_style).name} · {bookCount} {bookCount === 1 ? "book" : "books"}. Change its look in ••• → Decorate room.
        </p>
        <div>
          <label className="label" htmlFor="room-rename">
            Room name
          </label>
          <input id="room-rename" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
          Save
        </button>
        {room.id && (
          <div className="border-t border-line pt-4">
            {bookCount > 0 ? (
              <p className="text-sm text-ink-soft">To remove this room, first move its books to another room (open a book → On the shelf → Move to shelf).</p>
            ) : confirm ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Remove “{room.name}” and its empty shelves?</span>
                <button type="button" className="btn-danger" onClick={() => room.id && onDelete(room.id).then(onClose)}>
                  Remove room
                </button>
                <button type="button" className="btn-ghost" onClick={() => setConfirm(false)}>
                  Keep it
                </button>
              </div>
            ) : (
              <button type="button" className="text-sm text-danger hover:underline" onClick={() => setConfirm(true)}>
                Remove this room
              </button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}
