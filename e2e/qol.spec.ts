import { expect, test, type Page } from "@playwright/test";
import { enterCity, citySave } from "./helpers/city";
import { createJournal, acceptQuest } from "../src/game/quests/engine";
import { QUEST_CATALOG } from "../src/game/quests/catalog";
import type { PlayerProfile, SaveData } from "../src/game/persistence/model";

async function trackQuest(page: Page) {
  const save = await citySave(page),
    journal = createJournal(QUEST_CATALOG);
  const quest = QUEST_CATALOG.find(
    (q) => q.category === "main" && journal.quests[q.id].status === "AVAILABLE",
  )!;
  acceptQuest(journal, quest, Date.now());
  save.local.journal = journal;
  await page.evaluate(
    (value: SaveData) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("nowrift-campaign", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("progress", "readwrite"),
            store = tx.objectStore("progress"),
            root = store.get("player");
          root.onsuccess = () => {
            const p = root.result as PlayerProfile;
            store.put(value, p.slots.find((s) => s.id === p.activeSlotId)!.key);
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
    save,
  );
  await page.reload();
  await enterCity(page);
}

test.skip(
  !process.env.NOWRIFT_E2E,
  "Uses isolated city fixtures in the explicit instrumented build.",
);

test("Town Map keeps its real Fast Travel action visible after selecting a service or the current region", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterCity(page, true);
  await page.keyboard.press("m");
  const map = page.getByRole("dialog", { name: "Town map", exact: true });
  await map.locator('[data-map-marker="mara"]').focus();
  await page.keyboard.press("Enter");
  await expect(map.locator('[data-map-marker="mara"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({
    path: info.outputPath("map-selected-service.png"),
    animations: "disabled",
  });
  await expect(
    map.getByRole("button", { name: /^Fast Travel/ }),
  ).toBeInViewport();
  await map
    .getByRole("button", { name: "Thailand world map", exact: true })
    .click();
  await expect(map.locator('[data-region-travel="central"]')).toBeInViewport();
});

test("tracked quest and minimap occupy separate responsive HUD zones", async ({
  page,
}, info) => {
  await enterCity(page, true);
  await trackQuest(page);
  for (const size of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    const minimap = page.getByRole("complementary", {
        name: "Regional minimap",
        exact: true,
      }),
      tracker = page.locator(".quest-tracker");
    await expect(minimap).toBeVisible();
    await expect(tracker).toBeVisible();
    const a = await minimap.boundingBox(),
      b = await tracker.boundingBox();
    await page.screenshot({
      path: info.outputPath(`hud-${size.width}x${size.height}.png`),
      animations: "disabled",
    });
    expect(
      Math.max(
        0,
        Math.min(a!.x + a!.width, b!.x + b!.width) - Math.max(a!.x, b!.x),
      ) *
        Math.max(
          0,
          Math.min(a!.y + a!.height, b!.y + b!.height) - Math.max(a!.y, b!.y),
        ),
    ).toBe(0);
    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height);
    expect(b!.y + b!.height).toBeLessThan(size.height - 44);
  }
});
