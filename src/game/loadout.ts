import type { Game } from "./engine";
export const CHARACTERS = {
  wanderer: {
    name: "Rift Wanderer",
    title: "Keeper of the breach",
    description:
      "A steady hand in a fractured world. Balanced health and movement.",
    hp: 100,
    speed: 180,
    crit: 0.05,
    color: "#bbd7c0",
    tint: 0xffffff,
  },
  sentinel: {
    name: "Ash Sentinel",
    title: "The last oath",
    description:
      "Endure the gathering dark. More health, with a deliberate stride.",
    hp: 130,
    speed: 162,
    crit: 0.05,
    color: "#ddb78b",
    tint: 0xf1cfa6,
  },
  strider: {
    name: "Dusk Strider",
    title: "A shadow unbound",
    description:
      "Move between danger and opportunity. Swift, fragile and precise.",
    hp: 80,
    speed: 207,
    crit: 0.1,
    color: "#accadd",
    tint: 0xb7d6ec,
  },
} as const;
export type CharacterId = keyof typeof CHARACTERS;
export const RELICS = {
  "verdant-relic": {
    name: "Heartwood Sigil",
    world: "forest",
    material: "wood",
    detail: "Regenerate 0.25 HP/s, +0.25 per enhancement",
    icon: 7,
  },
  "solar-relic": {
    name: "Sunken Sun",
    world: "desert",
    material: "ancient-shard",
    detail: "+6% weapon damage, +3% per enhancement",
    icon: 2,
  },
  "glacial-relic": {
    name: "Warden’s Tear",
    world: "frozen",
    material: "frost-crystal",
    detail: "+10 maximum HP, +10 per enhancement",
    icon: 3,
  },
  "sovereign-relic": {
    name: "Cinder Crown",
    world: "infernal",
    material: "infernal-core",
    detail: "+2.5% critical chance, +2.5% per enhancement",
    icon: 6,
  },
} as const;
export type RelicId = keyof typeof RELICS;
export type Equipment = {
  equipped: RelicId | null;
  ranks: Partial<Record<RelicId, number>>;
};
export type Loadout = {
  character: CharacterId;
  relic: RelicId | null;
  rank: number;
};
export const emptyEquipment = (): Equipment => ({ equipped: null, ranks: {} });
export function validEquipment(e: unknown): e is Equipment {
  if (!e || typeof e !== "object" || Array.isArray(e)) return false;
  const v = e as Equipment;
  return (
    (v.equipped === null || Object.hasOwn(RELICS, v.equipped)) &&
    !!v.ranks &&
    typeof v.ranks === "object" &&
    !Array.isArray(v.ranks) &&
    Object.entries(v.ranks).every(
      ([id, n]) =>
        Object.hasOwn(RELICS, id) && Number.isInteger(n) && n >= 0 && n <= 3,
    )
  );
}
export const enhancementCost = (rank: number) => ({
  gold: 120 * (rank + 1),
  material: 3 * (rank + 1),
});
/** Apply once when a fresh run is created. Temporary blessings remain separate. */
export function applyLoadout(g: Game, loadout?: Loadout) {
  const c = CHARACTERS[loadout?.character ?? "wanderer"];
  g.character = loadout?.character ?? "wanderer";
  g.player.hp = g.player.maxHp = c.hp;
  g.player.speed = c.speed;
  g.weapon.crit = c.crit;
  if (!loadout?.relic || !Object.hasOwn(RELICS, loadout.relic)) return;
  const rank = Math.min(3, Math.max(0, Math.floor(loadout.rank))) + 1;
  if (loadout.relic === "verdant-relic") g.regen += 0.25 * rank;
  if (loadout.relic === "solar-relic")
    g.weapon.damage *= 1.06 + (rank - 1) * 0.03;
  if (loadout.relic === "glacial-relic") {
    g.player.maxHp += 10 * rank;
    g.player.hp = g.player.maxHp;
  }
  if (loadout.relic === "sovereign-relic") g.weapon.crit += 0.025 * rank;
}
