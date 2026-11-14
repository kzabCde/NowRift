import { expect, test, type Page } from "@playwright/test";
import { LANDMARKS } from "../src/game/world/content";
import type { SaveData } from "../src/game/persistence/model";
import { waitForHavenInput } from "./helpers/haven";

async function stored(page: Page): Promise<SaveData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress"),
            s = t.objectStore("progress"),
            root = s.get("player");
          root.onsuccess = () => {
            const p = root.result,
              key = p.slots.find(
                (v: { id: string; key: string }) => v.id === p.activeSlotId,
              ).key,
              q = s.get(key);
            q.onsuccess = () => resolve(q.result);
          };
          t.oncomplete = () => db.close();
          t.onerror = () => reject(t.error);
        };
      }),
  );
}

test.describe("objective-driven Story vertical slice", () => {
  test.skip(!process.env.NOWRIFT_E2E, "Requires explicitly instrumented build");
  test("Forest briefing, physical objectives, real combat and persistent settlement", async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.goto("/");
    await page.getByRole("button", { name: "Practice & legacy tools" }).click();
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page.getByRole("button", { name: "START STAGE →" }).click();
    await page
      .getByRole("button", { name: "Begin mission", exact: true })
      .click();
    await expect(page.getByLabel("Mission objectives")).toContainText(
      "Find Sera",
    );
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.invincible = 999;
    });
    const x = await page.evaluate(
      () => window.__NOWRIFT_TEST__!.state().player.x,
    );
    await page.keyboard.down("d");
    await page.waitForTimeout(250);
    await page.keyboard.up("d");
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.x),
    ).toBeGreaterThan(x);
    // Instrumented positioning accelerates travel; E and combat use the production handlers.
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state(),
        o = g.campaign!.mission!.objects.find((o) => o.id === "forest-1-sera")!;
      Object.assign(g.player, { x: o.x, y: o.y });
    });
    await page.keyboard.press("e");
    await expect(
      page.getByText("Sera: The moss used to glow", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByLabel("Mission objectives")).toContainText(
      "Investigate",
    );
    const runId = await page.evaluate(
      () => window.__NOWRIFT_TEST__!.state().id,
    );
    await page.keyboard.press("q");
    await expect(
      page.getByRole("dialog", { name: "Quest Journal", exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-quest-id="main-forest-1"]')).toContainText(
      "1/1",
    );
    await page
      .getByRole("button", { name: "Close journal", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    expect(await page.evaluate(() => window.__NOWRIFT_TEST__!.state().id)).toBe(
      runId,
    );
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state(),
        o = g.campaign!.mission!.objects.find((o) => o.id === "forest-1-oak")!;
      Object.assign(g.player, { x: o.x, y: o.y });
    });
    await expect(page.getByLabel("Mission objectives")).toContainText(
      "Clear four",
    );
    await page.screenshot({
      path: info.outputPath("forest-mission-desktop.png"),
    });
    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            const g = window.__NOWRIFT_TEST__!.state();
            for (const e of g.enemies)
              if (e.kind === "slime")
                g.bullets.push({
                  x: e.x,
                  y: e.y,
                  vx: 0,
                  vy: 0,
                  r: 8,
                  life: 1,
                  damage: e.hp + 1,
                  color: "#fff",
                });
            return g.campaign!.mission!.step;
          });
        },
        { timeout: 25000 },
      )
      .toBe(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: info.outputPath("forest-mission-mobile.png"),
    });
    for (const id of [
      "forest-1-wood-west",
      "forest-1-wood-south",
      "forest-1-wood-east",
    ]) {
      await page.evaluate((id) => {
        const g = window.__NOWRIFT_TEST__!.state(),
          o = g.campaign!.mission!.objects.find((o) => o.id === id)!;
        Object.assign(g.player, { x: o.x, y: o.y });
      }, id);
      await page.getByRole("button", { name: /Collect/ }).click();
    }
    await expect(
      page.getByRole("heading", { name: "The veil is lifted." }),
    ).toBeVisible();
    await expect(page.locator(".campaign-reward")).toContainText("FIRST CLEAR");
    const saved = await page.evaluate(
      async () =>
        new Promise<{ clears: string[]; status: string; xp: number }>(
          (resolve) => {
            const r = indexedDB.open("nowrift-campaign", 1);
            r.onsuccess = () => {
              const db = r.result,
                q = db
                  .transaction("progress")
                  .objectStore("progress")
                  .get("profile");
              q.onsuccess = () => {
                const p = q.result;
                resolve({
                  clears: p.clears,
                  status: p.local.journal.quests["main-forest-1"].status,
                  xp: p.xp,
                });
                db.close();
              };
            };
          },
        ),
    );
    expect(saved.clears).toContain("forest-1:normal");
    expect(saved.status).toBe("READY_TO_CLAIM");
    expect(saved.xp).toBeGreaterThan(0);
    await page.reload();
    await page.getByRole("button", { name: "Practice & legacy tools" }).click();
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page.locator(".stage-list button").nth(1).click();
    await expect(
      page.getByRole("button", { name: "START STAGE →" }),
    ).toBeEnabled();
    await expect(page.getByTestId("campaign-gold")).not.toContainText(
      /^0 GOLD/,
    );
  });
  test("Haven giver indicators, real delivery, journal tracking and bilingual mobile layout", async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Practice & legacy tools" }).click();
    const initial = await stored(page);
    // A legacy character with a completed first stage and owned cores; migration must preserve both.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const r = indexedDB.open("nowrift-campaign", 1);
          r.onsuccess = () => {
            const db = r.result,
              t = db.transaction("progress", "readwrite"),
              s = t.objectStore("progress"),
              get = s.get("profile");
            get.onsuccess = () => {
              const p = get.result;
              p.clears = ["forest-1:normal"];
              p.materials["slime-core"] = 3;
              p.local.world.tutorial = false;
              delete p.local.journal;
              s.put(p, "profile");
            };
            t.oncomplete = () => {
              db.close();
              resolve();
            };
            t.onerror = () => reject(t.error);
          };
        }),
    );
    await page.reload();
    await page.getByRole("button", { name: "Practice & legacy tools" }).click();
    await page
      .getByRole("button", { name: "ENTER RIFT HEAVEN →", exact: true })
      .click();
    await expect(page.locator(".rift-transition")).toHaveCount(0);
    await waitForHavenInput(page);
    const workshop = LANDMARKS.find((l) => l.id === "workshop")!;
    await page.evaluate(
      (p) => window.__NOWRIFT_HAVEN__!.place(p),
      workshop.entrance,
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window
              .__NOWRIFT_HAVEN__!.city()
              .questMarkers.find((m) => m.id === "workshop")?.texture,
        ),
      )
      .toBe("quest-marker-available");
    await page.locator(".haven-interact").click();
    const card = page.locator('[data-quest-id="side-forest-5"]');
    await card
      .getByRole("button", { name: "Accept quest", exact: true })
      .click();
    await card.getByRole("button", { name: /Deliver items/ }).click();
    await expect(card).toContainText("Reward ready");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window
              .__NOWRIFT_HAVEN__!.city()
              .questMarkers.find((m) => m.id === "workshop")?.texture,
        ),
      )
      .toBe("quest-marker-ready");
    await card
      .getByRole("button", { name: "Claim reward", exact: true })
      .click();
    const paid = await stored(page);
    expect(paid.materials["slime-core"]).toBe(0);
    expect(paid.gold).toBeGreaterThan(initial.gold);
    expect(paid.xp).toBeGreaterThan(initial.xp);
    expect(paid.rpg!.equipped).toEqual(initial.rpg!.equipped);
    await page.keyboard.press("Escape");
    await waitForHavenInput(page);
    await page.keyboard.press("q");
    await page.getByRole("button", { name: "Completed", exact: true }).click();
    await expect(page.locator('[data-quest-id="side-forest-5"]')).toContainText(
      "Completed",
    );
    await page
      .getByRole("button", { name: "Side Quests", exact: true })
      .click();
    await page.screenshot({
      path: info.outputPath("quest-journal-desktop.png"),
    });
    await page.keyboard.press("Escape");
    await waitForHavenInput(page);
    const board = LANDMARKS.find((l) => l.id === "board")!;
    await page.evaluate(
      (p) => window.__NOWRIFT_HAVEN__!.place(p),
      board.entrance,
    );
    await page.locator(".haven-interact").click();
    const survey = page.locator('[data-quest-id="side-forest-2"]');
    await survey
      .getByRole("button", { name: "Accept quest", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await waitForHavenInput(page);
    await page.keyboard.press("q");
    await page
      .getByRole("button", { name: "Side Quests", exact: true })
      .click();
    await page
      .locator('[data-quest-id="side-forest-2"]')
      .getByRole("button", { name: "Stop tracking", exact: true })
      .click();
    await page
      .locator('[data-quest-id="side-forest-2"]')
      .getByRole("button", { name: "Track quest", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await waitForHavenInput(page);
    await expect(page.locator(".quest-tracker")).toContainText(
      "The Ninefold Promise",
    );
    await page
      .locator(".haven-toolbar .language-switcher button")
      .nth(1)
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "บันทึกภารกิจ", exact: true })
      .click();
    await page
      .getByRole("button", { name: "ภารกิจเสริม", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "บันทึกภารกิจ", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("quest-journal-thai-mobile.png"),
    });
  });
  test("Free Mode only offers accessible areas and cannot open locked difficulties", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Practice & legacy tools" }).click();
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Free Mode · Supply Expeditions",
        exact: true,
      })
      .click();
    await page.locator(".world-card").nth(3).click();
    await expect(
      page.getByRole("button", { name: "BEGIN SUPPLY EXPEDITION →" }),
    ).toBeDisabled();
    await page.locator(".world-card").first().click();
    await page.getByRole("button", { name: "HARD", exact: true }).click();
    await expect(
      page.locator(".notice").filter({ hasText: "10 NORMAL" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "BEGIN SUPPLY EXPEDITION →" }),
    ).toBeDisabled();
  });
});
