import { expect, test } from "vitest";
import { parseBestKills } from "./metadata";
test("legacy kill records tolerate corrupt numbers without inventing a score", () => {
  expect(parseBestKills("42")).toBe(42);
  expect(parseBestKills("Infinity")).toBe(0);
  expect(parseBestKills("broken")).toBe(0);
  expect(parseBestKills("-8")).toBe(0);
  expect(parseBestKills(null)).toBe(0);
});
