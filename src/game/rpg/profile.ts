import type { Progress } from "../campaign/progression";
import {
  ITEMS,
  RARITIES,
  UPGRADES,
  ENHANCEMENT,
  AFFIX_BOUNDS,
} from "./content";
import { seededEquipment } from "./items";
import { emptyEquipment, addEquipment } from "./inventory";
import {
  SLOTS,
  LEGACY_SLOTS,
  type RpgState,
  type EquipmentInstance,
} from "./model";
export function validEquipmentInstance(e: EquipmentInstance) {
  return (
    !!e &&
    typeof e.id === "string" &&
    e.id.length > 0 &&
    ITEMS[e.definitionId]?.kind === "equipment" &&
    !!RARITIES[e.rarity] &&
    Number.isInteger(e.level) &&
    e.level >= 1 &&
    e.level <= 50 &&
    Number.isInteger(e.enhancement) &&
    e.enhancement >= 0 &&
    e.enhancement <= ENHANCEMENT.max &&
    Number.isInteger(e.pity) &&
    e.pity >= 0 &&
    e.pity <= 10000 &&
    typeof e.locked === "boolean" &&
    typeof e.favorite === "boolean" &&
    !!e.affixes &&
    Object.keys(e.affixes).length <= RARITIES[e.rarity].affixes &&
    Object.entries(e.affixes).every(
      ([k, v]) => k in AFFIX_BOUNDS && Number.isFinite(v) && v >= 0 && v < 1000,
    )
  );
}
function validRpgVersion(r: unknown, legacy = false): boolean {
  if (!r || typeof r !== "object") return false;
  const p = r as RpgState;
  const slots = legacy ? LEGACY_SLOTS : SLOTS;
  if (
    p.schema !== (legacy ? 1 : 2) ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 0 ||
    p.capacity !== 60 ||
    !Array.isArray(p.equipment) ||
    !p.equipment.every(validEquipmentInstance) ||
    new Set(p.equipment.map((e) => e.id)).size !== p.equipment.length ||
    !p.equipped ||
    Object.keys(p.equipped).length !== slots.length ||
    !Object.keys(p.equipped).every((s) =>
      (slots as readonly string[]).includes(s),
    ) ||
    !p.consumables ||
    !p.upgrades ||
    !p.stackFlags ||
    !Array.isArray(p.history) ||
    !Array.isArray(p.overflow)
  )
    return false;
  if (
    !Object.entries(p.stackFlags).every(
      ([id, f]) =>
        ITEMS[id] &&
        ITEMS[id].kind !== "equipment" &&
        f &&
        typeof f.favorite === "boolean" &&
        typeof f.locked === "boolean",
    )
  )
    return false;
  const equipped = Object.values(p.equipped).filter(Boolean);
  if (new Set(equipped).size !== equipped.length) return false;
  if (
    !slots.every(
      (s) =>
        p.equipped[s] === null ||
        p.equipment.some(
          (e) => e.id === p.equipped[s] && ITEMS[e.definitionId].slot === s,
        ),
    )
  )
    return false;
  if (
    !Object.entries(p.consumables).every(
      ([id, n]) =>
        ITEMS[id]?.kind === "consumable" && Number.isSafeInteger(n) && n >= 0,
    )
  )
    return false;
  if (
    !Object.entries(p.upgrades).every(
      ([id, n]) => id in UPGRADES && Number.isInteger(n) && n >= 0 && n <= 10,
    )
  )
    return false;
  if (
    !p.overflow.every(
      (o) =>
        typeof o.id === "string" &&
        (o.equipment
          ? validEquipmentInstance(o.equipment)
          : ITEMS[o.definitionId!]?.kind !== "equipment" &&
            !!ITEMS[o.definitionId!] &&
            Number.isSafeInteger(o.quantity) &&
            o.quantity! > 0),
    )
  )
    return false;
  const ids = [
    ...p.equipment.map((e) => e.id),
    ...p.overflow.filter((o) => o.equipment).map((o) => o.equipment!.id),
  ];
  return (
    new Set(ids).size === ids.length &&
    new Set(p.overflow.map((o) => o.id)).size === p.overflow.length &&
    p.history.every(
      (h) =>
        typeof h.id === "string" &&
        Number.isFinite(h.at) &&
        Number.isFinite(h.gold) &&
        typeof h.message === "string" &&
        Array.isArray(h.items),
    )
  );
}
export function validRpg(r: unknown): r is RpgState {
  return validRpgVersion(r);
}
/** A strict, idempotent upgrade. Invalid current/legacy saves are never repaired by guessing. */
export function migrateRpg(value: unknown): RpgState | null {
  if (validRpg(value)) return value;
  if (!validRpgVersion(value, true)) return null;
  const old = value as RpgState;
  return {
    ...structuredClone(old),
    schema: 2,
    equipped: { ...old.equipped, pants: null },
  };
}
/** Add the local RPG schema once; preserve the existing campaign wallet and receipts. */
export function initializeRpg(profile: Progress): Progress {
  if (profile.rpg) {
    const migrated = migrateRpg(profile.rpg);
    if (!migrated)
      throw new Error("RPG save is damaged. Original data has been preserved.");
    return migrated === profile.rpg
      ? profile
      : { ...structuredClone(profile), rpg: migrated };
  }
  const p: Progress = structuredClone(profile);
  p.rpg = {
    schema: 2,
    revision: 0,
    capacity: 60,
    equipment: [],
    equipped: emptyEquipment(),
    consumables: { "health-tonic": 3 },
    stackFlags: {},
    overflow: [],
    upgrades: {},
    history: [],
  };
  for (const slot of LEGACY_SLOTS) {
    const item = seededEquipment(
      "starter-" + slot,
      "forest-" + slot,
      "common",
      1,
    );
    p.rpg.equipment.push(item);
    p.rpg.equipped[slot] = item.id;
  }
  p.candidates
    .map((id, i) => ({ id, i }))
    .sort(
      (a, b) =>
        Number(b.id === profile.equipment?.equipped) -
        Number(a.id === profile.equipment?.equipped),
    )
    .forEach(({ id, i }) => {
      const world =
        id === "solar-relic"
          ? "desert"
          : id === "glacial-relic"
            ? "frozen"
            : id === "sovereign-relic"
              ? "infernal"
              : "forest";
      const item = seededEquipment(
        `legacy-${i}-${id}`,
        "boss-" + world,
        "rare",
        5,
      );
      item.enhancement =
        profile.equipment?.ranks[
          id as keyof NonNullable<Progress["equipment"]>["ranks"]
        ] ?? 0;
      addEquipment(p, item, "legacy-parcel-" + i);
      if (
        profile.equipment?.equipped === id &&
        !p.rpg!.equipped.necklace?.startsWith("legacy-")
      ) {
        // Equipping preserves the purchased legacy ranks and selected relic without occupying a bag slot.
        const parcel = p.rpg!.overflow.findIndex(
          (o) => o.equipment?.id === item.id,
        );
        if (parcel >= 0) {
          p.rpg!.overflow.splice(parcel, 1);
          p.rpg!.equipment.push(item);
        }
        p.rpg!.equipped.necklace = item.id;
      }
    });
  if (p.candidates.length)
    p.rpg!.history.push({
      id: "migration",
      at: 0,
      kind: "migration",
      message: `Converted ${p.candidates.length} legacy equipment candidates.`,
      gold: 0,
      items: [...p.candidates],
    });
  p.candidates = [];
  delete p.equipment;
  return p;
}
