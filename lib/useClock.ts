"use client";

import { useEffect, useState } from "react";
import type { RoomSettings } from "./room";

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
