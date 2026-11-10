import { expect, test } from "@playwright/test";

test("Thai language selection persists and localizes the campaign without changing progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".language-switcher.compact button").nth(1).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(
    page.getByRole("button", { name: /เล่นแบบผู้มาเยือน/ }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("nowrift-locale-v1")))
    .toBe("th");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await page.getByRole("button", { name: /เล่นแบบผู้มาเยือน/ }).click();
  await expect(page.locator(".weapon-card").first()).toContainText(
    "กระสุนมนตรา",
  );
  await page.getByRole("button", { name: "แผนที่โลก →", exact: true }).click();
  await expect(page.locator(".world-card")).toHaveCount(4);
  await expect(page.locator(".world-card").first()).toContainText("ป่ากระซิบ");
  await page.locator(".language-switcher.compact button").first().click();
  await expect(page.locator(".world-card").first()).toContainText(
    "Whispering Forest",
  );
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("nowrift-locale-v1")))
    .toBe("en");
});

test("language changes do not remount Phaser or reset an active run", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
  await page.getByRole("button", { name: "START NEW RUN" }).click();
  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toHaveCount(1);
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  const identity = await canvas.evaluate((element) => {
    (element as HTMLCanvasElement).dataset.i18nIdentity = "persistent";
    return element.dataset.i18nIdentity;
  });
  expect(identity).toBe("persistent");
  await page.locator(".language-switcher.compact button").nth(1).click();
  await expect(page.locator(".game-state")).toContainText("กำลังเล่น");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-i18n-identity", "persistent");
  await page.locator(".language-switcher.compact button").first().click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await expect(canvas).toHaveAttribute("data-i18n-identity", "persistent");
});

test("a new Thai-speaking visitor uses Thai without server hydration errors", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "th-TH" });
  const page = await context.newPage();
  try {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      page.getByRole("button", { name: /เล่นแบบผู้มาเยือน/ }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("Thai locale and installation metadata remain available offline after caching", async ({
  page,
  context,
  request,
}) => {
  const manifest = await (await request.get("/manifest.th.webmanifest")).json();
  expect(manifest.name).toContain("NowRift");
  expect(manifest.description).toContain("ออฟไลน์");
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.locator(".language-switcher.compact button").nth(1).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
  await expect(
    page.getByRole("button", { name: /เล่นแบบผู้มาเยือน/ }),
  ).toBeVisible();
});
