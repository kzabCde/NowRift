import { describe, expect, it } from "vitest";
import { th } from "./dictionaries/th";
import { WORLDS, STAGES, ITEM_IDS } from "../game/campaign/content";
import { WEAPONS, UPGRADES } from "../game/content/forest";
import { CHARACTERS, RELICS } from "../game/loadout";
import { ITEMS, RARITIES, UPGRADES as RPG_UPGRADES } from "../game/rpg/content";
import { resolveLocale, preferredLocale } from "./config";
import { date, number, plural, translate, translateText } from "./translator";
describe("offline internationalization", () => {
  it("translates the RPG catalog, generated descriptions and journal messages", () => {
    for (const item of Object.values(ITEMS)) {
      expect(translateText("th", item.name)).not.toBe(item.name);
      expect(translateText("th", item.description)).not.toBe(item.description);
    }
    for (const rarity of Object.values(RARITIES))
      expect(translateText("th", rarity.name)).not.toBe(rarity.name);
    for (const upgrade of Object.values(RPG_UPGRADES)) {
      expect(translateText("th", upgrade.name)).not.toBe(upgrade.name);
      expect(translateText("th", upgrade.description)).not.toBe(
        upgrade.description,
      );
    }
    expect(translateText("th", "Equipped Sunsteel Blade.")).toBe(
      "สวมใส่ดาบเหล็กสุริยะแล้ว",
    );
    expect(translateText("en", "Equipped Sunsteel Blade.")).toBe(
      "Equipped Sunsteel Blade.",
    );
  });
  it("supports English fallback and Thai translations", () => {
    expect(translate("en", "main", "Settings")).toBe("Settings");
    expect(translate("th", "main", "Settings")).toBe("ตั้งค่า");
    expect(translateText("th", "Whispering Forest")).toBe("ป่ากระซิบ");
    expect(translateText("th", "slime")).toBe("สไลม์");
    expect(
      translateText(
        "th",
        "Missing art: player. A fallback is in use; reload to retry.",
      ),
    ).toContain("ไม่พบภาพเกม");
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
    expect(
      plural("en", 1, { one: "{count} kill", other: "{count} kills" }),
    ).toBe("1 kill");
    expect(
      plural("en", 3, { one: "{count} kill", other: "{count} kills" }),
    ).toBe("3 kills");
    expect(plural("th", 3, { other: "{count} ครั้ง" })).toBe("3 ครั้ง");
    expect(date("th", new Date("2026-04-01T00:00:00.000Z"))).toContain("2026");
  });
  it("covers every canonical world, stage, enemy, weapon, upgrade, character, relic and material display string", () => {
    const content = th.content as Record<string, string>;
    const values = [
      ...WORLDS.flatMap((world) => [
        world.name,
        world.description,
        world.boss.name,
        world.boss.reward,
        ...world.boss.patterns,
        ...world.materials,
        ...world.enemies.map((enemy) => enemy.name),
      ]),
      ...STAGES.map((stage) => stage.name),
      ...ITEM_IDS,
      ...Object.values(WEAPONS).flatMap((weapon) => [
        weapon.name,
        weapon.description,
      ]),
      ...UPGRADES.flatMap((upgrade) => [upgrade.name, upgrade.description]),
      ...Object.values(CHARACTERS).flatMap((character) => [
        character.name,
        character.title,
        character.description,
      ]),
      ...Object.values(RELICS).flatMap((relic) => [relic.name, relic.detail]),
    ];
    for (const label of values)
      expect(content[label], "Missing: " + label).toBeTruthy();
  });
  it("has nonblank Thai translations and no duplicate source keys across divergent namespaces", () => {
    for (const group of Object.values(th))
      for (const value of Object.values(group))
        expect(value.trim().length).toBeGreaterThan(0);
  });
});
