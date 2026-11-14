import { writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { enterCity, citySave, placeCity } from "./helpers/city";
import { regionalCity } from "../src/game/world/regional-city";
import { currentRegion } from "../src/game/world/exploration";
import { waypointsIn, waypointLanding } from "../src/game/world/waypoints";
import { validPosition } from "../src/game/world/content";
import { beginStory } from "./helpers/story";
import { waitForHavenInput } from "./helpers/haven";
import { acceptQuest } from "../src/game/quests/engine";
import { migrateJournal } from "../src/game/quests/save";
import { QUEST_CATALOG } from "../src/game/quests/catalog";
import type { PlayerProfile, SaveData } from "../src/game/persistence/model";

async function trackQuest(page: Page) {
  const save = await citySave(page),
    journal = migrateJournal(undefined, save.clears, Date.now());
  const quest = QUEST_CATALOG.find(
    (q) => q.category === "side" && journal.quests[q.id].status === "AVAILABLE",
  )!;
  acceptQuest(journal, quest, Date.now());
  save.local.journal = journal;
  await page.evaluate(
    (value: SaveData) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("nowrift-campaign", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("progress", "readwrite"),
            store = tx.objectStore("progress"),
            root = store.get("player");
          root.onsuccess = () => {
            const p = root.result as PlayerProfile;
            store.put(value, p.slots.find((s) => s.id === p.activeSlotId)!.key);
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
    save,
  );
  await page.reload();
  await enterCity(page);
}

test.skip(
  !process.env.NOWRIFT_E2E,
  "Uses isolated city fixtures in the explicit instrumented build.",
);

test("Town Map keeps its real Fast Travel action visible after selecting a service or the current region", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterCity(page, true);
  await page.keyboard.press("m");
  const map = page.getByRole("dialog", { name: "Town map", exact: true });
  await map.locator('[data-map-marker="mara"]').focus();
  await page.keyboard.press("Enter");
  await expect(map.locator('[data-map-marker="mara"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({
    path: info.outputPath("map-selected-service.png"),
    animations: "disabled",
  });
  await expect(
    map.getByRole("button", { name: /^Fast Travel/ }),
  ).toBeInViewport();
  await map
    .getByRole("button", { name: "Thailand world map", exact: true })
    .click();
  await expect(map.locator('[data-region-travel="central"]')).toBeInViewport();
});

test("tracked quest and minimap occupy separate responsive HUD zones", async ({
  page,
}, info) => {
  await enterCity(page, true);
  await trackQuest(page);
  for (const size of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const minimap = page.getByRole("complementary", {
        name: "Regional minimap",
        exact: true,
      }),
      tracker = page.locator(".quest-tracker");
    await expect(minimap).toBeVisible();
    await expect(tracker).toBeVisible();
    const a = await minimap.boundingBox(),
      b = await tracker.boundingBox();
    await page.screenshot({
      path: info.outputPath(`hud-${size.width}x${size.height}.png`),
      animations: "disabled",
    });
    expect(
      Math.max(
        0,
        Math.min(a!.x + a!.width, b!.x + b!.width) - Math.max(a!.x, b!.x),
      ) *
        Math.max(
          0,
          Math.min(a!.y + a!.height, b!.y + b!.height) - Math.max(a!.y, b!.y),
        ),
    ).toBe(0);
    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    expect(b!.y + b!.height).toBeLessThan(size.height - 44);
  }
});

test("hidden exploration HUD keeps movement and interactions alive, permits map travel and restores through keyboard or touch", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterCity(page, true);
  await trackQuest(page);
  const before = await citySave(page),
    point = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.state().position,
    );
  await page.keyboard.down("d");
  await page.waitForTimeout(120);
  await page.keyboard.press("v");
  await expect(page.locator(".haven-page")).toHaveClass(/hud-concealed/);
  await expect(page.locator(".regional-minimap")).toBeHidden();
  await expect(page.locator(".quest-tracker")).toBeHidden();
  await page.waitForTimeout(350);
  await page.keyboard.up("d");
  expect(
    (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position)).x,
  ).toBeGreaterThan(point.x + 35);
  await page.keyboard.press("m");
  const map = page.getByRole("dialog", { name: "Town map", exact: true });
  await expect(map).toBeVisible();
  await map.locator('[data-waypoint-entry="grove"]').click();
  await map.getByRole("button", { name: /^Fast Travel/ }).click();
  await waitForHavenInput(page);
  await expect(page.locator(".haven-page")).toHaveClass(/hud-concealed/);
  expect((await citySave(page)).local.world!.positionEpoch).toBe(
    before.local.world!.positionEpoch + 1,
  );
  await page.screenshot({
    path: info.outputPath("hidden-hud-mobile.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Paused", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".haven-page")).toHaveClass(/hud-concealed/);
  await page.getByRole("button", { name: "Show HUD", exact: true }).click();
  await expect(page.locator(".regional-minimap")).toBeVisible();
  await page.keyboard.press("v");
  await page.keyboard.press("v");
  await expect(page.locator(".regional-minimap")).toBeVisible();
  const after = await citySave(page);
  expect(after.rpg).toEqual(before.rpg);
  expect(after.xp).toBe(before.xp);
});

test("physical key rebinding, deliberate conflict swaps, capture cancellation and emergency back persist without input leakage", async ({
  page,
}, info) => {
  await enterCity(page, true);
  const original = await citySave(page);
  await page
    .locator(".haven-bottom")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByText("Custom key bindings", { exact: true }).click();
  const rebind = async (action: string, key: string) => {
    await settings
      .getByRole("button", { name: `Rebind ${action}`, exact: true })
      .click();
    await expect(
      settings.getByText(`Press a key for ${action}`, { exact: true }),
    ).toBeVisible();
    await page.keyboard.press(key);
  };
  await rebind("Move right", "l");
  await expect(
    settings.locator('[data-keybind-action="right"] kbd'),
  ).toHaveText("L");
  await rebind("Full map", "k");
  await expect(settings.locator('[data-keybind-action="map"] kbd')).toHaveText(
    "K",
  );
  await rebind("Full map", "l");
  await expect(
    settings.getByRole("button", { name: "Swap bindings", exact: true }),
  ).toBeVisible();
  await settings.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(settings.locator('[data-keybind-action="map"] kbd')).toHaveText(
    "K",
  );
  await rebind("Full map", "l");
  await settings
    .getByRole("button", { name: "Swap bindings", exact: true })
    .click();
  await expect(
    settings.locator('[data-keybind-action="right"] kbd'),
  ).toHaveText("K");
  await expect(settings.locator('[data-keybind-action="map"] kbd')).toHaveText(
    "L",
  );
  await settings
    .getByRole("button", { name: "Rebind Interact", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(settings).toBeVisible();
  await expect(
    settings.locator('[data-keybind-action="interact"] kbd'),
  ).toHaveText("E");
  await rebind("Pause / back", "p");
  await page.screenshot({
    path: info.outputPath("custom-controls.png"),
    animations: "disabled",
  });
  await page.keyboard.press("p");
  await waitForHavenInput(page);
  const start = await page.evaluate(
    () => window.__NOWRIFT_HAVEN__!.state().position,
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(300);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position),
  ).toEqual(start);
  await page.keyboard.down("k");
  await page.waitForTimeout(350);
  await page.keyboard.press("l");
  await expect(
    page.getByRole("dialog", { name: "Town map", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const stopped = await page.evaluate(
    () => window.__NOWRIFT_HAVEN__!.state().position,
  );
  expect(stopped.x).toBeGreaterThan(start.x + 25);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position),
  ).toEqual(stopped);
  await page.keyboard.up("k");
  await page.keyboard.press("m");
  await expect(
    page.getByRole("dialog", { name: "Town map", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await enterCity(page);
  await page.keyboard.press("l");
  await expect(
    page.getByRole("dialog", { name: "Town map", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nowrift-preferences-v1")!),
  );
  expect(saved.keymap.keys).toMatchObject({
    right: "KeyK",
    map: "KeyL",
    pause: "KeyP",
    interact: "KeyE",
  });
  const after = await citySave(page);
  expect(after.xp).toBe(original.xp);
  expect(after.rpg).toEqual(original.rpg);
  await page
    .locator(".haven-bottom")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await settings.getByText("Custom key bindings", { exact: true }).click();
  await settings
    .getByRole("button", { name: "Reset Full map", exact: true })
    .click();
  await expect(settings.locator('[data-keybind-action="map"] kbd')).toHaveText(
    "M",
  );
  await settings
    .getByRole("button", { name: "Restore default keys", exact: true })
    .click();
  await expect(
    settings.getByLabel("Keyboard controls", { exact: true }),
  ).toHaveValue("both");
  await expect(
    settings.locator('[data-keybind-action="right"] kbd'),
  ).toHaveText("D / →");
  await settings.getByRole("button", { name: "DONE", exact: true }).click();
  await page.reload();
  await enterCity(page);
  await page.keyboard.press("m");
  await expect(
    page.getByRole("dialog", { name: "Town map", exact: true }),
  ).toBeVisible();
});

test("combat uses the same custom physical movement/map keys, resets speed on recovery and keeps real clocks unscaled", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await page.getByRole("button", { name: /^START NEW RUN/ }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await page.evaluate(() => {
    const g = window.__NOWRIFT_TEST__!.state();
    g.player.invincible = 9999;
    g.weapon.damage = 0;
  });
  const sample = () =>
    page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return {
        time: g.time,
        real: g.realTime!,
        speed: g.battleSpeed,
        position: { x: g.player.x, y: g.player.y },
      };
    });
  for (const speed of [1, 2, 4]) {
    await page
      .getByRole("button", { name: `Combat speed ${speed}x`, exact: true })
      .click();
    await expect.poll(async () => (await sample()).speed).toBe(speed);
    const a = await sample();
    await page.waitForTimeout(700);
    const b = await sample();
    expect(b.time - a.time).toBeGreaterThan((b.real - a.real) * speed - 0.12);
    expect(b.time - a.time).toBeLessThan((b.real - a.real) * speed + 0.12);
  }
  await page.keyboard.press("t");
  await expect.poll(async () => (await sample()).speed).toBe(1);
  await page
    .getByRole("button", { name: "Combat speed 4x", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).toBeVisible();
  const paused = await sample();
  await page.waitForTimeout(350);
  expect(await sample()).toEqual(paused);
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .last()
    .click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByText("Custom key bindings", { exact: true }).click();
  for (const [action, key] of [
    ["Move right", "l"],
    ["Full map", "k"],
    ["Cycle battle speed", "b"],
  ]) {
    await settings
      .getByRole("button", { name: `Rebind ${action}`, exact: true })
      .click();
    await page.keyboard.press(key);
  }
  await settings.getByRole("button", { name: "DONE", exact: true }).click();
  await page.getByRole("button", { name: /^RESUME RUN/ }).click();
  const before = await sample();
  await page.keyboard.down("d");
  await page.waitForTimeout(180);
  await page.keyboard.up("d");
  expect((await sample()).position).toEqual(before.position);
  await page.keyboard.down("l");
  await page.waitForTimeout(250);
  await page.keyboard.up("l");
  expect((await sample()).position.x).toBeGreaterThan(before.position.x + 30);
  await page.keyboard.press("k");
  await expect(page.getByRole("dialog", { name: "Town map" })).toHaveCount(0); // Practice has no local atlas.
  await page.keyboard.press("b");
  await expect.poll(async () => (await sample()).speed).toBe(1);
  await page
    .getByRole("button", { name: "Combat speed 4x", exact: true })
    .click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).toBeVisible();
  const hidden = await sample();
  await page.waitForTimeout(300);
  expect(await sample()).toEqual(hidden);
  await page.screenshot({
    path: info.outputPath("combat-speed-keybindings.png"),
    animations: "disabled",
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await page
    .getByRole("button", { name: "RECOVER RUN →", exact: true })
    .click();
  await page.getByRole("button", { name: /^RESUME CHECKPOINT/ }).click();
  await expect(
    page.getByRole("heading", { name: "Paused", exact: true }),
  ).toBeVisible();
  expect((await sample()).speed).toBe(1);
  expect((await sample()).time).toBeCloseTo(hidden.time, 5);
  expect((await sample()).real).toBeCloseTo(hidden.real, 5);
  await page.getByRole("button", { name: /^RESUME RUN/ }).click();
  await page.keyboard.press("b");
  await expect.poll(async () => (await sample()).speed).toBe(2);
});

test("mobile immersive mode preserves native touch movement, important interaction prompts and an accessible reveal handle", async ({
  browser,
  baseURL,
}, info) => {
  const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    }),
    page = await context.newPage();
  try {
    await enterCity(page, true);
    await page.getByRole("button", { name: /^Hide HUD/ }).tap();
    const start = await page.evaluate(
        () => window.__NOWRIFT_HAVEN__!.state().position,
      ),
      canvas = page.locator("canvas"),
      box = (await canvas.boundingBox())!,
      cdp = await context.newCDPSession(page),
      x = Math.round(box.x + box.width * 0.3),
      y = Math.round(box.y + box.height * 0.65);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await expect(canvas).toHaveAttribute("data-touch-active", "true");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 60, y }],
    });
    await page.waitForTimeout(400);
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position)).x,
    ).toBeGreaterThan(start.x + 20);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(canvas).toHaveAttribute("data-touch-active", "false");
    await placeCity(
      page,
      regionalCity("central").landmarks.find((l) => l.id === "mara")!.entrance,
    );
    await expect(page.locator(".haven-interact")).toContainText("Mara");
    await page.locator(".haven-interact").tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await waitForHavenInput(page);
    await expect(page.locator(".regional-minimap")).toBeHidden();
    await page.screenshot({
      path: info.outputPath("mobile-hidden-hud-touch.png"),
      animations: "disabled",
    });
    await page.getByRole("button", { name: /^Show HUD/ }).tap();
    await expect(page.locator(".regional-minimap")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("Story and Free exploration reserve independent minimap/quest zones, and immersive mode retains combat health and map access", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await enterCity(page, true);
  await trackQuest(page);
  await page
    .locator(".haven-bottom")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByText("Custom key bindings", { exact: true }).click();
  await settings
    .getByRole("button", { name: "Rebind Full map", exact: true })
    .click();
  await page.keyboard.press("k");
  await settings.getByRole("button", { name: "DONE", exact: true }).click();
  await waitForHavenInput(page);
  await placeCity(
    page,
    regionalCity("central").landmarks.find((l) => l.kind === "portal")!
      .entrance,
  );
  await page.locator(".haven-interact").click();
  await page
    .getByRole("button", { name: "Confirm travel", exact: true })
    .click();
  await expect(page.locator(".expedition-minimap")).toBeVisible();
  await page.evaluate(() => {
    const g = window.__NOWRIFT_TEST__!.state();
    g.player.invincible = 9999;
    g.weapon.damage = 0;
  });
  for (const size of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const a = (await page.locator(".expedition-minimap").boundingBox())!,
      b = (await page.locator(".quest-tracker").boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
    expect(b.y + b.height).toBeLessThanOrEqual(size.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("v");
  await expect(page.locator(".expedition-minimap")).toBeHidden();
  await expect(page.locator(".health-fill")).toBeVisible();
  await page
    .getByRole("button", { name: "Combat speed 4x", exact: true })
    .click();
  await page.keyboard.press("k");
  await expect(
    page.getByRole("dialog", { name: "Expedition map", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".expedition-minimap")).toBeHidden();
  await page.getByRole("button", { name: /^Show HUD/ }).click();
  await expect(page.locator(".expedition-minimap")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("free-combat-hud-mobile.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Return to main menu", exact: true })
    .click();
  await page.getByRole("button", { name: /EXIT TO/ }).click();
  await waitForHavenInput(page);
  await expect
    .poll(async () => {
      const save = await citySave(page);
      return { run: save.local.activeRun, checkpoint: save.local.checkpoint };
    })
    .toEqual({ run: null, checkpoint: null });
  await placeCity(
    page,
    regionalCity("central").landmarks.find((l) => l.kind === "portal")!
      .entrance,
  );
  await page.locator(".haven-interact").click();
  await page
    .getByRole("button", { name: "Campaign challenges →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "START STAGE →", exact: true })
    .click();
  await beginStory(page);
  await expect(page.locator(".mission-hud")).toBeVisible();
  await expect(page.locator(".quest-tracker")).toBeVisible();
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width > 1000 ? 720 : 844 });
    const a = (await page.locator(".expedition-minimap").boundingBox())!,
      b = (await page.locator(".quest-tracker").boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
  }
  await page
    .getByRole("button", { name: "Combat speed 4x", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("story-combat-hud-desktop.png"),
    animations: "disabled",
  });
});

test("World map keeps gate requirements for first visits, then travels to any discovered regional beacon away from a gate", async ({
  page,
}, info) => {
  await enterCity(page, true);
  const original = await citySave(page);
  await page.keyboard.press("m");
  const map = page.getByRole("dialog", { name: "Town map", exact: true });
  await map
    .getByRole("button", { name: "Thailand world map", exact: true })
    .click();
  await map.locator('[data-region-marker="north"]').click();
  await expect(map.locator('[data-region-travel="north"]')).toBeDisabled();
  await expect(map).toContainText("Walk to a regional Rift Gate");
  await page.keyboard.press("Escape");
  await waitForHavenInput(page);
  await placeCity(
    page,
    regionalCity("central").landmarks.find((l) => l.kind === "portal")!
      .entrance,
  );
  await page.keyboard.press("m");
  await map
    .getByRole("button", { name: "Thailand world map", exact: true })
    .click();
  await map.locator('[data-region-marker="north"]').click();
  await map.locator('[data-region-travel="north"]').click();
  await expect
    .poll(async () => currentRegion((await citySave(page)).local.world))
    .toBe("north");
  await waitForHavenInput(page);
  const beacon = waypointsIn("north").find((w) => w.id !== "north-plaza")!;
  await placeCity(page, beacon.spawn);
  await page.keyboard.press("e");
  await expect
    .poll(async () => (await citySave(page)).local.world!.waypoints)
    .toContain(beacon.id);
  await page.keyboard.press("Escape");
  await waitForHavenInput(page);
  await page.keyboard.press("m");
  await map
    .getByRole("button", { name: "Thailand world map", exact: true })
    .click();
  await map.locator('[data-region-marker="central"]').click();
  await map.locator('[data-region-travel="central"]').click();
  await waitForHavenInput(page);
  await page.keyboard.press("m");
  await map
    .getByRole("button", { name: "Thailand world map", exact: true })
    .click();
  await map.locator('[data-region-marker="north"]').click();
  await map
    .getByLabel("Regional destination", { exact: true })
    .selectOption(beacon.id);
  await expect(map.locator('[data-region-travel="north"]')).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("world-beacon-fast-travel.png"),
    animations: "disabled",
  });
  await map.locator('[data-region-travel="north"]').click();
  await waitForHavenInput(page);
  const arrived = await citySave(page);
  expect(arrived.local.world!.position).toEqual(waypointLanding(beacon));
  expect(validPosition(arrived.local.world!.position, "north")).toBe(true);
  expect(arrived.xp).toBe(original.xp);
  expect(arrived.rpg).toEqual(original.rpg);
  await page.reload();
  await enterCity(page);
  expect((await citySave(page)).local.world!.position).toEqual(
    arrived.local.world!.position,
  );
});

test("4x combat with 150 enemies stays responsive under mobile CPU throttling without scaling the wall clock", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Performance.enable");
  try {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Practice & legacy tools", exact: true })
      .click();
    await page.getByRole("button", { name: /^START NEW RUN/ }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      const g = window.__NOWRIFT_TEST__!.state();
      g.weapon.damage = 0;
    });
    await page
      .getByRole("button", { name: "Combat speed 4x", exact: true })
      .click();
    const sample = () =>
      page.evaluate(() => {
        const g = window.__NOWRIFT_TEST__!.state();
        return {
          wall: performance.now() / 1000,
          simulated: g.time,
          real: g.realTime!,
          speed: g.battleSpeed,
          frames: window.__NOWRIFT_TEST__!.metrics!().frames,
          enemies: g.enemies.length,
          phase: g.phase,
          fpsLimit: window.__NOWRIFT_TEST__!.metrics!().fpsLimit,
        };
      });
    const before = await sample();
    await page.waitForTimeout(4000);
    const after = await sample(),
      metrics = (await cdp.send("Performance.getMetrics")).metrics,
      heap = metrics.find((m) => m.name === "JSHeapUsedSize")!.value;
    const measurement = {
      simulatedSeconds: after.simulated - before.simulated,
      realSeconds: after.real - before.real,
      wallSeconds: after.wall - before.wall,
      frames: after.frames - before.frames,
      heapBytes: heap,
      cpuThrottle: 4,
      combatSpeed: after.speed,
    };
    expect(after.speed).toBe(4);
    expect(after.phase).toBe("playing");
    expect(after.enemies).toBeGreaterThanOrEqual(150);
    expect(after.fpsLimit).toBe(60);
    expect(measurement.frames).toBeGreaterThan(15);
    expect(measurement.simulatedSeconds).toBeGreaterThan(0.5);
    expect(measurement.simulatedSeconds).toBeLessThanOrEqual(
      measurement.realSeconds * 4 + 0.05,
    );
    expect(measurement.realSeconds).toBeLessThanOrEqual(
      measurement.wallSeconds + 0.05,
    );
    expect(heap).toBeLessThan(256 * 1024 * 1024);
    const report = info.outputPath("combat-4x-performance.json");
    await writeFile(report, JSON.stringify(measurement, null, 2) + "\n");
    await info.attach("combat-4x-performance.json", {
      path: report,
      contentType: "application/json",
    });
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Paused", exact: true }),
    ).toBeVisible();
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
});
