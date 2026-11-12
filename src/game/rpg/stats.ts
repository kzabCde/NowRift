import {
  CHARACTERS,
  RELICS,
  type CharacterId,
  type Loadout,
  type RelicId,
} from "../loadout";
import { resolveAppearance } from "../presentation/appearance";
import type { Progress } from "../campaign/progression";
import { validEquipmentInstance } from "./profile";
import {
  WEAPONS,
  type WeaponId,
  type UpgradeId,
  type AttackDefinition,
} from "../content/forest";
import { ITEMS, RARITIES, PRIMARY_VALUES, UPGRADES } from "./content";
import {
  SLOTS,
  type Attributes,
  type StatKey,
  type CharacterStats,
  type EquipmentInstance,
  type WeaponSnapshot,
} from "./model";
export const zero = (): Attributes => ({
  maxHp: 0,
  damage: 0,
  attackSpeed: 0,
  critChance: 0,
  critDamage: 0,
  armor: 0,
  speed: 0,
  regen: 0,
  projectiles: 0,
  area: 0,
});
/** Minimum lifetime XP required to reach a permanent level. */
export function totalXpForLevel(level: number) {
  const completed = Math.max(0, Math.min(59, Math.floor(level) - 1));
  return completed * 100 + (completed * (completed - 1) * 50) / 2;
}
export function characterLevel(xp: number) {
  let level = 1,
    remaining = Math.max(0, xp);
  while (level < 60 && remaining >= 100 + (level - 1) * 50) {
    remaining -= 100 + (level - 1) * 50;
    level++;
  }
  return {
    level,
    xp: remaining,
    next: level === 60 ? 0 : 100 + (level - 1) * 50,
  };
}
export function itemStats(
  item: EquipmentInstance,
  enhancement = item.enhancement,
): Attributes {
  const def = ITEMS[item.definitionId],
    out = zero(),
    rarity = RARITIES[item.rarity],
    scale =
      (1 + item.level * 0.16) *
      rarity.multiplier *
      (1 + enhancement * rarity.enhance);
  if (def?.primary) out[def.primary] = PRIMARY_VALUES[def.primary] * scale;
  for (const [key, value] of Object.entries(item.affixes))
    out[key as StatKey] += (value ?? 0) * (1 + enhancement * rarity.enhance);
  if (def?.slot === "armor")
    out.armor +=
      item.level * rarity.multiplier * (1 + enhancement * rarity.enhance);
  return out;
}
function cap(
  stats: Attributes,
  weapon: WeaponId | AttackDefinition,
  level: number,
): CharacterStats {
  const s = {
    ...stats,
    maxHp: Math.min(5000, Math.max(1, Math.round(stats.maxHp))),
    damage: Math.min(10000, Math.max(0, stats.damage)),
    attackSpeed: Math.min(2, Math.max(0, stats.attackSpeed)),
    critChance: Math.min(0.75, Math.max(0, stats.critChance)),
    critDamage: Math.min(4, Math.max(1, stats.critDamage)),
    armor: Math.min(300, Math.max(0, stats.armor)),
    speed: Math.min(360, Math.max(60, stats.speed)),
    regen: Math.min(20, Math.max(0, stats.regen)),
    projectiles: Math.min(8, Math.max(1, Math.floor(stats.projectiles))),
    area: Math.min(4, Math.max(1, stats.area)),
  };
  const interval = Math.max(
    0.12,
    (typeof weapon === "string" ? WEAPONS[weapon] : weapon).interval /
      (1 + s.attackSpeed),
  );
  return {
    ...s,
    interval,
    level,
    power: powerRating(s, interval),
  };
}
export function calculateStats(
  profile: Progress,
  weapon: WeaponId = "arcane",
  character: CharacterId = profile.local?.character ?? "wanderer",
): CharacterStats {
  const equipped = equippedWeapon(profile);
  // Only explicit practice without an RPG inventory may use a free attack style.
  const attackId = profile.rpg ? equipped?.definition.weapon?.attack : weapon;
  const { level } = characterLevel(profile.xp),
    w = attackId
      ? WEAPONS[attackId]
      : { ...WEAPONS.arcane, damage: 0, interval: 1 },
    c = CHARACTERS[character],
    out: Attributes = {
      maxHp: c.hp + (level - 1) * 8,
      damage: w.damage + (level - 1) * 1.25,
      attackSpeed: 0,
      critChance: c.crit,
      critDamage: 1.5,
      armor: 0,
      speed: c.speed,
      regen: 0,
      projectiles: w.projectiles ?? 1,
      area: 1,
    };
  const rpg = profile.rpg;
  if (rpg) {
    for (const slot of SLOTS) {
      const item = rpg.equipment.find((e) => e.id === rpg.equipped[slot]);
      if (item) {
        const stats = itemStats(item);
        for (const key of Object.keys(stats) as StatKey[])
          out[key] += stats[key];
      }
    }
    for (const [id, def] of Object.entries(UPGRADES))
      out[def.stat] += (rpg.upgrades[id] ?? 0) * def.amount;
  }
  if (profile.rpg && !equipped) out.damage = 0;
  return cap(out, w, level);
}
export function temporaryStats(
  base: CharacterStats,
  weapon: WeaponId,
  stacks: Partial<Record<UpgradeId, number>>,
  focus = false,
  attack: AttackDefinition = WEAPONS[weapon],
): CharacterStats {
  const n = (key: UpgradeId) => stacks[key] ?? 0;
  const out = cap(
    {
      ...base,
      maxHp: base.maxHp + n("vitality") * 25,
      damage: base.damage + attack.damage * 0.25 * n("power"),
      speed: base.speed + 18 * n("stride"),
      critChance: base.critChance + 0.05 * n("critical"),
      critDamage: base.critDamage + 0.25 * n("fury"),
      projectiles: base.projectiles + n("multishot"),
      area: base.area + 0.2 * n("area"),
      regen: base.regen + 0.5 * n("regen"),
    },
    weapon,
    base.level,
  );
  out.interval = Math.max(
    0.12,
    (base.interval * 0.88 ** n("rapid")) / (focus ? 1.3 : 1),
  );
  out.power = powerRating(out, out.interval);
  return out;
}
export function incomingDamage(amount: number, armor: number) {
  return Math.max(1, Math.round((amount * 100) / (100 + Math.max(0, armor))));
}

export function campaignLoadout(
  profile: Progress,
  _legacyWeapon?: WeaponId,
  character: CharacterId = profile.local?.character ?? "wanderer",
) {
  const equipped = resolveEquippedWeapon(profile, character);
  if (!equipped)
    throw new Error("Equip a weapon in Inventory before entering a stage.");
  return {
    character,
    weaponSnapshot: equipped,
    visualAppearance: resolveAppearance(profile, character),
    build: equipped.stats,
    appearance: {
      rarity: equipped.rarity,
      icon: ITEMS[equipped.definitionId].icon,
    },
  };
}

function equippedWeapon(profile: Progress) {
  const id = profile.rpg?.equipped.weapon;
  if (!id) return null;
  const owned = profile.rpg!.equipment.filter((item) => item.id === id);
  if (owned.length !== 1) return null;
  const instance = owned[0],
    definition = ITEMS[instance.definitionId];
  if (
    !validEquipmentInstance(instance) ||
    !definition ||
    definition.kind !== "equipment" ||
    definition.slot !== "weapon" ||
    !definition.weapon ||
    !RARITIES[instance.rarity] ||
    !Object.hasOwn(WEAPONS, definition.weapon.attack)
  )
    return null;
  return { instance, definition };
}
export function resolveEquippedWeapon(
  profile: Progress,
  character: CharacterId = profile.local?.character ?? "wanderer",
): WeaponSnapshot | null {
  const selected = equippedWeapon(profile);
  if (!selected) return null;
  const { instance, definition } = selected,
    spec = definition.weapon!;
  return {
    schema: 1,
    instanceId: instance.id,
    definitionId: definition.id,
    name: definition.name,
    family: spec.family,
    attackId: spec.attack,
    attack: { ...WEAPONS[spec.attack] },
    assetKey: "equipment-weapons",
    frame: spec.frame,
    rarity: instance.rarity,
    enhancement: instance.enhancement,
    instance: structuredClone(instance),
    stats: calculateStats(profile, spec.attack, character),
  };
}

export function powerRating(s: Attributes, interval: number) {
  return Math.round(
    (s.damage / interval) *
      (1 + s.critChance * (s.critDamage - 1)) *
      (1 + (s.projectiles - 1) * 0.35) *
      (1 + (s.area - 1) * 0.25) +
      s.maxHp * 0.08 +
      s.armor * 0.5 +
      s.regen * 8 +
      (s.speed - 180) * 0.15,
  );
}
export function equipmentPower(item: EquipmentInstance) {
  const base: Attributes = {
      maxHp: 100,
      damage: 10,
      attackSpeed: 0,
      critChance: 0.05,
      critDamage: 1.5,
      armor: 0,
      speed: 180,
      regen: 0,
      projectiles: 1,
      area: 1,
    },
    before = cap(base, "arcane", 1),
    bonus = itemStats(item),
    next = { ...base };
  for (const key of Object.keys(bonus) as StatKey[]) next[key] += bonus[key];
  return cap(next, "arcane", 1).power - before.power;
}

/** Retain the original practice character/relic loadout, derived from the single RPG inventory. */
export function practiceLoadout(
  profile: Progress,
  character: CharacterId,
): Loadout {
  const e = profile.rpg?.equipment.find(
    (e) => e.id === profile.rpg!.equipped.necklace,
  );
  const relic = e
    ? ((Object.keys(RELICS) as RelicId[]).find(
        (id) => e.definitionId === "boss-" + RELICS[id].world,
      ) ?? null)
    : null;
  return { character, relic, rank: Math.min(3, e?.enhancement ?? 0) };
}
