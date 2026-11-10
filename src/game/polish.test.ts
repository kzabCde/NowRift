import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import {
  makeGame,
  beginGame,
  advanceGame,
  spawnEnemy,
  advanceEffects,
} from "./engine";
import { feedback, drainFeedback } from "./feedback";
import { CHARACTERS, applyLoadout, emptyEquipment } from "./loadout";
import { changeEquipment, campaignRepository } from "./campaign/persistence";
import { emptyProgress, validProgress } from "./campaign/progression";
import { PALETTE, VoiceGate } from "./audio/palette";
import { parsePreferences, defaults } from "../state/settings";
describe("bounded semantic combat feedback", () => {
  test("important alerts survive saturation and objects recycle", () => {
    const g = makeGame();
    for (let i = 0; i < 300; i++) feedback(g, "spark", i, 0);
    feedback(g, "bossSpawn", 0, 0, 0xffffff, 100, 0, true);
    expect(g.feedback).toHaveLength(128);
    expect(g.feedback.some((e) => e.kind === "bossSpawn")).toBe(true);
    const objects = new Set(g.feedback);
    drainFeedback(g, () => {});
    feedback(g, "heal", 0, 0);
    expect(objects.has(g.feedback[0])).toBe(true);
  });
  test("directional knockback belongs to daggers and preserves the existing fire trajectory", () => {
    for (const weapon of ["daggers", "fire"] as const) {
      const g = makeGame(1800, 1400, weapon, () => 0.99);
      beginGame(g);
      g.enemies = [];
      g.obstacles = [];
      g.spawnCooldown = 999;
      g.weapon.cooldown = 999;
      const e = spawnEnemy(g, "elite", 1000, 700)!;
      e.speed = 0;
      g.bullets.push({
        x: 1000,
        y: 700,
        vx: 0,
        vy: 0,
        r: 8,
        life: 1,
        damage: 3,
        color: "#fff",
      });
      advanceGame(g, 0.01, 0, 0);
      expect(e.x).toBe(weapon === "daggers" ? 1003 : 1000);
    }
  });
  test("hits emit semantic feedback and damage text recycles", () => {
    const g = makeGame(1800, 1400, "arcane", () => 0.99);
    beginGame(g);
    g.enemies = [];
    g.obstacles = [];
    g.spawnCooldown = 999;
    g.weapon.cooldown = 999;
    const e = spawnEnemy(g, "slime", 1000, 700)!;
    g.bullets.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      r: 8,
      life: 1,
      damage: 3,
      color: "#fff",
      critical: true,
    });
    advanceGame(g, 0.02, 0, 0);
    expect(g.feedback.some((e) => e.kind === "spark" && e.important)).toBe(
      true,
    );
    const text = g.texts[0];
    advanceEffects(g, 2);
    expect(g.pools.texts).toContain(text);
  });
});
describe("local character and equipment gameplay", () => {
  test("characters change the actual simulation", () => {
    for (const character of Object.keys(
      CHARACTERS,
    ) as (keyof typeof CHARACTERS)[]) {
      const g = makeGame();
      applyLoadout(g, { character, relic: null, rank: 0 });
      expect(g.player.maxHp).toBe(CHARACTERS[character].hp);
      expect(g.player.speed).toBe(CHARACTERS[character].speed);
      expect(g.weapon.crit).toBe(CHARACTERS[character].crit);
    }
    const g = makeGame();
    applyLoadout(g, { character: "sentinel", relic: "glacial-relic", rank: 2 });
    expect(g.player.hp).toBe(160);
  });
  test("old campaign saves remain valid, unavailable relics and overspending rejected", () => {
    const p = emptyProgress();
    expect(validProgress(p)).toBe(true);
    expect(() => changeEquipment(p, "equip", "verdant-relic")).toThrow(
      "Earn this relic",
    );
    p.candidates = ["verdant-relic"];
    expect(() => changeEquipment(p, "enhance", "verdant-relic")).toThrow(
      "Not enough",
    );
    p.gold = 33;
    p.materials["slime-core"] = 1;
    const next = changeEquipment(p, "enhance", "verdant-relic");
    expect(next.gold).toBe(0);
    expect(next.materials["slime-core"]).toBe(0);
    expect(
      next.rpg!.equipment.find((e) => e.definitionId === "boss-forest")!
        .enhancement,
    ).toBe(1);
    expect(p.gold).toBe(33);
    expect(p.equipment).toBeUndefined();
    expect(validProgress(next)).toBe(true);
    expect(
      validProgress({
        ...next,
        equipment: { ...emptyEquipment(), equipped: "sovereign-relic" },
      }),
    ).toBe(false);
  });
  test("enhancement and equip share an atomic IndexedDB transaction", async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("nowrift-campaign", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("progress");
      r.onsuccess = () => {
        const db = r.result,
          t = db.transaction("progress", "readwrite");
        t.objectStore("progress").put(
          {
            ...emptyProgress(),
            gold: 33,
            materials: { "slime-core": 1 },
            candidates: ["verdant-relic"],
          },
          "profile",
        );
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
    });
    const results = await Promise.allSettled([
      campaignRepository.enhance("verdant-relic"),
      campaignRepository.enhance("verdant-relic"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await campaignRepository.equip("verdant-relic");
    const p = await campaignRepository.load();
    expect(p.gold).toBe(0);
    expect(
      p.rpg!.equipment.find((e) => e.id === p.rpg!.equipped.necklace)!
        .definitionId,
    ).toBe("boss-forest");
  });
});
describe("sound event policies and preferences", () => {
  test("collision floods obey per-event cooldown and voice budget", () => {
    const gate = new VoiceGate();
    expect(gate.allow("impact", 1, 0.1, 0, 8)).toBe(true);
    expect(gate.allow("impact", 1.01, 0.1, 0, 8)).toBe(false);
    expect(gate.allow("impact", 1.2, 0.1, 8, 8)).toBe(false);
    expect(gate.allow("impact", 1.21, 0.1, 7, 8)).toBe(true);
    expect(PALETTE.damage.priority).toBeGreaterThan(PALETTE.enemyHit.priority);
    for (const tone of Object.values(PALETTE)) {
      expect(tone.duration).toBeLessThan(2);
      expect(tone.gain).toBeLessThan(0.15);
    }
  });
  test("legacy preference migration, volume bounds and untrusted fields", () => {
    expect(parsePreferences({ reducedEffects: true, zoom: 0.85 })).toEqual({
      ...defaults,
      reducedEffects: true,
      zoom: 0.85,
    });
    for (const master of [-1, Infinity, NaN, 2, "loud"])
      expect(() => parsePreferences({ master })).toThrow();
    expect(parsePreferences({ set: "broken", quality: "low" }).quality).toBe(
      "low",
    );
  });
});
