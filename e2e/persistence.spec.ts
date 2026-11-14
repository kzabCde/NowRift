import { beginStory, finishStory } from "./helpers/story";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyProgress } from "../src/game/campaign/progression";
import { initializeRpg } from "../src/game/rpg/profile";
import { seededEquipment } from "../src/game/rpg/items";
import type { PlayerProfile, SaveData } from "../src/game/persistence/model";
async function guest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await expect(page.locator(".profile-subtitle")).toBeVisible();
}
async function profile(page: Page) {
  await page.getByRole("button", { name: /^PROFILE & SAVES/ }).click();
  await expect(page.locator(".profile-player-id")).toHaveText(
    /^NR-[A-F0-9]{8}$/,
  );
}
async function slot(page: Page, id?: string): Promise<SaveData> {
  return page.evaluate(
    async (id) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readonly"),
            s = t.objectStore("progress"),
            p = s.get("player");
          p.onsuccess = () => {
            const root = p.result as PlayerProfile,
              ref = root.slots.find((s) => s.id === (id ?? root.activeSlotId))!,
              q = s.get(ref.key);
            q.onsuccess = () => resolve(q.result);
          };
          t.oncomplete = () => db.close();
          t.onerror = () => reject(t.error);
        };
      }),
    id,
  );
}
async function player(page: Page): Promise<PlayerProfile> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readonly"),
            q = t.objectStore("progress").get("player");
          q.onsuccess = () => resolve(q.result);
          t.oncomplete = () => db.close();
          t.onerror = () => reject(t.error);
        };
      }),
  );
}
async function seed(page: Page) {
  await page.goto("/");
  const p = initializeRpg(emptyProgress());
  p.gold = 2000;
  p.materials = {
    wood: 100,
    "copper-ore": 100,
    "slime-core": 100,
    "enhancement-stone": 100,
  };
  p.rpg!.equipment.push(
    seededEquipment("backup-blade", "desert-weapon", "rare", 5),
  );
  await page.evaluate(
    async (p) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("progress");
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readwrite");
          t.objectStore("progress").put(p, "profile");
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
      }),
    p,
  );
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await expect(page.locator(".profile-subtitle")).toBeVisible();
}
async function confirm(page: Page, title: string) {
  await page
    .getByRole("dialog", { name: title, exact: true })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
}
async function startStage(page: Page) {
  await page.getByRole("button", { name: "WORLD MAP →", exact: true }).click();
  await page
    .getByRole("button", { name: "START STAGE →", exact: true })
    .click();
  await beginStory(page);
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
}
async function finishStage(page: Page) {
  await finishStory(page);
  await expect(page.locator(".campaign-reward")).toContainText("FIRST CLEAR");
  await expect(page.locator(".save-message")).toContainText("saved");
}

test("guest identity, three save slots, selection, names and deletion persist independently", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await guest(page);
  const first = await slot(page);
  await profile(page);
  const id = (await player(page)).id;
  await page
    .getByLabel("Player name", { exact: true })
    .fill("Chronicle Keeper");
  await page
    .getByRole("button", { name: "SAVE PLAYER NAME", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chronicle Keeper", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "SAVE SLOTS", exact: true }).click();
  await page
    .getByLabel("New character name", { exact: true })
    .fill("Ash Ember");
  await page
    .getByLabel("Character class", { exact: true })
    .selectOption("sentinel");
  await page.getByRole("button", { name: "CREATE SLOT", exact: true }).click();
  await expect(page.locator(".profile-slot.selected")).toContainText(
    "Ash Ember",
  );
  const second = await slot(page);
  expect(second.local.character).toBe("sentinel");
  expect(second.gold).toBe(0);
  expect(second.local.id).not.toBe(first.local.id);
  await page
    .getByLabel("New character name", { exact: true })
    .fill("Dusk Thread");
  await page.getByRole("button", { name: "CREATE SLOT", exact: true }).click();
  await expect(page.locator(".profile-slot")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "CREATE SLOT", exact: true }),
  ).toBeDisabled();
  const firstCard = page.locator(".profile-slot").first();
  await firstCard
    .getByRole("button", { name: "SELECT CHARACTER", exact: true })
    .click();
  await expect(firstCard).toHaveClass(/selected/);
  await page
    .getByLabel("Rename character", { exact: true })
    .fill("Moss Lantern");
  await page
    .getByRole("button", { name: "RENAME CHARACTER", exact: true })
    .click();
  await expect(firstCard.getByRole("heading")).toHaveText("Moss Lantern");
  await page.reload();
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await profile(page);
  expect((await player(page)).id).toBe(id);
  await expect(
    page.getByRole("heading", { name: "Moss Lantern", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "SAVE SLOTS", exact: true }).click();
  const dusk = page.locator(".profile-slot").filter({ hasText: "Dusk Thread" });
  await dusk.getByRole("button", { name: "DELETE SLOT", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Delete character?" }),
  ).toContainText("Dusk Thread");
  await page.getByRole("button", { name: "CANCEL", exact: true }).click();
  expect((await player(page)).slots).toHaveLength(3);
  await dusk.getByRole("button", { name: "DELETE SLOT", exact: true }).click();
  await confirm(page, "Delete character?");
  await expect(page.locator(".profile-slot")).toHaveCount(2);
  expect((await slot(page, second.local.id)).gold).toBe(0);
  await page.screenshot({
    path: info.outputPath("save-slots.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("profile-wide check-in pays once across characters and achievements claim only once", async ({
  page,
}) => {
  await guest(page);
  const first = await slot(page);
  await profile(page);
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  const claim = page.getByRole("button", {
    name: "CLAIM DAILY REWARD",
    exact: true,
  });
  await claim.evaluate((el) => {
    (el as HTMLButtonElement).click();
    (el as HTMLButtonElement).click();
  });
  await expect(
    page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
  ).toBeDisabled();
  expect((await slot(page)).gold).toBe(500);
  expect((await player(page)).checkins).toHaveLength(1);
  await page.getByRole("button", { name: "SAVE SLOTS", exact: true }).click();
  await page.getByLabel("New character name").fill("Second Light");
  await page.getByRole("button", { name: "CREATE SLOT", exact: true }).click();
  await expect(page.locator(".profile-slot.selected")).toContainText(
    "Second Light",
  );
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
  ).toBeDisabled();
  expect((await slot(page)).gold).toBe(0);
  expect((await slot(page, first.local.id)).gold).toBe(500);
  await page.getByRole("button", { name: "ACHIEVEMENTS", exact: true }).click();
  const outfit = page
    .locator(".profile-objectives article")
    .filter({ hasText: "Ready for the rift" });
  await outfit
    .getByRole("button", { name: "CLAIM REWARD", exact: true })
    .click();
  await expect(
    outfit.getByRole("button", { name: "CLAIMED", exact: true }),
  ).toBeDisabled();
  expect((await slot(page)).gold).toBe(100);
});
test("malformed import and quota failure preserve existing progress and shared claim history", async ({
  page,
}) => {
  await guest(page);
  await profile(page);
  const before = await slot(page);
  await page
    .getByRole("button", { name: "BACKUP & RESTORE", exact: true })
    .click();
  await page.getByLabel("Import save file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "not valid JSON" }),
  ).toBeVisible();
  expect((await slot(page)).gold).toBe(before.gold);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    let fail = true;
    IDBObjectStore.prototype.put = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      const p = value as { rpg?: { history: { kind: string }[] } };
      if (fail && p.rpg?.history.at(-1)?.kind === "gift") {
        fail = false;
        throw new DOMException("quota", "QuotaExceededError");
      }
      return key === undefined
        ? original.call(this, value)
        : original.call(this, value, key);
    };
  });
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  await page
    .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: /quota|storage is full/i }),
  ).toBeVisible();
  expect((await slot(page)).gold).toBe(before.gold);
  expect((await player(page)).checkins).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "CLAIM DAILY REWARD", exact: true }),
  ).toBeEnabled();
});
test("profile, daily and backup controls fit mobile portrait and landscape", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await guest(page);
  await profile(page);
  for (const label of [
    "PROFILE",
    "SAVE SLOTS",
    "CHECK-IN",
    "DAILY QUESTS",
    "ACHIEVEMENTS",
    "BACKUP & RESTORE",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("daily-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
});
test("another tab selecting a different slot cannot redirect a pending reward to that character", async ({
  page,
  context,
}) => {
  await guest(page);
  await profile(page);
  const first = await slot(page),
    other = await context.newPage();
  try {
    await guest(other);
    await profile(other);
    await other
      .getByRole("button", { name: "SAVE SLOTS", exact: true })
      .click();
    await other.getByLabel("New character name").fill("Other Tab");
    await other
      .getByRole("button", { name: "CREATE SLOT", exact: true })
      .click();
    await expect(other.locator(".profile-slot.selected")).toContainText(
      "Other Tab",
    );
    const second = await slot(other);
    await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
    await page
      .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
    ).toBeDisabled();
    expect((await slot(page, first.local.id)).gold).toBe(500);
    expect((await slot(other, second.local.id)).gold).toBe(0);
    expect((await player(page)).checkins[0].slotId).toBe(first.local.id);
  } finally {
    await other.close();
  }
});
test("successful enhancement completes a daily quest and its reward persists once", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: /Inventory & equipment/ }).click();
  await page.locator('.rpg-grid button[aria-label*="Sunsteel Blade"]').click();
  await page.getByRole("button", { name: "BLACKSMITH", exact: true }).click();
  await page
    .getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true })
    .click();
  await confirm(page, "Confirm enhancement");
  await expect(
    page.getByRole("status").filter({ hasText: "Enhancement succeeded" }),
  ).toBeVisible();
  const earned = await slot(page);
  await page
    .getByRole("button", { name: "← RETURN TO HUB", exact: true })
    .click();
  await profile(page);
  await page.getByRole("button", { name: "DAILY QUESTS", exact: true }).click();
  const quest = page
    .locator(".profile-objectives article")
    .filter({ hasText: "A brighter edge" });
  await expect(quest).toContainText("1 / 1");
  await quest
    .getByRole("button", { name: "CLAIM REWARD", exact: true })
    .click();
  await expect(
    quest.getByRole("button", { name: "CLAIMED", exact: true }),
  ).toBeDisabled();
  expect((await slot(page)).gold).toBe(earned.gold + 100);
  await page.reload();
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await profile(page);
  await page.getByRole("button", { name: "DAILY QUESTS", exact: true }).click();
  await expect(
    page
      .locator(".profile-objectives article")
      .filter({ hasText: "A brighter edge" })
      .getByRole("button", { name: "CLAIMED", exact: true }),
  ).toBeDisabled();
});
test("daily claims and JSON export work offline and survive an offline reload", async ({
  page,
  context,
}) => {
  await guest(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await profile(page);
  const id = (await player(page)).id;
  await context.setOffline(true);
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  await page
    .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "BACKUP & RESTORE", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "EXPORT JSON BACKUP", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/NowRift.*json/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await profile(page);
  expect((await player(page)).id).toBe(id);
  expect((await slot(page)).gold).toBe(500);
});
test("Thai profile navigation preserves identity and save-slot contents", async ({
  page,
}) => {
  await guest(page);
  await profile(page);
  const before = await slot(page),
    id = (await player(page)).id;
  await page.locator(".language-switcher.compact button").nth(1).click();
  await expect(
    page.getByRole("button", { name: "บันทึกตัวละคร", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "เช็กอิน", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "รับรางวัลรายวัน", exact: true }),
  ).toBeVisible();
  await page.locator(".language-switcher.compact button").first().click();
  expect((await player(page)).id).toBe(id);
  expect((await slot(page)).gold).toBe(before.gold);
  expect((await slot(page)).rpg).toEqual(before.rpg);
});
test.describe("checkpoint and complete RPG backup integration", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires explicitly instrumented gameplay",
  );
  test("keyboard and touch preferences persist and change actual input handling", async ({
    page,
  }) => {
    await guest(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByLabel("Keyboard controls", { exact: true })
      .selectOption("arrows");
    await page
      .getByLabel("Touch movement area", { exact: true })
      .selectOption("left");
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await startStage(page);
    const x = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      return g.player.x;
    });
    await page.keyboard.down("d");
    await page.waitForTimeout(350);
    await page.keyboard.up("d");
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.x),
    ).toBeCloseTo(x);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.up("ArrowRight");
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.x),
    ).toBeGreaterThan(x + 20);
    await page.reload();
    await page
      .getByRole("button", { name: /^Practice & legacy tools/ })
      .click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(
      page.getByLabel("Keyboard controls", { exact: true }),
    ).toHaveValue("arrows");
    await expect(
      page.getByLabel("Touch movement area", { exact: true }),
    ).toHaveValue("left");
  });
  test("stage loot, equip, enhancement and unlocks survive reload and confirmed export/import", async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await seed(page);
    await startStage(page);
    await finishStage(page);
    await page
      .getByRole("button", { name: "RETURN TO MAIN MENU", exact: true })
      .click();
    await page.getByRole("button", { name: /Inventory & equipment/ }).click();
    await page
      .locator('.rpg-grid button[aria-label*="Sunsteel Blade"]')
      .click();
    await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
    await page.getByRole("button", { name: "BLACKSMITH", exact: true }).click();
    await page
      .getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true })
      .click();
    await confirm(page, "Confirm enhancement");
    await expect(
      page.getByRole("status").filter({ hasText: "Enhancement succeeded" }),
    ).toBeVisible();
    const earned = await slot(page);
    expect(
      earned.rpg!.equipment.find((e) => e.id === "backup-blade")!.enhancement,
    ).toBe(1);
    expect(earned.clears).toContain("forest-1:normal");
    await page.reload();
    await page
      .getByRole("button", { name: /^Practice & legacy tools/ })
      .click();
    await profile(page);
    expect((await slot(page)).rpg!.equipped.weapon).toBe("backup-blade");
    await page
      .getByRole("button", { name: "BACKUP & RESTORE", exact: true })
      .click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "EXPORT JSON BACKUP", exact: true })
      .click();
    const path = await (await download).path();
    expect(path).toBeTruthy();
    const json = await readFile(path!, "utf8"),
      file = JSON.parse(json);
    expect(file.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(file.payload.save.rpg.equipped.weapon).toBe("backup-blade");
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await page.getByRole("button", { name: /Inventory & equipment/ }).click();
    await page.getByRole("button", { name: "THE TRADER", exact: true }).click();
    await page
      .getByRole("button", { name: "BUY CRIMSON TONIC", exact: true })
      .click();
    await confirm(page, "Confirm purchase");
    await expect
      .poll(async () => (await slot(page)).gold)
      .toBe(earned.gold - 25);
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await profile(page);
    await page
      .getByRole("button", { name: "BACKUP & RESTORE", exact: true })
      .click();
    await page.getByLabel("Import save file").setInputFiles({
      name: "restore.json",
      mimeType: "application/json",
      buffer: Buffer.from(json),
    });
    await expect(
      page.getByRole("dialog", { name: "Confirm save import" }),
    ).toContainText("Rift Wanderer");
    await page.screenshot({
      path: info.outputPath("import-preview.png"),
      fullPage: true,
      animations: "disabled",
    });
    expect((await slot(page)).gold).toBe(earned.gold - 25);
    await confirm(page, "Confirm save import");
    await expect.poll(async () => (await slot(page)).gold).toBe(earned.gold);
    const restored = await slot(page);
    expect(
      restored.rpg!.equipment.find((e) => e.id === "backup-blade")!.enhancement,
    ).toBe(1);
    expect(restored.clears).toContain("forest-1:normal");
    await expect(page.locator(".profile-backup")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
  test("an interrupted run resumes the exact checkpoint paused and settles rewards once", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await seed(page);
    await startStage(page);
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      g.player.x = 700;
      g.player.y = 710;
      g.player.hp = g.player.maxHp - 35;
      g.time = 65.25;
    });
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect
      .poll(async () => (await slot(page)).local.checkpoint?.state.time ?? 0)
      .toBeGreaterThan(65);
    const before = await slot(page),
      c = before.local.checkpoint!;
    await page.reload();
    await page
      .getByRole("button", { name: /^Practice & legacy tools/ })
      .click();
    await page
      .getByRole("button", { name: "RECOVER RUN →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "RESUME CHECKPOINT →", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("PAUSED");
    const restored = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return {
        id: g.id,
        x: g.player.x,
        y: g.player.y,
        hp: g.player.hp,
        time: g.time,
        weapon: g.weapon,
        stacks: g.stacks,
        enemies: g.enemies.length,
      };
    });
    expect(restored.id).toBe(c.run.id);
    expect(restored.x).toBe(c.state.player.x);
    expect(restored.y).toBe(c.state.player.y);
    expect(restored.hp).toBeCloseTo(c.state.player.hp);
    expect(restored.time).toBe(c.state.time);
    expect(restored.weapon).toEqual(c.state.weapon);
    expect(restored.stacks).toEqual(c.state.stacks);
    expect(restored.enemies).toBe(c.state.enemies.length);
    expect((await slot(page)).gold).toBe(before.gold);
    await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await finishStage(page);
    const settled = await slot(page);
    expect(settled.receipts.filter((id) => id === c.run.id)).toHaveLength(1);
    expect(settled.local.checkpoint).toBeNull();
    expect(settled.gold).toBeGreaterThan(before.gold);
  });
  test("a failed checkpoint pauses combat, preserves the previous snapshot and retries visibly", async ({
    page,
  }) => {
    await seed(page);
    await startStage(page);
    await expect
      .poll(async () => Boolean((await slot(page)).local.checkpoint))
      .toBe(true);
    const previous = (await slot(page)).local.checkpoint!;
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      Reflect.set(window, "__restoreCheckpointWrites", () => {
        IDBObjectStore.prototype.put = original;
      });
      IDBObjectStore.prototype.put = function (
        value: unknown,
        key?: IDBValidKey,
      ) {
        if ((value as { local?: { checkpoint?: unknown } }).local?.checkpoint)
          throw new DOMException("quota", "QuotaExceededError");
        return key === undefined
          ? original.call(this, value)
          : original.call(this, value, key);
      };
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      g.time = 23;
    });
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Checkpoint save failed" }),
    ).toBeVisible();
    await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
      "Save Failed",
    );
    await expect(
      page.getByRole("button", { name: /^RESUME RUN/ }),
    ).toBeDisabled();
    expect((await slot(page)).local.checkpoint!.state.time).toBe(
      previous.state.time,
    );
    await page.evaluate(() =>
      Reflect.get(window, "__restoreCheckpointWrites")(),
    );
    await page
      .getByRole("button", { name: "Retry checkpoint", exact: true })
      .click();
    await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
      "Saved",
    );
    await expect(
      page.getByRole("alert").filter({ hasText: "Checkpoint save failed" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^RESUME RUN/ }),
    ).toBeEnabled();
    expect(
      (await slot(page)).local.checkpoint!.state.time,
    ).toBeGreaterThanOrEqual(23);
    await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  });
  test("recovering in another tab blocks the old writer and cannot double-bank the run", async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    await seed(page);
    await startStage(page);
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect
      .poll(async () => Boolean((await slot(page)).local.checkpoint))
      .toBe(true);
    const checkpoint = (await slot(page)).local.checkpoint!,
      other = await context.newPage();
    try {
      await guest(other);
      await profile(other);
      await other
        .getByRole("button", { name: "RESUME CHECKPOINT →", exact: true })
        .click();
      await expect(other.locator(".game-state")).toContainText("PAUSED");
      await page.getByRole("button", { name: /^RESUME RUN/ }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: /another tab/ }),
      ).toBeVisible();
      await other.getByRole("button", { name: /^RESUME RUN/ }).click();
      await finishStage(other);
      expect(
        (await slot(other)).receipts.filter((id) => id === checkpoint.run.id),
      ).toHaveLength(1);
    } finally {
      await other.close();
    }
  });
});
