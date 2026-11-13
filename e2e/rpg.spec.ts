import { EVOLUTION_TIERS } from "../src/game/presentation/weapon-visual";
import { test, expect, type Page } from "@playwright/test";
import { initializeRpg } from "../src/game/rpg/profile";
import { emptyProgress, type Progress } from "../src/game/campaign/progression";
import { seededEquipment, hash } from "../src/game/rpg/items";
import { enhancementQuote } from "../src/game/rpg/enhancement";
import { calculateStats } from "../src/game/rpg/stats";
import { usedSlots } from "../src/game/rpg/inventory";
import { seeded } from "../src/game/campaign/content";
function fixture() {
  const p = initializeRpg(emptyProgress());
  p.gold = 15000;
  p.xp = 250;
  p.materials = {
    wood: 1000,
    "slime-core": 1000,
    "copper-ore": 1000,
    "enhancement-stone": 1000,
  };
  p.rpg!.consumables["focus-tonic"] = 3;
  p.rpg!.equipment.push(
    seededEquipment("sample-blade", "desert-weapon", "rare", 5),
    seededEquipment("sample-ring", "frozen-ring", "epic", 8),
  );
  return p;
}
async function seed(page: Page, p = fixture(), ready = true) {
  await page.goto("/");
  await page.evaluate(async (p) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("nowrift-campaign", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("progress");
      r.onsuccess = () => {
        const db = r.result,
          t = db.transaction("progress", "readwrite");
        t.objectStore("progress").put(p, "profile");
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
    });
  }, p);
  await page.getByRole("button", { name: "Practice & legacy tools" }).click();
  await page.getByRole("button", { name: /Inventory & equipment/ }).click();
  if (ready)
    await expect(
      page.getByRole("heading", { name: "Every relic tells a story." }),
    ).toBeVisible();
}
async function saved(page: Page): Promise<Progress> {
  return await page.evaluate(
    async () =>
      await new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            t = db.transaction("progress", "readonly"),
            get = t.objectStore("progress").get("profile");
          get.onsuccess = () => {
            db.close();
            resolve(get.result);
          };
          get.onerror = () => reject(get.error);
        };
      }),
  );
}
async function selectBlade(page: Page) {
  await page
    .locator(".rpg-grid")
    .getByRole("button", { name: /Sunsteel Blade/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /^Sunsteel Blade/ }),
  ).toBeVisible();
}
for (const target of [3, 6, 9, 12, 15]) {
  test(`a saved +${target} milestone transforms the equipped weapon, can be skipped, and survives reload`, async ({
    page,
  }, info) => {
    const p = fixture(),
      item = p.rpg!.equipment.find((e) => e.id === "sample-blade")!;
    item.enhancement = target - 1;
    const chance = enhancementQuote(item).effective,
      tier = target / 3,
      tierName = EVOLUTION_TIERS[tier];
    p.rpg!.equipped.weapon = item.id;
    // Choose a successful real seeded action using this item’s actual quoted probability.
    let id = "";
    for (let i = 0; i < 100; i++)
      if (seeded(hash("action-evolution-" + i))() < chance) {
        id = "evolution-" + i;
        break;
      }
    await page.addInitScript(
      (id) =>
        Object.defineProperty(Crypto.prototype, "randomUUID", {
          value: () => id,
        }),
      id,
    );
    await seed(page, p);
    await page.getByRole("button", { name: "BLACKSMITH", exact: true }).click();
    await selectBlade(page);
    const preview = page.locator(".weapon-evolution");
    await expect(preview).toContainText(tierName);
    await expect(preview).toContainText(
      "Your next success transforms this weapon.",
    );
    await expect(page.locator(".rpg-chance")).toContainText(`${chance * 100}%`);
    if (target === 6)
      await page.screenshot({
        path: info.outputPath("evolution-before.png"),
        fullPage: true,
        animations: "disabled",
      });
    await page
      .getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Confirm enhancement" })
      .getByRole("button", { name: "CONFIRM", exact: true })
      .click();
    const reveal = page.getByRole("dialog", { name: "Weapon evolved" });
    await expect(reveal).toBeVisible();
    await expect(reveal).toContainText(`${tierName} +${target}`);
    await reveal.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(reveal).toHaveCount(0);
    await expect(page.locator(".rpg-character .actor-weapon")).toHaveAttribute(
      "data-weapon-frame",
      String(6 + tier),
    );
    const state = await saved(page);
    expect(
      state.rpg!.equipment.find((e) => e.id === item.id)!.enhancement,
    ).toBe(target);
    expect(state.gold).toBe(p.gold - enhancementQuote(item).gold);
    if (target === 6)
      await page.screenshot({
        path: info.outputPath("evolution-after.png"),
        fullPage: true,
        animations: "disabled",
      });
    await page.reload();
    await page
      .getByRole("button", { name: "Practice & legacy tools", exact: true })
      .click();
    await expect(page.locator(".wanderer-card .actor-weapon")).toHaveAttribute(
      "data-weapon-frame",
      String(6 + tier),
    );
  });
}

test("Thai mobile milestone previews respect reduced motion", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const p = fixture();
  p.rpg!.equipment.find((e) => e.id === "sample-blade")!.enhancement = 14;
  await seed(page, p);
  await selectBlade(page);
  await page.getByRole("button", { name: "TH", exact: true }).first().click();
  const preview = page.locator(".weapon-evolution");
  await expect(preview).toContainText("เหนือสรรพสิ่ง");
  await expect(preview).toContainText("+15");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await preview.screenshot({
    path: info.outputPath("evolution-mobile-th.png"),
  });
});
test("inventory sorts, filters, compares, protects and equips unique gear", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const p = fixture();
  await seed(page, p);
  await expect(page.getByTestId("bag-capacity")).toHaveText(
    `${usedSlots(p)} / 60`,
  );
  await expect(page.locator(".rpg-slot")).toHaveCount(7);
  await page.getByLabel("Inventory sort").selectOption("name");
  await page.getByLabel("Inventory category").selectOption("material");
  await expect(page.locator(".rpg-grid button")).toHaveCount(4);
  await page.getByLabel("Inventory category").selectOption("equipment");
  await expect(page.locator(".rpg-grid button")).toHaveCount(2);
  await selectBlade(page);
  await expect(page.locator(".rpg-comparison")).toContainText("Attack damage");
  await page.getByRole("button", { name: "FAVORITE", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "DISMANTLE EQUIPMENT" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "UNFAVORITE", exact: true }).click();
  await page.getByRole("button", { name: "LOCK ITEM", exact: true }).click();
  await expect(page.getByRole("button", { name: /SELL FOR/ })).toBeDisabled();
  await page.getByRole("button", { name: "UNLOCK ITEM", exact: true }).click();
  await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "UNEQUIP", exact: true }),
  ).toBeVisible();
  const equipped = await saved(page);
  expect(equipped.rpg!.equipped.weapon).toBe("sample-blade");
  expect(equipped.rpg!.equipment).toHaveLength(p.rpg!.equipment.length);
  expect(calculateStats(equipped).damage).toBeGreaterThan(
    calculateStats(p).damage,
  );
  await page.screenshot({
    path: info.outputPath("inventory-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "UNEQUIP", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "EQUIP ITEM", exact: true }),
  ).toBeVisible();
  const unequipped = await saved(page);
  expect(unequipped.rpg!.equipped.weapon).toBeNull();
  expect(new Set(unequipped.rpg!.equipment.map((e) => e.id)).size).toBe(
    p.rpg!.equipment.length,
  );
  expect(errors).toEqual([]);
});
test("enhancement quote, success feedback and double confirmation charge once", async ({
  page,
}, info) => {
  const p = fixture(),
    item = p.rpg!.equipment.find((e) => e.id === "sample-blade")!,
    quote = enhancementQuote(item);
  await seed(page, p);
  await selectBlade(page);
  await page.getByRole("button", { name: "BLACKSMITH", exact: true }).click();
  await expect(page.locator(".rpg-chance")).toContainText("100%");
  await page.getByRole("button", { name: "ENHANCE EQUIPMENT" }).click();
  const modal = page.getByRole("dialog", { name: "Confirm enhancement" });
  await expect(modal).toContainText(`Base 100%`);
  await expect(modal).toContainText(`${quote.gold} gold`);
  await modal
    .getByRole("button", { name: "CONFIRM", exact: true })
    .evaluate((el) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });
  await expect(
    page.getByRole("status").filter({ hasText: "Enhancement succeeded" }),
  ).toBeVisible();
  const s = await saved(page);
  expect(s.gold).toBe(p.gold - quote.gold);
  expect(s.rpg!.equipment.find((e) => e.id === item.id)!.enhancement).toBe(1);
  expect(s.rpg!.history.filter((e) => e.kind === "enhance")).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("blacksmith-success.png"),
    fullPage: true,
  });
});
test("enhancement failure preserves rank and displays newly accumulated pity", async ({
  page,
}) => {
  let id = "";
  for (let i = 0; i < 100; i++) {
    const candidate = "failed-enhancement-" + i;
    if (seeded(hash("action-" + candidate))() > 0.95) {
      id = candidate;
      break;
    }
  }
  expect(id).not.toBe("");
  await page.addInitScript(
    (id) =>
      Object.defineProperty(Crypto.prototype, "randomUUID", {
        value: () => id,
      }),
    id,
  );
  const p = fixture();
  p.rpg!.equipment.find((e) => e.id === "sample-blade")!.enhancement = 5;
  await seed(page, p);
  await selectBlade(page);
  await page.getByRole("button", { name: "BLACKSMITH", exact: true }).click();
  await expect(page.locator(".rpg-chance")).toContainText("70%");
  await page.getByRole("button", { name: "ENHANCE EQUIPMENT" }).click();
  await page
    .getByRole("dialog", { name: "Confirm enhancement" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Enhancement failed: +5" }),
  ).toBeVisible();
  await expect(page.locator(".rpg-chance")).toContainText("PITY +2%");
  await expect(page.locator(".rpg-chance")).toContainText("72%");
  const s = await saved(page);
  expect(s.rpg!.equipment.find((e) => e.id === "sample-blade")!.pity).toBe(1);
  await expect(
    page.locator(".rpg-details .weapon-evolution .weapon-sprite").first(),
  ).toHaveAttribute("data-weapon-frame", "7");
  await expect(
    page.getByRole("dialog", { name: "Weapon evolved" }),
  ).toHaveCount(0);
});
test("a real downgrade returns Mythic to Ascendant without an evolution celebration", async ({
  page,
}) => {
  let id = "";
  for (let i = 0; i < 100; i++) {
    const rng = seeded(hash("action-downgrade-" + i));
    if (rng() >= 0.25 && rng() < 0.5) {
      id = "downgrade-" + i;
      break;
    }
  }
  expect(id).not.toBe("");
  await page.addInitScript(
    (id) =>
      Object.defineProperty(Crypto.prototype, "randomUUID", {
        value: () => id,
      }),
    id,
  );
  const p = fixture();
  p.rpg!.equipment.find((e) => e.id === "sample-blade")!.enhancement = 12;
  await seed(page, p);
  await selectBlade(page);
  await page.getByRole("button", { name: "BLACKSMITH", exact: true }).click();
  await page
    .getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm enhancement" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(page.locator(".rpg-notices")).toContainText(
    "Enhancement failed: +11",
  );
  await expect(
    page.locator(".weapon-evolution .weapon-sprite").first(),
  ).toHaveAttribute("data-weapon-tier", "3");
  await expect(
    page.getByRole("dialog", { name: "Weapon evolved" }),
  ).toHaveCount(0);
  expect(
    (await saved(page)).rpg!.equipment.find((e) => e.id === "sample-blade")!
      .enhancement,
  ).toBe(11);
});
test("shop purchases, material crafting, sales and transaction history", async ({
  page,
}, info) => {
  const p = fixture();
  await seed(page, p);
  await page.getByRole("button", { name: "THE TRADER", exact: true }).click();
  await page.getByLabel("Purchase quantity").fill("2");
  await page
    .getByRole("button", { name: "BUY SUNSTEEL BLADE", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm purchase" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Purchase complete" }),
  ).toBeVisible();
  let s = await saved(page);
  expect(s.gold).toBe(p.gold - 700);
  const bought = s.rpg!.equipment.filter((e) => e.id.startsWith("purchase:"));
  expect(bought).toHaveLength(2);
  expect(bought[0].id).not.toBe(bought[1].id);
  await page
    .locator(".rpg-recipes article")
    .filter({ hasText: "Brew Crimson Tonic" })
    .getByRole("button", { name: "CRAFT", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Confirm crafting" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Crafting complete" }),
  ).toBeVisible();
  s = await saved(page);
  expect(s.rpg!.consumables["health-tonic"]).toBe(4);
  expect(s.gold).toBe(p.gold - 710);
  await page.screenshot({ path: info.outputPath("shop.png"), fullPage: true });
  await page.getByRole("button", { name: "INVENTORY", exact: true }).click();
  await selectBlade(page);
  await page.getByRole("button", { name: /SELL FOR/ }).click();
  await page
    .getByRole("dialog", { name: "Confirm sale" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sold for" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "JOURNAL", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transaction journal" }),
  ).toBeVisible();
  await expect(page.locator(".rpg-journal")).toContainText("Purchase complete");
  await expect(page.locator(".rpg-journal")).toContainText("Crafting complete");
  await expect(page.locator(".rpg-journal")).toContainText("Sold for");
});
test("dismantle removes an owned item and grants actual materials after confirmation", async ({
  page,
}) => {
  const p = fixture();
  await seed(page, p);
  await selectBlade(page);
  await page.getByRole("button", { name: "DISMANTLE EQUIPMENT" }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirm dismantle" }),
  ).toContainText("cannot be undone");
  await page.getByRole("button", { name: "CONFIRM", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Equipment dismantled" }),
  ).toBeVisible();
  const s = await saved(page);
  expect(s.rpg!.equipment.some((e) => e.id === "sample-blade")).toBe(false);
  expect(s.materials["copper-ore"]).toBeGreaterThan(p.materials["copper-ore"]);
});
test("full inventory preserves loot until a slot is freed, without duplicate claiming", async ({
  page,
}) => {
  const p = fixture();
  let i = 0;
  while (usedSlots(p) < 60)
    p.rpg!.equipment.push(
      seededEquipment("full-" + i++, "forest-weapon", "common", 1),
    );
  p.rpg!.overflow.push({
    id: "saved-parcel",
    equipment: seededEquipment("overflow-item", "infernal-ring", "epic", 10),
  });
  await seed(page, p);
  await page.getByRole("button", { name: /CLAIM$/ }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Inventory full" }),
  ).toBeVisible();
  await selectBlade(page);
  await page.getByRole("button", { name: /SELL FOR/ }).click();
  await page.getByRole("button", { name: "CONFIRM", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sold for" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /CLAIM$/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Loot parcel claimed" }),
  ).toBeVisible();
  const s = await saved(page);
  expect(s.rpg!.overflow).toHaveLength(0);
  expect(s.rpg!.equipment.filter((e) => e.id === "overflow-item")).toHaveLength(
    1,
  );
  expect(usedSlots(s)).toBe(60);
});
test("mobile inventory, equipment and shop remain usable at narrow widths", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await seed(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await selectBlade(page);
  await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "UNEQUIP", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("inventory-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "THE TRADER", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "CHARACTER", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Permanent disciplines" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
});
test("permanent disciplines consume resources and survive reload", async ({
  page,
}) => {
  const p = fixture();
  await seed(page, p);
  await page.getByRole("button", { name: "CHARACTER", exact: true }).click();
  await page
    .locator(".rpg-discipline")
    .filter({ hasText: "Arcane Training" })
    .getByRole("button")
    .click();
  await page
    .getByRole("dialog", { name: "Learn permanent discipline" })
    .getByRole("button", { name: "CONFIRM", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "reached rank 1" }),
  ).toBeVisible();
  const s = await saved(page);
  expect(s.gold).toBe(p.gold - 100);
  expect(s.rpg!.upgrades.training).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Practice & legacy tools" }).click();
  await page.getByRole("button", { name: /Inventory & equipment/ }).click();
  await page.getByRole("button", { name: "CHARACTER", exact: true }).click();
  await expect(
    page.locator(".rpg-discipline").filter({ hasText: "Arcane Training" }),
  ).toContainText("1/10");
});
test("corrupt RPG inventory is reported and never silently reset", async ({
  page,
}) => {
  const p = fixture();
  p.rpg!.equipment.push(p.rpg!.equipment[0]);
  await seed(page, p, false);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Original data (?:has been|was) preserved/ }),
  ).toBeVisible();
  const s = await saved(page);
  expect(s.rpg!.equipment).toHaveLength(p.rpg!.equipment.length);
});
test("RPG language switching translates inventory without changing owned items", async ({
  page,
}) => {
  await seed(page);
  const before = await saved(page);
  await page.locator(".language-switcher.compact button").nth(1).click();
  await expect(
    page.getByRole("heading", { name: /วัตถุโบราณทุกชิ้น/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ช่างตีเหล็ก", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "เสริมพลังอุปกรณ์", exact: true }),
  ).toBeVisible();
  await page.locator(".language-switcher.compact button").first().click();
  await expect(
    page.getByRole("button", { name: "ENHANCE EQUIPMENT", exact: true }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test.describe("live campaign build and consumables", () => {
  test.skip(!process.env.NOWRIFT_E2E, "Requires instrumented gameplay build");
  test("equipped stats and tonics reach combat; retry uses newly earned character levels", async ({
    page,
  }) => {
    await seed(page);
    await selectBlade(page);
    await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "UNEQUIP", exact: true }),
    ).toBeVisible();
    const p = await saved(page),
      expected = calculateStats(p);
    await page
      .getByRole("button", { name: "← RETURN TO HUB", exact: true })
      .click();
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page.getByRole("button", { name: "START STAGE →" }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    const build = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.player.hp = g.player.maxHp - 50;
      return {
        hp: g.player.maxHp,
        damage: g.weapon.damage,
        interval: g.weapon.delay,
        armor: g.player.armor,
      };
    });
    expect(build.hp).toBe(expected.maxHp);
    expect(build.damage).toBeCloseTo(expected.damage);
    expect(build.armor).toBeCloseTo(expected.armor);
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    const hp = await page.evaluate(
      () => window.__NOWRIFT_TEST__!.state().player.hp,
    );
    await page.getByRole("button", { name: /CRIMSON TONIC/ }).click();
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_TEST__!.state().player.hp),
      )
      .toBeCloseTo(hp + 35);
    expect((await saved(page)).rpg!.consumables["health-tonic"]).toBe(2);
    await page.getByRole("button", { name: /AZURE TONIC/ }).click();
    await expect
      .poll(() => page.evaluate(() => window.__NOWRIFT_TEST__!.state().focus))
      .toBe(20);
    expect(
      await page.evaluate(() => window.__NOWRIFT_TEST__!.state().weapon.delay),
    ).toBeCloseTo(expected.interval / 1.3);
    expect((await saved(page)).rpg!.consumables["focus-tonic"]).toBe(2);
    await expect(page.locator(".game-state")).toContainText("PAUSED");
    await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      g.campaign!.enemies = 120;
      g.player.invincible = 999;
      g.time = g.campaign!.definition.clear.seconds - 0.01;
    });
    await page.getByRole("button", { name: /^RESUME RUN/ }).click();
    await expect(page.locator(".campaign-reward")).toContainText("FIRST CLEAR");
    const earned = calculateStats(await saved(page));
    expect(earned.level).toBeGreaterThan(expected.level);
    await page.getByRole("button", { name: "TRY AGAIN" }).click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    const retry = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return { maxHp: g.player.maxHp, damage: g.weapon.damage, focus: g.focus };
    });
    expect(retry.maxHp).toBe(earned.maxHp);
    expect(retry.damage).toBeCloseTo(earned.damage);
    expect(retry.focus).toBe(0);
  });
});
