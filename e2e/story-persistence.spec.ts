import { expect, test } from "@playwright/test";
import { beginStory } from "./helpers/story";
test("completed Story objectives commit before the periodic autosave", async ({
  page,
}) => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Requires the explicit production-trigger fixture",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Practice & legacy tools" }).click();
  await page.getByRole("button", { name: "WORLD MAP →", exact: true }).click();
  await page
    .getByRole("button", { name: "START STAGE →", exact: true })
    .click();
  await beginStory(page);
  await page.evaluate(async () => window.__NOWRIFT_TEST__!.missionStep());
  // The fixture physically interacts with Sera and advances the real simulation.
  // The ten-second periodic save cannot account for this immediate commit.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<string[]>((resolve) => {
              const r = indexedDB.open("nowrift-campaign", 1);
              r.onsuccess = () => {
                const db = r.result,
                  t = db.transaction("progress"),
                  q = t.objectStore("progress").get("profile");
                q.onsuccess = () =>
                  resolve(
                    q.result.local.checkpoint?.environment?.mission
                      ?.completed ?? [],
                  );
                t.oncomplete = () => db.close();
              };
            }),
        ),
      { timeout: 2500 },
    )
    .toContain("forest-1-ranger");
});
