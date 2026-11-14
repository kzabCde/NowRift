import { expect, test, type Page } from "@playwright/test";
import { REGIONS, type RegionId } from "../src/game/world/regions";
import { regionalCity } from "../src/game/world/regional-city";
import { currentRegion } from "../src/game/world/exploration";
import { citySave, enterCity, placeCity } from "./helpers/city";
import { waitForHavenInput } from "./helpers/haven";
import { stageById } from "../src/game/campaign/content";
import { beginStory } from "./helpers/story";
import { writeFile } from "node:fs/promises";

test.describe("regional exploration and unified atlas", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires the explicit city fixture; travel and map commands use production logic.",
  );
  async function journey(page: Page, to: RegionId) {
    const before = await citySave(page),
      origin = currentRegion(before.local.world),
      gate = regionalCity(origin).landmarks.find((l) => l.kind === "portal")!;
    await placeCity(page, gate.entrance);
    await page.keyboard.press("m");
    const map = page.getByRole("dialog", { name: "Town map", exact: true });
    await expect(map).toBeVisible();
    await map
      .getByRole("button", { name: "Thailand world map", exact: true })
      .click();
    await map.locator(`[data-region-marker="${to}"]`).click();
    await expect(map.locator(`[data-region-travel="${to}"]`)).toBeEnabled();
    await map.locator(`[data-region-travel="${to}"]`).click();
    await expect
      .poll(async () => currentRegion((await citySave(page)).local.world))
      .toBe(to);
    await waitForHavenInput(page);
    await expect(
      page.locator(`.regional-minimap [data-map-region="${to}"]`),
    ).toBeVisible();
  }
  test("four real city scenes retain the character, render native regional assets and survive return/reload", async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    const errors: string[] = [],
      missing: string[] = [],
      requestedRegions = new Set<string>();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      const region = r.url().match(/\/assets\/regions\/([^/]+)\//)?.[1];
      if (region) requestedRegions.add(region);
      if (r.url().includes("/assets/") && r.status() >= 400)
        missing.push(r.url());
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await enterCity(page, true);
    const initial = await citySave(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const measurements: {
      region: RegionId;
      viewport: { width: number; height: number } | null;
      cpu: number;
      fps: number;
      p95FrameMs: number;
      phaserFps: number;
      heapBytes: number;
      textureBytes: number;
      sprites: number;
      visibleSprites: number;
      motes: number;
    }[] = [];
    async function measure(region: RegionId, cpu: number) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
      await page.waitForTimeout(800);
      const sample = await page.evaluate(
        () =>
          new Promise<{ fps: number; p95FrameMs: number }>((resolve) => {
            const gaps: number[] = [],
              start = performance.now();
            let last = start;
            const frame = (now: number) => {
              gaps.push(now - last);
              last = now;
              if (now - start < 3000) requestAnimationFrame(frame);
              else {
                gaps.sort((a, b) => a - b);
                resolve({
                  fps: gaps.length / ((now - start) / 1000),
                  p95FrameMs: gaps[Math.floor(gaps.length * 0.95)],
                });
              }
            };
            requestAnimationFrame(frame);
          }),
      );
      const city = await page.evaluate(() => window.__NOWRIFT_HAVEN__!.city()),
        metrics = (await cdp.send("Performance.getMetrics")).metrics,
        heapBytes = metrics.find((m) => m.name === "JSHeapUsedSize")!.value;
      expect(sample.fps).toBeGreaterThan(cpu === 4 ? 18 : 30);
      expect(sample.p95FrameMs).toBeLessThan(150);
      expect(heapBytes).toBeLessThan(256 * 1024 * 1024);
      expect(city.textureBytes).toBeLessThan(160 * 1024 * 1024);
      expect(city.motes).toBeLessThanOrEqual(city.moteLimit);
      if (cpu === 4)
        expect(city.visibleSprites).toBeLessThan(city.sprites * 0.75);
      measurements.push({
        region,
        viewport: page.viewportSize(),
        cpu,
        ...sample,
        phaserFps: city.fps,
        heapBytes,
        textureBytes: city.textureBytes,
        sprites: city.sprites,
        visibleSprites: city.visibleSprites,
        motes: city.motes,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }
    for (const r of REGIONS.filter((r) => r.id !== "central")) {
      requestedRegions.clear();
      await journey(page, r.id);
      expect([...requestedRegions]).toEqual([r.id]);
      const saved = await citySave(page);
      expect(saved.xp).toBe(initial.xp);
      expect(saved.gold).toBe(initial.gold);
      expect(saved.materials).toEqual(initial.materials);
      expect(saved.rpg).toEqual(initial.rpg);
      expect(saved.clears).toEqual(initial.clears);
      await page.evaluate(() => window.__NOWRIFT_HAVEN__!.setCityTime(0.25));
      await expect
        .poll(() =>
          page.evaluate(() => window.__NOWRIFT_HAVEN__!.city().lighting.night),
        )
        .toBe(false);
      await page.screenshot({
        path: info.outputPath(`${r.id}-desktop.png`),
        animations: "disabled",
      });
      await measure(r.id, 1);
      await page.setViewportSize({ width: 390, height: 844 });
      await placeCity(
        page,
        regionalCity(r.id).landmarks.find((l) => l.kind === "blacksmith")!
          .entrance,
      );
      await expect(page.locator(".haven-interact")).toContainText(
        r.id === "north"
          ? "Mountain Forge"
          : r.id === "northeast"
            ? "Ancient Forge"
            : "Harbor Forge",
      );
      await page.screenshot({
        path: info.outputPath(`${r.id}-mobile.png`),
        animations: "disabled",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 2,
        ),
      ).toBe(true);
      await measure(r.id, 4);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await journey(page, "central");
    const returned = await citySave(page);
    expect(returned.local.world!.positionEpoch).toBe(4);
    await page.evaluate(() =>
      window.__NOWRIFT_HAVEN__!.emitSave({ x: 900, y: 900 }, 0),
    );
    expect((await citySave(page)).local.world!.position).toEqual(
      returned.local.world!.position,
    );
    await page.screenshot({
      path: info.outputPath("central-river-city.png"),
      animations: "disabled",
    });
    await journey(page, "south");
    const beforeReload = await citySave(page);
    await page.reload();
    await enterCity(page);
    expect(currentRegion((await citySave(page)).local.world)).toBe("south");
    expect((await citySave(page)).local.world!.position).toEqual(
      beforeReload.local.world!.position,
    );
    expect((await citySave(page)).rpg).toEqual(initial.rpg);
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
    const path = info.outputPath("regional-performance.json");
    await writeFile(path, JSON.stringify(measurements, null, 2) + "\n");
    await info.attach("regional-performance.json", {
      path,
      contentType: "application/json",
    });
  });
  test("minimap opens an accurate local/world map, pans and zooms, and saves a destination without moving the player", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await enterCity(page, true);
    await page.keyboard.down("d");
    await page.waitForTimeout(450);
    await page.keyboard.up("d");
    const point = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.state().position,
    );
    await page.getByRole("button", { name: "Open map", exact: true }).click();
    const map = page.getByRole("dialog", { name: "Town map", exact: true }),
      view = map.locator(".atlas-viewport");
    await expect(map).toBeVisible();
    await expect(map.getByTestId("town-player-marker")).toHaveCSS("left", /.+/);
    await map.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(view).toHaveAttribute("data-zoom", "1.30");
    await view.scrollIntoViewIfNeeded();
    const b = await view.boundingBox();
    await page.mouse.move(b!.x + b!.width * 0.5, b!.y + b!.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(
      b!.x + b!.width * 0.5 + 40,
      b!.y + b!.height * 0.2 + 20,
      { steps: 6 },
    );
    await page.mouse.up();
    await expect(view).not.toHaveAttribute("data-pan-x", "0.0");
    await map
      .getByRole("button", { name: "Center on player", exact: true })
      .click();
    await expect(view).toHaveAttribute("data-zoom", "2.00");
    await map.getByRole("button", { name: "Fit map", exact: true }).click();
    await expect(view).toHaveAttribute("data-zoom", "1.00");
    await map.locator('[data-waypoint-entry="guild"]').click();
    await map
      .getByRole("button", { name: "Set destination", exact: false })
      .click();
    await waitForHavenInput(page);
    await expect(page.getByTestId("minimap-destination")).toContainText(
      "Adventurer",
    );
    expect((await citySave(page)).local.world!.position).toEqual(point);
    expect((await citySave(page)).local.world!.atlas!.destination).toEqual({
      region: "central",
      landmarkId: "waypoint-guild",
    });
    await page.keyboard.press("m");
    await expect(map).toBeVisible();
    await map
      .getByRole("button", { name: "Thailand world map", exact: true })
      .click();
    await map.locator('[data-region-marker="north"]').click();
    await expect(map.locator('[data-region-travel="north"]')).toBeDisabled();
    await expect(map.locator('[data-selected-region="north"]')).toContainText(
      "Gate",
    );
    await page.screenshot({
      path: info.outputPath("thailand-world-overview.png"),
      animations: "disabled",
    });
    await page.keyboard.press("m");
    await expect(map).toHaveCount(0);
    await waitForHavenInput(page);
    expect(
      await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position),
    ).toEqual(point);
  });
  test("a regional shop uses the existing purchase transaction once and retains owned gear after reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await enterCity(page, true);
    await journey(page, "south");
    const market = regionalCity("south").landmarks.find(
      (l) => l.id === "south-market",
    )!;
    await placeCity(page, market.entrance);
    await page.locator(".haven-interact").click();
    const detail = page.locator(".outfitters-desktop-detail"),
      buy = detail.getByRole("button", { name: /^Buy for/ });
    await expect(buy).toBeEnabled();
    const price = Number(
        (await buy.innerText()).match(/[\d,]+/)![0].replaceAll(",", ""),
      ),
      before = await citySave(page);
    await buy.click();
    const dialog = page.getByRole("dialog", {
      name: "Confirm purchase",
      exact: true,
    });
    await dialog
      .getByRole("button", { name: "CONFIRM", exact: true })
      .evaluate((node) => {
        (node as HTMLButtonElement).click();
        (node as HTMLButtonElement).click();
      });
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(async () => (await citySave(page)).gold)
      .toBe(before.gold - price);
    const bought = await citySave(page);
    expect(bought.rpg!.equipment).toHaveLength(
      before.rpg!.equipment.length + 1,
    );
    expect(bought.rpg!.equipped).toEqual(before.rpg!.equipped);
    expect(bought.xp).toBe(before.xp);
    await page.keyboard.press("Escape");
    await waitForHavenInput(page);
    await page.reload();
    await enterCity(page);
    expect((await citySave(page)).rpg).toEqual(bought.rpg);
    expect(currentRegion((await citySave(page)).local.world)).toBe("south");
  });
  test("Thai mobile map supports real pinch and drag gestures without steering the character", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterCity(page, true);
    await page.getByRole("button", { name: "TH", exact: true }).click();
    const before = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.state().position,
    );
    await page.getByRole("button", { name: "เปิดแผนที่", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "แผนที่พื้นที่", exact: true }),
    ).toBeVisible();
    const view = page.locator(".unified-atlas .atlas-viewport"),
      box = await view.boundingBox(),
      x = box!.x + box!.width / 2,
      y = box!.y + box!.height / 2,
      cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 25, y, id: 1 },
        { x: x + 25, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 65, y, id: 1 },
        { x: x + 65, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(async () => Number(await view.getAttribute("data-zoom")))
      .toBeGreaterThan(1.5);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 3 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 30, y: y + 20, id: 3 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(view).not.toHaveAttribute("data-pan-x", "0.0");
    await page
      .getByRole("button", { name: "แผนที่โลกสี่ภูมิภาค", exact: true })
      .click();
    await page.locator('[data-region-marker="north"]').click();
    await expect(page.locator('[data-selected-region="north"]')).toContainText(
      "เวียงเมฆา",
    );
    await page.screenshot({
      path: info.outputPath("thai-mobile-world-map.png"),
      animations: "disabled",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.keyboard.press("m");
    await waitForHavenInput(page);
    expect(
      await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state().position),
    ).toEqual(before);
  });
  test("regional Free exploration pauses for its atlas, gathers at the actual marker and extracts to the same city with loot", async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterCity(page, true);
    await journey(page, "north");
    const before = await citySave(page),
      gate = regionalCity("north").landmarks.find((l) => l.kind === "portal")!;
    await placeCity(page, gate.entrance);
    await page.locator(".haven-interact").click();
    await page
      .getByRole("button", { name: "Confirm travel", exact: true })
      .click();
    await expect(page.locator(".expedition-minimap")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__NOWRIFT_TEST__?.state().campaign?.definition.id,
        ),
      )
      .toBe("frozen-1");
    expect(
      await page.evaluate(
        () => window.__NOWRIFT_TEST__!.state().campaign!.seed,
      ),
    ).toBe(stageById("frozen-1").environment.seed);
    await page.getByRole("button", { name: "Open map", exact: true }).click();
    const map = page.getByRole("dialog", {
      name: "Expedition map",
      exact: true,
    });
    await expect(map).toBeVisible();
    const frozenTime = await page.evaluate(
      () => window.__NOWRIFT_TEST__!.state().time,
    );
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().time),
    ).toBe(frozenTime);
    const resource = map.locator(
      '[data-wilderness-marker="frozen-1-supply-0"]',
    );
    const point = await resource.evaluate((el) => ({
      x: parseFloat((el as HTMLElement).style.left) * 18,
      y: parseFloat((el as HTMLElement).style.top) * 14,
    }));
    await resource.click();
    await map.getByRole("button", { name: /Set destination/ }).click();
    await expect(map).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__NOWRIFT_TEST__!.state().campaign!.mapTarget,
        ),
      )
      .toBe("frozen-1-supply-0");
    await page.evaluate((p) => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      g.player.x = p.x;
      g.player.y = p.y;
    }, point);
    await page.keyboard.press("e");
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__NOWRIFT_TEST__!.state().campaign!.harvested,
        ),
      )
      .toContain("frozen-1-supply-0");
    await page.evaluate(() => {
      for (let i = 0; i < 7; i++) window.__NOWRIFT_TEST__!.scenario("target");
    });
    for (let i = 0; i < 100; i++) {
      const state = await page.evaluate(() => ({
        time: window.__NOWRIFT_TEST__!.state().time,
        kills: window.__NOWRIFT_TEST__!.state().kills,
        phase: window.__NOWRIFT_TEST__!.state().phase,
      }));
      if (state.time >= 21 && state.kills >= 5) break;
      const upgrade = page.locator(".upgrade-card").first();
      if (await upgrade.isVisible()) await upgrade.click();
      await page.waitForTimeout(250);
    }
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().kills),
    ).toBeGreaterThanOrEqual(5);
    await page.screenshot({
      path: info.outputPath("highland-expedition-minimap.png"),
      animations: "disabled",
    });
    await page.keyboard.press("m");
    await expect(map).toBeVisible();
    await page.screenshot({
      path: info.outputPath("highland-expedition-atlas.png"),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.x = 900;
      g.player.y = 760;
    });
    await page.getByRole("button", { name: "Extract to Wiang Mekha" }).click();
    await expect(
      page.getByRole("heading", { name: "Expedition complete", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".save-message")).toContainText("saved");
    const after = await citySave(page);
    expect(after.materials["frost-crystal"] ?? 0).toBeGreaterThan(
      before.materials["frost-crystal"] ?? 0,
    );
    expect(after.clears).toEqual(before.clears);
    expect(after.rpg!.equipped).toEqual(before.rpg!.equipped);
    expect(after.local.world!.atlas!.wilderness?.north).toBeDefined();
    await page
      .getByRole("dialog", { name: "Victory", exact: true })
      .getByRole("button", { name: "RETURN TO Wiang Mekha", exact: true })
      .click();
    await waitForHavenInput(page);
    expect(currentRegion((await citySave(page)).local.world)).toBe("north");
    await expect(page.locator(".haven-title h1")).toHaveText("Wiang Mekha");
  });
  test("Story map markers use current mission objects and map inspection cannot advance time or objectives", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Practice & legacy tools", exact: true })
      .click();
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "START STAGE →", exact: true })
      .click();
    await beginStory(page);
    await page.keyboard.press("m");
    const map = page.getByRole("dialog", {
      name: "Expedition map",
      exact: true,
    });
    await expect(map).toBeVisible();
    const before = await page.evaluate(() => ({
      time: window.__NOWRIFT_TEST__!.state().time,
      step: window.__NOWRIFT_TEST__!.state().campaign!.mission!.step,
    }));
    await expect(map.locator("[data-wilderness-marker]")).not.toHaveCount(0);
    await page.waitForTimeout(350);
    expect(
      await page.evaluate(() => ({
        time: window.__NOWRIFT_TEST__!.state().time,
        step: window.__NOWRIFT_TEST__!.state().campaign!.mission!.step,
      })),
    ).toEqual(before);
    await map.getByRole("button", { name: "Close map", exact: true }).click();
    await expect(map).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.__NOWRIFT_TEST__!.state().phase))
      .toBe("playing");
  });
});
