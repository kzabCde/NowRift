import { expect, test, type Page } from "@playwright/test";
async function enterHub(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
  await expect(
    page.getByRole("heading", { name: "The forest is calling." }),
  ).toBeVisible();
}
async function start(page: Page) {
  await enterHub(page);
  await page.getByRole("button", { name: "START NEW RUN" }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await expect(page.locator("canvas.game-canvas")).toHaveCount(1);
}
test("guest hub, working manual and all four weapon choices", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("nowrift-phase1-best-kills", "42"),
  );
  await enterHub(page);
  await expect(page.locator(".nr-record")).toContainText("042");
  await page.getByRole("button", { name: /Field manual/ }).click();
  await expect(
    page.getByRole("dialog", { name: "How to survive" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "UNDERSTOOD" }).click();
  for (const name of [
    "Twin Daggers",
    "Fire Orb",
    "Frost Pulse",
    "Arcane Bolt",
  ]) {
    const card = page.getByRole("button", { name: new RegExp(name) });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
  }
  await page.screenshot({
    path: info.outputPath("desktop-hub.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Run records/ }).click();
  await expect(page.getByRole("dialog", { name: "Run records" })).toContainText(
    "Your story is unwritten.",
  );
  expect(errors).toEqual([]);
});
test("gameplay, pause, settings, resume, restart, and confirmed exit", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await start(page);
  if (!process.env.NOWRIFT_E2E)
    expect(await page.evaluate(() => window.__NOWRIFT_TEST__)).toBeUndefined();
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: info.outputPath("desktop-gameplay.png") });
  await page.getByRole("button", { name: "PAUSE", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  const t = await page.locator(".stat-value").first().textContent();
  await page.waitForTimeout(350);
  await expect(page.locator(".stat-value").first()).toHaveText(t!);
  await page.getByRole("button", { name: "RESUME RUN" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Reduced effects").check();
  await page.getByLabel("Camera scale").selectOption("0.85");
  await page.getByLabel("Camera scale").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Camera scale")).toHaveValue("1");
  await page.getByRole("button", { name: "DONE" }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await page.getByRole("button", { name: "RESTART", exact: true }).click();
  await expect(page.locator(".stat-value").first()).toHaveText("00:00");
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "← MAIN MENU", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Return to hub" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "CONTINUE RUN" }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await page.getByRole("button", { name: "← MAIN MENU", exact: true }).click();
  await page.getByRole("button", { name: "EXIT TO HUB →" }).click();
  await expect(
    page.getByRole("heading", { name: "The forest is calling." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("small mobile and landscape focus mode preserve the run without overflow", async ({
  page,
}, info) => {
  await start(page);
  for (const size of [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.getByRole("button", { name: "Enter focus mode" }).click();
    const rect = await page.locator(".arena").boundingBox();
    expect(rect!.height).toBeGreaterThan(80);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(size.height + 2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`focus-${size.width}.png`) });
    await page.getByRole("button", { name: "Exit focus mode" }).click();
  }
});
test("touch drag, cancellation, and blur interruption", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await start(page);
    const beforeX = await page.evaluate(
      () => window.__NOWRIFT_TEST__?.state().player.x ?? null,
    );
    const canvas = page.locator("canvas.game-canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!,
      x = Math.round(box.x + box.width / 2),
      y = Math.round(box.y + box.height / 2);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await expect(canvas).toHaveAttribute("data-touch-active", "true");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 65, y: y + 20 }],
    });
    await page.waitForTimeout(500);
    if (beforeX !== null)
      expect(
        await page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.x),
      ).toBeGreaterThan(beforeX + 20);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(canvas).toHaveAttribute("data-touch-active", "false");
    await page.screenshot({ path: info.outputPath("mobile-gameplay.png") });
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  } finally {
    await context.close();
  }
});
test("settings persist and corrupted preferences preserve playable defaults", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Reduced effects").check();
  await page.getByLabel("Camera scale").selectOption("1.15");
  await page.getByRole("button", { name: "DONE" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Reduced effects")).toBeChecked();
  await expect(page.getByLabel("Camera scale")).toHaveValue("1.15");
  await page.evaluate(() =>
    localStorage.setItem("nowrift-preferences-v1", "{broken"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "defaults are in use" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "DONE" }).click();
  await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
  await page.getByRole("button", { name: "START NEW RUN" }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
});
test("PWA assets and game chunks launch offline after initial online load", async ({
  page,
  context,
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  // Wait for the actual async gameplay bundle and all original art to reach CacheStorage.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const keys = await caches.keys();
          const urls = (
            await Promise.all(
              keys.map(async (k) =>
                (await (await caches.open(k)).keys()).map((r) => r.url),
              ),
            )
          ).flat();
          return {
            art: urls.filter((u) => u.includes("/assets/forest/")).length,
            chunks: urls.filter(
              (u) => u.includes("/_next/static/") && u.endsWith(".js"),
            ).length,
          };
        }),
      { timeout: 20000 },
    )
    .toMatchObject({ art: 14 });
  await page.waitForTimeout(1000);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
  await page.getByRole("button", { name: "START NEW RUN" }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await expect(page.locator("canvas")).toHaveCount(1);
});
test("missing player art falls back without blocking playable combat", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/assets/forest/player.png", (route) => route.abort());
    await start(page);
    await expect(
      page.getByRole("alert").filter({ hasText: "Missing art: player" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test.describe("instrumented gameplay (NEXT_PUBLIC_E2E=1 build only)", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Enable explicit test fixtures with NEXT_PUBLIC_E2E=1 when building and NOWRIFT_E2E=1 when testing.",
  );
  test("keyboard actually moves the player, camera follows, and upgrade modifies real combat", async ({
    page,
  }) => {
    await start(page);
    const before = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return { x: g.player.x, y: g.player.y, damage: g.weapon.damage };
    });
    await page.keyboard.down("d");
    await page.waitForTimeout(500);
    await page.keyboard.up("d");
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.x),
    ).toBeGreaterThan(before.x + 30);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("upgrade"));
    await expect(
      page.getByRole("dialog", { name: "Choose an upgrade" }),
    ).toBeVisible();
    const old = await page.evaluate(() =>
      JSON.stringify(window.__NOWRIFT_TEST__!.state().stacks),
    );
    await page.locator(".upgrade-card").first().click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    expect(
      await page.evaluate(() =>
        JSON.stringify(window.__NOWRIFT_TEST__!.state().stacks),
      ),
    ).not.toBe(old);
  });
  test("Guardian telegraphs, phase two, real projectile victory, saved record and retry", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await start(page);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("boss"));
    await expect(page.getByLabel("Forest Guardian health")).toBeVisible();
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      const b = g.enemies.find((e) => e.kind === "boss")!;
      b.x = g.player.x + 200;
      b.y = g.player.y;
      b.attack = 0;
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_TEST__!.state().hazards.length),
      )
      .toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath("guardian-telegraph.png") });
    await page.evaluate(() => {
      const b = window
        .__NOWRIFT_TEST__!.state()
        .enemies.find((e) => e.kind === "boss")!;
      b.hp = b.maxHp / 2;
      b.attack = 0;
    });
    await expect(page.getByLabel("Forest Guardian health")).toContainText(
      "ENRAGED",
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_TEST__!.state().hazards.length),
      )
      .toBeGreaterThanOrEqual(3);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.strikeBoss());
    await expect(
      page.getByRole("heading", { name: "The veil is lifted." }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Run record saved");
    await page.screenshot({ path: info.outputPath("victory.png") });
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "TRY AGAIN" }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("defeat"));
    await expect(
      page.getByRole("heading", { name: "Your light fades." }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Run record saved");
    await page
      .getByRole("button", { name: "RETURN TO MAIN MENU", exact: true })
      .click();
    await page.getByRole("button", { name: /Run records/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Run records" }),
    ).toContainText("Guardian defeated");
    await expect(
      page.getByRole("dialog", { name: "Run records" }),
    ).toContainText("Wanderer fallen");
    expect(errors).toEqual([]);
  });
  test("unavailable save storage reports failure while retry remains playable", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(window, "indexedDB", {
        get() {
          throw new DOMException("Storage unavailable", "SecurityError");
        },
      }),
    );
    await start(page);
    await page.evaluate(() => window.__NOWRIFT_TEST__!.scenario("defeat"));
    await expect(page.getByRole("status")).toContainText("could not be saved");
    await page.getByRole("button", { name: "TRY AGAIN" }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  });
  test("150-enemy rendered stress measurement", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await start(page);
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      window.__NOWRIFT_TEST__!.state().weapon.damage = 0;
    });
    const measurement = await page.evaluate(async () => {
      const samples: number[] = [];
      let previous = performance.now();
      const start = previous;
      await new Promise<void>((resolve) => {
        function frame(now: number) {
          samples.push(now - previous);
          previous = now;
          if (now - start < 8000) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      samples.sort((a, b) => a - b);
      return {
        frames: samples.length,
        fps: samples.length / ((previous - start) / 1000),
        p95FrameMs: samples[Math.floor(samples.length * 0.95)],
        enemies: window.__NOWRIFT_TEST__!.state().enemies.length,
        userAgent: navigator.userAgent,
      };
    });
    expect(measurement.enemies).toBeGreaterThanOrEqual(150);
    await info.attach("rendered-performance.json", {
      body: JSON.stringify(measurement, null, 2),
      contentType: "application/json",
    });
    console.log("Rendered stress:", measurement);
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  });
  test("150-enemy mobile viewport with 4x CPU throttling", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await start(page);
    await page.evaluate(() => {
      window.__NOWRIFT_TEST__!.scenario("stress");
      window.__NOWRIFT_TEST__!.state().weapon.damage = 0;
    });
    const measurement = await page.evaluate(async () => {
      const samples: number[] = [];
      let previous = performance.now();
      const start = previous;
      await new Promise<void>((resolve) => {
        function frame(now: number) {
          samples.push(now - previous);
          previous = now;
          if (now - start < 8000) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      samples.sort((a, b) => a - b);
      return {
        frames: samples.length,
        fps: samples.length / ((previous - start) / 1000),
        p95FrameMs: samples[Math.floor(samples.length * 0.95)],
        enemies: window.__NOWRIFT_TEST__!.state().enemies.length,
        userAgent: navigator.userAgent,
      };
    });
    expect(measurement.enemies).toBeGreaterThanOrEqual(150);
    await info.attach("rendered-performance.json", {
      body: JSON.stringify(measurement, null, 2),
      contentType: "application/json",
    });
    console.log("Mobile viewport, 4x CPU stress:", measurement);
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  });
});
