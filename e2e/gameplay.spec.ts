import { expect, test } from "@playwright/test";

async function enterGuestHub(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /continue as guest/i })).toBeVisible();
  await page.getByRole("button", { name: /continue as guest/i }).click();
  await expect(page.getByRole("heading", { name: /the hub/i })).toBeVisible();
}

async function startGuestRun(page: import("@playwright/test").Page) {
  await enterGuestHub(page);
  await page.getByRole("button", { name: /start new run/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
}

test("guest-only gateway shows no working sign-in or registration option", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /continue as guest/i })).toBeVisible();
  await expect(page.locator(".nr-locked-accounts")).toContainText("SIGN IN");
  await expect(page.locator(".nr-locked-accounts")).toContainText("CREATE ACCOUNT");
  await expect(page.getByRole("button", { name: /sign in|create account/i })).toHaveCount(0);
  await page.getByRole("button", { name: /continue as guest/i }).click();
  await expect(page.getByRole("button", { name: /start new run/i })).toBeVisible();
  await expect(page.locator(".nr-locked-module")).toHaveCount(3);
  await page.getByRole("button", { name: /change mode/i }).click();
  await expect(page.getByRole("button", { name: /continue as guest/i })).toBeVisible();
});

test("guest hub displays device-local best score, controls and playable run", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nowrift-phase1-best-kills", "42"));
  await enterGuestHub(page);
  await expect(page.locator(".nr-record")).toContainText("042");
  await page.getByRole("button", { name: /view controls/i }).click();
  await expect(page.getByRole("dialog", { name: /how to survive/i })).toBeVisible();
  await page.getByRole("button", { name: /close controls/i }).click();
  await page.getByRole("button", { name: /start new run/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
});

test("gameplay pause, resume, restart and confirm exit to main hub", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await startGuestRun(page);

  await page.getByRole("button", { name: /pause/i }).click();
  await expect(page.getByRole("heading", { name: /paused/i })).toBeVisible();
  const timePaused = await page.locator(".hud-stats .stat").first().locator(".stat-value").textContent();
  await page.waitForTimeout(280);
  await expect(page.locator(".hud-stats .stat").first().locator(".stat-value")).toHaveText(timePaused || "");
  await page.getByRole("button", { name: /resume run/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");

  await page.getByRole("button", { name: /restart/i }).click();
  await expect(page.locator(".hud-stats .stat").first().locator(".stat-value")).toHaveText("00:00");
  await page.getByRole("button", { name: /main menu/i }).click();
  await expect(page.getByRole("dialog", { name: /return to hub/i })).toBeVisible();
  await page.getByRole("button", { name: /continue run/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await page.getByRole("button", { name: /main menu/i }).click();
  await page.getByRole("button", { name: /exit to hub/i }).click();
  await expect(page.getByRole("heading", { name: /the hub/i })).toBeVisible();
});

test("guest gateway, lobby and game fit small mobile and landscape screens", async ({ page }) => {
  for (const size of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await enterGuestHub(page);
    const checkOverflow = async (stage: string) => {
      const metrics = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(metrics.doc, "document overflow at " + size.width + " / " + stage).toBeLessThanOrEqual(metrics.viewport + 2);
    };
    await checkOverflow("hub");

    await page.getByRole("button", { name: /start new run/i }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.getByRole("button", { name: /focus mode/i }).click();
    await expect(page.locator(".site-shell")).toHaveClass(/immersive/);
    const rect = await page.locator(".arena").boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.height).toBeGreaterThan(80);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(size.height + 3);
    await page.getByRole("button", { name: /exit focus mode/i }).click();
    await page.getByRole("button", { name: /main menu/i }).click();
    await page.getByRole("button", { name: /exit to hub/i }).click();
    await checkOverflow("return to hub");
  }
});

test("touch control resets on loss of focus", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await startGuestRun(page);
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
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(canvas).toHaveAttribute("data-touch-active", "false");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.getByRole("heading", { name: /paused/i })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("PWA install assets and guest entry work after first offline cache", async ({ page, context, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
  }
  expect((await request.get("/sw.js")).ok()).toBe(true);

  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /continue as guest/i })).toBeVisible();
  await page.getByRole("button", { name: /continue as guest/i }).click();
  await page.getByRole("button", { name: /start new run/i }).click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
});
