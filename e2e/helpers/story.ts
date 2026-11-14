import { expect, type Page } from "@playwright/test";
export async function beginStory(page: Page) {
  await page
    .getByRole("button", { name: "Begin mission", exact: true })
    .click();
}
/** Instrumented travel/combat fixture; every objective still uses production triggers and settlement. */
export async function finishStory(page: Page, stopAtBoss = false) {
  for (let step = 0; step < 8; step++) {
    const state = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return { phase: g.phase, mission: g.campaign?.mission?.phase };
    });
    if (
      state.phase === "victory" ||
      (stopAtBoss && state.mission === "BOSS_OR_FINAL_ENCOUNTER")
    )
      return;
    if (state.phase === "paused")
      await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await page.evaluate(async () => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 9999;
      await window.__NOWRIFT_TEST__!.missionStep();
    });
  }
  throw new Error("Story mission did not reach its real objective completion");
}
export async function expectStoryVictory(page: Page) {
  await finishStory(page);
  await expect(
    page.getByRole("heading", { name: "The veil is lifted." }),
  ).toBeVisible();
}
