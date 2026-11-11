import { test, expect, type Page } from "@playwright/test";
import { emptyProgress, type Progress } from "../src/game/campaign/progression";
import { initializeRpg } from "../src/game/rpg/profile";
import { seededEquipment } from "../src/game/rpg/items";
import { ITEMS } from "../src/game/rpg/content";
import { CHARACTERS, type CharacterId } from "../src/game/loadout";
import { STAGES } from "../src/game/campaign/content";
import { resolveEquippedWeapon } from "../src/game/rpg/stats";
import { LANDMARKS } from "../src/game/world/content";
import type { SaveData } from "../src/game/persistence/model";
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(12000);
});
const definitions = [
  "forest-weapon",
  "desert-weapon",
  "frozen-weapon",
  "infernal-weapon",
];
function fixture() {
  const p = initializeRpg(emptyProgress());
  p.gold = 10000;
  p.clears = STAGES.map((s) => s.id + ":normal");
  for (const definition of definitions) {
    const item = seededEquipment("owned-" + definition, definition, "rare", 3);
    item.enhancement = 3;
    p.rpg!.equipment.push(item);
  }
  return p;
}
async function seed(page: Page, p: Progress = fixture()) {
  await page.goto("/");
  await page.evaluate(
    (p) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("progress");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readwrite");
          tx.objectStore("progress").put(p, "profile");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    p,
  );
  await page
    .getByRole("button", { name: "Practice & legacy tools", exact: true })
    .click();
  await expect(page.locator(".hub-main .equipped-weapon")).toBeVisible();
}
async function saved(page: Page): Promise<SaveData> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("nowrift-campaign", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("progress", "readonly"),
            q = tx.objectStore("progress").get("profile");
          q.onsuccess = () => resolve(q.result);
          tx.oncomplete = () => db.close();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}
async function equip(page: Page, definition: string) {
  await page.locator(".hub-main .equipped-weapon").getByRole("button").click();
  await expect(page.locator(".rpg-character .character-preview")).toBeVisible();
  await page
    .locator(".rpg-grid")
    .getByRole("button", { name: new RegExp(ITEMS[definition].name) })
    .last()
    .click();
  await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
  const preview = page.locator(".rpg-character .character-preview");
  await expect(preview).toHaveAttribute(
    "data-weapon-instance",
    "owned-" + definition,
  );
  await expect(page.locator(".rpg-character .equipped-weapon")).toContainText(
    ITEMS[definition].name + " +3",
  );
  await page
    .getByRole("button", { name: "← RETURN TO HUB", exact: true })
    .click();
  await expect(page.locator(".hub-main .equipped-weapon")).toHaveAttribute(
    "data-weapon-instance",
    "owned-" + definition,
  );
}
async function exitRun(page: Page) {
  await page.getByRole("button", { name: "← MAIN MENU", exact: true }).click();
  await page
    .getByRole("button", { name: "EXIT TO HUB →", exact: true })
    .click();
  await expect(page.locator(".hub-main")).toBeVisible();
}
for (const character of Object.keys(CHARACTERS) as CharacterId[]) {
  test(`${character} equips all four owned weapons in Inventory and uses them across four Worlds`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await seed(page);
    const before = (await saved(page)).rpg;
    await page.getByRole("button", { name: /^Wanderer/ }).click();
    await page
      .getByRole("button", { name: CHARACTERS[character].name, exact: true })
      .click();
    await page
      .getByRole("button", { name: "CONFIRM WANDERER →", exact: true })
      .click();
    await expect
      .poll(async () => (await saved(page)).local.character)
      .toBe(character);
    expect((await saved(page)).rpg).toEqual(before);
    for (const [i, definition] of definitions.entries()) {
      await equip(page, definition);
      await expect(
        page.locator(".wanderer-card .character-preview"),
      ).toHaveAttribute("data-character", character);
      await page
        .getByRole("button", { name: "WORLD MAP →", exact: true })
        .click();
      await page.locator(".world-card").nth(i).click();
      await expect(
        page.locator(".campaign-details .equipped-weapon"),
      ).toHaveAttribute("data-weapon-instance", "owned-" + definition);
      await page
        .getByRole("button", { name: "START STAGE →", exact: true })
        .click();
      await expect(page.locator(".game-state")).toContainText("LIVE RUN");
      await expect(page.locator(".active-weapon")).toContainText(
        ITEMS[definition].name + " +3",
      );
      const expected = resolveEquippedWeapon(await saved(page))!;
      if (process.env.NOWRIFT_E2E) {
        await expect
          .poll(() =>
            page.evaluate(
              () => window.__NOWRIFT_TEST__?.appearance?.().instanceId,
            ),
          )
          .toBe(expected.instanceId);
        const rendered = await page.evaluate(() =>
          window.__NOWRIFT_TEST__!.appearance!(),
        );
        expect(rendered.body).toBe(`character-${character}-moss`);
        expect(rendered.weaponAsset).toBe("equipment-weapons");
        expect(rendered.weaponFrame).toBe(i);
        expect(rendered.weaponVisible).toBe(true);
        const actual = await page.evaluate(() => {
          const g = window.__NOWRIFT_TEST__!.state();
          return {
            character: g.character,
            attack: g.weaponId,
            weapon: g.equippedWeapon,
            damage: g.weapon.damage,
            delay: g.weapon.delay,
          };
        });
        expect(actual.character).toBe(character);
        expect(actual.attack).toBe(expected.attackId);
        expect(actual.weapon).toEqual(expected);
        expect(actual.damage).toBeCloseTo(expected.stats.damage);
        expect(actual.delay).toBeCloseTo(expected.stats.interval);
        // A stationary fixture target exercises the real automatic attack path.
        await page.evaluate(() => {
          const g = window.__NOWRIFT_TEST__!.state(),
            enemy = g.enemies[0];
          g.enemies = [enemy];
          g.bullets = [];
          g.obstacles = [];
          g.spawnCooldown = 999;
          enemy.x = g.player.x + 60;
          enemy.y = g.player.y;
          enemy.speed = 0;
          enemy.hp = enemy.maxHp = 10000;
          enemy.attack = enemy.contact = 999;
          g.weapon.cooldown = 0;
          g.weapon.crit = 0;
          g.player.invincible = 999;
        });
        await expect
          .poll(() =>
            page.evaluate(() => {
              const enemy = window.__NOWRIFT_TEST__!.state().enemies[0];
              return enemy.maxHp - enemy.hp;
            }),
          )
          .toBeGreaterThan(0);
        if (expected.attack.kind === "pulse")
          expect(
            await page.evaluate(
              () => window.__NOWRIFT_TEST__!.state().enemies[0].slow ?? 0,
            ),
          ).toBeGreaterThan(0);
        if (["slash", "sweep"].includes(expected.attack.kind ?? ""))
          expect(
            await page.evaluate(
              () => window.__NOWRIFT_TEST__!.state().bullets.length,
            ),
          ).toBe(0);
      }
      if (character === "strider")
        await page.screenshot({
          path: info.outputPath(`strider-${definition}.png`),
          fullPage: true,
          animations: "disabled",
        });
      await exitRun(page);
    }
    expect(errors).toEqual([]);
  });
}

test("empty inventory weapons block campaign entry and expose a real Equip action", async ({
  page,
}) => {
  const p = fixture();
  p.rpg!.equipped.weapon = null;
  await seed(page, p);
  await expect(page.locator(".hub-main .equipped-weapon")).toContainText(
    "Empty weapon slot",
  );
  await page.getByRole("button", { name: "WORLD MAP →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "START STAGE →", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Equip Weapon", exact: false })
    .click();
  await page
    .locator(".rpg-grid")
    .getByRole("button", { name: /Riftwood Staff/ })
    .first()
    .click();
  await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
  await expect(page.locator(".rpg-character .actor-weapon")).toBeVisible();
  expect((await saved(page)).rpg!.equipment).toHaveLength(
    p.rpg!.equipment.length,
  );
});

test("mobile equipment previews remain layered, change with owned gear, and survive resizing", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await equip(page, "desert-weapon");
  const layer = page.locator(".wanderer-card .actor-weapon");
  await expect(layer).toHaveCSS("background-image", /characters\/weapons.png/);
  await expect(layer).toHaveCSS("background-position", "-64px 0px");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("mobile-equipped-blade.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "WORLD MAP →", exact: true }).click();
  await page
    .getByRole("button", { name: "START STAGE →", exact: true })
    .click();
  await expect(page.locator(".game-state")).toContainText("LIVE RUN");
  await expect(page.locator(".active-weapon")).toContainText(
    "Sunsteel Blade +3",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator(".active-weapon")).toContainText(
    "Sunsteel Blade +3",
  );
});

test.describe("equipment checkpoint and live town rendering", () => {
  test.skip(
    !process.env.NOWRIFT_E2E,
    "Uses explicit fixture build to inspect actual Phaser layers",
  );
  test("recovery restores its original blade instance and combat after live inventory changes", async ({
    page,
  }) => {
    await seed(page);
    await equip(page, "desert-weapon");
    await page
      .getByRole("button", { name: "WORLD MAP →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "START STAGE →", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("LIVE RUN");
    await page.getByRole("button", { name: "PAUSE", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await saved(page)).local.checkpoint?.state.equippedWeapon
            ?.instanceId,
      )
      .toBe("owned-desert-weapon");
    const checkpoint = (await saved(page)).local.checkpoint!;
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const r = indexedDB.open("nowrift-campaign", 1);
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction("progress", "readwrite"),
              store = tx.objectStore("progress"),
              q = store.get("profile");
            q.onsuccess = () => {
              const p = q.result as SaveData;
              p.rpg!.equipped.weapon = "owned-forest-weapon";
              store.put(p, "profile");
            };
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Practice & legacy tools", exact: true })
      .click();
    await page
      .getByRole("button", { name: "RECOVER RUN →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "RESUME CHECKPOINT →", exact: true })
      .click();
    await expect(page.locator(".game-state")).toContainText("PAUSED");
    await expect(page.locator(".active-weapon")).toContainText(
      "Sunsteel Blade +3",
    );
    const restored = await page.evaluate(() => {
      const g = window.__NOWRIFT_TEST__!.state();
      return {
        weapon: g.equippedWeapon,
        combat: g.weapon,
        character: g.character,
        time: g.time,
        appearance: window.__NOWRIFT_TEST__!.appearance!(),
      };
    });
    expect(restored.weapon).toEqual(checkpoint.state.equippedWeapon);
    expect(restored.combat).toEqual(checkpoint.state.weapon);
    expect(restored.character).toBe(checkpoint.state.character);
    expect(restored.time).toBe(checkpoint.state.time);
    expect(restored.appearance.weaponFrame).toBe(1);
    expect(restored.appearance.instanceId).toBe("owned-desert-weapon");
    expect((await saved(page)).rpg!.equipped.weapon).toBe(
      "owned-forest-weapon",
    );
  });
  test("Haven changes the held weapon after inventory equip without replacing its canvas", async ({
    page,
  }) => {
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
    const canvas = await page.locator("canvas").elementHandle();
    const original = (await saved(page)).rpg!.equipped.weapon;
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_HAVEN__?.appearance().instanceId),
      )
      .toBe(original);
    await page.keyboard.press("h");
    await page
      .locator(".equipped-weapon")
      .getByRole("button", { name: /Open Inventory/ })
      .click();
    await page
      .locator(".rpg-grid")
      .getByRole("button", { name: /Sunsteel Blade/ })
      .click();
    await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sanctuary-summary")).toBeVisible();
    await expect(page.locator(".equipped-weapon")).toContainText(
      "Sunsteel Blade +3",
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_HAVEN__?.appearance().instanceId),
      )
      .toBe("owned-desert-weapon");
    expect(
      await canvas!.evaluate(
        (node) => node === document.querySelector("canvas"),
      ),
    ).toBe(true);
    await page.keyboard.press("h");
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(300);
    await page.keyboard.up("ArrowUp");
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_HAVEN__?.appearance().behindBody),
      )
      .toBe(true);
    await page.keyboard.press("i");
    await page
      .locator(".rpg-grid")
      .getByRole("button", { name: /Glacial Scepter/ })
      .click();
    await page.getByRole("button", { name: "EQUIP ITEM", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect
      .poll(() =>
        page.evaluate(() => window.__NOWRIFT_HAVEN__?.appearance().weaponFrame),
      )
      .toBe(2);
    const training = LANDMARKS.find((l) => l.id === "training")!;
    await page.evaluate(
      (position) => window.__NOWRIFT_HAVEN__!.place(position),
      training.entrance,
    );
    await page.locator(".haven-interact").click();
    await page
      .getByRole("button", { name: "Test equipped weapon", exact: true })
      .click();
    await expect
      .poll(async () =>
        Number(
          (await page.locator(".haven-training > strong").innerText()).match(
            /\d+/,
          )?.[0],
        ),
      )
      .toBeGreaterThan(0);
  });
});
