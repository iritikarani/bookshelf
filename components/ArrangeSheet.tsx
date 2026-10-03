"use client";

import { useEffect, useState } from "react";
import { useLibrary } from "@/lib/library";
import { AESTHETICS, aestheticOf, type Aesthetic } from "@/lib/themes";
import type { DecorKind } from "@/lib/types";
import { DECOR, DecorArt } from "./Decor";
import { Sheet } from "./Sheet";

const SPINES = ["#f2c4c0", "#c8cbf0", "#f3e3a2", "#bfe3cf", "#bfd8ee", "#ecc5dc", "#e6dccb"];

/** A tiny version of the room: wall, shelf structure, a few spines and a plant. */
function StylePreview({ a }: { a: Aesthetic }) {
  const row = (offset: number) => (
    <div className="shelf-cell flex h-[30px] items-end gap-[2px] !px-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="rounded-[1px]" style={{ width: [7, 9, 6, 8][i], height: [20, 24, 18, 22][(i + offset) % 4], background: SPINES[(i + offset * 2) % SPINES.length] }} />
      ))}
      <span className="ml-auto" style={{ height: offset ? 14 : 24, aspectRatio: offset ? "50 / 50" : "80 / 110" }}>
        <DecorArt kind={offset ? "succulent" : "plant"} />
      </span>
    </div>
  );
  return (
    <div data-style={a.id} className="room relative flex h-[118px] items-end justify-center overflow-hidden rounded-lg px-4 pt-3" style={{ backgroundAttachment: "scroll" }}>
      <div className={`shelf-unit w-full max-w-[150px] ${a.structure === "case" ? "" : "mb-2"}`} data-structure={a.structure} style={a.structure === "case" ? { padding: "0 6px" } : { paddingTop: 12 }}>
        <div className="unit-cap" />
        {a.structure === "case" && <div className="case-top" style={{ height: 7, margin: "0 -6px" }} />}
        {row(0)}
        <div className="plank" style={{ height: 6, marginBottom: a.structure === "case" ? 0 : 12 }} />
        {row(1)}
        {a.structure !== "case" && <div className="plank" style={{ height: 6, marginBottom: 0 }} />}
        {a.structure === "case" && <div className="case-base" style={{ height: 8, margin: "0 -6px" }} />}
      </div>
    </div>
  );
}

export function ArrangeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, shelves, setShelfStyle, addDecor } = useLibrary();
  const current = aestheticOf(profile?.shelf_style);
  const [shelfId, setShelfId] = useState(shelves[0]?.id ?? "");
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => {
    if (!shelves.some((s) => s.id === shelfId)) setShelfId(shelves[0]?.id ?? "");
  }, [shelves, shelfId]);

  const place = async (kind: DecorKind, name: string) => {
    if (!shelfId) return;
    await addDecor(kind, shelfId);
    setPlaced(`${name} placed on ${shelves.find((s) => s.id === shelfId)?.name}.`);
    window.setTimeout(() => setPlaced(null), 2200);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Arrange your shelf" wide>
      <p className="text-sm text-ink-soft">
        Pick a room, place a few objects, then drag anything on the shelf to rearrange it. Open a book to stand it spine-out or turn its cover to face out.
      </p>

      <fieldset className="mt-5">
        <legend className="label">Aesthetic</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Aesthetic">
          {AESTHETICS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={current.id === a.id}
              onClick={() => setShelfStyle(a.id)}
              className={`rounded-xl border p-1.5 text-left transition ${current.id === a.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-ink-soft"}`}
            >
              <StylePreview a={a} />
              <p className="mt-1.5 px-1 text-sm font-medium">{a.name}</p>
              <p className="px-1 pb-0.5 text-xs text-ink-soft">{a.blurb}</p>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="label">Decorate</legend>
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="decor-shelf" className="text-sm text-ink-soft">Place on</label>
          <select id="decor-shelf" className="field w-auto" value={shelfId} onChange={(e) => setShelfId(e.target.value)}>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {DECOR.map((d) => (
            <button
              key={d.kind}
              type="button"
              onClick={() => place(d.kind, d.name)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-paper p-2 text-center transition hover:-translate-y-0.5 hover:border-accent motion-reduce:transform-none"
              aria-label={`Place ${d.name}`}
            >
              <span className="flex h-16 items-end">
                <span style={{ height: Math.max(26, 60 * d.h), aspectRatio: `${d.viewBox[0]} / ${d.viewBox[1]}` }}>
                  <DecorArt kind={d.kind} />
                </span>
              </span>
              <span className="text-[11px] leading-tight text-ink-soft">{d.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 h-5 text-sm text-accent" role="status">{placed}</p>
      </fieldset>
    </Sheet>
  );
}
