import { seeded } from "../campaign/content";
import { ITEMS, RARITIES, AFFIX_BOUNDS } from "./content";
import {
  RARITY_IDS,
  type EquipmentInstance,
  type Rarity,
  type StatKey,
} from "./model";
export function hash(text: string) {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++)
    n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return n >>> 0;
}
export function createEquipment(
  id: string,
  definitionId: string,
  rarity: Rarity,
  level: number,
  rng: () => number,
): EquipmentInstance {
  if (
    ITEMS[definitionId]?.kind !== "equipment" ||
    !RARITIES[rarity] ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > 50
  )
    throw new Error("Invalid equipment definition");
  const keys = Object.keys(AFFIX_BOUNDS) as StatKey[],
    affixes: EquipmentInstance["affixes"] = {};
  for (let i = 0; i < RARITIES[rarity].affixes; i++) {
    const index = Math.floor(rng() * keys.length),
      key = keys.splice(index, 1)[0],
      [min, max] = AFFIX_BOUNDS[key];
    affixes[key] =
      Math.round(
        (min + (max - min) * rng()) *
          (key === "projectiles" ? 1 : 1 + level * 0.035) *
          1000,
      ) / 1000;
  }
  return {
    id,
    definitionId,
    rarity,
    level,
    enhancement: 0,
    pity: 0,
    affixes,
    locked: false,
    favorite: false,
  };
}
export function weightedRarity(
  rng: () => number,
  factor = 1,
  min: Rarity = "common",
): Rarity {
  const weights = RARITY_IDS.map(
      (r, i) => RARITIES[r].weight * (i ? factor : 1),
    ),
    sum = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * sum;
  let chosen: Rarity = "legendary";
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      chosen = RARITY_IDS[i];
      break;
    }
  }
  return RARITY_IDS[
    Math.max(RARITY_IDS.indexOf(chosen), RARITY_IDS.indexOf(min))
  ];
}
export function seededEquipment(
  id: string,
  definition: string,
  rarity: Rarity,
  level: number,
) {
  return createEquipment(id, definition, rarity, level, seeded(hash(id)));
}
