import type { Progress } from "../campaign/progression";
import { seeded } from "../campaign/content";
import { ITEMS, RARITIES, SHOP, RECIPES, UPGRADES } from "./content";
import { SLOTS, type Slot, type InventoryEntry } from "./model";
import { initializeRpg, validRpg } from "./profile";
import {
  usedSlots,
  findEntry,
  removeEntry,
  addEquipment,
  grantStack,
  canAdd,
  claim,
} from "./inventory";
import { hash, createEquipment } from "./items";
import { spend, gold, quantity } from "./economy";
import { enhancementOutcome } from "./enhancement";
export type ActionBody =
  | { type: "equip"; itemId: string }
  | { type: "unequip"; slot: Slot }
  | { type: "flag"; itemId: string; flag: "favorite" | "locked" }
  | { type: "enhance"; itemId: string; expectedEnhancement: number }
  | { type: "dismantle" | "sell"; itemId: string; quantity: number }
  | { type: "buy"; offerId: string; quantity: number }
  | { type: "craft"; recipeId: string; quantity: number }
  | { type: "upgrade"; upgradeId: keyof typeof UPGRADES }
  | { type: "claim"; parcelId: string }
  | { type: "consume"; definitionId: "health-tonic" | "focus-tonic" };
export type RpgCommand = {
  id: string;
  expectedRevision: number;
  at: number;
  action: ActionBody;
};
export function sellPrice(entry: InventoryEntry) {
  if (entry.equipment) {
    if (entry.id.startsWith("starter-")) return 0;
    return Math.floor(
      (4 + entry.equipment.level * 2) *
        RARITIES[entry.equipment.rarity].salvage *
        (1 + entry.equipment.enhancement * 0.1),
    );
  }
  return ITEMS[entry.definitionId].sellPrice ?? 1;
}
export function dismantleYield(entry: InventoryEntry) {
  const e = entry.equipment;
  if (!e) throw new Error("Only equipment can be dismantled.");
  return {
    "copper-ore": RARITIES[e.rarity].salvage + Math.floor(e.level / 5),
    "enhancement-stone": Math.floor(e.enhancement / 5),
  };
}
export function shopEquipment(offerId: string, id: string) {
  const offer = SHOP.find((o) => o.id === offerId);
  if (!offer || !offer.rarity) throw new Error("Unknown equipment offer");
  return createEquipment(
    id,
    offer.item,
    offer.rarity,
    offer.level!,
    seeded(hash("shop-" + offer.id)),
  );
}
export function applyCommand(
  profile: Progress,
  command: RpgCommand,
  rng = seeded(hash(command.id)),
) {
  const current = initializeRpg(profile);
  if (
    typeof command.id !== "string" ||
    !command.id.length ||
    !Number.isFinite(command.at)
  )
    throw new Error("Invalid action");
  if (current.receipts.includes(command.id))
    return {
      progress: current,
      entry: current.rpg!.history.find((e) => e.id === command.id) ?? null,
    };
  if (command.expectedRevision !== current.rpg!.revision)
    throw new Error(
      "Your inventory changed. Review the latest values and try again.",
    );
  const p = structuredClone(current),
    r = p.rpg!,
    a = command.action,
    before = p.gold;
  const entry = {
    id: command.id,
    at: command.at,
    kind: a.type,
    message: "",
    gold: 0,
    items: [] as string[],
    itemId: undefined as string | undefined,
    enhancement: undefined as import("./model").LedgerEntry["enhancement"],
  };
  switch (a.type) {
    case "equip": {
      const e = findEntry(p, a.itemId);
      if (!e.equipment) throw new Error("This item cannot be equipped.");
      const slot = ITEMS[e.definitionId].slot!;
      r.equipped[slot] = e.id;
      entry.itemId = e.id;
      entry.message = `Equipped ${ITEMS[e.definitionId].name}.`;
      break;
    }
    case "unequip": {
      if (!SLOTS.includes(a.slot) || !r.equipped[a.slot])
        throw new Error("No item is equipped in that slot.");
      if (usedSlots(p) >= r.capacity)
        throw new Error("Inventory full. Free a bag slot to unequip.");
      r.equipped[a.slot] = null;
      entry.message = "Equipment returned to your bag.";
      break;
    }
    case "flag": {
      const e = findEntry(p, a.itemId);
      if (!["locked", "favorite"].includes(a.flag))
        throw new Error("Invalid item flag");
      if (e.equipment) e.equipment[a.flag] = !e.equipment[a.flag];
      else {
        const flags = r.stackFlags[e.definitionId] ?? {
          favorite: false,
          locked: false,
        };
        r.stackFlags[e.definitionId] = { ...flags, [a.flag]: !flags[a.flag] };
      }
      entry.itemId = e.id;
      entry.message = "Item protection updated.";
      break;
    }
    case "enhance": {
      const e = findEntry(p, a.itemId).equipment;
      if (!e) throw new Error("Select equipment to enhance.");
      if (e.locked) throw new Error("Unlock this item before enhancing.");
      if (e.enhancement !== a.expectedEnhancement)
        throw new Error("Enhancement quote is stale.");
      const outcome = enhancementOutcome(e, rng),
        quote = outcome.quote;
      spend(p, quote.gold, quote.materials);
      entry.enhancement = {
        before: e.enhancement,
        after: outcome.after,
        success: outcome.success,
        base: quote.base,
        bonus: quote.bonus,
        effective: quote.effective,
        pityBefore: e.pity,
        pityAfter: outcome.pity,
        cost: quote.gold,
        materials: quote.materials,
      };
      e.enhancement = outcome.after;
      e.pity = outcome.pity;
      entry.itemId = e.id;
      entry.items = Object.entries(quote.materials).map(
        ([id, n]) => `Consumed ${ITEMS[id].name} ×${n}`,
      );
      entry.message = outcome.success
        ? `Enhancement succeeded: +${outcome.after}.`
        : `Enhancement failed: +${outcome.after}. ${outcome.pity > entry.enhancement.pityBefore ? "Pity increased." : "Pity unchanged."}`;
      break;
    }
    case "sell": {
      const e = findEntry(p, a.itemId),
        n = quantity(a.quantity),
        value = sellPrice(e) * n;
      removeEntry(p, e, n);
      gold(p, value);
      entry.itemId = e.id;
      entry.items = [`Sold ${ITEMS[e.definitionId].name} ×${n}`];
      entry.message = `Sold for ${value} gold.`;
      break;
    }
    case "dismantle": {
      const e = findEntry(p, a.itemId);
      if (a.quantity !== 1)
        throw new Error("Dismantle one unique item at a time.");
      const rewards = dismantleYield(e);
      removeEntry(p, e);
      for (const [id, n] of Object.entries(rewards))
        if (n > 0) grantStack(p, id, n);
      entry.itemId = e.id;
      entry.items = Object.entries(rewards)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => `Obtained ${ITEMS[id].name} ×${n}`);
      entry.message = "Equipment dismantled into materials.";
      break;
    }
    case "buy": {
      const offer = SHOP.find((o) => o.id === a.offerId),
        n = quantity(a.quantity);
      if (!offer) throw new Error("Unknown shop offer.");
      if (!canAdd(p, offer.item, offer.rarity ? n : 1))
        throw new Error("Inventory full.");
      spend(p, offer.price * n);
      if (offer.rarity)
        for (let i = 0; i < n; i++)
          addEquipment(
            p,
            shopEquipment(offer.id, `purchase:${command.id}:${i}`),
          );
      else grantStack(p, offer.item, n);
      entry.items = [`Obtained ${ITEMS[offer.item].name} ×${n}`];
      entry.message = "Purchase complete.";
      break;
    }
    case "craft": {
      const recipe = RECIPES.find((r) => r.id === a.recipeId),
        n = quantity(a.quantity);
      if (!recipe) throw new Error("Unknown recipe.");
      spend(
        p,
        recipe.gold * n,
        Object.fromEntries(
          Object.entries(recipe.materials).map(([id, v]) => [id, v * n]),
        ),
      );
      grantStack(p, recipe.output, recipe.quantity * n);
      entry.items = [
        ...Object.entries(recipe.materials).map(
          ([id, count]) => `Consumed ${ITEMS[id].name} ×${count * n}`,
        ),
        `Crafted ${ITEMS[recipe.output].name} ×${recipe.quantity * n}`,
      ];
      entry.message = "Crafting complete.";
      break;
    }
    case "upgrade": {
      const def = UPGRADES[a.upgradeId];
      if (!def) throw new Error("Unknown permanent upgrade");
      const rank = r.upgrades[a.upgradeId] ?? 0;
      if (rank >= 10) throw new Error("Maximum permanent rank reached.");
      spend(p, 100 * (rank + 1) ** 2, { "copper-ore": rank + 1 });
      r.upgrades[a.upgradeId] = rank + 1;
      entry.items = [`Consumed ${ITEMS["copper-ore"].name} ×${rank + 1}`];
      entry.message = `${def.name} reached rank ${rank + 1}.`;
      break;
    }
    case "claim":
      claim(p, a.parcelId);
      entry.message = "Loot parcel claimed.";
      break;
    case "consume": {
      if (
        !["health-tonic", "focus-tonic"].includes(a.definitionId) ||
        (r.consumables[a.definitionId] ?? 0) < 1
      )
        throw new Error("No tonic available.");
      r.consumables[a.definitionId]--;
      entry.items = [`Consumed ${ITEMS[a.definitionId].name} ×1`];
      entry.message = "Tonic used.";
      break;
    }
    default:
      throw new Error("Unknown action");
  }
  entry.gold = p.gold - before;
  r.revision++;
  r.history.push(entry);
  p.receipts.push(command.id);
  if (
    !validRpg(r) ||
    usedSlots(p) > r.capacity ||
    !Number.isSafeInteger(p.gold) ||
    p.gold < 0
  )
    throw new Error("Invalid inventory transition");
  return { progress: p, entry };
}
