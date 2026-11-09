import { expect, test } from "@playwright/test";

test("desktop gameplay: launch, pause, resume, and restart", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /enter the rift/i })).toBeVisible();
  await page.getByRole("button", { name: /enter the rift/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");

  await page.getByRole("button", { name: /pause/i }).click();
  await expect(page.getByRole("heading", { name: /paused/i })).toBeVisible();
  const timePaused = await page.locator(".hud-stats .stat").first().locator(".stat-value").textContent();
  await page.waitForTimeout(300);
  await expect(page.locator(".hud-stats .stat").first().locator(".stat-value")).toHaveText(timePaused || "");

  await page.getByRole("button", { name: /resume run/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await page.getByRole("button", { name: /restart/i }).click();
  await expect(page.locator(".hud-stats .stat").first().locator(".stat-value")).toHaveText("00:00");
});

test("mobile layout stays inside 320px, 390px and landscape viewports", async ({ page }) => {
  for (const size of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(page.locator(".game-card")).toBeVisible();
    const metrics = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(metrics.pageWidth, "horizontal document overflow at " + size.width).toBeLessThanOrEqual(metrics.viewportWidth + 2);

    await page.getByRole("button", { name: /focus/i }).click();
    await expect(page.locator(".site-shell")).toHaveClass(/immersive/);
    await expect(page.locator(".arena")).toBeVisible();
    const focusMetrics = await page.evaluate(() => {
      const rect = document.querySelector(".arena")!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height, viewport: innerHeight };
    });
    expect(focusMetrics.height).toBeGreaterThan(80);
    expect(focusMetrics.bottom).toBeLessThanOrEqual(focusMetrics.viewport + 2);
    await page.getByRole("button", { name: /exit/i }).click();
    await expect(page.locator(".site-shell")).not.toHaveClass(/immersive/);
  }
});

test("mobile touch control resets when the app loses focus", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: /enter the rift/i }).click();
    const canvas = page.locator("canvas.game-canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const x = Math.round(box!.x + box!.width / 2);
    const y = Math.round(box!.y + box!.height / 2);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await expect(canvas).toHaveAttribute("data-touch-active", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 65, y: y + 20 }] });
    await expect(canvas).toHaveAttribute("data-touch-active", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(canvas).toHaveAttribute("data-touch-active", "false");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.getByRole("heading", { name: /paused/i })).toBeVisible();
    await expect(canvas).toHaveAttribute("data-touch-active", "false");
  } finally {
    await context.close();
  }
});

test("PWA install resources are served and first-load app works offline", async ({ page, context, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(100);
  }
  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBe(true);

  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /enter the rift/i })).toBeVisible();
  await page.getByRole("button", { name: /enter the rift/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
});
