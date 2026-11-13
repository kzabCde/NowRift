import { test, expect, type Page } from "@playwright/test";
import { emptyProgress, type Progress } from "../src/game/campaign/progression";
import { initializeRpg } from "../src/game/rpg/profile";
import { seededEquipment } from "../src/game/rpg/items";
import { ITEMS } from "../src/game/rpg/content";
import type { SaveData } from "../src/game/persistence/model";
import { LANDMARKS } from "../src/game/world/content";
import { expeditionLayout } from "../src/game/world/farming";
import { waitForHavenInput } from "./helpers/haven";

const equippedDefinitions = ["desert-armor", "frozen-helmet", "infernal-boots"];
function fixture() {
  const p = initializeRpg(emptyProgress());
  p.gold = 10000;
  p.materials = { wood: 100, "slime-core": 100, "copper-ore": 100 };
  for (const definition of equippedDefinitions)
    p.rpg!.equipment.push(
      seededEquipment("visual-" + definition, definition, "epic", 5),
    );
  return p;
}
async function seed(page: Page, p: Progress = fixture()) {
  await page.goto("/");
  await page.evaluate(
    (p) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("progress");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readwrite");
          tx.objectStore("progress").put(p, "profile");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    p,
  );
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await expect(page.locator(".hub-main .equipped-weapon")).toBeVisible();
}
async function saved(page: Page): Promise<SaveData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readonly"),
            q = tx.objectStore("progress").get("profile");
          q.onsuccess = () => resolve(q.result);
          tx.oncomplete = () => db.close();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}
async function enterHaven(page: Page) {
  await page
    .getByRole("button", { name: "ENTER RIFT HEAVEN →", exact: true })
    .click();
  await expect(page.locator(".rift-transition")).toHaveCount(0);
  await expect(page.locator(".haven-title h1")).toHaveText("Rift Heaven");
  const begin = page.getByRole("button", {
    name: "Begin exploring",
    exact: true,
  });
  if (await begin.isVisible()) await begin.click();
  await waitForHavenInput(page);
}
async function equippedPreview(page: Page) {
  await page.getByRole("button", { name: /Inventory & equipment/ }).click();
  for (const definition of equippedDefinitions) {
    await page
      .locator(".rpg-grid")
      .getByRole("button", { name: new RegExp(ITEMS[definition].name) })
      .click();
    await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
    await expect(
      page.locator(
        `.rpg-character .character-preview [data-definition-id="${definition}"][data-visual-layer="${ITEMS[definition].slot === "helmet" ? "headwear" : ITEMS[definition].slot}"]`,
      ),
    ).toHaveCount(1);
  }
}

test("owned helmet, armor and boots change independent preview layers and persist after reload", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  const before = await saved(page);
  await equippedPreview(page);
  const preview = page.locator(".rpg-character .character-preview");
  expect(
    await preview.locator("[data-visual-layer]").count(),
  ).toBeGreaterThanOrEqual(8);
  await expect(preview.locator('[data-visual-layer="body"]')).toHaveCount(1);
  await page.screenshot({
    path: info.outputPath("layered-inventory-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  const changed = await saved(page);
  expect(changed.rpg!.equipment).toEqual(before.rpg!.equipment);
  expect(changed.rpg!.equipped.weapon).toBe(before.rpg!.equipped.weapon);
  expect(changed.rpg!.equipped.armor).toBe("visual-desert-armor");
  expect(changed.rpg!.equipped.helmet).toBe("visual-frozen-helmet");
  expect(changed.rpg!.equipped.boots).toBe("visual-infernal-boots");
  await page.reload();
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  for (const definition of equippedDefinitions)
    await expect(
      page.locator(
        `.wanderer-card .character-preview [data-definition-id="${definition}"][data-visual-layer="${ITEMS[definition].slot === "helmet" ? "headwear" : ITEMS[definition].slot}"]`,
      ),
    ).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Inventory & equipment/ }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("layered-inventory-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test.describe("live layered renderer and pixel effects", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires the explicitly instrumented build to inspect live rendered layers",
  );

  test("Free Mode gathering uses the selected biome and acknowledges its mining feedback without banking unextracted loot", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await seed(page);
    const before = await saved(page);
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Free Mode · Supply Expeditions",
        exact: true,
      })
      .click();
    await page.locator(".world-card").nth(1).click();
    await page
      .getByRole("button", { name: "BEGIN SUPPLY EXPEDITION →", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    const map = await page.evaluate(
      () => window.__NOWRIFT_TEST__!.state().campaign!.map,
    );
    const node = expeditionLayout("desert-1", map).nodes.find(
      (entry) => entry.item === "gold-ore",
    )!;
    await page.evaluate((point) => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.obstacles = [];
      g.enemies.length = 0;
      g.spawnCooldown = 999;
      g.player.invincible = 999;
      g.player.x = point.x;
      g.player.y = point.y;
    }, node);
    await page
      .getByRole("button", { name: /Gather supplies Gold Ore/ })
      .click();
    await expect
      .poll(async () =>
        (await saved(page)).local.checkpoint?.environment?.harvested?.includes(
          node.id,
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__NOWRIFT_TEST__!.state().visualAction?.pose,
        ),
      )
      .toBe("mine");
    const after = await saved(page);
    expect(after.materials).toEqual(before.materials);
    expect(after.rpg!.equipment).toEqual(before.rpg!.equipment);
    expect(errors).toEqual([]);
  });

  test("equipped body layers agree between town and combat, with directional frame bounds and a frozen checkpoint", async ({
    page,
  }, info) => {
    await seed(page);
    await equippedPreview(page);
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await enterHaven(page);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__NOWRIFT_HAVEN__
              ?.appearance()
              .layers?.filter((l) => l.definitionId).length ?? 0,
        ),
      )
      .toBeGreaterThanOrEqual(3);
    const town = await page.evaluate(() =>
      window.__NOWRIFT_HAVEN__!.appearance(),
    );
    for (const definition of equippedDefinitions)
      expect(
        town.layers.some((l) => l.definitionId === definition && l.visible),
      ).toBe(true);
    const canvas = await page.locator("canvas").elementHandle();
    await page.keyboard.down("ArrowUp");
    try {
      await expect
        .poll(() =>
          page.evaluate(
            () => window.__NOWRIFT_HAVEN__!.appearance().behindBody,
          ),
        )
        .toBe(true);
    } finally {
      await page.keyboard.up("ArrowUp");
    }
    const back = await page.evaluate(() =>
      window.__NOWRIFT_HAVEN__!.appearance(),
    );
    expect(back.behindBody).toBe(true);
    expect(
      back.layers
        .filter((l) => l.visible)
        .every((l) => l.frame >= 0 && l.frame < 104),
    ).toBe(true);
    await page.keyboard.press("i");
    await expect(page.locator(".haven-screen-overlay .rpg-grid")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".haven-screen-overlay")).toHaveCount(0);
    await waitForHavenInput(page);
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector("canvas"),
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("layered-haven.png"),
      animations: "disabled",
    });
    const portal = LANDMARKS.find((l) => l.id === "portal")!;
    await page.evaluate(
      (position) => window.__NOWRIFT_HAVEN__!.place(position),
      portal.entrance,
    );
    await page.locator(".haven-interact").click();
    await page
      .getByRole("button", { name: "Confirm travel", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    const combat = await page.evaluate(() =>
      window.__NOWRIFT_TEST__!.appearance!(),
    );
    expect(combat.appearanceKey).toBe(town.appearanceKey);
    for (const definition of equippedDefinitions)
      expect(
        combat.layers.some((l) => l.definitionId === definition && l.visible),
      ).toBe(true);
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect
      .poll(async () => Boolean((await saved(page)).local.checkpoint))
      .toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "PLAY NOW", exact: true }).click();
    await page
      .getByRole("button", { name: "Resume checkpoint", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await expect(page.locator(".game-state")).toContainText("PAUSED");
    expect(
      (await page.evaluate(() => window.__NOWRIFT_TEST__!.appearance!()))
        .appearanceKey,
    ).toBe(combat.appearanceKey);
  });

  test("actual attack and boss events draw bounded pixel VFX, pause their frames and clean up on returning to town", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await seed(page);
    await page.getByRole("button", { name: /Fire Orb/ }).click();
    await page.getByRole("button", { name: /START NEW RUN/ }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      const g = window.__NOWRIFT_TEST__!.state();
      g.obstacles = [];
      g.spawnCooldown = 999;
      for (let i = 0; i < g.enemies.length; i++) {
        const enemy = g.enemies[i],
          angle = (i / g.enemies.length) * Math.PI * 2,
          radius = 110 + (i % 5) * 18;
        enemy.x = g.player.x + Math.cos(angle) * radius;
        enemy.y = g.player.y + Math.sin(angle) * radius;
        enemy.speed = 0;
        enemy.hp = enemy.maxHp = 1e6;
        enemy.contact = enemy.attack = 999;
      }
      g.weapon.damage = 1;
      g.weapon.delay = 0.12;
      g.weapon.projectiles = 5;
      g.weapon.cooldown = 0;
      g.player.invincible = 999;
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_TEST__!.vfx!().spriteCount),
      )
      .toBeGreaterThanOrEqual(12);
    const effects = await page.evaluate(() => window.__NOWRIFT_TEST__!.vfx!());
    expect(effects.atlasKeys.every((key) => key.startsWith("pixel-vfx-"))).toBe(
      true,
    );
    expect(effects.frames.every((frame) => frame >= 0 && frame < 16)).toBe(
      true,
    );
    expect(effects.active).toBeLessThanOrEqual(96);
    await page.screenshot({
      path: info.outputPath("pixel-spells-combat.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    // Allow the existing camera follow interpolation to settle after resize.
    await page.waitForTimeout(600);
    await page.screenshot({
      path: info.outputPath("pixel-spells-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect(page.locator(".game-state")).toContainText("PAUSED");
    await page.waitForTimeout(150);
    const paused = await page.evaluate(
      () => window.__NOWRIFT_TEST__!.vfx!().frames,
    );
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.vfx!().frames),
    ).toEqual(paused);
    await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("boss");
      const g = window.__NOWRIFT_TEST__!.state(),
        boss = g.enemies.find((e) => e.kind === "boss")!;
      boss.x = g.player.x + 170;
      boss.y = g.player.y;
      boss.attack = 0;
      g.player.invincible = 999;
    });
    await expect(page.getByLabel("Forest Guardian health")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_TEST__!.state().hazards.length),
      )
      .toBeGreaterThan(0);
    await page.screenshot({
      path: info.outputPath("pixel-boss-telegraph.png"),
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "← MAIN MENU", exact: true })
      .click();
    await page
      .getByRole("button", { name: "EXIT TO HUB →", exact: true })
      .click();
    await enterHaven(page);
    await expect(page.locator("canvas")).toHaveCount(1);
    expect(await page.evaluate(() => window.__NOWRIFT_TEST__)).toBeUndefined();
    expect(errors).toEqual([]);
  });
  test("crafting visual receipts follow successful inventory transactions and failed writes grant no visual reward", async ({
    page,
  }, info) => {
    await seed(page);
    await enterHaven(page);
    const workshop = LANDMARKS.find((l) => l.id === "workshop")!;
    await page.evaluate(
      (position) => window.__NOWRIFT_HAVEN__!.place(position),
      workshop.entrance,
    );
    await page.locator(".haven-interact").click();
    await expect(page.locator(".rpg-recipes")).toBeVisible();
    const before = await saved(page);
    await page
      .locator(".rpg-recipes article")
      .first()
      .getByRole("button", { name: "CRAFT", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Confirm crafting" })
      .getByRole("button", { name: "CONFIRM", exact: true })
      .click();
    await expect
      .poll(async () => (await saved(page)).materials["enhancement-stone"] ?? 0)
      .toBe((before.materials["enhancement-stone"] ?? 0) + 1);
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_HAVEN__!.action().lastReceipt?.id),
      )
      .toMatch(/^action-/);
    const committed = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.action().lastReceipt!,
    );
    await expect(
      page.locator(`[data-committed-receipt="${committed.id}"]`).first(),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("committed-crafting-pixel-feedback.png"),
      animations: "disabled",
    });
    const afterSuccess = await saved(page);
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      Reflect.set(window, "__visualRestoreWrites", () => {
        IDBObjectStore.prototype.put = original;
      });
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("quota", "QuotaExceededError");
      };
    });
    await page
      .locator(".rpg-recipes article")
      .first()
      .getByRole("button", { name: "CRAFT", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Confirm crafting" })
      .getByRole("button", { name: "CONFIRM", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: /quota|save|storage/i }),
    ).toBeVisible();
    await page.evaluate(() => Reflect.get(window, "__visualRestoreWrites")());
    expect((await saved(page)).materials).toEqual(afterSuccess.materials);
    expect((await saved(page)).gold).toBe(afterSuccess.gold);
    expect(
      (
        await page.evaluate(
          () => window.__NOWRIFT_HAVEN__!.action().lastReceipt!,
        )
      ).id,
    ).toBe(committed.id);
  });
});
