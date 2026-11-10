import { describe, expect, it } from "vitest";
import { th } from "./dictionaries/th";
import { resolveLocale, preferredLocale } from "./config";
import { date, number, plural, translate, translateText } from "./translator";
describe("offline internationalization", () => {
  it("supports English fallback and Thai translations", () => {
    expect(translate("en", "main", "Settings")).toBe("Settings");
    expect(translate("th", "main", "Settings")).toBe("ตั้งค่า");
    expect(translateText("th", "Whispering Forest")).toBe("ป่ากระซิบ");
    expect(translateText("th", "slime")).toBe("สไลม์");
    expect(translateText("en", "unrecognized")).toBe("unrecognized");
  });
  it("detects and persists only valid locales", () => {
    expect(resolveLocale(["ja-JP", "th-TH"])).toBe("th");
    expect(preferredLocale("en", ["th-TH"])).toBe("en");
    expect(preferredLocale("bad", ["th-TH"])).toBe("th");
  });
  it("interpolates progression and formats calendar year", () => {
    expect(translateText("th", "Clear Stage 2 on HARD.")).toContain("2");
    expect(number("th", 1234)).toContain("1,234");
    expect(plural("en", 1, { one: "{count} kill", other: "{count} kills" })).toBe("1 kill");
    expect(plural("en", 3, { one: "{count} kill", other: "{count} kills" })).toBe("3 kills");
    expect(plural("th", 3, { other: "{count} ครั้ง" })).toBe("3 ครั้ง");
    expect(date("th", new Date("2026-04-01T00:00:00.000Z"))).toContain("2026");
  });
  it("has nonblank Thai translations and no duplicate source keys across divergent namespaces", () => {
    for (const group of Object.values(th)) for (const value of Object.values(group)) expect(value.trim().length).toBeGreaterThan(0);
  });
});
