import { test, expect, type Page } from "@playwright/test";
import { emptyProgress, type Progress } from "../src/game/campaign/progression";
import { initializeRpg } from "../src/game/rpg/profile";
import { OUTFITTER_OFFERS, WEARABLE_SLOTS } from "../src/game/rpg/content";
import { seededEquipment } from "../src/game/rpg/items";
import { calculateStats } from "../src/game/rpg/stats";
import { formatEquipmentStat } from "../src/game/rpg/preview";
import { enhancementQuote } from "../src/game/rpg/enhancement";
import { usedSlots } from "../src/game/rpg/inventory";
import { STAGES } from "../src/game/campaign/content";
import { CHARACTERS, type CharacterId } from "../src/game/loadout";
import type { PlayerProfile, SaveData } from "../src/game/persistence/model";
import legacy from "../src/game/rpg/fixtures/six-slot-save.json";
import { LANDMARKS } from "../src/game/world/content";
import { waitForHavenInput } from "./helpers/haven";

const categoryNames = {
  armor: "Chest armor",
  helmet: "Headwear",
  pants: "Legwear",
  boots: "Footwear",
};
function fixture() {
  const p = initializeRpg(emptyProgress());
  p.gold = 15000;
  p.clears = STAGES.map((stage) => stage.id + ":normal");
  p.materials = { wood: 1000, "copper-ore": 1000, "enhancement-stone": 1000 };
  const weapon = seededEquipment(
    "outfitters-sunblade",
    "desert-weapon",
    "rare",
    5,
  );
  weapon.enhancement = 12;
  p.rpg!.equipment.push(weapon);
  p.rpg!.equipped.weapon = weapon.id;
  return p;
}
async function saved(page: Page): Promise<SaveData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("nowrift-campaign", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("progress", "readonly"),
            store = tx.objectStore("progress");
          const root = store.get("player");
          root.onsuccess = () => {
            const player = root.result as PlayerProfile;
            const slot = store.get(
              player.slots.find((s) => s.id === player.activeSlotId)!.key,
            );
            slot.onsuccess = () => resolve(slot.result);
          };
          tx.oncomplete = () => db.close();
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}
async function seed(
  page: Page,
  progress: Progress | typeof legacy = fixture(),
) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await expect(page.locator(".hub-main")).toBeVisible();
  const original = await saved(page);
  const p = JSON.parse(
    JSON.stringify({ ...original, ...progress }),
  ) as SaveData;
  p.local = { ...p.local, id: original.local.id };
  if (p.local.checkpoint) p.local.checkpoint.run.slotId = original.local.id;
  if (p.local.activeRun) p.local.activeRun.slotId = original.local.id;
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("nowrift-campaign", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("progress", "readwrite"),
            store = tx.objectStore("progress");
          const root = store.get("player");
          root.onsuccess = () => {
            const player = root.result as PlayerProfile;
            store.put(
              value,
              player.slots.find((s) => s.id === player.activeSlotId)!.key,
            );
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    p,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await expect(page.locator(".hub-main")).toBeVisible();
}
async function shop(page: Page) {
  await page.getByRole("button", { name: /Inventory & equipment/ }).click();
  await page
    .getByRole("button", { name: "RIFT OUTFITTERS", exact: true })
    .click();
  await expect(page.locator(".outfitters-heading h1")).toHaveText(
    "RIFT OUTFITTERS",
  );
}
const details = (page: Page) => page.locator(".outfitters-desktop-detail");
const actor = (page: Page) =>
  page.locator(".outfitters-desktop-appearance .character-preview");

test("purchase and equip every category, compare real stats, forge, sell and reload", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await shop(page);
  await expect(page.locator(".outfitters-slot")).toHaveCount(7);
  await page.locator(".outfitters-desktop-appearance").screenshot({
    path: info.outputPath("appearance-before.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Legwear", exact: true }).click();
  await page.getByLabel("Collection", { exact: true }).selectOption("all");
  await page.screenshot({
    path: info.outputPath("outfitters-stock-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByLabel("Collection", { exact: true }).selectOption("desert");
  await page.getByLabel("Quality", { exact: true }).selectOption("uncommon");
  for (const slot of WEARABLE_SLOTS) {
    await page
      .getByRole("button", { name: categoryNames[slot], exact: true })
      .click();
    const offer = OUTFITTER_OFFERS.find(
      (o) => o.item === `desert-${slot}` && o.rarity === "uncommon",
    )!;
    const before = await saved(page);
    await expect(
      details(page).getByRole("button", {
        name: `Buy for ${offer.price} gold`,
        exact: true,
      }),
    ).toBeEnabled();
    // Try-on must never write the candidate into ownership or the wallet.
    expect((await saved(page)).rpg).toEqual(before.rpg);
    await details(page)
      .getByRole("button", { name: /^Buy for/ })
      .click();
    const confirmation = page.getByRole("dialog", { name: "Confirm purchase" });
    await expect(confirmation).toContainText(`${offer.price} Gold`);
    await confirmation
      .getByRole("button", { name: "CONFIRM", exact: true })
      .evaluate((node) => {
        (node as HTMLButtonElement).click();
        (node as HTMLButtonElement).click();
      });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const bought = await saved(page),
      item = bought.rpg!.equipment.at(-1)!;
    expect(bought.gold).toBe(before.gold - offer.price);
    expect(bought.rpg!.equipment).toHaveLength(
      before.rpg!.equipment.length + 1,
    );
    expect(item.definitionId).toBe(`desert-${slot}`);
    const expected = structuredClone(bought);
    expected.rpg!.equipped[slot] = item.id;
    const stats = calculateStats(expected);
    await expect(
      details(page).locator('[data-stat="armor"] td').nth(1),
    ).toHaveText(formatEquipmentStat("armor", stats.armor));
    await details(page)
      .getByRole("button", { name: "Inspect owned copy", exact: true })
      .click();
    await details(page)
      .getByRole("button", { name: "Equip this item", exact: true })
      .click();
    await expect(
      details(page).getByRole("button", {
        name: "Unequip this item",
        exact: true,
      }),
    ).toBeVisible();
    const equipped = await saved(page);
    expect(equipped.rpg!.equipped[slot]).toBe(item.id);
    expect(calculateStats(equipped)).toEqual(stats);
    const layer = slot === "helmet" ? "headwear" : slot;
    await expect(
      actor(page).locator(`[data-visual-layer="${layer}"]`),
    ).toHaveAttribute("data-instance-id", item.id);
    await expect(actor(page)).toHaveAttribute("data-weapon-frame", "10");
    await expect(
      details(page).getByRole("button", { name: /^Sell for/ }),
    ).toBeDisabled();
    if (slot !== "boots")
      await page
        .getByRole("button", { name: "Shop stock", exact: true })
        .click();
  }
  await page.screenshot({
    path: info.outputPath("outfitters-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.locator(".outfitters-desktop-appearance").screenshot({
    path: info.outputPath("appearance-after.png"),
    animations: "disabled",
  });
  const beforeForge = await saved(page),
    boot = beforeForge.rpg!.equipment.find(
      (i) => i.id === beforeForge.rpg!.equipped.boots,
    )!;
  await details(page)
    .getByRole("button", { name: "Enhance at the forge", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm enhancement" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Enhancement succeeded" }),
  ).toBeVisible();
  const enhanced = await saved(page);
  expect(enhanced.gold).toBe(beforeForge.gold - enhancementQuote(boot).gold);
  expect(
    enhanced.rpg!.equipment.find((i) => i.id === boot.id)!.enhancement,
  ).toBe(1);
  await page
    .getByRole("button", { name: "RIFT OUTFITTERS", exact: true })
    .click();
  await page.getByRole("button", { name: "Owned gear", exact: true }).click();
  await page.getByRole("button", { name: "Footwear", exact: true }).click();
  await page.getByLabel("Collection", { exact: true }).selectOption("desert");
  await details(page)
    .getByRole("button", { name: "Unequip this item", exact: true })
    .click();
  await details(page)
    .getByRole("button", { name: /^Sell for/ })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm sale" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(page.locator(".outfitters-desktop-detail")).toContainText(
    "Choose gear",
  );
  const sold = await saved(page);
  expect(sold.rpg!.equipped.boots).toBeNull();
  expect(sold.rpg!.equipment.some((i) => i.id === boot.id)).toBe(false);
  expect(sold.gold).toBeGreaterThan(enhanced.gold);
  await page.reload();
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  expect((await saved(page)).rpg).toEqual(sold.rpg);
  expect((await saved(page)).gold).toBe(sold.gold);
  expect(errors).toEqual([]);
});

for (const reason of ["gold", "capacity", "progression"] as const) {
  test(`shop eligibility uses real ${reason} and cannot charge a blocked purchase`, async ({
    page,
  }) => {
    const p = fixture();
    if (reason === "gold") p.gold = 0;
    if (reason === "capacity")
      while (usedSlots(p) < p.rpg!.capacity)
        p.rpg!.equipment.push(
          seededEquipment(
            `full-${p.rpg!.equipment.length}`,
            "forest-pants",
            "common",
            1,
          ),
        );
    if (reason === "progression") p.clears = [];
    await seed(page, p);
    await shop(page);
    if (reason === "progression")
      await page
        .getByLabel("Collection", { exact: true })
        .selectOption("infernal");
    await expect(
      details(page).getByRole("button", { name: /^Buy for/ }),
    ).toBeDisabled();
    await expect(details(page)).toContainText(
      reason === "gold"
        ? "Not enough gold."
        : reason === "capacity"
          ? "Inventory full."
          : "Complete the required world milestone",
    );
    expect((await saved(page)).gold).toBe(p.gold);
    expect((await saved(page)).rpg!.equipment).toEqual(p.rpg!.equipment);
  });
}

test("mobile Thai detail is fullscreen, focus trapped and preserves touch-sized purchase actions", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  await shop(page);
  await page.getByRole("button", { name: "TH", exact: true }).first().click();
  await page.locator(".outfitters-categories button").nth(2).click();
  await page.locator(".outfitters-card").first().click();
  const modal = page.locator(".outfitters-mobile-modal .modal-panel");
  await expect(modal).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await modal.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  expect((await modal.boundingBox())!.height).toBe(844);
  await expect(modal).toContainText("กางเกง");
  const buy = modal.getByRole("button", { name: /ซื้อในราคา/ });
  await buy.scrollIntoViewIfNeeded();
  expect((await buy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("outfitters-mobile-th.png"),
    animations: "disabled",
  });
  await buy.click();
  const confirm = page.getByRole("dialog", { name: "ยืนยันการซื้อ" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "ยืนยัน", exact: true }).click();
  await expect(confirm).toHaveCount(0);
  await modal
    .getByRole("button", { name: "ดูไอเทมที่เป็นเจ้าของ", exact: true })
    .click();
  await modal
    .getByRole("button", { name: "สวมใส่ไอเทมนี้", exact: true })
    .click();
  await expect(
    modal.getByRole("button", { name: "ถอดไอเทมนี้", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).rpg!.equipped.pants).not.toBeNull();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
});

test("the historical six-slot save migrates in-browser without altering its checkpoint", async ({
  page,
}) => {
  await seed(page, legacy);
  const migrated = await saved(page);
  expect(migrated.rpg!.schema).toBe(2);
  expect(migrated.rpg!.equipped.pants).toBeNull();
  expect(migrated.rpg!.equipment).toEqual(legacy.rpg.equipment);
  expect(migrated.local.checkpoint!.state.visualAppearance).toEqual(
    legacy.local.checkpoint.state.visualAppearance,
  );
  expect(migrated.gold).toBe(legacy.gold);
  await shop(page);
  await expect(
    page.locator('.outfitters-slot[data-slot="pants"]'),
  ).toContainText("Empty");
  await page.reload();
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  expect((await saved(page)).rpg).toEqual(migrated.rpg);
});

for (const character of Object.keys(CHARACTERS) as CharacterId[]) {
  test(`${character} previews all four themes without changing unrelated layers or evolved weapon`, async ({
    page,
  }) => {
    await seed(page);
    // Select the archetype through the existing persistent menu control.
    await page
      .getByRole("button", { name: "Wanderer", exact: false })
      .first()
      .click();
    await page
      .locator(".character-choices")
      .getByRole("button", { name: CHARACTERS[character].name, exact: true })
      .click();
    await page
      .getByRole("button", { name: "CONFIRM WANDERER →", exact: true })
      .click();
    await shop(page);
    await page.getByRole("button", { name: "Legwear", exact: true }).click();
    await page.getByLabel("Quality", { exact: true }).selectOption("epic");
    const original = await saved(page);
    for (const world of ["forest", "desert", "frozen", "infernal"]) {
      await page.getByLabel("Collection", { exact: true }).selectOption(world);
      await expect(actor(page)).toHaveAttribute("data-character", character);
      await expect(
        actor(page).locator('[data-visual-layer="pants"]'),
      ).toHaveAttribute("data-definition-id", `${world}-pants`);
      await expect(
        actor(page).locator('[data-visual-layer="armor"]'),
      ).toHaveAttribute("data-definition-id", "forest-armor");
      await expect(actor(page)).toHaveAttribute("data-weapon-frame", "10");
      expect((await saved(page)).rpg).toEqual(original.rpg);
    }
  });
}

test("the hub merchant updates the same live rig and returns to the existing canvas", async ({
  page,
}, info) => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Uses explicit hub placement instrumentation.",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await page
    .getByRole("button", { name: "ENTER RIFT HEAVEN →", exact: true })
    .click();
  await expect(page.locator(".rift-transition")).toHaveCount(0);
  const begin = page.getByRole("button", {
    name: "Begin exploring",
    exact: true,
  });
  if (await begin.isVisible()) await begin.click();
  await waitForHavenInput(page);
  const canvas = await page.locator("canvas").elementHandle();
  const before = await page.evaluate(() =>
    window.__NOWRIFT_HAVEN__!.appearance(),
  );
  const merchant = LANDMARKS.find((l) => l.id === "market")!;
  await page.evaluate(
    (position) => window.__NOWRIFT_HAVEN__!.place(position),
    merchant.entrance,
  );
  await expect(page.locator(".haven-interact")).toContainText(
    "Rift Outfitters",
  );
  await page.locator(".haven-interact").click();
  await expect(page.locator(".outfitters-heading")).toBeVisible();
  await page.getByRole("button", { name: "Legwear", exact: true }).click();
  await page.getByLabel("Collection", { exact: true }).selectOption("frozen");
  await details(page)
    .getByRole("button", { name: /^Buy for/ })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm purchase" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await details(page)
    .getByRole("button", { name: "Inspect owned copy", exact: true })
    .click();
  await details(page)
    .getByRole("button", { name: "Equip this item", exact: true })
    .click();
  await expect(
    details(page).getByRole("button", {
      name: "Unequip this item",
      exact: true,
    }),
  ).toBeVisible();
  const purchased = (await saved(page)).rpg!.equipped.pants;
  await page
    .getByRole("button", { name: "← RETURN TO HUB", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__NOWRIFT_HAVEN__
            ?.appearance()
            .layers.find((l) => l.slot === "pants")?.instanceId,
      ),
    )
    .toBe(purchased);
  const after = await page.evaluate(() =>
    window.__NOWRIFT_HAVEN__!.appearance(),
  );
  expect(after.layers.find((l) => l.slot === "armor")!.key).toBe(
    before.layers.find((l) => l.slot === "armor")!.key,
  );
  expect(after.evolutionTier).toBe(4);
  expect(
    await canvas!.evaluate((node) => node === document.querySelector("canvas")),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("outfitters-equipped-hub.png"),
    animations: "disabled",
  });
});
