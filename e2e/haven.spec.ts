import { test, expect, type Page } from "@playwright/test";
import type { SaveData, PlayerProfile } from "../src/game/persistence/model";
import {
  HAVEN,
  LANDMARKS,
  nearest,
  validPosition,
} from "../src/game/world/content";
import { waitForHavenInput } from "./helpers/haven";
async function save(page: Page): Promise<SaveData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readonly"),
            store = t.objectStore("progress"),
            root = store.get("player");
          root.onsuccess = () => {
            const p = root.result as PlayerProfile,
              q = store.get(p.slots.find((s) => s.id === p.activeSlotId)!.key);
            q.onsuccess = () => resolve(q.result);
          };
          t.oncomplete = () => db.close();
          t.onerror = () => reject(t.error);
        };
      }),
  );
}
async function guest(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await expect(
    page.getByRole("button", { name: "ENTER RIFT HEAVEN →", exact: true }),
  ).toBeVisible();
}
async function haven(page: Page) {
  const legacy = page.getByRole("button", {
    name: "Practice & legacy tools",
    exact: true,
  });
  const entry = page.getByRole("button", {
    name: "ENTER RIFT HEAVEN →",
    exact: true,
  });
  await expect(legacy.or(entry)).toBeVisible();
  if (await legacy.isVisible()) await legacy.click();
  await entry.click();
  await expect(page.locator(".haven-canvas canvas")).toHaveCount(1);
  await expect(page.locator(".haven-loading")).toHaveCount(0);
  const tutorial = page.getByRole("button", {
    name: "Begin exploring",
    exact: true,
  });
  if (await tutorial.isVisible()) await tutorial.click();
  await expect(page.locator(".haven-loading")).toHaveCount(0);
  await waitForHavenInput(page);
}
async function place(page: Page, id: string) {
  await expect(page.locator(".haven-title h1")).toBeVisible();
  await expect(page.locator(".haven-loading")).toHaveCount(0);
  const owner = (await save(page)).local.world!.writer;
  await expect
    .poll(() => page.evaluate(() => window.__NOWRIFT_HAVEN__?.state().session))
    .toBe(owner);
  await expect(page.locator(".haven-loading")).toHaveCount(0);
  const l = LANDMARKS.find((l) => l.id === id)!;
  await page.evaluate((p) => window.__NOWRIFT_HAVEN__!.place(p), l.entrance);
  await expect(page.locator(".haven-interact")).toContainText(l.name);
  await page.locator(".haven-interact").click();
}
async function close(page: Page) {
  await page.locator(".modal-panel .modal-close").click();
}
test("Rift Heaven launches with the saved character, real canvas, localized map and journal", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await guest(page);
  const before = await save(page);
  await haven(page);
  await expect(page.locator(".haven-status")).toContainText(before.local.name);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Town map" })).toContainText(
    "Portal Sanctuary",
  );
  await close(page);
  await page.getByRole("button", { name: "Journal", exact: true }).click();
  await page.getByRole("button", { name: "Accept quest", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Journal" })).toContainText(
    "Active",
  );
  await close(page);
  await page.screenshot({
    path: info.outputPath("rift-haven-desktop.png"),
    animations: "disabled",
  });
  await page.locator(".haven-toolbar .language-switcher button").nth(1).click();
  await expect(page.locator(".haven-title h1")).toHaveText("ริฟต์เฮเวน");
  await page.getByRole("button", { name: "แผนที่", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "แผนที่เมือง" })).toContainText(
    "วิหารประตูมิติ",
  );
  await close(page);
  expect((await save(page)).rpg).toEqual(before.rpg);
  expect(errors).toEqual([]);
});
test("mobile portrait and landscape hub overlays fit without overflow or a second canvas", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await guest(page);
  await haven(page);
  for (const size of [
    { width: 320, height: 740 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    for (const label of ["Map", "Journal", "Settings"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
      ).toBe(true);
      await close(page);
    }
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.screenshot({
      path: info.outputPath(`haven-${size.width}.png`),
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await page.locator(".haven-toolbar .language-switcher button").nth(1).click();
  await page.getByRole("button", { name: "แผนที่", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "แผนที่เมือง" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await close(page);
});
test.describe("instrumented open-world integration", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires explicit test build; scenario controls are absent in production.",
  );
  test("training uses real combat damage and cannot change permanent inventory", async ({
    page,
  }) => {
    await guest(page);
    await haven(page);
    const before = await save(page);
    await place(page, "training");
    await page
      .getByRole("button", { name: "Test equipped weapon", exact: true })
      .click();
    await expect
      .poll(async () => {
        const value = await page
          .getByRole("dialog", { name: "Training Grounds" })
          .locator(".haven-training > strong")
          .textContent();
        return Number(value?.split(":").at(-1));
      })
      .toBeGreaterThan(0);
    await close(page);
    const after = await save(page);
    expect(after.rpg).toEqual(before.rpg);
    expect(after.gold).toBe(before.gold);
    expect(after.local.stats.kills).toBe(before.local.stats.kills);
  });
  test("a refreshed expedition restores gathered resources and can lose only unbanked loot", async ({
    page,
  }) => {
    await guest(page);
    await haven(page);
    const owned = await save(page);
    await place(page, "portal");
    await page
      .getByRole("button", { name: "Confirm travel", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      g.player.x = 710;
      g.player.y = 700;
    });
    await page.getByRole("button", { name: /Gather fallen wood/ }).click();
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await save(page)).local.checkpoint?.environment?.harvested?.length ??
          0,
      )
      .toBe(1);
    const checkpoint = (await save(page)).local.checkpoint!;
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
    expect(
      await page.evaluate(
        () => window.__NOWRIFT_TEST__!.state().campaign!.harvested,
      ),
    ).toEqual(["fallen-wood"]);
    expect((await save(page)).local.checkpoint!.run.id).toBe(checkpoint.run.id);
    await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("defeat"));
    await expect(
      page.getByRole("heading", { name: "Expedition lost", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".save-message")).toContainText("saved");
    const lost = await save(page);
    expect(lost.gold).toBe(owned.gold);
    expect(lost.materials).toEqual(owned.materials);
    expect(lost.rpg!.equipment).toEqual(owned.rpg!.equipment);
    await page.getByRole("button", { name: "TRY AGAIN", exact: false }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.hp),
    ).toBeLessThan(5);
    await page
      .getByRole("button", { name: "RETURN TO RIFT HEAVEN", exact: true })
      .click();
    await page
      .getByRole("button", { name: "EXIT TO HUB →", exact: true })
      .click();
    await expect(page.locator(".haven-loading")).toHaveCount(0);
    await place(page, "inn");
    await page
      .getByRole("button", { name: "Rest and save", exact: true })
      .click();
    expect((await save(page)).local.world!.hp).toBeGreaterThan(1);
  });
  test("a second town session invalidates the old hub writer without changing inventory", async ({
    page,
    context,
  }) => {
    await guest(page);
    await haven(page);
    const before = await save(page),
      other = await context.newPage();
    try {
      await guest(other);
      await haven(other);
      await page.bringToFront();
      const resume = page.getByRole("button", { name: "Resume", exact: true });
      if (await resume.isVisible()) await resume.click();
      await page.evaluate(
        (p) => window.__NOWRIFT_HAVEN__!.place(p),
        LANDMARKS.find((l) => l.id === "wardrobe")!.entrance,
      );
      await page.locator(".haven-interact").click();
      await expect(
        page.getByRole("alert").filter({ hasText: "another tab" }),
      ).toBeVisible();
      expect((await save(other)).rpg).toEqual(before.rpg);
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(
        page.getByRole("button", { name: /^Practice & legacy tools/ }),
      ).toBeVisible();
      expect((await save(other)).rpg).toEqual(before.rpg);
    } finally {
      await other.close();
    }
  });
  test("keyboard moves and collides; interactions require range and overlays keep the same scene", async ({
    page,
  }) => {
    await guest(page);
    await haven(page);
    await expect
      .poll(() => page.evaluate(() => !!window.__NOWRIFT_HAVEN__))
      .toBe(true);
    const before = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.state().position,
    );
    await page.keyboard.down("d");
    await page.waitForTimeout(450);
    await page.keyboard.up("d");
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position)).x,
    ).toBeGreaterThan(before.x + 30);
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position)).x,
    ).toBeLessThan(before.x + 105);
    // The new Plaza beacon can still be in range after the short movement check.
    // Give the out-of-range assertion its own explicitly empty street fixture.
    const emptyStreet = {
      x: HAVEN.spawn.x,
      y: HAVEN.spawn.y + HAVEN.range + 64,
    };
    expect(validPosition(emptyStreet)).toBe(true);
    expect(nearest(emptyStreet)).toBeNull();
    await page.evaluate((p) => window.__NOWRIFT_HAVEN__!.place(p), emptyStreet);
    await page.keyboard.press("e");
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.evaluate(
      (p) => window.__NOWRIFT_HAVEN__!.place(p),
      LANDMARKS.find((l) => l.id === "forge")!.entrance,
    );
    await page.keyboard.down("w");
    await page.waitForTimeout(700);
    await page.keyboard.up("w");
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position)).y,
    ).toBeGreaterThanOrEqual(
      LANDMARKS.find((l) => l.id === "forge")!.solid!.y +
        LANDMARKS.find((l) => l.id === "forge")!.solid!.h +
        12,
    );
    await page
      .locator("canvas")
      .evaluate((e) => e.setAttribute("data-instance", "original"));
    await place(page, "forge");
    await expect(
      page.getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true }),
    ).toBeVisible();
    const paused = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.state().position,
    );
    await page.keyboard.down("d");
    await page.waitForTimeout(300);
    await page.keyboard.up("d");
    expect(
      await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position),
    ).toEqual(paused);
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-instance",
      "original",
    );
    await expect(page.locator("canvas")).toHaveCount(1);
  });
  test("wardrobe changes visible cosmetics and persists without touching equipment", async ({
    page,
  }) => {
    await guest(page);
    await haven(page);
    const before = await save(page);
    await place(page, "wardrobe");
    await page.getByRole("button", { name: "Tide", exact: true }).click();
    await page
      .getByRole("button", { name: "Save appearance", exact: true })
      .click();
    await expect
      .poll(async () => (await save(page)).local.world!.outfit)
      .toBe("tide");
    expect((await save(page)).rpg).toEqual(before.rpg);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await haven(page);
    expect((await save(page)).local.world!.outfit).toBe("tide");
  });
  test("guest character → haven → quest → forest combat → gather → extract → craft → reload", async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await guest(page);
    await page.getByRole("button", { name: /^PROFILE & SAVES/ }).click();
    await page.getByRole("button", { name: "SAVE SLOTS", exact: true }).click();
    await page.getByLabel("New character name").fill("Willow Wanderer");
    await page
      .getByRole("button", { name: "CREATE SLOT", exact: true })
      .click();
    await expect(page.locator(".profile-slot.selected")).toContainText(
      "Willow Wanderer",
    );
    const original = await save(page);
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await haven(page);
    await place(page, "mara");
    await page
      .getByRole("button", { name: "Accept quest", exact: true })
      .click();
    await close(page);
    await place(page, "portal");
    await page
      .getByRole("button", { name: "Confirm travel", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      const g = window.__NOWRIFT_TEST__!.state();
      g.time = 25;
      g.player.invincible = 999;
      g.xpToNext = 1e6;
      for (const e of g.enemies.slice(0, 12))
        g.bullets.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          r: 12,
          damage: 1e6,
          life: 1,
          color: "#fff",
        });
    });
    await expect
      .poll(() => page.evaluate(() => window.__NOWRIFT_TEST__!.state().kills))
      .toBeGreaterThanOrEqual(12);
    for (const node of [
      { x: 710, y: 700, label: "Gather fallen wood" },
      { x: 1080, y: 710, label: "Gather slime residue" },
    ]) {
      await page.evaluate((p) => {
        const g = window.__NOWRIFT_TEST__!.state();
        g.player.x = p.x;
        g.player.y = p.y;
      }, node);
      await page.getByRole("button", { name: new RegExp(node.label) }).click();
    }
    await expect
      .poll(
        async () =>
          (await save(page)).local.checkpoint?.environment?.harvested?.length ??
          0,
      )
      .toBe(2);
    expect((await save(page)).gold).toBe(0);
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.x = 900;
      g.player.y = 760;
    });
    await page.getByRole("button", { name: /Extract to Rift Heaven/ }).click();
    await expect(
      page.getByRole("heading", { name: "Expedition complete", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".save-message")).toContainText("saved");
    const banked = await save(page);
    expect(banked.materials.wood).toBeGreaterThanOrEqual(3);
    expect(banked.materials["slime-core"]).toBeGreaterThanOrEqual(2);
    expect(banked.clears).toEqual(original.clears);
    const receipt = banked.receipts.at(-1)!;
    await page
      .getByRole("dialog", { name: "Victory", exact: true })
      .getByRole("button", { name: "RETURN TO RIFT HEAVEN", exact: true })
      .click();
    await expect(page.locator(".haven-title h1")).toHaveText("Rift Heaven");
    await expect(page.locator("canvas")).toHaveCount(1);
    await place(page, "mara");
    await page
      .getByRole("button", { name: "Claim reward", exact: true })
      .click();
    await close(page);
    await place(page, "workshop");
    const recipe = page
      .locator(".rpg-recipes article")
      .filter({ hasText: "Brew Crimson Tonic" });
    await recipe.getByRole("button", { name: "CRAFT", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Confirm crafting", exact: true })
      .getByRole("button", { name: "CONFIRM", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Crafting complete" }),
    ).toBeVisible();
    const crafted = await save(page);
    expect(crafted.materials.wood).toBe(banked.materials.wood - 2);
    expect(crafted.rpg!.consumables["health-tonic"]).toBe(4);
    await page.screenshot({
      path: info.outputPath("haven-crafted-supplies.png"),
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await page.reload();
    await page
      .getByRole("button", { name: /^Practice & legacy tools/ })
      .click();
    await haven(page);
    const restored = await save(page);
    expect(restored.local.id).toBe(original.local.id);
    expect(restored.gold).toBe(crafted.gold);
    expect(restored.rpg).toEqual(crafted.rpg);
    expect(restored.materials).toEqual(crafted.materials);
    expect(restored.local.world!.quest).toBe("claimed");
    expect(restored.local.world!.extractions).toBe(1);
    expect(restored.receipts.filter((id) => id === receipt)).toHaveLength(1);
    expect(errors).toEqual([]);
  });
  test("touch cancellation and rotation stop movement without corrupting the scene", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    try {
      await guest(page);
      await haven(page);
      const cdp = await context.newCDPSession(page),
        canvas = page.locator("canvas"),
        box = (await canvas.boundingBox())!,
        before = await page.evaluate(
          () => window.__NOWRIFT_HAVEN__!.state().position,
        );
      const x = box.x + 180,
        y = box.y + 350;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + 65, y: y + 30, id: 1 }],
      });
      await page.waitForTimeout(400);
      await expect(canvas).toHaveAttribute("data-touch-active", "true");
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      await expect(canvas).toHaveAttribute("data-touch-active", "false");
      const after = await page.evaluate(
        () => window.__NOWRIFT_HAVEN__!.state().position,
      );
      expect(
        Math.hypot(after.x - before.x, after.y - before.y),
      ).toBeGreaterThan(10);
      await page.waitForTimeout(200);
      expect(
        await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position),
      ).toEqual(after);
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(canvas).toHaveCount(1);
    } finally {
      await context.close();
    }
  });
});
test("the cached town, character and map continue after an offline reload", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await guest(page);
  await haven(page);
  const before = await save(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const urls = (
            await Promise.all(
              (await caches.keys()).map(async (key) =>
                (await (await caches.open(key)).keys()).map((r) => r.url),
              ),
            )
          ).flat();
          return urls.filter((u) => u.includes("/assets/haven/")).length;
        }),
      { timeout: 20000 },
    )
    .toBeGreaterThanOrEqual(17);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Practice & legacy tools/ }).click();
  await haven(page);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Town map" })).toBeVisible();
  expect((await save(page)).rpg).toEqual(before.rpg);
  await close(page);
  // Walk the expanded south lane and east approach with real keyboard input.
  // These are street turns, not test-only position writes or town teleports.
  const portal = LANDMARKS.find((l) => l.id === "portal")!;
  let from = { ...HAVEN.spawn };
  for (const target of [
    { x: HAVEN.spawn.x, y: portal.entrance.y + 26 },
    { x: portal.entrance.x, y: portal.entrance.y + 26 },
  ]) {
    const dx = target.x - from.x,
      dy = target.y - from.y;
    const distance = Math.hypot(dx, dy);
    for (let n = 0; n <= distance; n += 4)
      expect(
        validPosition({
          x: from.x + (dx * n) / distance,
          y: from.y + (dy * n) / distance,
        }),
      ).toBe(true);
    const key = dx ? "d" : "s",
      ms = (distance / HAVEN.speed) * 1000;
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
    from = target;
  }
  await expect(page.locator(".haven-interact")).toContainText(
    "Portal Sanctuary",
  );
  await page.locator(".haven-interact").click();
  await page
    .getByRole("button", { name: "Confirm travel", exact: true })
    .click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await page.getByRole("button", { name: "PAUSE", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).toBeVisible();
});
