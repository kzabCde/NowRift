import { RELICS } from "../loadout";
import { ITEM_IDS, WORLDS } from "../campaign/content";
import { SLOTS, type ItemDefinition, type Rarity, type StatKey } from "./model";
export const RARITIES: Record<
  Rarity,
  {
    name: string;
    color: string;
    multiplier: number;
    affixes: number;
    weight: number;
    enhance: number;
    cost: number;
    salvage: number;
  }
> = {
  common: {
    name: "Common",
    color: "#adb4bc",
    multiplier: 1,
    affixes: 0,
    weight: 62,
    enhance: 0.04,
    cost: 1,
    salvage: 1,
  },
  uncommon: {
    name: "Uncommon",
    color: "#81c495",
    multiplier: 1.2,
    affixes: 1,
    weight: 25,
    enhance: 0.05,
    cost: 1.35,
    salvage: 2,
  },
  rare: {
    name: "Rare",
    color: "#79aff1",
    multiplier: 1.5,
    affixes: 2,
    weight: 10,
    enhance: 0.06,
    cost: 1.8,
    salvage: 4,
  },
  epic: {
    name: "Epic",
    color: "#bd8bef",
    multiplier: 1.9,
    affixes: 3,
    weight: 2.7,
    enhance: 0.07,
    cost: 2.6,
    salvage: 7,
  },
  legendary: {
    name: "Legendary",
    color: "#e6bd68",
    multiplier: 2.5,
    affixes: 4,
    weight: 0.3,
    enhance: 0.08,
    cost: 4,
    salvage: 12,
  },
};
const primary: Record<(typeof SLOTS)[number], StatKey> = {
  weapon: "damage",
  armor: "maxHp",
  helmet: "armor",
  boots: "speed",
  ring: "critChance",
  necklace: "regen",
};
const names = [
  [
    "Riftwood Staff",
    "Wanderer’s Vest",
    "Briar Hood",
    "Trail Boots",
    "Amber Ring",
    "Leaf Pendant",
  ],
  [
    "Sunsteel Blade",
    "Dune Mail",
    "Scarab Helm",
    "Nomad Treads",
    "Solar Band",
    "Sundial Amulet",
  ],
  [
    "Glacial Scepter",
    "Frostguard Plate",
    "Warden’s Crown",
    "Snowstriders",
    "Sapphire Loop",
    "Crystal Tear",
  ],
  [
    "Ember Glaive",
    "Obsidian Cuirass",
    "Ashen Horns",
    "Cinderwalkers",
    "Infernal Seal",
    "Sovereign’s Heart",
  ],
];
export const ITEMS: Record<string, ItemDefinition> = Object.fromEntries(
  [
    ...WORLDS.flatMap((w, wi) =>
      SLOTS.map((slot, i) => ({
        id: `${w.id}-${slot}`,
        name: names[wi][i],
        kind: "equipment" as const,
        slot,
        icon: wi * 6 + i,
        primary: primary[slot],
        description: `${w.name} ${slot}. A permanent companion for campaign runs.`,
      })),
    ),
    ...WORLDS.map((w, i) => ({
      id: "boss-" + w.id,
      name: RELICS[w.boss.reward as keyof typeof RELICS].name,
      kind: "equipment" as const,
      slot: "necklace" as const,
      icon: i * 6 + 5,
      primary: (["regen", "damage", "maxHp", "critChance"] as const)[i],
      description: `A unique relic recovered from ${w.boss.name}.`,
    })),
    ...ITEM_IDS.map((id, i) => ({
      id,
      name: id
        .split("-")
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join(" "),
      kind: "material" as const,
      icon: 24 + i,
      description: "A locally stored crafting resource earned from the worlds.",
      buyPrice: 20 + i * 5,
      sellPrice: 2 + i,
    })),
    {
      id: "health-tonic",
      name: "Crimson Tonic",
      kind: "consumable" as const,
      icon: 40,
      description: "Restore 35 HP during a paused campaign run.",
      buyPrice: 25,
      sellPrice: 5,
    },
    {
      id: "focus-tonic",
      name: "Azure Tonic",
      kind: "consumable" as const,
      icon: 41,
      description: "Attack 30% faster for 20 seconds. Use from the pause menu.",
      buyPrice: 45,
      sellPrice: 8,
    },
  ].map((d) => [d.id, d]),
);
export const AFFIX_BOUNDS: Record<StatKey, [number, number]> = {
  maxHp: [5, 16],
  damage: [1, 3],
  attackSpeed: [0.02, 0.06],
  critChance: [0.01, 0.025],
  critDamage: [0.04, 0.12],
  armor: [2, 6],
  speed: [2, 6],
  regen: [0.1, 0.3],
  projectiles: [1, 1],
  area: [0.03, 0.08],
};
export const PRIMARY_VALUES: Record<StatKey, number> = {
  maxHp: 12,
  damage: 2,
  attackSpeed: 0.03,
  critChance: 0.015,
  critDamage: 0.08,
  armor: 3,
  speed: 4,
  regen: 0.25,
  projectiles: 1,
  area: 0.05,
};
export const ENHANCEMENT = {
  max: 15,
  pityEnabled: true,
  pityPerFailure: 0.02,
  pityCap: 0.2,
  downgradeChance: 0.5,
  success: [
    1, 0.9, 0.9, 0.9, 0.7, 0.7, 0.7, 0.45, 0.45, 0.45, 0.25, 0.25, 0.25, 0.1,
    0.1,
  ],
};
export const EQUIPMENT_DROPS = {
  enemy: 0.025,
  elite: 0.18,
  boss: 1,
  completion: 0.4,
  firstClear: 1,
};
export const UPGRADES = {
  training: {
    name: "Arcane Training",
    description: "+1.5 permanent damage per rank",
    stat: "damage" as const,
    amount: 1.5,
  },
  vigor: {
    name: "Oakheart",
    description: "+8 permanent max HP per rank",
    stat: "maxHp" as const,
    amount: 8,
  },
  ward: {
    name: "Stoneward",
    description: "+2 permanent armor per rank",
    stat: "armor" as const,
    amount: 2,
  },
  stride: {
    name: "Wayfarer",
    description: "+3 permanent movement speed per rank",
    stat: "speed" as const,
    amount: 3,
  },
};
export const SHOP = [
  { id: "health-tonic", item: "health-tonic", price: 25 },
  { id: "focus-tonic", item: "focus-tonic", price: 45 },
  { id: "ore", item: "copper-ore", price: 20 },
  { id: "stone", item: "enhancement-stone", price: 50 },
  {
    id: "staff",
    item: "forest-weapon",
    rarity: "uncommon" as Rarity,
    level: 3,
    price: 120,
  },
  {
    id: "armor",
    item: "forest-armor",
    rarity: "uncommon" as Rarity,
    level: 3,
    price: 120,
  },
  {
    id: "blade",
    item: "desert-weapon",
    rarity: "rare" as Rarity,
    level: 5,
    price: 350,
  },
  {
    id: "ring",
    item: "frozen-ring",
    rarity: "rare" as Rarity,
    level: 5,
    price: 350,
  },
];
export const RECIPES = [
  {
    id: "refine-stone",
    name: "Refine Enhancement Stone",
    gold: 20,
    materials: { wood: 3, "slime-core": 2 } as Record<string, number>,
    output: "enhancement-stone",
    quantity: 1,
  },
  {
    id: "brew-tonic",
    name: "Brew Crimson Tonic",
    gold: 10,
    materials: { wood: 2, "slime-core": 1 } as Record<string, number>,
    output: "health-tonic",
    quantity: 1,
  },
];
export const statNames: Record<StatKey, string> = {
  maxHp: "Max HP",
  damage: "Attack damage",
  attackSpeed: "Attack speed",
  critChance: "Critical chance",
  critDamage: "Critical damage",
  armor: "Armor",
  speed: "Movement speed",
  regen: "HP / second",
  projectiles: "Projectile count",
  area: "Area of effect",
};
