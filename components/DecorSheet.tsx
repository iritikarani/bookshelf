"use client";

import type { Decor, Shelf, ShelfItem } from "@/lib/types";
import { DecorArt, decorSpec } from "./Decor";
import { ChevronLeft, ChevronRight, TrashIcon } from "./Icons";
import { Sheet } from "./Sheet";

/** Arrange one decor object: move it along the shelf, to another shelf, or take it off. */
export function DecorSheet({
  decor,
  shelves,
  itemsByShelf,
  onClose,
  onNudge,
  onSend,
  onRemove,
}: {
  decor: Decor | null;
  shelves: Shelf[];
  itemsByShelf: Map<string, ShelfItem[]>;
  onClose: () => void;
  onNudge: (id: string, dir: -1 | 1) => void;
  onSend: (id: string, shelfId: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!decor) return null;
  const spec = decorSpec(decor.kind);
  const list = itemsByShelf.get(decor.shelf_id) ?? [];
  const index = list.findIndex((x) => x.id === decor.id);

  return (
    <Sheet open onClose={onClose} title={spec.name}>
      <div className="flex items-end justify-center rounded-xl bg-ink/5 py-6">
        <div style={{ height: 120, aspectRatio: `${spec.viewBox[0]} / ${spec.viewBox[1]}` }}>
          <DecorArt kind={decor.kind} />
        </div>
      </div>
      <fieldset className="mt-5">
        <legend className="label">Arrange</legend>
        <div className="flex items-center gap-2">
          <select className="field flex-1" aria-label="Move to shelf" value={decor.shelf_id} onChange={(e) => onSend(decor.id, e.target.value)}>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button type="button" className="btn-ghost px-3" aria-label="Move left" disabled={index <= 0} onClick={() => onNudge(decor.id, -1)}>
            <ChevronLeft />
          </button>
          <button type="button" className="btn-ghost px-3" aria-label="Move right" disabled={index >= list.length - 1} onClick={() => onNudge(decor.id, 1)}>
            <ChevronRight />
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-ink-soft">Spot {index + 1} of {list.length}. On a computer you can also drag it.</p>
      </fieldset>
      <button
        type="button"
        className="btn-ghost mt-6 text-danger"
        onClick={() => {
          onRemove(decor.id);
          onClose();
        }}
      >
        <TrashIcon width={16} height={16} /> Take it off the shelf
      </button>
    </Sheet>
  );
}
