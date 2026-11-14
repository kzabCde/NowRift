import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { CITY, DISTRICTS } from "../src/game/world/city";
import { HAVEN } from "../src/game/world/content";
import { WAYPOINTS, waypointLanding } from "../src/game/world/waypoints";
import { calculateStats } from "../src/game/rpg/stats";
import { STAGES } from "../src/game/campaign/content";
import {
  citySave,
  enterCity,
  placeCity,
  cityStation,
  closeCityPanel,
} from "./helpers/city";
import { waitForHavenInput } from "./helpers/haven";

test.describe("expanded city and authoritative town travel", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Uses explicit city rendering and stale-event instrumentation.",
  );
  test("all nine districts render distinct desktop and touch views without replacing the live canvas or build", async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await enterCity(page, true);
    const before = await citySave(page),
      canvas = await page.locator("canvas").elementHandle();
    for (const size of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      for (const d of DISTRICTS) {
        await placeCity(page, d.center);
        await expect(page.locator(".haven-district")).toHaveAttribute(
          "data-district",
          d.id,
        );
        await expect
          .poll(() =>
            page.evaluate(
              () => window.__NOWRIFT_HAVEN__!.city().visibleSprites,
            ),
          )
          .toBeLessThan(
            (await page.evaluate(
              () => window.__NOWRIFT_HAVEN__!.city().sprites,
            )) * 0.75,
          );
        const metrics = await page.evaluate(() =>
          window.__NOWRIFT_HAVEN__!.city(),
        );
        expect(metrics.tileLayers).toBe(5);
        expect(metrics.motes).toBeLessThanOrEqual(72);
        expect(metrics.textureBytes).toBeLessThan(160 * 1024 * 1024);
        expect(
          metrics.residents.every(
            (n) => n.frame >= 0 && n.frame < CITY.npcs.length * 16,
          ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 2,
          ),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(
            `${size.width === 390 ? "mobile" : "desktop"}-${d.id}.png`,
          ),
          animations: "disabled",
        });
      }
    }
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector("canvas"),
      ),
    ).toBe(true);
    expect((await citySave(page)).rpg).toEqual(before.rpg);
    expect((await citySave(page)).xp).toBe(before.xp);
    expect(errors).toEqual([]);
  });
  test("Town Map distinguishes locked waypoints, retains route markers, commits travel and ignores stale autosaves after reload", async ({
    page,
  }, info) => {
    await enterCity(page, true);
    const before = await citySave(page),
      old = before.local.world!;
    await page.keyboard.press("m");
    const map = page.getByRole("dialog", { name: "Town map", exact: true });
    await expect(map).toBeVisible();
    await map.locator('[data-waypoint-entry="guild"]').click();
    await expect(
      map.getByRole("button", { name: "Fast Travel", exact: false }),
    ).toBeDisabled();
    await map.getByRole("button", { name: /Set destination/ }).click();
    await waitForHavenInput(page);
    expect(
      (await page.evaluate(() => window.__NOWRIFT_HAVEN__!.state())).position,
    ).toEqual(old.position);
    await page.keyboard.press("m");
    await map.locator('[data-waypoint-entry="grove"]').click();
    await map.locator(".town-map-overview").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath("town-map-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });
    const go = map.getByRole("button", { name: /^Fast Travel/ });
    await go.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("town-travel-transition")).toBeVisible();
    await expect(page.getByTestId("town-travel-transition")).toHaveCount(0);
    await waitForHavenInput(page);
    const landed = await citySave(page);
    expect(landed.local.world!.position).toEqual(
      waypointLanding(WAYPOINTS.find((w) => w.id === "grove")!),
    );
    expect(landed.local.world!.positionEpoch).toBe(1);
    await page.evaluate(
      ({ position, epoch }) =>
        window.__NOWRIFT_HAVEN__!.emitSave(position, epoch),
      { position: old.position, epoch: 0 },
    );
    await expect
      .poll(async () => (await citySave(page)).local.revision)
      .toBeGreaterThan(landed.local.revision);
    expect((await citySave(page)).local.world!.position).toEqual(
      landed.local.world!.position,
    );
    expect((await citySave(page)).rpg).toEqual(before.rpg);
    expect((await citySave(page)).local.activeRun).toBeNull();
    await page.reload();
    await enterCity(page);
    expect((await citySave(page)).local.world!.position).toEqual(
      landed.local.world!.position,
    );
    expect((await citySave(page)).local.world!.positionEpoch).toBe(1);
    await page.keyboard.down("d");
    await page.waitForTimeout(250);
    await page.keyboard.up("d");
    await page.keyboard.press("m");
    const actual = await page.evaluate(
      () => window.__NOWRIFT_HAVEN__!.state().position,
    );
    const left = await page
      .getByTestId("town-player-marker")
      .evaluate((el) => parseFloat((el as HTMLElement).style.left));
    expect(left).toBeCloseTo((actual.x / HAVEN.width) * 100, 1);
  });
  test("exploration unlocks every waypoint and all nine real arrivals preserve the shared progression", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await enterCity(page, true);
    const before = await citySave(page),
      canvas = await page.locator("canvas").elementHandle();
    for (const w of WAYPOINTS) {
      await cityStation(page, w.landmarkId);
      await page.getByRole("button", { name: /Open Town Map/ }).click();
      await page.locator(`[data-waypoint-entry="${w.id}"]`).click();
      await page.getByRole("button", { name: /^Fast Travel/ }).click();
      await expect(page.getByTestId("town-travel-transition")).toHaveCount(0);
      await waitForHavenInput(page);
      const saved = await citySave(page);
      expect(saved.local.world!.waypoints).toContain(w.id);
      expect(saved.local.world!.position).toEqual(waypointLanding(w));
      expect(saved.local.world!.location).toBe("haven");
      expect(saved.rpg).toEqual(before.rpg);
      expect(saved.gold).toBe(before.gold);
      expect(saved.xp).toBe(before.xp);
      expect(saved.materials).toEqual(before.materials);
      expect(saved.clears).toEqual(before.clears);
      expect(saved.local.world!.quest).toBe(before.local.world!.quest);
    }
    expect((await citySave(page)).local.world!.waypoints).toHaveLength(9);
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector("canvas"),
      ),
    ).toBe(true);
  });
  test("district stations connect to real clothing, crafting, guild, training and lore systems", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await enterCity(page, true);
    const before = await citySave(page);
    await cityStation(page, "vendor-pants");
    await expect(
      page.getByRole("button", { name: "Legwear", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .locator(".outfitters-desktop-detail")
      .getByRole("button", { name: /^Buy for/ })
      .click();
    await page
      .getByRole("dialog", { name: "Confirm purchase" })
      .getByRole("button", { name: "CONFIRM", exact: true })
      .click();
    await page
      .locator(".outfitters-desktop-detail")
      .getByRole("button", { name: "Inspect owned copy", exact: true })
      .click();
    await page
      .locator(".outfitters-desktop-detail")
      .getByRole("button", { name: "Equip this item", exact: true })
      .click();
    await expect(
      page
        .locator(".outfitters-desktop-detail")
        .getByRole("button", { name: "Unequip this item", exact: true }),
    ).toBeVisible();
    const dressed = await citySave(page);
    expect(dressed.gold).toBe(before.gold - 52);
    expect(calculateStats(dressed).armor).toBeGreaterThan(
      calculateStats(before).armor,
    );
    expect(dressed.local.world!.waypoints).toContain("market");
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await waitForHavenInput(page);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window
              .__NOWRIFT_HAVEN__!.appearance()
              .layers.find((l) => l.slot === "pants")?.instanceId,
        ),
      )
      .toBe(dressed.rpg!.equipped.pants);
    await cityStation(page, "guild");
    await expect(
      page.getByRole("heading", { name: "Story missions & guardian records" }),
    ).toBeVisible();
    await expect(page.locator(".haven-guild-records").first()).toContainText(
      `${STAGES.filter((s) => s.worldId === "forest").length} / ${STAGES.filter((s) => s.worldId === "forest").length}`,
    );
    await closeCityPanel(page);
    await cityStation(page, "workshop");
    const tonic = page
      .locator(".rpg-recipes article")
      .filter({ hasText: "Brew Crimson Tonic" });
    await tonic.getByRole("button", { name: "CRAFT", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Confirm crafting" })
      .getByRole("button", { name: "CONFIRM", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Crafting complete" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await waitForHavenInput(page);
    await cityStation(page, "training");
    await page
      .getByRole("button", { name: "Test equipped weapon", exact: true })
      .click();
    await expect
      .poll(async () =>
        Number(
          (await page.locator(".haven-training > strong").innerText())
            .split(":")
            .at(-1),
        ),
      )
      .toBeGreaterThan(0);
    await closeCityPanel(page);
    for (const d of DISTRICTS) {
      await cityStation(page, "lore-" + d.id);
      await expect(page.locator(".haven-lore")).toContainText(d.loreTitle);
      await closeCityPanel(page);
    }
    const after = await citySave(page);
    for (const d of DISTRICTS)
      expect(after.local.world!.discoveries).toContain("lore-" + d.id);
    expect(after.rpg!.equipped.weapon).toBe("city-sunblade");
    expect(after.xp).toBe(before.xp);
  });
  test("Thai touch Town Map works at 320px and district sound, lighting and effect bounds remain real", async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterCity(page, true);
    await page
      .locator(".haven-toolbar .language-switcher button")
      .nth(1)
      .click();
    await page.getByRole("button", { name: "แผนที่", exact: true }).click();
    const map = page.getByRole("dialog", { name: "แผนที่เมือง", exact: true });
    await map.locator('[data-waypoint-entry="grove"]').click();
    const go = map.getByRole("button", { name: /^เดินทางด่วน/ });
    await go.scrollIntoViewIfNeeded();
    expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("town-map-mobile-th.png"),
      animations: "disabled",
    });
    await go.click();
    await expect(page.getByTestId("town-travel-transition")).toHaveCount(0);
    await page
      .locator(".haven-toolbar .language-switcher button")
      .nth(0)
      .click();
    await waitForHavenInput(page);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await page.locator(".town-map-overview").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath("town-map-mobile-overview.png"),
      animations: "disabled",
    });
    await closeCityPanel(page);
    for (const d of DISTRICTS) {
      await placeCity(page, d.center);
      await expect
        .poll(() =>
          page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().district),
        )
        .toBe(d.id);
      const audio = await page.evaluate(() =>
        window.__NOWRIFT_AUDIO__!.diagnostics(),
      );
      expect(audio.contexts).toBe(1);
      expect(audio.schedulers).toBe(1);
      expect(audio.voices).toBeLessThanOrEqual(24);
      expect(audio.ambientLoops).toBeLessThanOrEqual(2);
    }
    await placeCity(page, HAVEN.spawn);
    const cornerBrightness = () =>
      page.locator("canvas").evaluate((canvas) => {
        const c = canvas as HTMLCanvasElement,
          ctx = c.getContext("2d")!;
        return [
          [16, 16],
          [c.width - 48, 16],
          [16, c.height - 48],
          [c.width - 48, c.height - 48],
        ].map(([x, y]) => {
          const pixels = ctx.getImageData(x, y, 32, 32).data;
          let sum = 0;
          for (let i = 0; i < pixels.length; i += 4)
            sum +=
              pixels[i] * 0.2126 +
              pixels[i + 1] * 0.7152 +
              pixels[i + 2] * 0.0722;
          return sum / 1024;
        });
      });
    const daylight = await cornerBrightness();
    await page.evaluate(() => window.__NOWRIFT_HAVEN__!.setCityTime(0.75));
    await expect(page.locator(".haven-district")).toContainText(
      "Lantern hours",
    );
    // The HUD describes the clock before the throttled canvas paint completes.
    // Wait for the actual pixels, retaining the same threshold at every corner.
    for (let i = 0; i < 4; i++)
      await expect
        .poll(async () => (await cornerBrightness())[i], {
          message: `Night overlay at canvas corner ${i}`,
        })
        .toBeLessThan(daylight[i] * 0.95);
    await placeCity(page, WAYPOINTS.find((w) => w.id === "gate")!.spawn);
    await page.evaluate(() => window.__NOWRIFT_HAVEN__!.setCityTime(0.75));
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_HAVEN__!.city().lighting.night),
      )
      .toBe(true);
    await expect(page.locator(".haven-district")).toContainText(
      "Lantern hours",
    );
    await page.screenshot({
      path: info.outputPath("city-night-mobile.png"),
      animations: "disabled",
    });
  });
  test("large city stays bounded while walking and traveling under desktop and throttled touch rendering", async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await enterCity(page, true);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const measurements = [];
    for (const size of [
      { width: 1440, height: 1000, cpu: 1 },
      { width: 390, height: 844, cpu: 4 },
    ]) {
      await page.setViewportSize(size);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: size.cpu });
      for (const w of WAYPOINTS) await placeCity(page, w.spawn);
      await page.waitForTimeout(1200);
      const sample = await page.evaluate(
        () =>
          new Promise<{ fps: number; p95FrameMs: number }>((resolve) => {
            const gaps: number[] = [],
              start = performance.now();
            let last = start;
            const frame = (now: number) => {
              gaps.push(now - last);
              last = now;
              if (now - start < 4000) requestAnimationFrame(frame);
              else {
                const ordered = [...gaps].sort((a, b) => a - b);
                resolve({
                  fps: gaps.length / ((now - start) / 1000),
                  p95FrameMs: ordered[Math.floor(ordered.length * 0.95)],
                });
              }
            };
            requestAnimationFrame(frame);
          }),
      );
      const city = await page.evaluate(() => window.__NOWRIFT_HAVEN__!.city());
      const metrics = (await cdp.send("Performance.getMetrics")).metrics;
      const heapBytes = metrics.find((m) => m.name === "JSHeapUsedSize")!.value;
      expect(sample.fps).toBeGreaterThan(size.cpu === 4 ? 18 : 30);
      expect(sample.p95FrameMs).toBeLessThan(150);
      expect(heapBytes).toBeLessThan(256 * 1024 * 1024);
      expect(city.textureBytes).toBeLessThan(160 * 1024 * 1024);
      expect(city.visibleSprites).toBeLessThan(city.sprites * 0.75);
      const scale = size.width / city.camera.width;
      const feet =
        (WAYPOINTS.find((w) => w.id === "hearthside")!.spawn.y -
          city.camera.y) *
        scale;
      expect(feet).toBeLessThan(size.height - (size.width < 650 ? 174 : 94));
      measurements.push({
        viewport: size,
        ...sample,
        phaserFps: city.fps,
        heapBytes,
        textureBytes: city.textureBytes,
        sprites: city.sprites,
        visibleSprites: city.visibleSprites,
        motes: city.motes,
      });
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const path = info.outputPath("city-performance.json");
    await writeFile(path, JSON.stringify(measurements, null, 2) + "\n");
    await info.attach("city-performance.json", {
      path,
      contentType: "application/json",
    });
  });
});

test("production Town Map travels, reloads and preserves the character without test instrumentation", async ({
  page,
}) => {
  test.skip(
    !!process.env.NOWRIFT_E2E,
    "Checks the ordinary production bundle.",
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
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
  const before = await citySave(page);
  await page.keyboard.press("m");
  const map = page.getByRole("dialog", { name: "Town map", exact: true });
  await expect(map).toBeVisible();
  await map.locator('[data-waypoint-entry="grove"]').click();
  await map.getByRole("button", { name: /^Fast Travel/ }).click();
  await expect(map).toHaveCount(0);
  await expect(page.getByTestId("town-travel-transition")).toHaveCount(0);
  await expect
    .poll(async () => (await citySave(page)).local.world!.positionEpoch)
    .toBe(1);
  const arrived = await citySave(page);
  expect(arrived.local.world!.position).toEqual(
    waypointLanding(WAYPOINTS.find((w) => w.id === "grove")!),
  );
  expect(arrived.rpg).toEqual(before.rpg);
  expect(arrived.xp).toBe(before.xp);
  await page.reload();
  const legacy = page.getByRole("button", {
    name: "Practice & legacy tools",
    exact: true,
  });
  if (await legacy.isVisible()) await legacy.click();
  await page
    .getByRole("button", { name: "ENTER RIFT HEAVEN →", exact: true })
    .click();
  await expect(page.locator(".haven-loading")).toHaveCount(0);
  expect((await citySave(page)).local.world!.position).toEqual(
    arrived.local.world!.position,
  );
  expect(await page.evaluate(() => window.__NOWRIFT_HAVEN__)).toBeUndefined();
  expect(await page.evaluate(() => window.__NOWRIFT_TEST__)).toBeUndefined();
});
