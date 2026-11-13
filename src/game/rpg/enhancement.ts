import { ENHANCEMENT, RARITIES, ITEMS } from "./content";
import type { EquipmentInstance } from "./model";
export function enhancementQuote(
  item: EquipmentInstance,
  pityEnabled = ENHANCEMENT.pityEnabled,
) {
  const level = item.enhancement;
  if (level >= ENHANCEMENT.max) throw new Error("This item is already +15.");
  const base = ENHANCEMENT.success[level],
    bonus = pityEnabled
      ? Math.min(ENHANCEMENT.pityCap, item.pity * ENHANCEMENT.pityPerFailure)
      : 0;
  const slot = ITEMS[item.definitionId].slot!,
    material =
      slot === "weapon"
        ? "copper-ore"
        : slot === "armor" ||
            slot === "helmet" ||
            slot === "pants" ||
            slot === "boots"
          ? "wood"
          : "slime-core";
  const materials: Record<string, number> = {
    [material]: 1 + Math.floor(level / 3),
  };
  if (level >= 7)
    materials["enhancement-stone"] = 1 + Math.floor((level - 7) / 3);
  return {
    base,
    bonus,
    effective: Math.min(1, base + bonus),
    gold: Math.ceil(
      18 *
        (level + 1) ** 2 *
        RARITIES[item.rarity].cost *
        (slot === "weapon" ? 1.15 : 1),
    ),
    materials,
    before: level,
    after: level + 1,
    pityDescription: pityEnabled
      ? `Failure adds ${ENHANCEMENT.pityPerFailure * 100} percentage points of pity, capped at ${ENHANCEMENT.pityCap * 100}. Success resets pity.`
      : "Enhancement pity is disabled.",
    failure:
      level >= 10
        ? `Failure consumes costs; ${ENHANCEMENT.downgradeChance * 100}% chance to drop one level. Equipment is never destroyed.`
        : "Failure consumes costs; enhancement level is preserved.",
  };
}
export function enhancementOutcome(
  item: EquipmentInstance,
  rng: () => number,
  pityEnabled = ENHANCEMENT.pityEnabled,
) {
  const quote = enhancementQuote(item, pityEnabled),
    success = rng() < quote.effective;
  const after = success
    ? item.enhancement + 1
    : item.enhancement >= 10 && rng() < ENHANCEMENT.downgradeChance
      ? item.enhancement - 1
      : item.enhancement;
  return {
    quote,
    success,
    after,
    pity: success
      ? 0
      : pityEnabled
        ? Math.min(10000, item.pity + 1)
        : item.pity,
  };
}
