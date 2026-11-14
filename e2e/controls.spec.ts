import { test, expect } from "@playwright/test";

test("holding Escape after cancelling key capture cannot close its owning Settings dialog", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByText("Custom key bindings", { exact: true }).click();
  await settings
    .getByRole("button", { name: "Rebind Interact", exact: true })
    .click();
  await expect(
    settings.getByText("Press a key for Interact", { exact: true }),
  ).toBeVisible();
  await page.keyboard.down("Escape");
  await expect(
    settings.getByText("Press a key for Interact", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.down("Escape"); // A repeated physical keydown, not a second press.
  await expect(settings).toBeVisible();
  await page.keyboard.up("Escape");
  await page.keyboard.press("Escape");
  await expect(settings).toHaveCount(0);
});

test("a wide touch-only screen does not imply a keyboard; an actual physical key enables rebinding", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).tap();
    const settings = page.getByRole("dialog", {
      name: "Settings",
      exact: true,
    });
    await expect(
      settings.getByText("Custom key bindings", { exact: true }),
    ).toHaveCount(0);
    await expect(
      settings.getByText(
        "Connect a keyboard or press a physical key to customize desktop controls. Touch controls stay available.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.keyboard.press("w");
    await expect(
      settings.getByText("Custom key bindings", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
