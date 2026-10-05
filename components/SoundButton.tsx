"use client";

import { useEffect } from "react";
import type { RoomSettings } from "@/lib/room";
import { SOUNDS, soundFor, useRoomSound } from "@/lib/sound";

/**
 * The speaker in the corner of the room, shown when room sounds are switched on. Tap to play or
 * pause. Browsers only allow sound after a tap, so it also starts on the first tap anywhere.
 */
export function SoundButton({ room, season }: { room?: RoomSettings | null; season?: string | null }) {
  const s = useRoomSound();
  const kind = soundFor(s.kind, { weather: room?.weather, time: room?.time, season });

  // Start on the first tap once switched on.
  useEffect(() => {
    if (!s.on || s.playing) return;
    const start = () => s.play(kind, s.volume);
    window.addEventListener("pointerdown", start, { once: true });
    return () => window.removeEventListener("pointerdown", start);
  }, [s.on, s.playing, kind, s.volume, s]);

  // Follow a change of sound or volume while playing.
  useEffect(() => {
    if (s.on && s.playing) s.play(kind, s.volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, s.volume]);

  if (!s.on) return null;
  const name = SOUNDS.find((x) => x.id === kind)?.name ?? "Room sounds";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (s.playing) s.pause();
        else s.play(kind, s.volume);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={s.playing}
      aria-label={s.playing ? `Pause room sounds (${name})` : `Play room sounds (${name})`}
      title={s.playing ? `${name}: tap to pause` : `${name}: tap to play`}
      className="fixed bottom-24 left-4 z-30 flex h-12 md:bottom-5 md:left-5 items-center gap-2 rounded-full bg-paper/90 px-4 text-sm text-ink shadow-lg ring-1 ring-line backdrop-blur transition hover:bg-paper"
    >
      <span aria-hidden className="text-lg">
        {s.playing ? "🔊" : "🔈"}
      </span>
      <span className="hidden sm:inline">{s.playing ? name : "Play sounds"}</span>
      {s.playing && (
        <span aria-hidden className="flex h-4 items-end gap-[2px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="sound-bar w-[3px] rounded-full bg-current" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
      )}
    </button>
  );
}
