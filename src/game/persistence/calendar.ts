import { GAME_TIMEZONE, gameDay, type Gift } from "./daily";
import type { Checkin } from "./model";

export const CALENDAR_VERSION = 1;
export function validCalendarDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function monthLength(month: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Invalid calendar month.");
  // ISO parsing avoids Date.UTC's special handling of years 00–99.
  const date = new Date(month + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.getUTCDate();
}
export const calendarDay = (month: string, day: number) =>
  `${month}-${String(day).padStart(2, "0")}`;
export function monthCells(month: string): (string | null)[] {
  const count = monthLength(month),
    start = new Date(month + "-01T12:00:00Z").getUTCDay();
  const cells: (string | null)[] = Array.from({ length: start }, () => null);
  for (let day = 1; day <= count; day++) cells.push(calendarDay(month, day));
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function adjacentMonth(month: string, offset: number) {
  monthLength(month);
  const date = new Date(month + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function calendarLabel(
  iso: string,
  locale: "en" | "th",
  monthOnly = false,
) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    timeZone: GAME_TIMEZONE,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "long",
    ...(monthOnly ? {} : { day: "numeric" as const }),
  }).format(
    new Date(
      iso.slice(0, 7) + (monthOnly ? "-01" : iso.slice(7)) + "T05:00:00Z",
    ),
  );
}
export function untilBangkokMidnight(at: number): number {
  const date = new Date(gameDay(at) + "T00:00:00+07:00");
  return date.getTime() + 86400000 - at;
}

/** Version 1 is frozen so exported history keeps the reward originally offered. */
export function calendarReward(dayKey: string): {
  gift: Gift;
  weekly: boolean;
  final: boolean;
} {
  if (!validCalendarDay(dayKey)) throw new Error("Invalid calendar date.");
  const day = Number(dayKey.slice(8)),
    month = dayKey.slice(0, 7);
  const weekly = [7, 14, 21, 28].includes(day),
    final = day === monthLength(month);
  const ordinary: Gift[] = [
    { gold: 300 },
    { materials: { "copper-ore": 3 } },
    { gold: 400 },
    { materials: { wood: 4 } },
    { gold: 500 },
    { materials: { "enhancement-stone": 2 } },
    { gold: 300 },
  ];
  const gift: Gift = weekly
    ? {
        gold: [500, 750, 1000, 1500][day / 7 - 1],
        materials: { "enhancement-stone": day / 7 + 1 },
      }
    : structuredClone(ordinary[(day - 1) % ordinary.length]);
  // One rare-material parcel per calendar month, replacing the old weekly cycle chest.
  if (day === 21)
    Object.assign(gift.materials!, {
      "ancient-shard": 5,
      "frost-crystal": 5,
      "gold-ore": 5,
    });
  if (final) {
    gift.gold = (gift.gold ?? 0) + 1000;
    gift.epic = true;
  }
  return { gift, weekly, final };
}
export function checkinState(
  day: string,
  today: string,
  claims: readonly Checkin[],
) {
  if (claims.some((claim) => claim.day === day)) return "claimed";
  return day === today ? "today" : day < today ? "missed" : "future";
}
