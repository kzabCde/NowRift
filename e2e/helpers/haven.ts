import { expect, type Page } from "@playwright/test";

/** A revealed canvas can still be locked while the tutorial/save closes. */
export async function waitForHavenInput(page: Page) {
  await expect(page.locator(".haven-context")).toBeVisible();
  if (process.env.NOWRIFT_E2E)
    await expect
      .poll(
        () => page.evaluate(() => window.__NOWRIFT_HAVEN__?.state().locked),
        {
          message: "Rift Heaven must accept input after its overlay closes",
        },
      )
      .toBe(false);
}
