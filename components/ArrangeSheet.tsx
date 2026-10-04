"use client";

import { useEffect, useState } from "react";
import { useLibrary } from "@/lib/library";
import { REWARDS, finishedCount, isUnlocked, nextReward, rewardFor } from "@/lib/rewards";
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
  const { profile, shelves, books, setShelfStyle, addDecor } = useLibrary();
  const finished = finishedCount(books);
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
    <Sheet open={open} onClose={onClose} title="Decorate your room" wide>
      <p className="text-sm text-ink-soft">
        Pick a room, place a few objects, then drag anything on the shelf to rearrange it. Open a book to stand it spine-out or turn its cover to face out.
      </p>

      <RewardsCard finished={finished} />

      <fieldset className="mt-6">
        <legend className="label">Room</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Aesthetic">
          {AESTHETICS.map((a) => {
            const locked = !isUnlocked(a.id, finished);
            const reward = rewardFor(a.id);
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={current.id === a.id}
                aria-disabled={locked}
                onClick={() => !locked && setShelfStyle(a.id)}
                className={`relative rounded-xl border p-1.5 text-left transition ${current.id === a.id ? "border-accent ring-2 ring-accent/40" : "border-line hover:border-ink-soft"} ${locked ? "cursor-not-allowed" : ""}`}
              >
                <div className={locked ? "opacity-45 grayscale-[60%]" : ""}>
                  <StylePreview a={a} />
                </div>
                {locked && reward && <LockBadge at={reward.at} finished={finished} />}
                <p className="mt-1.5 px-1 text-sm font-medium">
                  {reward && <span aria-hidden>{reward.emoji} </span>}
                  {a.name}
                </p>
                <p className="px-1 pb-0.5 text-xs text-ink-soft">{locked && reward ? `Finish ${reward.at} books to unlock` : a.blurb}</p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="label">Objects</legend>
        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="decor-shelf" className="text-sm text-ink-soft">Place on</label>
          <select id="decor-shelf" className="field w-auto" value={shelfId} onChange={(e) => setShelfId(e.target.value)}>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {DECOR.map((d) => {
            const locked = !isUnlocked(d.kind, finished);
            const reward = rewardFor(d.kind);
            return (
              <button
                key={d.kind}
                type="button"
                onClick={() => !locked && place(d.kind, d.name)}
                aria-disabled={locked}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border bg-paper p-2 text-center transition motion-reduce:transform-none ${
                  locked ? "cursor-not-allowed border-dashed border-line" : reward ? "border-accent/60 hover:-translate-y-0.5 hover:border-accent" : "border-line hover:-translate-y-0.5 hover:border-accent"
                }`}
                aria-label={locked && reward ? `${d.name}, locked: finish ${reward.at} books` : `Place ${d.name}`}
              >
                <span className={`flex h-16 items-end ${locked ? "opacity-35 grayscale" : ""}`}>
                  <span style={{ height: Math.max(26, 60 * d.h), aspectRatio: `${d.viewBox[0]} / ${d.viewBox[1]}` }}>
                    <DecorArt kind={d.kind} />
                  </span>
                </span>
                {locked && reward && <LockBadge at={reward.at} finished={finished} />}
                <span className="text-xs leading-tight text-ink-soft">{locked && reward ? `🔒 ${reward.at} books` : d.name}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 h-5 text-sm text-accent" role="status">{placed}</p>
      </fieldset>
    </Sheet>
  );
}

function LockBadge({ at, finished }: { at: number; finished: number }) {
  return (
    <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 font-mono text-[11px] text-paper shadow" aria-hidden>
      🔒 {finished}/{at}
    </span>
  );
}

/** "Reading rewards": what you've earned and how close the next one is. */
function RewardsCard({ finished }: { finished: number }) {
  const next = nextReward(finished);
  const prevAt = [...REWARDS].reverse().find((r) => r.at <= finished)?.at ?? 0;
  const pct = next ? Math.round(((finished - prevAt) / (next.at - prevAt)) * 100) : 100;
  const earned = REWARDS.filter((r) => r.at <= finished);
  return (
    <section className="mt-5 rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/25" aria-labelledby="rewards-title">
      <h3 id="rewards-title" className="font-serif text-lg leading-tight">Reading rewards</h3>
      <p className="mt-0.5 text-sm text-ink-soft">Finish books and new things appear for your room.</p>
      {next ? (
        <>
          <p className="mt-3 text-sm">
            <span aria-hidden>{next.emoji}</span> <strong>{next.name}</strong> unlocks at {next.at} finished books.{" "}
            <span className="text-ink-soft">
              {next.at - finished} to go
            </span>
          </p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={prevAt} aria-valuemax={next.at} aria-valuenow={finished} aria-label="Progress to the next reward">
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm">✨ You’ve unlocked everything. What a reader.</p>
      )}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="All rewards">
        {REWARDS.map((r) => {
          const got = r.at <= finished;
          return (
            <li key={r.id} className={`rounded-full px-2.5 py-1 text-xs ${got ? "bg-accent text-accent-ink" : "bg-ink/5 text-ink-soft"}`}>
              {got ? r.emoji : "🔒"} {r.name} · {r.at}
            </li>
          );
        })}
      </ul>
      {earned.length > 0 && <p className="sr-only">You have earned {earned.map((r) => r.name).join(", ")}.</p>}
    </section>
  );
}
