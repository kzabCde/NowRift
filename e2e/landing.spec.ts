import { test, expect, type Page } from "@playwright/test";

const hero = (page: Page) => page.locator("[data-cinematic-hero]");
const play = (page: Page) =>
  page.getByRole("button", { name: "PLAY NOW", exact: true });

async function ready(page: Page) {
  await page.goto("/");
  await expect(play(page)).toBeVisible();
  await expect
    .poll(() =>
      hero(page).evaluate((element) => {
        const hero = element.getBoundingClientRect();
        return [...element.querySelectorAll("img")]
          .filter((image) => {
            const box = image.getBoundingClientRect();
            return (
              box.width > 0 &&
              box.height > 0 &&
              box.right > hero.left &&
              box.left < hero.right &&
              box.bottom > hero.top &&
              box.top < hero.bottom
            );
          })
          .every((image) => image.complete && image.naturalWidth > 0);
      }),
    )
    .toBe(true);
}

test("keyboard Play keeps the existing character entry flow and exact official logo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator(".gateway-official-logo")).toHaveAttribute(
    "src",
    "/branding/nowrift-logo-transparent.png",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to Play" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(play(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Character name", { exact: true }),
  ).toBeVisible();
  await expect(hero(page)).toHaveCount(0);
  await expect(page.locator(".rift-transition")).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [name, width, height] of [
  ["desktop", 1920, 1080],
  ["laptop", 1366, 768],
  ["tablet", 768, 1024],
  ["small laptop", 1024, 600],
  ["portrait", 390, 844],
  ["small phone", 320, 568],
  ["landscape", 844, 390],
  ["short landscape", 667, 375],
  ["very short landscape", 568, 320],
] as const) {
  test(`${name} keeps the official logo and Play visible without scrolling or overflow`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    const button = await play(page).boundingBox(),
      logo = await page.locator(".gateway-official-logo").boundingBox();
    expect(button).not.toBeNull();
    expect(logo).not.toBeNull();
    for (const box of [button!, logo!]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(60);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
    expect(button!.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(logo!.width / logo!.height - 1)).toBeLessThan(0.01);
    if (height > 600) {
      expect(logo!.y + logo!.height).toBeLessThan(button!.y);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`landing-${name.replaceAll(" ", "-")}.png`),
      animations: "disabled",
    });
  });
}

test("Explore reveals four real features, lazy local art and a working second entry action", async ({
  page,
}) => {
  await ready(page);
  await hero(page)
    .getByRole("link", { name: "EXPLORE THE WORLD", exact: true })
    .first()
    .click();
  const showcase = page.locator("#worlds-beyond");
  await expect(showcase).toBeFocused();
  await expect(showcase.locator("article")).toHaveCount(4);
  for (const article of await showcase.locator("article").all()) {
    await article.scrollIntoViewIfNeeded();
    const image = article.locator("img");
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("src", /^\/assets\/landing\//);
    await expect
      .poll(() =>
        image.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page.getByRole("button", { name: "BEGIN YOUR JOURNEY" }).click();
  await expect(
    page.getByLabel("Character name", { exact: true }),
  ).toBeVisible();
});

test("sound, graphics settings and Thai copy remain live and persistent", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unmute sound", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("nowrift-preferences-v1") || "{}")
            .muted,
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings.getByLabel("Mute all audio")).toBeChecked();
  await settings.getByLabel("Graphics quality").selectOption("low");
  await expect(page.locator("[data-landing]")).toHaveAttribute(
    "data-motion",
    "off",
  );
  await page.keyboard.press("Escape");
  await expect(settings).toHaveCount(0);
  await page.getByRole("button", { name: "TH", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "เล่นเลย", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await page.getByRole("button", { name: "เล่นเลย", exact: true }).click();
  await expect(page.getByLabel("ชื่อตัวละคร", { exact: true })).toBeVisible();
});

test("decorative motion responds to mouse, pauses offscreen and respects OS and game preferences", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page);
  const portal = hero(page).locator('[data-depth="rift"] > div').last();
  await expect(portal).not.toHaveCSS("animation-name", "none");
  await page.mouse.move(1200, 500);
  await expect
    .poll(() =>
      hero(page).evaluate((e) => e.style.getPropertyValue("--pointer-x")),
    )
    .not.toBe("0.00px");
  await page.locator("#worlds-beyond").scrollIntoViewIfNeeded();
  await expect(hero(page)).toHaveAttribute("data-paused", "true");
  await expect(portal).toHaveCSS("animation-play-state", "paused");
  await page.evaluate(() => scrollTo(0, 0));
  await expect(hero(page)).toHaveAttribute("data-paused", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(portal).toHaveCSS("animation-name", "none");
  await page.mouse.move(1000, 300);
  await expect
    .poll(() =>
      hero(page).evaluate((e) => e.style.getPropertyValue("--pointer-x")),
    )
    .toBe("0.00px");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Reduced effects", { exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(portal).toHaveCSS("animation-name", "none");
  await expect(play(page)).toBeEnabled();
});

test("a missing cinematic background falls back to existing world art and keeps Play working", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    await page.route("**/assets/landing/forest.webp", (route) => route.abort());
    await page.goto("/");
    await expect(hero(page).locator('[data-depth="backdrop"]')).toHaveCSS(
      "background-image",
      /\/assets\/forest\/key-art\.png/,
    );
    await play(page).click();
    await expect(
      page.getByLabel("Character name", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("cold mobile framing is stable before hydration and artwork loading", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.defineProperty(window, "__LANDING_CLS__", { value: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        })[]) {
          if (!entry.hadRecentInput) shifts.push(entry.value);
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", { cacheDisabled: true });
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 40,
      downloadThroughput: 500000,
      uploadThroughput: 250000,
    });
    await ready(page);
    await expect(hero(page)).toHaveAttribute("data-paused", "false");
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const shifts = await page.evaluate(
      () =>
        (window as unknown as { __LANDING_CLS__: number[] }).__LANDING_CLS__,
    );
    expect(shifts.reduce((total, value) => total + value, 0)).toBeLessThan(0.1);
    await info.attach("cold-mobile-layout-shifts", {
      body: JSON.stringify(shifts),
      contentType: "application/json",
    });
    await expect(play(page)).toBeEnabled();
  } finally {
    await context.close();
  }
});
