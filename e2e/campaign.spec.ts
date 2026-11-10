import { test, expect, type Page } from "@playwright/test";
import { STAGES, WORLDS, DIFFICULTIES } from "../src/game/campaign/content";
async function atlas(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE AS GUEST" }).click();
  await page.getByRole("button", { name: "WORLD MAP →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Worlds beyond the veil." }),
  ).toBeVisible();
}
async function seedAll(page: Page) {
  await page.goto("/");
  await page.evaluate(
    async (clears) => {
      await new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("progress");
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readwrite");
          t.objectStore("progress").put(
            {
              version: 1,
              clears,
              receipts: [],
              gold: 0,
              xp: 0,
              materials: {},
              candidates: [],
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
    },
    STAGES.flatMap((s) => Object.keys(DIFFICULTIES).map((d) => `${s.id}:${d}`)),
  );
}
test("atlas discovers locked worlds, explains locks, and supports mobile layout", async ({
  page,
}) => {
  await atlas(page);
  await expect(page.locator(".world-card")).toHaveCount(4);
  await expect(page.locator(".stage-list button")).toHaveCount(5);
  await page.locator(".world-card").nth(1).click();
  await expect(
    page.getByRole("button", { name: "START STAGE →" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("previous world");
  await page.locator(".world-card").first().click();
  await page.getByRole("button", { name: "HARD", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("five NORMAL");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
});
test.describe("campaign simulation bridge", () => {
  test.skip(!process.env.NOWRIFT_E2E, "Requires explicitly instrumented build");
  test("first victory banks rewards and unlocks next stage after reload", async ({
    page,
  }) => {
    await atlas(page);
    await page.getByRole("button", { name: "START STAGE →" }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
      g.time = g.campaign!.definition.clear.seconds - 0.01;
    });
    await expect(
      page.getByRole("heading", { name: "The veil is lifted." }),
    ).toBeVisible();
    await expect(page.locator(".campaign-reward")).toContainText("FIRST CLEAR");
    await page
      .getByRole("button", { name: "RETURN TO MAIN MENU", exact: true })
      .click();
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page.locator(".stage-list button").nth(1).click();
    await expect(
      page.getByRole("button", { name: "START STAGE →" }),
    ).toBeEnabled();
    await page.reload();
    await atlas(page);
    await expect(page.getByTestId("campaign-gold")).toContainText(
      /^[1-9]\d* GOLD/,
    );
  });
  for (const world of WORLDS)
    test(`${world.name}: five playable stages plus hard and nightmare boss`, async ({
      page,
    }, info) => {
      test.setTimeout(100000);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await seedAll(page);
      for (const stage of STAGES.filter((s) => s.worldId === world.id))
        for (const difficulty of (stage.number === 5
          ? ["normal", "hard", "nightmare"]
          : ["normal"]) as ("normal" | "hard" | "nightmare")[]) {
          await atlas(page);
          await page.locator(".world-card").nth(WORLDS.indexOf(world)).click();
          await page
            .getByRole("button", {
              name: difficulty.toUpperCase(),
              exact: true,
            })
            .click();
          await page
            .locator(".stage-list button")
            .nth(stage.number - 1)
            .click();
          await page.getByRole("button", { name: "START STAGE →" }).click();
          await expect(page.locator(".game-state")).toContainText("LIVE RUN");
          expect(
            await page.evaluate(
              () => window.__NOWRIFT_TEST__!.state().campaign!.world.id,
            ),
          ).toBe(world.id);
          await expect(page.locator("canvas")).toHaveCount(1);
          await page.keyboard.down("d");
          await page.waitForTimeout(150);
          await page.keyboard.up("d");
          if (stage.number === 5) {
            await page.evaluate(() => {
              window.__NOWRIFT_TEST__!.scenario("boss");
              const g = window.__NOWRIFT_TEST__!.state();
              g.player.invincible = 999;
              const b = g.enemies.find((e) => e.kind === "boss")!;
              b.x = g.player.x + 180;
              b.y = g.player.y;
              b.attack = 0;
            });
            await expect(
              page.getByLabel(`${world.boss.name} health`),
            ).toBeVisible();
            await page.waitForTimeout(100);
            if (difficulty === "normal")
              await page.screenshot({
                path: info.outputPath(`${world.id}-boss.png`),
              });
            await page.evaluate(() => window.__NOWRIFT_TEST__!.strikeBoss());
          } else
            await page.evaluate(() => {
              const g = window.__NOWRIFT_TEST__!.state();
              g.player.invincible = 999;
              g.time =
                g.campaign!.definition.clear.seconds *
                  g.campaign!.difficulty.duration -
                0.01;
            });
          await expect(
            page.getByRole("heading", { name: "The veil is lifted." }),
          ).toBeVisible();
          await expect(page.locator(".campaign-reward")).toBeVisible();
        }
      expect(errors).toEqual([]);
    });
});
