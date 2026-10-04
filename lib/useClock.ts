"use client";

import { useEffect, useState } from "react";
import type { RoomSettings } from "./room";
import { currentSeason, type Season } from "./seasons";

/** Re-renders every few minutes while the room follows the real time of day. */
export function useRoomClock(room?: RoomSettings | null) {
  const [, tick] = useState(0);
  const live = room?.time === "auto";
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => tick((n) => n + 1), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [live]);
}

/**
 * The seasonal touch showing in the room, worked out in the browser after the page loads (the
 * static pages are built ahead of time). Null when there's none or the reader turned them off.
 */
export function useSeason(room?: RoomSettings | null): Season | null {
  const [season, setSeason] = useState<Season | null>(null);
  const off = room?.seasonal === "off";
  useEffect(() => {
    if (off) return setSeason(null);
    setSeason(currentSeason());
    const id = window.setInterval(() => setSeason(currentSeason()), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [off]);
  return season;
}
