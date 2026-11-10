import { test, expect, type Page } from "@playwright/test";
async function hub(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
}
async function run(page: Page) {
  await page.getByRole("button", { name: "START NEW RUN" }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
}
test("new sanctuary screens fit portrait, tablet and landscape; motion preference works", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await hub(page);
  for (const size of [
    { width: 320, height: 700 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.getByRole("button", { name: /^Wanderer/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Choose a wanderer" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Dusk Strider", exact: true })
      .click();
    await page.getByRole("button", { name: "CONFIRM WANDERER" }).click();
    await page.getByRole("button", { name: /Inventory & equipment/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Inventory & equipment" }),
    ).toContainText("Your relic pouch is empty");
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    expect(
      await page.getByLabel("Reduced effects", { exact: true }).isChecked(),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`settings-${size.width}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "DONE", exact: true }).click();
  }
});
test.describe("real audio and game integration", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires an explicitly instrumented test build",
  );
  test("audio unlocks on interaction, produces a signal, obeys mute and persists every bus", async ({
    page,
  }) => {
    await page.goto("/");
    // Audio instrumentation registers during client hydration, which can follow the load event.
    await expect.poll(
      () => page.evaluate(() => typeof window.__NOWRIFT_AUDIO__),
    ).toBe("object");
    expect(
      await page.evaluate(
        () => window.__NOWRIFT_AUDIO__!.diagnostics().contexts,
      ),
    ).toBe(0);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().context),
      )
      .toBe("running");
    await page.getByRole("button", { name: "TEST SOUND" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().signalRms),
      )
      .toBeGreaterThan(0.00001);
    for (const label of [
      "Master volume",
      "Music volume",
      "Sound effect volume",
      "Ambient volume",
    ]) {
      await page.getByLabel(label, { exact: true }).focus();
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowRight");
      await expect(page.getByLabel(label, { exact: true })).toHaveValue("0.01");
    }
    await page.getByLabel("Mute all audio", { exact: true }).check();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().masterGain),
      )
      .toBeLessThan(0.0001);
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().signalRms),
      )
      .toBeLessThan(0.00001);
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(
      page.getByLabel("Mute all audio", { exact: true }),
    ).toBeChecked();
    for (const label of [
      "Master volume",
      "Music volume",
      "Sound effect volume",
      "Ambient volume",
    ])
      await expect(page.getByLabel(label, { exact: true })).toHaveValue("0.01");
  });
  test("one audio context and scheduler survive navigation, pause and tab interruption", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await hub(page);
    for (let i = 0; i < 3; i++) {
      await run(page);
      const d = await page.evaluate(() =>
        window.__NOWRIFT_AUDIO__!.diagnostics(),
      );
      expect(d.contexts).toBe(1);
      expect(d.mounts).toBe(1);
      expect(d.schedulers).toBe(1);
      await page.getByRole("button", { name: "PAUSE", exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().paused),
        )
        .toBe(true);
      await page.keyboard.press("Escape");
      await expect(page.locator(".game-state")).toContainText("LIVE RUN");
      await page
        .getByRole("button", { name: "← MAIN MENU", exact: true })
        .click();
      await page.getByRole("button", { name: "EXIT TO HUB →" }).click();
    }
    await run(page);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().context),
      )
      .toBe("suspended");
    const hidden = await page.evaluate(() =>
      window.__NOWRIFT_AUDIO__!.diagnostics(),
    );
    expect(hidden.schedulers).toBe(0);
    expect(hidden.voices).toBe(0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByRole("button", { name: "RESUME RUN" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics().context),
      )
      .toBe("running");
    expect(errors).toEqual([]);
  });
  test("collision floods respect voice limits, prioritize damage alerts and clean up sources", async ({
    page,
  }) => {
    await hub(page);
    const result = await page.evaluate(() => {
      const a = window.__NOWRIFT_AUDIO__!;
      let accepted = 0;
      for (let i = 0; i < 500; i++) if (a.play("enemyHit")) accepted++;
      const important = a.play("damage");
      return { floodAccepted: accepted, important, ...a.diagnostics() };
    });
    expect(result.floodAccepted).toBeLessThanOrEqual(1);
    expect(result.important).toBe(true);
    expect(result.voices).toBeLessThanOrEqual(24);
    expect(result.dropped).toBeGreaterThan(400);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Music volume", { exact: true }).focus();
    await page.keyboard.press("Home");
    await page.getByLabel("Ambient volume", { exact: true }).focus();
    await page.keyboard.press("Home");
    await page.waitForTimeout(2400);
    expect(
      (await page.evaluate(() => window.__NOWRIFT_AUDIO__!.diagnostics()))
        .voices,
    ).toBeLessThanOrEqual(10);
  });
  test("earned relics equip, enhance atomically, persist, and change real character stats", async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("progress");
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readwrite");
          t.objectStore("progress").put(
            {
              version: 1,
              clears: [],
              receipts: [],
              gold: 240,
              xp: 0,
              materials: { wood: 12 },
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
    });
    await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
    await page.getByRole("button", { name: /^Wanderer/ }).click();
    await page
      .getByRole("button", { name: "Ash Sentinel", exact: true })
      .click();
    await page.getByRole("button", { name: "CONFIRM WANDERER" }).click();
    await page.getByRole("button", { name: /Inventory & equipment/ }).click();
    await page.getByRole("button", { name: "EQUIP", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "UNEQUIP", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "ENHANCE · 120G", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Relic enhanced");
    await expect(page.locator(".inventory-wallet")).toContainText(
      "120 CAMPAIGN GOLD",
    );
    await page.screenshot({
      path: info.outputPath("equipment.png"),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await run(page);
    const stats = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return { hp: g.player.maxHp, speed: g.player.speed, regen: g.regen };
    });
    expect(stats).toEqual({ hp: 130, speed: 162, regen: 0.5 });
    await page.reload();
    await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
    await run(page);
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().regen),
    ).toBe(0.5);
  });
  test("low effects retain boss warnings, effects stay bounded, and keyboard focus stays in upgrade", async ({
    page,
  }, info) => {
    await hub(page);
    await run(page);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("boss"));
    await expect
      .poll(() =>
        page.evaluate(
          () => window.__NOWRIFT_AUDIO__!.diagnostics().events.bossIntro ?? 0,
        ),
      )
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByLabel("Reduced effects", { exact: true }).check();
    await page
      .getByLabel("Graphics quality", { exact: true })
      .selectOption("low");
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      const b = g.enemies.find((e) => e.kind === "boss")!;
      b.x = g.player.x + 180;
      b.y = g.player.y;
      b.attack = 0;
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_TEST__!.state().hazards.length),
      )
      .toBeGreaterThan(0);
    await expect(page.getByLabel("Forest Guardian health")).toBeVisible();
    await page.screenshot({
      path: info.outputPath("low-effects-telegraph.png"),
      animations: "disabled",
    });
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.effects!()),
    ).toBeLessThanOrEqual(96);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("upgrade"));
    const dialog = page.getByRole("dialog", { name: "Choose an upgrade" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  });
  test("low graphics caps rendering while simulation keeps real time under 4x CPU throttle", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await hub(page);
    await run(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByLabel("Graphics quality", { exact: true })
      .selectOption("low");
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      window.__NOWRIFT_TEST__!.state().weapon.damage = 0;
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const before = await page.evaluate(() => ({
      now: performance.now(),
      time: window.__NOWRIFT_TEST__!.state().time,
      ...window.__NOWRIFT_TEST__!.metrics!(),
    }));
    await page.waitForTimeout(4500);
    const after = await page.evaluate(() => ({
      now: performance.now(),
      time: window.__NOWRIFT_TEST__!.state().time,
      ...window.__NOWRIFT_TEST__!.metrics!(),
    }));
    const seconds = (after.now - before.now) / 1000;
    const measurement = {
      renderFps: (after.frames - before.frames) / seconds,
      simulatedSeconds: after.time - before.time,
      wallSeconds: seconds,
      ...after,
    };
    expect(after.fpsLimit).toBe(30);
    expect(measurement.renderFps).toBeLessThan(33);
    expect(Math.abs(measurement.simulatedSeconds - seconds)).toBeLessThan(0.6);
    expect(after.effects).toBeLessThanOrEqual(32);
    expect(after.feedback).toBeLessThanOrEqual(128);
    expect(after.textObjects).toBeLessThanOrEqual(60);
    await info.attach("low-quality-performance.json", {
      body: JSON.stringify(measurement, null, 2),
      contentType: "application/json",
    });
    console.log("Low quality, 4x CPU:", measurement);
  });
});
