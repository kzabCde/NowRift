import type { Progress } from "../campaign/progression";
import type { EquipmentInstance, StatKey } from "./model";
import { ITEMS } from "./content";
import { validEquipmentInstance } from "./profile";

/** Display-only copy: neither a purchase nor ownership. Never sent to persistence. */
export function previewEquipment(
  profile: Progress,
  candidate: EquipmentInstance,
): Progress {
  const slot = ITEMS[candidate.definitionId]?.slot;
  if (!slot || !profile.rpg || !validEquipmentInstance(candidate))
    throw new Error("Invalid equipment preview.");
  const next = structuredClone(profile);
  next.rpg!.equipment = next
    .rpg!.equipment.filter((item) => item.id !== candidate.id)
    .concat(structuredClone(candidate));
  next.rpg!.equipped[slot] = candidate.id;
  return next;
}
export function formatEquipmentStat(key: StatKey, value: number) {
  return ["attackSpeed", "critChance", "critDamage", "area"].includes(key)
    ? `${(value * 100).toFixed(1)}%`
    : value.toFixed(["regen", "damage"].includes(key) ? 1 : 0);
}
