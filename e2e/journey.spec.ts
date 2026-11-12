import { test, expect, type Page } from "@playwright/test";
import type { PlayerProfile, SaveData } from "../src/game/persistence/model";
import { LANDMARKS } from "../src/game/world/content";

async function data(
  page: Page,
): Promise<{ player: PlayerProfile; save: SaveData }> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readonly"),
            store = tx.objectStore("progress"),
            q = store.get("player");
          q.onsuccess = () => {
            const player = q.result as PlayerProfile,
              slot = store.get(
                player.slots.find((s) => s.id === player.activeSlotId)!.key,
              );
            slot.onsuccess = () => resolve({ player, save: slot.result });
          };
          tx.oncomplete = () => db.close();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}
async function creation(page: Page, name = "Rowan") {
  await page.goto("/");
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(
    page.getByLabel("Character name", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Character name", { exact: true }).fill(name);
}
async function reveal(page: Page) {
  await expect(page.locator(".haven-title h1")).toHaveText("Rift Heaven");
  await expect(page.locator(".rift-transition")).toHaveCount(0);
  const begin = page.getByRole("button", {
    name: "Begin exploring",
    exact: true,
  });
  if (await begin.isVisible()) await begin.click();
  await expect(page.locator("canvas")).toHaveCount(1);
  // The finished visual transition can precede the unlock command reaching
  // Phaser. Assert gameplay readiness rather than racing the H shortcut.
  await expect
    .poll(() => page.evaluate(() => window.__NOWRIFT_HAVEN__?.state().locked), {
      message: "Rift Heaven must be interactive after the reveal" },
    )
    .toBe(false);
}
async function create(page: Page, name = "Rowan") {
  await creation(page, name);
  await page
    .getByRole("button", {
      name: "CREATE CHARACTER & ENTER WORLD",
      exact: true,
    })
    .click();
  await reveal(page);
}
async function interact(page: Page, id: string) {
  const entrance = LANDMARKS.find((l) => l.id === id)!.entrance;
  await page.evaluate((p) => window.__NOWRIFT_HAVEN__!.place(p), entrance);
  await page.locator(".haven-interact").click();
}
test("Play creates one persistent named identity, shows a real loading transition and enters the city", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await creation(page, "  นักเดินทาง Élan  ");
  await page.getByRole("button", { name: /Dusk Strider/ }).click();
  await page.getByRole("button", { name: "Tide", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("character-creation.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "CREATE CHARACTER & ENTER WORLD",
      exact: true,
    })
    .dblclick();
  await expect(page.locator(".rift-transition")).toBeVisible();
  await expect(page.locator(".rift-transition")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: info.outputPath("rift-crossing.png") });
  await reveal(page);
  const value = await data(page);
  expect(value.player.slots).toHaveLength(1);
  expect(value.save.local.name).toBe("นักเดินทาง Élan");
  expect(value.save.local.character).toBe("strider");
  expect(value.save.local.world!.outfit).toBe("tide");
  if (!process.env.NOWRIFT_E2E) {
    expect(await page.evaluate(() => typeof window.__NOWRIFT_HAVEN__)).toBe(
      "undefined",
    );
    expect(await page.evaluate(() => typeof window.__NOWRIFT_TEST__)).toBe(
      "undefined",
    );
  }
  await expect(page.locator(".haven-status")).toContainText("นักเดินทาง Élan");
  await page.screenshot({ path: info.outputPath("rift-heaven-primary.png") });
  expect(errors).toEqual([]);
});
test("new names validate without creating data; controls and bidi are rejected", async ({
  page,
}) => {
  await creation(page, "   ");
  await page
    .getByRole("button", {
      name: "CREATE CHARACTER & ENTER WORLD",
      exact: true,
    })
    .click();
  await expect(page.locator("#identity-error")).toContainText("1 to 24");
  await page
    .getByLabel("Character name", { exact: true })
    .fill("Hidden\u202eName");
  await page
    .getByRole("button", {
      name: "CREATE CHARACTER & ENTER WORLD",
      exact: true,
    })
    .click();
  await expect(page.locator("#identity-error")).toContainText("hidden control");
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readonly"),
            request = tx.objectStore("progress").count();
          request.onsuccess = () => resolve(request.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  expect(count).toBe(0);
});
test("returning players continue, select among three slots and never overwrite a full roster", async ({
  page,
}) => {
  test.setTimeout(90000);
  await create(page, "Rowan");
  const original = await data(page);
  for (const name of ["Willow", "Ash"]) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "PLAY", exact: true }).click();
    await page
      .getByRole("button", { name: "New character", exact: true })
      .click();
    await page.getByLabel("Character name", { exact: true }).fill(name);
    await page
      .getByRole("button", {
        name: "CREATE CHARACTER & ENTER WORLD",
        exact: true,
      })
      .click();
    await reveal(page);
  }
  await page.reload();
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(page.locator(".journey-slot")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "New character", exact: true }),
  ).toBeDisabled();
  await page.locator(".journey-slot").filter({ hasText: "Rowan" }).click();
  await page.getByRole("button", { name: /^Continue as Rowan/ }).click();
  await reveal(page);
  const restored = await data(page);
  expect(restored.save.local.id).toBe(original.save.local.id);
  expect(restored.player.id).toBe(original.player.id);
  expect(restored.save.rpg).toEqual(original.save.rpg);
});
test("Sanctuary, nested inventory and settings retain the same Phaser world and translate live", async ({
  page,
}) => {
  await create(page);
  const canvas = await page.locator("canvas").elementHandle();
  await page.keyboard.press("h");
  const panel = page.getByRole("dialog", { name: "Sanctuary", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Rowan");
  await expect(panel.locator(".sanctuary-equipment > div")).toHaveCount(6);
  const beforeWeapon = await data(page);
  await expect(panel.locator(".equipped-weapon")).toContainText(
    "Riftwood Staff +0",
  );
  await expect(
    panel.getByRole("button", { name: "Fire Orb", exact: true }),
  ).toHaveCount(0);
  await panel.getByRole("button", { name: /^Open inventory/ }).click();
  await expect(page.locator(".haven-screen-overlay .rpg-page")).toBeVisible();
  await page.locator(".rpg-grid button").first().click();
  await page.getByRole("button", { name: /SELL FOR/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirm sale", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Confirm sale", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".haven-screen-overlay .rpg-page")).toBeVisible();
  expect((await data(page)).save.rpg).toEqual(beforeWeapon.save.rpg);
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await page.dispatchEvent("body", "keydown", { key: "h", repeat: true });
  await expect(panel).toBeVisible();
  await page.keyboard.press("h");
  await expect(panel).toHaveCount(0);
  expect(
    await canvas!.evaluate((node) => node === document.querySelector("canvas")),
  ).toBe(true);
  await page.locator(".haven-toolbar .language-switcher button").nth(1).click();
  await page.getByRole("button", { name: "วิหารส่วนตัว", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "วิหารส่วนตัว", exact: true }),
  ).toContainText("อุปกรณ์");
  await page.keyboard.press("Escape");
  expect(
    await canvas!.evaluate((node) => node === document.querySelector("canvas")),
  ).toBe(true);
});
test("the activity directory guides walking and daily activities open over the retained town", async ({
  page,
}) => {
  await create(page);
  const before = await data(page),
    canvas = await page.locator("canvas").elementHandle();
  await page
    .getByRole("button", { name: "Activity Directory", exact: true })
    .click();
  const directory = page.getByRole("dialog", {
    name: "Activity Directory",
    exact: true,
  });
  await expect(directory.locator("article")).toHaveCount(11);
  await directory
    .locator("article")
    .filter({ hasText: "Crafting workshop" })
    .getByRole("button", { name: /Mark entrance/ })
    .click();
  await expect(directory).toHaveCount(0);
  expect((await data(page)).save.local.world!.position).toEqual(
    before.save.local.world!.position,
  );
  await page.keyboard.press("h");
  await page
    .getByRole("button", { name: /^Daily activities & achievements/ })
    .click();
  await expect(page.locator(".profile-page")).toBeVisible();
  await page.getByRole("button", { name: "PROFILE", exact: true }).click();
  await page.getByLabel("Player name", { exact: true }).fill("Hallowed");
  await page.getByLabel("Player name", { exact: true }).press("h");
  await expect(page.getByLabel("Player name", { exact: true })).toHaveValue(
    "Hallowedh",
  );
  await expect(page.locator(".profile-page")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Sanctuary", exact: true }),
  ).toBeVisible();
  expect(
    await canvas!.evaluate((node) => node === document.querySelector("canvas")),
  ).toBe(true);
});
test("failed world assets remain gated and Retry recreates only the renderer with the same saved identity", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    let fail = true;
    await page.route("**/assets/haven/terrain.png", (route) =>
      fail ? route.abort() : route.continue(),
    );
    await creation(page);
    await page
      .getByRole("button", {
        name: "CREATE CHARACTER & ENTER WORLD",
        exact: true,
      })
      .click();
    await expect(page.locator(".rift-transition")).toContainText(
      "The rift could not open.",
    );
    const before = await data(page);
    fail = false;
    await page
      .locator(".rift-transition")
      .getByRole("button", { name: "Retry", exact: true })
      .click();
    await reveal(page);
    const after = await data(page);
    expect(after.player.slots).toHaveLength(1);
    expect(after.save.local.id).toBe(before.save.local.id);
    expect(after.save.rpg).toEqual(before.save.rpg);
  } finally {
    await context.close();
  }
});
test("Thai creation, reduced motion, portrait and landscape remain usable", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.locator(".header-right .language-switcher button").nth(1).click();
  await page.getByRole("button", { name: "เล่น", exact: true }).click();
  await page.getByLabel("ชื่อตัวละคร", { exact: true }).fill("W".repeat(24));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("creation-thai-320.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "สร้างตัวละครและเข้าสู่โลก", exact: true })
    .click();
  await expect(page.locator(".rift-transition")).toHaveClass(/rift-reduced/);
  await expect(page.locator(".rift-transition")).toHaveCount(0);
  await page.getByRole("button", { name: "เริ่มสำรวจ", exact: true }).click();
  const statusBounds = (await page.locator(".haven-status").boundingBox())!;
  expect(statusBounds.x + statusBounds.width).toBeLessThanOrEqual(320);
  for (const size of [
    { width: 320, height: 740 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page
      .getByRole("button", { name: "วิหารส่วนตัว", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "วิหารส่วนตัว", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`sanctuary-thai-${size.width}.png`),
    });
    await page.keyboard.press("Escape");
  }
});
test("storage failure offers recovery without silently creating a replacement character", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(page.locator(".journey-error")).toContainText("preserved");
  await expect(
    page.getByRole("button", { name: "Manage saves & backups", exact: false }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});
test("older campaign-only saves enter through selection and retain their progression", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("progress");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readwrite");
          tx.objectStore("progress").put(
            {
              version: 1,
              clears: ["forest-1:normal"],
              receipts: ["older-receipt"],
              gold: 321,
              xp: 250,
              materials: { wood: 7 },
              candidates: [],
            },
            "profile",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(page.locator(".journey-slot")).toHaveCount(1);
  await expect(page.getByLabel("Character name", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: /^Continue as Rift Wanderer/ })
    .click();
  await reveal(page);
  const current = await data(page);
  expect(current.save.gold).toBe(321);
  expect(current.save.xp).toBe(250);
  expect(current.save.materials.wood).toBe(7);
  expect(current.save.clears).toEqual(["forest-1:normal"]);
  expect(current.save.receipts).toContain("older-receipt");
});
test("loading waits for actual assets before initializing or revealing the world", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" }),
    page = await context.newPage();
  let release!: () => void,
    requested = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await page.route("**/assets/haven/terrain.png", async (route) => {
      requested = true;
      await gate;
      await route.continue();
    });
    await creation(page);
    await page
      .getByRole("button", {
        name: "CREATE CHARACTER & ENTER WORLD",
        exact: true,
      })
      .click();
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator(".rift-transition")).toBeVisible();
    await expect(page.locator(".rift-transition progress")).not.toHaveAttribute(
      "value",
      "1",
    );
    await page.keyboard.press("h");
    await expect(
      page.getByRole("dialog", { name: "Sanctuary", exact: true }),
    ).toHaveCount(0);
    release();
    await reveal(page);
  } finally {
    release();
    await context.close();
  }
});
test("the character-first journey and Sanctuary continue after an offline PWA relaunch", async ({
  page,
  context,
}) => {
  await create(page, "Offline Willow");
  const before = await data(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const entries = (
          await Promise.all(
            (await caches.keys()).map(async (key) =>
              (await (await caches.open(key)).keys()).map(
                (r) => new URL(r.url).pathname,
              ),
            ),
          )
        ).flat();
        return (
          entries.includes("/assets/haven/terrain.png") &&
          entries.some((s) => s.startsWith("/_next/static/"))
        );
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page
    .getByRole("button", { name: /^Continue as Offline Willow/ })
    .click();
  await reveal(page);
  await page.keyboard.press("h");
  await expect(
    page.getByRole("dialog", { name: "Sanctuary", exact: true }),
  ).toContainText("Offline Willow");
  const restored = await data(page);
  expect(restored.save.local.id).toBe(before.save.local.id);
  expect(restored.save.rpg).toEqual(before.save.rpg);
  expect(restored.player.id).toBe(before.player.id);
});
test.describe("instrumented journey boundaries", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires explicitly instrumented gameplay fixtures",
  );
  test("H locks actual movement, preserves position and ignores held keys", async ({
    page,
  }) => {
    await create(page);
    await page.keyboard.down("d");
    await page.waitForTimeout(300);
    await page.keyboard.up("d");
    await page.keyboard.press("h");
    await expect
      .poll(() => page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().locked))
      .toBe(true);
    const before = await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state());
    await page.keyboard.down("d");
    await page.waitForTimeout(400);
    await page.keyboard.up("d");
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state())).position,
    ).toEqual(before.position);
    await page.keyboard.press("h");
    await expect
      .poll(() => page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().locked))
      .toBe(false);
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state())).session,
    ).toBe(before.session);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "PLAY", exact: true }).click();
    await page.getByRole("button", { name: /^Continue as Rowan/ }).click();
    await reveal(page);
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state())).position,
    ).toEqual(before.position);
  });
  test("campaign failure returns to the persistent city and H cannot bypass combat", async ({
    page,
  }) => {
    await create(page);
    const before = await data(page);
    await interact(page, "portal");
    await page.getByRole("button", { name: /^Campaign challenges/ }).click();
    await page
      .getByRole("button", { name: "START STAGE →", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__NOWRIFT_TEST__?.state().time), {
        intervals: [25, 50, 100],
      })
      .toBe(0);
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await page.keyboard.press("h");
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Return to Rift Heaven to open Sanctuary" }),
    ).toBeVisible();
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("defeat"));
    await expect(
      page
        .getByRole("button", { name: "RETURN TO RIFT HEAVEN", exact: true })
        .last(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "RETURN TO RIFT HEAVEN", exact: true })
      .last()
      .click();
    await reveal(page);
    const after = await data(page);
    expect(after.save.local.id).toBe(before.save.local.id);
    expect(after.save.clears).toEqual(before.save.clears);
    expect(after.save.rpg!.equipped).toEqual(before.save.rpg!.equipped);
  });
  test("farming recovery takes precedence at Play, extraction settles once and returns home", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await create(page);
    const original = await data(page);
    await interact(page, "portal");
    await page
      .getByRole("button", { name: "Confirm travel", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.x = 710;
      g.player.y = 700;
      g.player.invincible = 999;
    });
    await page.getByRole("button", { name: /Gather fallen wood/ }).click();
    await expect
      .poll(
        async () =>
          (await data(page)).save.local.checkpoint?.environment?.harvested
            ?.length,
      )
      .toBe(1);
    const runId = (await data(page)).save.local.checkpoint!.run.id;
    await page.reload();
    await page.getByRole("button", { name: "PLAY", exact: true }).click();
    await page
      .getByRole("button", { name: "Resume checkpoint", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await expect(page.locator(".game-state")).toContainText("PAUSED");
    expect((await data(page)).save.local.checkpoint!.run.id).toBe(runId);
    await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      const g = window.__NOWRIFT_TEST__!.state();
      g.time = 25;
      g.xpToNext = 1e6;
      g.player.invincible = 999;
      for (const e of g.enemies.slice(0, 8))
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
      .toBeGreaterThanOrEqual(5);
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.x = 900;
      g.player.y = 760;
    });
    await page.getByRole("button", { name: /Extract to Rift Heaven/ }).click();
    await expect(page.locator(".save-message")).toContainText("saved");
    const banked = await data(page);
    expect(banked.save.materials.wood).toBeGreaterThanOrEqual(3);
    expect(banked.save.clears).toEqual(original.save.clears);
    await page
      .getByRole("button", { name: "RETURN TO RIFT HEAVEN", exact: true })
      .last()
      .click();
    await reveal(page);
    await page.reload();
    await page.getByRole("button", { name: "PLAY", exact: true }).click();
    await page.getByRole("button", { name: /^Continue as Rowan/ }).click();
    await reveal(page);
    const restored = await data(page);
    expect(restored.save.materials).toEqual(banked.save.materials);
    expect(restored.save.receipts).toEqual(banked.save.receipts);
    expect(restored.player.id).toBe(original.player.id);
    expect(restored.save.local.id).toBe(original.save.local.id);
  });
  test("a recovered level-up waits for world reveal, then applies one real blessing", async ({
    page,
  }) => {
    await create(page);
    await interact(page, "portal");
    await page
      .getByRole("button", { name: "Confirm travel", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("upgrade"));
    await expect(page.locator(".upgrade-card")).toHaveCount(3);
    await expect
      .poll(async () => (await data(page)).save.local.checkpoint?.state.phase)
      .toBe("upgrade");
    const checkpoint = (await data(page)).save.local.checkpoint!;
    await page.reload();
    await page.getByRole("button", { name: "PLAY", exact: true }).click();
    await page
      .getByRole("button", { name: "Resume checkpoint", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toBeVisible();
    await expect(page.locator(".upgrade-overlay")).toHaveCount(0);
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await expect(page.locator(".upgrade-card")).toHaveCount(3);
    await page.locator(".upgrade-card").first().click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    const count = await page.evaluate(() =>
      Object.values(window.__NOWRIFT_TEST__!.state().stacks).reduce(
        (sum, value) => sum + value!,
        0,
      ),
    );
    expect(count).toBe(
      Object.values(checkpoint.state.stacks).reduce(
        (sum, value) => sum + value!,
        0,
      ) + 1,
    );
    expect((await data(page)).save.local.checkpoint!.run.id).toBe(
      checkpoint.run.id,
    );
  });
});
