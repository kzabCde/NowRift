"use client";
import { useEffect, useState } from "react";
import { gameDay } from "@/game/persistence/daily";
import { untilBangkokMidnight } from "@/game/persistence/calendar";

/** Calendar wall clock: independent of combat simulation, with focus/sleep recovery. */
export function useGameDay() {
  const [day, setDay] = useState(() => gameDay());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setDay(gameDay());
      timer = setTimeout(
        refresh,
        Math.min(60000, Math.max(50, untilBangkokMidnight(Date.now()) + 20)),
      );
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return day;
}
