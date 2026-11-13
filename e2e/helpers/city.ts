import { expect, type Page } from "@playwright/test";
import { initializeRpg } from "../../src/game/rpg/profile";
import { emptyProgress } from "../../src/game/campaign/progression";
import { STAGES } from "../../src/game/campaign/content";
import { seededEquipment } from "../../src/game/rpg/items";
import { calculateStats } from "../../src/game/rpg/stats";
import { defaultWorld } from "../../src/game/world/save";
import { LANDMARKS, type Point } from "../../src/game/world/content";
import type { SaveData, PlayerProfile } from "../../src/game/persistence/model";
import { waitForHavenInput } from "./haven";

export async function citySave(page: Page): Promise<SaveData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("nowrift-campaign", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("progress", "readonly"),
            store = tx.objectStore("progress"),
            root = store.get("player");
          root.onsuccess = () => {
            const p = root.result as PlayerProfile,
              q = store.get(p.slots.find((s) => s.id === p.activeSlotId)!.key);
            q.onsuccess = () => resolve(q.result);
          };
          tx.oncomplete = () => db.close();
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}
export async function enterCity(page: Page, seed = false) {
  if (seed) {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Practice & legacy tools", exact: true })
      .click();
    await expect(page.locator(".hub-main")).toBeVisible();
    const original = await citySave(page),
      p = {
        ...original,
        ...initializeRpg(emptyProgress()),
        local: { ...original.local, world: defaultWorld() },
      };
    p.gold = 12000;
    p.xp = 700;
    p.clears = STAGES.map((s) => s.id + ":normal");
    p.materials = {
      wood: 400,
      "slime-core": 400,
      "copper-ore": 400,
      "enhancement-stone": 400,
    };
    const blade = seededEquipment(
      "city-sunblade",
      "desert-weapon",
      "legendary",
      10,
    );
    blade.enhancement = 12;
    p.rpg!.equipment.push(blade);
    p.rpg!.equipped.weapon = blade.id;
    p.local.world.hp = calculateStats(p).maxHp;
    await page.evaluate(
      (value) =>
        new Promise<void>((resolve, reject) => {
          const r = indexedDB.open("nowrift-campaign", 1);
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction("progress", "readwrite"),
              s = tx.objectStore("progress"),
              q = s.get("player");
            q.onsuccess = () => {
              const p = q.result as PlayerProfile;
              s.put(
                value,
                p.slots.find((slot) => slot.id === p.activeSlotId)!.key,
              );
            };
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      p,
    );
    await page.reload();
  }
  const legacy = page.getByRole("button", {
    name: "Practice & legacy tools",
    exact: true,
  });
  if (await legacy.isVisible()) await legacy.click();
  await page
    .getByRole("button", { name: "ENTER RIFT HEAVEN →", exact: true })
    .click();
  await expect(page.locator(".rift-transition")).toHaveCount(0);
  await expect(page.locator(".haven-loading")).toHaveCount(0);
  const begin = page.getByRole("button", {
    name: "Begin exploring",
    exact: true,
  });
  if (await begin.isVisible()) await begin.click();
  await waitForHavenInput(page);
  await page.evaluate(() => window.__NOWRIFT_HAVEN__!.setCityTime(0.25));
  await expect
    .poll(() =>
      page.evaluate(() => window.__NOWRIFT_HAVEN__!.city().lighting.night),
    )
    .toBe(false);
}
export async function placeCity(page: Page, point: Point) {
  const before = await page.evaluate(
    () => window.__NOWRIFT_HAVEN__!.city().frames,
  );
  await page.evaluate((p) => window.__NOWRIFT_HAVEN__!.place(p), point);
  await expect
    .poll(() => page.evaluate(() => window.__NOWRIFT_HAVEN__!.city().frames))
    .toBeGreaterThan(before + 1);
}
export async function cityStation(page: Page, id: string) {
  const l = LANDMARKS.find((l) => l.id === id)!;
  await placeCity(page, l.entrance);
  await expect(page.locator(".haven-interact")).toContainText(l.name);
  await page.locator(".haven-interact").click();
}
export async function closeCityPanel(page: Page) {
  await page.keyboard.press("Escape");
  await waitForHavenInput(page);
}
