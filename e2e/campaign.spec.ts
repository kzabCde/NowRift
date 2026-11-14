import { beginStory, finishStory } from "./helpers/story";
import { test, expect, type Page } from "@playwright/test";
import { STAGES, WORLDS, DIFFICULTIES } from "../src/game/campaign/content";
async function atlas(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Practice & legacy tools" }).click();
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
  await expect(page.locator(".stage-list button")).toHaveCount(10);
  await page.locator(".world-card").nth(1).click();
  await expect(
    page.getByRole("button", { name: "START STAGE →" }),
  ).toBeDisabled();
  await expect(page.locator(".notice")).toContainText("previous world");
  await page.locator(".world-card").first().click();
  await page.getByRole("button", { name: "HARD", exact: true }).click();
  await expect(page.locator(".notice")).toContainText("10 NORMAL");
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
    await beginStory(page);
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await finishStory(page);

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
    test(`${world.name}: ten objective missions plus Hard and Nightmare guardians`, async ({
      page,
    }, info) => {
      test.setTimeout(180000);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await seedAll(page);
      for (const stage of STAGES.filter((s) => s.worldId === world.id))
        for (const difficulty of (stage.number === 5 || stage.number === 10
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
          await beginStory(page);
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
          if (stage.number === 5 || stage.number === 10) {
            await finishStory(page, true);
            const bossName =
              stage.number === 10
                ? {
                    forest: "Heartwood Echo",
                    desert: "Meridian Keeper",
                    frozen: "Witness of Winter",
                    infernal: "The Fractured Heart",
                  }[world.id]
                : world.boss.name;
            await expect(page.getByLabel(`${bossName} health`)).toBeVisible();
            if (stage.number === 10 && difficulty === "normal") {
              for (const [damage, label] of [
                [0.38, "PHASE II"],
                [0.34, "PHASE III"],
              ] as const) {
                await page.evaluate((damage) => {
                  const g = window.__NOWRIFT_TEST__!.state(),
                    boss = g.enemies.find((e) => e.kind === "boss")!;
                  g.bullets.push({
                    x: boss.x,
                    y: boss.y,
                    vx: 0,
                    vy: 0,
                    r: 8,
                    life: 1,
                    damage: boss.maxHp * damage,
                    color: "#fff",
                  });
                }, damage);
                await expect(page.locator(".boss-hud")).toContainText(label);
              }
              await page.evaluate(() => {
                const g = window.__NOWRIFT_TEST__!.state();
                g.bullets = g.bullets.filter((b) => !b.hostile);
                g.enemies.find((e) => e.kind === "boss")!.attack = 0;
              });
              await expect
                .poll(() =>
                  page.evaluate(
                    () =>
                      window
                        .__NOWRIFT_TEST__!.state()
                        .bullets.filter((b) => b.hostile).length,
                  ),
                )
                .toBeGreaterThanOrEqual(4);
            }
            if (difficulty === "normal")
              await page.screenshot({
                path: info.outputPath(`${world.id}-${stage.number}-boss.png`),
              });
          }
          await finishStory(page);
          await expect(
            page.getByRole("heading", { name: "The veil is lifted." }),
          ).toBeVisible();
          await expect(page.locator(".campaign-reward")).toBeVisible();
        }
      expect(errors).toEqual([]);
    });
});
