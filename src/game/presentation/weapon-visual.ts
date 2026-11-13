import { ITEMS, RARITIES } from "../rpg/content";
import type { EquipmentInstance, WeaponSnapshot } from "../rpg/model";

export const EVOLUTION_TIERS = [
  "Forged",
  "Reinforced",
  "Awakened",
  "Ascendant",
  "Mythic",
  "Transcendent",
] as const;
export type EvolutionTier = 0 | 1 | 2 | 3 | 4 | 5;
export const WEAPON_FAMILIES = ["staff", "sword", "scepter", "glaive"] as const;
export const EVOLUTION_ART = {
  key: "weapon-evolution",
  path: "/assets/characters/weapon-evolution.png",
  size: 32,
  columns: 6,
  rows: 4,
  grip: { x: 16, y: 24 },
} as const;
export const LEGACY_WEAPON_ART = {
  key: "equipment-weapons",
  path: "/assets/characters/weapons.png",
  columns: 18,
  rows: 1,
} as const;
export type VisualWeapon = EquipmentInstance | WeaponSnapshot;

/** Invalid external values fall back to the base appearance; no saved fields are written. */
export function evolutionTier(enhancement: unknown): EvolutionTier {
  return (
    typeof enhancement === "number" && Number.isFinite(enhancement)
      ? Math.max(0, Math.min(5, Math.floor(enhancement / 3)))
      : 0
  ) as EvolutionTier;
}

/** Snapshot appearance belongs to its historical instance, never the current inventory. */
export function resolveWeaponVisual(weapon: VisualWeapon | null | undefined) {
  if (!weapon) return null;
  const instance = "instance" in weapon ? weapon.instance : weapon;
  const spec = ITEMS[instance.definitionId]?.weapon;
  if (!spec) return null;
  const tier = evolutionTier(instance.enhancement);
  return {
    ...EVOLUTION_ART,
    frame: WEAPON_FAMILIES.indexOf(spec.family) * EVOLUTION_ART.columns + tier,
    family: spec.family,
    tier,
    tierName: EVOLUTION_TIERS[tier],
    enhancement: instance.enhancement,
    instanceId: instance.id,
    rarityAccent: RARITIES[instance.rarity]?.color ?? RARITIES.common.color,
    effectColor: {
      staff: "#9de8c3",
      sword: "#ffe7a1",
      scepter: "#a6edff",
      glaive: "#ffad73",
    }[spec.family],
    fallback: { ...LEGACY_WEAPON_ART, frame: spec.frame },
  };
}
export type WeaponVisual = NonNullable<ReturnType<typeof resolveWeaponVisual>>;

/** A family-correct legacy fallback, or hide the layer if even that frame is absent. */
export function weaponTexture(
  visual: WeaponVisual,
  hasFrame: (key: string, frame: number) => boolean,
) {
  if (hasFrame(visual.key, visual.frame)) return visual;
  return hasFrame(visual.fallback.key, visual.fallback.frame)
    ? visual.fallback
    : null;
}

export function nextEvolution(enhancement: number) {
  const tier = evolutionTier(enhancement);
  return tier === 5
    ? null
    : { enhancement: (tier + 1) * 3, tier: (tier + 1) as EvolutionTier };
}

/** Bounded decorative work only. Combat simulation does not consume this specification. */
export function weaponEffects(
  tier: EvolutionTier,
  reduced = false,
  low = false,
) {
  return {
    glow: !reduced && tier >= 2,
    pulse: !reduced && !low && tier >= 3,
    particles: reduced || low || tier < 4 ? 0 : tier === 5 ? 3 : 2,
    trail: !reduced && !low && tier === 5,
  };
}
