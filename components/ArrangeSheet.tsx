"use client";

import { useEffect, useState } from "react";
import { useLibrary } from "@/lib/library";
import { REWARDS, finishedCount, isUnlocked, nextReward, rewardFor } from "@/lib/rewards";
import {
  CURTAINS,
  FAIRY_LIGHTS,
  FINISHES,
  FLOORS,
  LAMP_LEVELS,
  LAMP_TONES,
  LOOK_KEYS,
  PATTERNS,
  RUGS,
  STRUCTURES,
  TIMES,
  WALLS,
  WEATHERS,
  hasLightingChanges,
  hasRoomChanges,
  perCaseOf,
  roomAttrs,
  roomStyle,
  structureOf,
  type RoomSettings,
} from "@/lib/room";
import { AESTHETICS, aestheticOf, type Aesthetic } from "@/lib/themes";
import type { DecorKind } from "@/lib/types";
import { DECOR, DecorArt } from "./Decor";
import { FairyLights, RoomWindow, useLamp } from "./RoomScene";
import { useSeason } from "@/lib/useClock";
import { SEASONS, nextFestival } from "@/lib/seasons";
import { SOUNDS, soundFor, useRoomSound, type SoundKind } from "@/lib/sound";
import { Sheet } from "./Sheet";

const SPINES = ["#f2c4c0", "#c8cbf0", "#f3e3a2", "#bfe3cf", "#bfd8ee", "#ecc5dc", "#e6dccb"];

/** A tiny version of the room: wall, shelf structure, a few spines and a plant (and the floor, when asked). */
export function StylePreview({ a, room, withFloor = false, tall = false, lampOn = false, season }: { a: Aesthetic; room?: RoomSettings | null; withFloor?: boolean; tall?: boolean; lampOn?: boolean; season?: string | null }) {
  const structure = structureOf(a, room);
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
    <div
      data-style={a.id}
      {...roomAttrs(room, undefined, season)}
      className={`room relative flex items-end overflow-hidden rounded-lg px-4 pt-3 ${tall ? "h-[190px] justify-end pr-[8%]" : "h-[118px] justify-center"} ${withFloor ? "pb-[34px]" : ""}`}
      style={{ ...roomStyle(room), backgroundAttachment: "scroll" }}
    >
      {tall && (
        <div className="absolute left-[7%] top-6 h-14 w-[26%]">
          <RoomWindow compact className="h-full w-full" />
        </div>
      )}
      {tall && <FairyLights className="!top-0" />}
      {tall && lampOn && <div aria-hidden className="mini-lamp" />}
      <div className={`shelf-unit relative z-[1] w-full max-w-[150px] ${structure === "case" ? "" : "mb-2"}`} data-structure={structure} style={structure === "case" ? { padding: "0 6px" } : { paddingTop: 12 }}>
        <div className="unit-cap" />
        {structure === "case" && <div className="case-top" style={{ height: 7, margin: "0 -6px" }} />}
        {row(0)}
        <div className="plank" style={{ height: 6, marginBottom: structure === "case" ? 0 : 12 }} />
        {row(1)}
        {structure !== "case" && <div className="plank" style={{ height: 6, marginBottom: 0 }} />}
        {structure === "case" && <div className="case-base" style={{ height: 8, margin: "0 -6px" }} />}
      </div>
      {withFloor && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[34px]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.18), transparent 30%), var(--floor)" }}>
          <div className="mini-rug absolute bottom-1.5 left-1/2 h-4 w-[44%] -translate-x-1/2 rounded-sm" style={{ background: "var(--rug)", boxShadow: "inset 0 0 0 2px var(--rug-2)" }} />
        </div>
      )}
    </div>
  );
}

type EditorTab = "room" | "shelves" | "objects" | "lighting";
const TABS: { id: EditorTab; label: string; icon: string }[] = [
  { id: "room", label: "Room", icon: "🏠" },
  { id: "shelves", label: "Shelves", icon: "📚" },
  { id: "objects", label: "Objects", icon: "🪴" },
  { id: "lighting", label: "Lighting", icon: "💡" },
];

/**
 * The room editor: a live preview on top, then Room / Shelves / Objects / Lighting.
 * Room styles are starting points; every choice here layers on top of the style.
 */
export function ArrangeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, shelves, books, decor, setShelfStyle, setRoom, addDecor, removeDecor, renameShelf } = useLibrary();
  const finished = finishedCount(books);
  const current = aestheticOf(profile?.shelf_style);
  const room = profile?.room ?? null;
  const [tab, setTab] = useState<EditorTab>("room");
  const [shelfId, setShelfId] = useState(shelves[0]?.id ?? "");
  const [placed, setPlaced] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!shelves.some((s) => s.id === shelfId)) setShelfId(shelves[0]?.id ?? "");
  }, [shelves, shelfId]);

  const place = async (kind: DecorKind, name: string) => {
    if (!shelfId) return;
    await addDecor(kind, shelfId);
    setPlaced(`${name} placed on ${shelves.find((s) => s.id === shelfId)?.name}.`);
    window.setTimeout(() => setPlaced(null), 2200);
  };

  const pick = (patch: Partial<RoomSettings>) => setRoom(patch);
  const [lampOn, toggleLamp] = useLamp();
  const season = useSeason(room);
  const sound = useRoomSound();
  const coming = nextFestival(new Date());

  return (
    <Sheet open={open} onClose={onClose} title="Decorate your room" wide>
      {/* live preview + tabs stay in view while you scroll the options */}
      <div className="sticky -top-1 z-10 -mx-5 bg-paper px-5 pb-3 pt-1">
        <StylePreview a={current} room={room} withFloor tall lampOn={lampOn} season={season} />
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-full bg-ink/5 p-1" role="tablist" aria-label="Editor sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-2 py-2 text-sm font-medium transition ${tab === t.id ? "bg-paper text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              <span aria-hidden>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "room" && (
        <div className="space-y-6 pt-2" role="tabpanel" aria-label="Room">
          <fieldset>
            <legend className="label">Start from a style</legend>
            <p className="-mt-1 mb-2 text-sm text-ink-soft">Each style sets the whole room. Then make it yours below.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Room style">
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

          <SwatchRow label="Wall colour" options={WALLS} value={room?.wall} onPick={(wall) => pick({ wall })} />
          <ChipRow label="Wall pattern" options={PATTERNS} value={room?.pattern} onPick={(pattern) => pick({ pattern })} />
          <SwatchRow label="Floor" options={FLOORS} value={room?.floor} onPick={(floor) => pick({ floor })} />
          <SwatchRow label="Rug" options={RUGS} value={room?.rug} onPick={(rug) => pick({ rug })} />
          <SwatchRow label="Curtains" options={CURTAINS} value={room?.curtains} onPick={(curtains) => pick({ curtains })} />

          {hasRoomChanges(room) && (
            <button type="button" className="btn-ghost" onClick={() => setRoom(Object.fromEntries(LOOK_KEYS.map((k) => [k, undefined])))}>
              ↺ Back to the {current.name} look
            </button>
          )}
        </div>
      )}

      {tab === "shelves" && (
        <div className="space-y-6 pt-2" role="tabpanel" aria-label="Shelves">
          <fieldset>
            <legend className="label">Shelf type</legend>
            <div className="grid grid-cols-2 gap-2">
              {STRUCTURES.map((st) => {
                const on = structureOf(current, room) === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick({ structure: st.id === current.structure ? undefined : st.id })}
                    className={`rounded-xl border p-3 text-left transition ${on ? "border-accent bg-accent/10 ring-2 ring-accent/30" : "border-line hover:border-ink-soft"}`}
                  >
                    <p className="font-medium">{st.name}</p>
                    <p className="text-xs text-ink-soft">{st.blurb}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <SwatchRow label="Wood or paint" options={FINISHES} value={room?.finish} onPick={(finish) => pick({ finish })} />

          <fieldset>
            <legend className="label">Shelves in each bookcase</legend>
            <div className="inline-flex rounded-full border border-line p-1" role="radiogroup" aria-label="Shelves in each bookcase">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={perCaseOf(room) === n}
                  onClick={() => pick({ perCase: n === 3 ? undefined : n })}
                  className={`rounded-full px-5 py-2 text-sm ${perCaseOf(room) === n ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">When a bookcase fills up, the next one starts with this many shelves.</p>
          </fieldset>

          <fieldset>
            <legend className="label">Shelf names</legend>
            <ul className="space-y-2">
              {shelves.map((sh) => (
                <li key={sh.id}>
                  <input
                    className="field font-serif text-lg"
                    aria-label={`Name of ${sh.name}`}
                    maxLength={60}
                    value={names[sh.id] ?? sh.name}
                    onChange={(e) => setNames((n) => ({ ...n, [sh.id]: e.target.value }))}
                    onBlur={() => {
                      const v = (names[sh.id] ?? sh.name).trim();
                      if (v && v !== sh.name) renameShelf(sh.id, v.slice(0, 60));
                    }}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-sm text-ink-soft">Named shelves show their name on the wood. Add, reorder or remove shelves in ••• → Edit shelves.</p>
          </fieldset>
        </div>
      )}

      {tab === "objects" && (
        <div className="pt-2" role="tabpanel" aria-label="Objects">
          <RewardsCard finished={finished} />
          <fieldset className="mt-6">
            <legend className="label">Add an object</legend>
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor="decor-shelf" className="text-sm text-ink-soft">Place on</label>
              <select id="decor-shelf" className="field w-auto" value={shelfId} onChange={(e) => setShelfId(e.target.value)}>
                {shelves.map((sh) => (
                  <option key={sh.id} value={sh.id}>{sh.name}</option>
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

          {decor.length > 0 && (
            <fieldset className="mt-4">
              <legend className="label">On your shelves</legend>
              <ul className="space-y-1.5">
                {decor.map((d) => {
                  const spec = DECOR.find((x) => x.kind === d.kind);
                  if (!spec) return null;
                  return (
                    <li key={d.id} className="flex items-center gap-3 rounded-xl bg-wall/50 px-3 py-2 ring-1 ring-line/60">
                      <span className="h-8 w-8 shrink-0">
                        <DecorArt kind={d.kind} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {spec.name} <span className="text-sm text-ink-soft">· {shelves.find((sh) => sh.id === d.shelf_id)?.name}</span>
                      </span>
                      <button type="button" className="rounded-full px-3 py-1.5 text-sm text-danger hover:bg-danger/10" onClick={() => removeDecor(d.id)}>
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1.5 text-sm text-ink-soft">To move one, drag it on the shelf (press and hold on a phone) or tap it.</p>
            </fieldset>
          )}
        </div>
      )}

      {tab === "lighting" && (
        <div className="space-y-6 pt-2" role="tabpanel" aria-label="Lighting">
          <fieldset>
            <legend className="label">Time of day</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Time of day">
              <TimeCard icon="🖥️" name="Match my screen" blurb="Night when your phone is dark" checked={!room?.time} onPick={() => pick({ time: undefined })} />
              {TIMES.map((t) => (
                <TimeCard key={t.id} icon={t.icon} name={t.name} blurb={t.blurb} checked={room?.time === t.id} onPick={() => pick({ time: t.id })} />
              ))}
            </div>
          </fieldset>

          <PillRow label="Outside the window" options={WEATHERS} value={room?.weather ?? "clear"} onPick={(id) => pick({ weather: id === "clear" ? undefined : id })} />

          <fieldset>
            <legend className="label">Reading lamp</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Reading lamp">
              {[true, false].map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  role="radio"
                  aria-checked={lampOn === on}
                  onClick={() => lampOn !== on && toggleLamp()}
                  className={`rounded-xl border px-4 py-2 text-sm ${lampOn === on ? "border-accent bg-accent/10" : "border-line text-ink-soft"}`}
                >
                  {on ? "💡 On" : "Off"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">You can also tap the lamp in your room.</p>
          </fieldset>

          <PillRow
            label="Lamp colour"
            options={LAMP_TONES.map((t) => ({ id: t.id, name: t.name, swatch: t.color }))}
            value={room?.lampTone ?? "warm"}
            onPick={(id) => pick({ lampTone: id === "warm" ? undefined : id })}
          />
          <PillRow
            label="Lamp brightness"
            options={LAMP_LEVELS.map((l) => ({ id: String(l.id), name: l.name }))}
            value={String(room?.lampLevel ?? 2)}
            onPick={(id) => pick({ lampLevel: id === "2" ? undefined : (Number(id) as 1 | 3) })}
          />
          <fieldset>
            <legend className="label">Seasonal touches</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Seasonal touches">
              {[true, false].map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  role="radio"
                  aria-checked={(room?.seasonal !== "off") === on}
                  onClick={() => pick({ seasonal: on ? undefined : "off" })}
                  className={`rounded-xl border px-4 py-2 text-sm ${(room?.seasonal !== "off") === on ? "border-accent bg-accent/10" : "border-line text-ink-soft"}`}
                >
                  {on ? "On" : "Off"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">
              Little touches around the window that change by themselves: autumn leaves, Diwali diyas, a Christmas wreath, winter frost, Holi colours, spring blossom.
              {room?.seasonal !== "off" && season && (
                <>
                  {" "}
                  Right now: <span aria-hidden>{SEASONS[season].icon}</span> {SEASONS[season].name}.
                </>
              )}
              {room?.seasonal !== "off" && coming && coming.season !== season && (
                <>
                  {" "}
                  Coming up: <span aria-hidden>{SEASONS[coming.season].icon}</span> {SEASONS[coming.season].name} from {coming.date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}.
                </>
              )}
            </p>
          </fieldset>

          <fieldset>
            <legend className="label">Room sounds</legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Room sounds">
              {[true, false].map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  role="radio"
                  aria-checked={sound.on === on}
                  onClick={() => {
                    sound.save({ on });
                    // switching on is a tap, so the sound can start straight away
                    if (on) sound.play(soundFor(sound.kind, { weather: room?.weather, time: room?.time, season }), sound.volume);
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm ${sound.on === on ? "border-accent bg-accent/10" : "border-line text-ink-soft"}`}
                >
                  {on ? "🔊 On" : "Off"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">Soft sounds while you’re in your room. A speaker button in the corner plays and pauses them. Only you hear them, on this device.</p>
            {sound.on && (
              <div className="mt-3 space-y-3">
                <PillRow label="Sound" options={SOUNDS.map((x) => ({ id: x.id, name: x.name, icon: x.icon }))} value={sound.kind} onPick={(id) => sound.save({ kind: id as SoundKind })} />
                <label className="flex items-center gap-3 text-sm">
                  <span className="text-ink-soft">Volume</span>
                  <input type="range" min={0.05} max={1} step={0.05} value={sound.volume} onChange={(e) => sound.save({ volume: Number(e.target.value) })} className="flex-1 accent-[rgb(var(--accent))]" aria-label="Room sounds volume" />
                </label>
              </div>
            )}
          </fieldset>

          <PillRow
            label="Fairy lights"
            options={[{ id: "none", name: "None" }, ...FAIRY_LIGHTS.map((f) => ({ id: f.id, name: f.name, swatch: f.color }))]}
            value={room?.fairy ?? "none"}
            onPick={(id) => pick({ fairy: id === "none" ? undefined : id })}
          />

          {hasLightingChanges(room) && (
            <button type="button" className="btn-ghost" onClick={() => setRoom({ time: undefined, weather: undefined, lampTone: undefined, lampLevel: undefined, fairy: undefined, seasonal: undefined })}>
              ↺ Back to normal lighting
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** A row of colour swatches, starting with "the style's own". */
function SwatchRow({ label, options, value, onPick }: { label: string; options: { id: string; name: string; color: string }[]; value?: string; onPick: (id: string | undefined) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={label}>
        <button
          type="button"
          role="radio"
          aria-checked={!value}
          aria-label="The style's own"
          title="The style's own"
          onClick={() => onPick(undefined)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed text-sm text-ink-soft ${!value ? "border-accent ring-2 ring-accent/40" : "border-line"}`}
        >
          ↺
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            aria-label={o.name}
            title={o.name}
            onClick={() => onPick(o.id)}
            className={`relative h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${value === o.id ? "border-ink ring-2 ring-accent ring-offset-2 ring-offset-paper" : "border-ink/15"}`}
            style={{ background: o.color === "transparent" ? "repeating-linear-gradient(45deg, rgb(var(--paper)) 0 4px, rgb(var(--line)) 4px 6px)" : o.color }}
          >
            {o.color === "transparent" && <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-soft">✕</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Text choices, one always picked; a dot of colour when the option has one. */
function PillRow({ label, options, value, onPick }: { label: string; options: { id: string; name: string; icon?: string; swatch?: string }[]; value: string; onPick: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onPick(o.id)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${value === o.id ? "border-accent bg-accent/10" : "border-line"}`}
          >
            {o.icon && <span aria-hidden>{o.icon}</span>}
            {o.swatch && <span aria-hidden className="h-4 w-4 rounded-full ring-1 ring-ink/15" style={{ background: o.swatch }} />}
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TimeCard({ icon, name, blurb, checked, onPick }: { icon: string; name: string; blurb: string; checked: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onPick}
      className={`rounded-xl border p-3 text-left transition ${checked ? "border-accent bg-accent/10 ring-2 ring-accent/30" : "border-line hover:border-ink-soft"}`}
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <span className="mt-1 block text-sm font-medium">{name}</span>
      <span className="block text-xs text-ink-soft">{blurb}</span>
    </button>
  );
}

/** Pattern choices as small tiles on a neutral wall. */
function ChipRow({ label, options, value, onPick }: { label: string; options: { id: string; name: string; css: string }[]; value?: string; onPick: (id: string | undefined) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        <button type="button" role="radio" aria-checked={!value} onClick={() => onPick(undefined)} className={`rounded-xl border px-3 py-2 text-sm ${!value ? "border-accent bg-accent/10" : "border-line text-ink-soft"}`}>
          ↺ Style’s own
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onPick(o.id)}
            className={`flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3 text-sm ${value === o.id ? "border-accent bg-accent/10" : "border-line"}`}
          >
            <span aria-hidden className="h-7 w-7 rounded-lg ring-1 ring-line" style={{ background: `${o.css}, ${o.id === "stars" ? "#18203d" : "#e9e2d6"}` }} />
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
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
