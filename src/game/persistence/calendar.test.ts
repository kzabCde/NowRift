import { expect, test } from "vitest";
import {
  adjacentMonth,
  calendarDay,
  calendarLabel,
  calendarReward,
  checkinState,
  monthCells,
  monthLength,
  untilBangkokMidnight,
  validCalendarDay,
} from "./calendar";
import { gameDay } from "./daily";
import { ITEMS } from "../rpg/content";

test.each([
  ["2026-02", 28],
  ["2028-02", 29],
  ["1900-02", 28],
  ["2000-02", 29],
  ["2026-04", 30],
  ["2026-01", 31],
] as const)(
  "%s has exactly %i actual dates with correct Sunday-first weekday alignment",
  (month, length) => {
    const cells = monthCells(month),
      days = cells.filter(Boolean);
    expect(monthLength(month)).toBe(length);
    expect(days).toHaveLength(length);
    expect(cells.length % 7).toBe(0);
    expect(days[0]).toBe(month + "-01");
    expect(days.at(-1)).toBe(calendarDay(month, length));
    expect(cells.indexOf(month + "-01")).toBe(
      new Date(month + "-01T12:00:00Z").getUTCDay(),
    );
  },
);
test("year rollover and Bangkok midnight use Gregorian ISO dates regardless of Thai display", () => {
  expect(adjacentMonth("2026-12", 1)).toBe("2027-01");
  expect(adjacentMonth("2027-01", -1)).toBe("2026-12");
  const at = Date.UTC(2026, 11, 31, 16, 59, 59, 900);
  expect(gameDay(at)).toBe("2026-12-31");
  expect(untilBangkokMidnight(at)).toBe(100);
  expect(gameDay(at + 100)).toBe("2027-01-01");
  expect(untilBangkokMidnight(at + 100)).toBe(86400000);
  expect(calendarLabel("2026-11", "th", true)).toContain("2026");
  expect(calendarLabel("2026-11-10", "en")).toBe("10 November 2026");
  for (const bad of [
    "2026-02-29",
    "2026-13-01",
    "2026-01-00",
    "2026-1-1",
    null,
  ])
    expect(validCalendarDay(bad)).toBe(false);
});
test("weekly milestones and the actual final date merge once, with only valid economy items", () => {
  expect(calendarReward("2026-02-28")).toEqual({
    weekly: true,
    final: true,
    gift: { gold: 2500, materials: { "enhancement-stone": 5 }, epic: true },
  });
  expect(calendarReward("2028-02-28")).toEqual({
    weekly: true,
    final: false,
    gift: { gold: 1500, materials: { "enhancement-stone": 5 } },
  });
  expect(calendarReward("2028-02-29").gift).toEqual({ gold: 1300, epic: true });
  expect(calendarReward("2026-11-14").gift).toEqual({
    gold: 750,
    materials: { "enhancement-stone": 3 },
  });
  expect(calendarReward("2026-11-10").gift).toEqual({ gold: 400 });
  for (const month of ["2026-02", "2028-02", "2026-04", "2026-01"]) {
    let epics = 0;
    for (const day of monthCells(month).filter((d): d is string => !!d)) {
      const { gift } = calendarReward(day);
      if (gift.epic) epics++;
      for (const [id, n] of Object.entries(gift.materials ?? {})) {
        expect(ITEMS[id]).toBeDefined();
        expect(n).toBeGreaterThan(0);
      }
    }
    expect(epics).toBe(1);
  }
});
test("claims from either schema remain claimed; missing days cannot shift or backfill rewards", () => {
  const claims = [
    { day: "2026-11-09", cycle: 6, slotId: "old", at: 0 },
    { day: "2026-11-10", calendarVersion: 1 as const, slotId: "new", at: 1 },
  ];
  expect(checkinState("2026-11-09", "2026-11-11", claims)).toBe("claimed");
  expect(checkinState("2026-11-10", "2026-11-11", claims)).toBe("claimed");
  expect(checkinState("2026-11-08", "2026-11-11", claims)).toBe("missed");
  expect(checkinState("2026-11-11", "2026-11-11", claims)).toBe("today");
  expect(checkinState("2026-11-12", "2026-11-11", claims)).toBe("future");
  const reward = calendarReward("2026-11-11");
  claims.length = 0;
  expect(calendarReward("2026-11-11")).toEqual(reward);
});
