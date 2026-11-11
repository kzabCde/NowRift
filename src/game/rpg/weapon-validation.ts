import { WEAPONS } from "../content/forest";
import { ITEMS, RARITIES } from "./content";
import type { WeaponSnapshot } from "./model";
import { validEquipmentInstance } from "./profile";
export function validWeaponSnapshot(value: unknown): value is WeaponSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as WeaponSnapshot,
    spec = ITEMS[v.definitionId]?.weapon;
  if (
    !spec ||
    v.schema !== 1 ||
    v.assetKey !== "equipment-weapons" ||
    v.family !== spec.family ||
    v.attackId !== spec.attack ||
    v.frame !== spec.frame ||
    !Object.hasOwn(WEAPONS, v.attackId) ||
    typeof v.name !== "string" ||
    !v.name ||
    v.name.length > 100 ||
    !validEquipmentInstance(v.instance) ||
    v.instance.id !== v.instanceId ||
    v.instance.definitionId !== v.definitionId ||
    v.instance.rarity !== v.rarity ||
    v.instance.enhancement !== v.enhancement ||
    !RARITIES[v.rarity]
  )
    return false;
  const a = v.attack,
    s = v.stats;
  if (
    !a ||
    !s ||
    !["projectile", "pulse", "slash", "sweep"].includes(
      a.kind ?? "projectile",
    ) ||
    !/^#[a-f0-9]{6}$/i.test(a.color) ||
    !Number.isInteger(a.icon) ||
    a.icon < 0 ||
    a.icon > 7
  )
    return false;
  if (
    ![
      a.damage,
      a.interval,
      a.range,
      a.speed,
      a.arc ?? 0,
      a.blast ?? 0,
      a.projectiles ?? 1,
    ].every((n) => Number.isFinite(n) && n >= 0 && n <= 10000) ||
    a.interval < 0.12 ||
    a.interval > 10 ||
    a.range < 1 ||
    (a.kind === "projectile" && a.speed <= 0)
  )
    return false;
  const fields = [
    "maxHp",
    "damage",
    "attackSpeed",
    "critChance",
    "critDamage",
    "armor",
    "speed",
    "regen",
    "projectiles",
    "area",
    "interval",
    "level",
    "power",
  ] as const;
  return (
    fields.every(
      (key) => Number.isFinite(s[key]) && s[key] >= 0 && s[key] <= 1e8,
    ) &&
    s.maxHp > 0 &&
    s.maxHp <= 5000 &&
    s.damage <= 10000 &&
    s.interval >= 0.12 &&
    s.interval <= 10 &&
    s.projectiles >= 1 &&
    s.projectiles <= 8 &&
    s.level >= 1 &&
    s.level <= 60 &&
    s.speed <= 360
  );
}
