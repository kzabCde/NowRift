import { expect, test, type Page } from "@playwright/test";
import type { PlayerProfile, SaveData } from "../src/game/persistence/model";
async function openCalendar(page: Page, at: number) {
  await page.clock.setFixedTime(at);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await page.getByRole("button", { name: /^PROFILE & SAVES/ }).click();
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  await expect(page.locator(".calendar-table")).toBeVisible();
}
async function records(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ player: PlayerProfile; save: SaveData }>(
        (resolve, reject) => {
          const r = indexedDB.open("nowrift-campaign", 1);
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction("progress", "readonly"),
              s = tx.objectStore("progress"),
              p = s.get("player");
            p.onsuccess = () => {
              const player = p.result as PlayerProfile,
                q = s.get(
                  player.slots.find((ref) => ref.id === player.activeSlotId)!
                    .key,
                );
              q.onsuccess = () => resolve({ player, save: q.result });
            };
            tx.oncomplete = () => db.close();
            tx.onerror = () => reject(tx.error);
          };
        },
      ),
  );
}
test("monthly calendar aligns real dates, exposes honest reward states and stays readable on desktop/mobile", async ({
  page,
}, info) => {
  await openCalendar(page, Date.UTC(2026, 10, 10, 12));
  await expect(page.locator(".calendar-table")).toHaveAttribute(
    "data-calendar-month",
    "2026-11",
  );
  await expect(page.locator("[data-calendar-date]")).toHaveCount(30);
  await expect(
    page.locator('[data-calendar-date="2026-11-09"]'),
  ).toHaveAttribute("data-state", "missed");
  await expect(
    page.locator('[data-calendar-date="2026-11-11"]'),
  ).toHaveAttribute("data-state", "future");
  await page.locator('[data-calendar-date="2026-11-14"]').click();
  await expect(page.locator(".calendar-detail")).toContainText("750 Gold");
  await expect(page.locator(".calendar-detail")).toContainText(
    "Weekly milestone",
  );
  await expect(
    page.getByRole("button", { name: "Date locked", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".calendar-detail")).toContainText("400 Gold");
  for (const size of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const b = await page.locator(".calendar-table").boundingBox();
    expect(b!.width).toBeLessThanOrEqual(size.width);
    await page.screenshot({
      path: info.outputPath(`calendar-${size.width}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(page.locator("[data-calendar-date]")).toHaveCount(31);
  await expect(
    page.getByRole("button", { name: "Date locked", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(page.locator("[data-calendar-date]")).toHaveCount(31);
  await expect(
    page.getByRole("button", { name: "Date locked", exact: true }),
  ).toBeDisabled();
});
test("Bangkok midnight rolls the real month forward after an atomic final-day bonus; Thai and history remain Gregorian", async ({
  page,
}, info) => {
  await openCalendar(page, Date.UTC(2026, 1, 28, 16, 59, 59));
  const original = await records(page);
  await expect(page.locator("[data-calendar-date]")).toHaveCount(28);
  await expect(page.locator(".calendar-detail")).toContainText(
    "Final calendar-day bonus",
  );
  await page
    .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
  ).toBeDisabled();
  const claimed = await records(page);
  expect(claimed.save.gold - original.save.gold).toBe(2500);
  expect(
    claimed.save.rpg!.equipment.filter((e) => e.rarity === "epic"),
  ).toHaveLength(1);
  expect(claimed.player.checkins).toHaveLength(1);
  await page.clock.setFixedTime(Date.UTC(2026, 1, 28, 17));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".calendar-table")).toHaveAttribute(
    "data-calendar-month",
    "2026-03",
  );
  await expect(
    page.getByRole("button", { name: "CLAIM DAILY REWARD", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
  ).toBeDisabled();
  expect((await records(page)).save.gold - original.save.gold).toBe(2800);
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await page.locator('[data-calendar-date="2026-02-28"]').click();
  await expect(page.locator(".calendar-detail button")).toBeDisabled();
  await page.locator(".language-switcher.compact button").nth(1).click();
  await expect(page.locator("#checkin-month")).toContainText("2026");
  await expect(page.locator("#checkin-month")).toContainText("กุมภาพันธ์");
  await page.screenshot({
    path: info.outputPath("calendar-thai-history.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await page.locator(".language-switcher button").first().click();
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await page.getByRole("button", { name: /^PROFILE & SAVES/ }).click();
  await page.getByRole("button", { name: "CHECK-IN", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "CLAIMED TODAY", exact: true }),
  ).toBeDisabled();
  expect((await records(page)).player.id).toBe(original.player.id);
  expect((await records(page)).player.checkins.map((c) => c.day)).toEqual([
    "2026-02-28",
    "2026-03-01",
  ]);
});
test("competing real tabs cannot grant a second calendar reward", async ({
  page,
  context,
}) => {
  const now = Date.UTC(2026, 10, 10, 12);
  await openCalendar(page, now);
  const before = await records(page);
  const other = await context.newPage();
  try {
    await openCalendar(other, now);
    await Promise.all([
      page
        .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
        .click(),
      other
        .getByRole("button", { name: "CLAIM DAILY REWARD", exact: true })
        .click(),
    ]);
    await expect
      .poll(async () => (await records(page)).player.checkins.length)
      .toBe(1);
    expect((await records(page)).save.gold - before.save.gold).toBe(400);
    expect(
      (await records(page)).save.receipts.filter((id) =>
        id.startsWith("checkin:"),
      ),
    ).toHaveLength(1);
  } finally {
    await other.close();
  }
});
