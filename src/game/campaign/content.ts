import type { EnemyKind } from "../content/forest";
export type WorldId = "forest" | "desert" | "frozen" | "infernal";
export type DifficultyId = "normal" | "hard" | "nightmare";
export type DifficultyDefinition = {
  id: DifficultyId;
  hp: number;
  speed: number;
  damage: number;
  spawn: number;
  reward: number;
  projectiles: number;
  elites: number;
  duration: number;
};
export const DIFFICULTIES: Record<DifficultyId, DifficultyDefinition> = {
  normal: {
    id: "normal",
    hp: 1,
    speed: 1,
    damage: 1,
    spawn: 1,
    reward: 1,
    projectiles: 1,
    elites: 0.04,
    duration: 1,
  },
  hard: {
    id: "hard",
    hp: 1.35,
    speed: 1.12,
    damage: 1.25,
    spawn: 0.8,
    reward: 1.6,
    projectiles: 3,
    elites: 0.12,
    duration: 1.1,
  },
  nightmare: {
    id: "nightmare",
    hp: 1.8,
    speed: 1.2,
    damage: 1.5,
    spawn: 0.62,
    reward: 2.4,
    projectiles: 5,
    elites: 0.22,
    duration: 1.2,
  },
};
export type HazardDefinition = {
  kind: "thorns" | "sandstorm" | "ice" | "lava";
  damage: number;
  slow: number;
  burn: number;
  radius: number;
  delay: number;
  period: number;
  color: number;
};
export type EnemyDefinition = {
  kind: EnemyKind;
  name: string;
  behavior: "pursuit" | "charge" | "ranged" | "denial" | "summon";
  hp: number;
  speed: number;
  damage: number;
};
export type BossDefinition = {
  name: string;
  patterns: readonly string[];
  hp: number;
  reward: string;
  projectileSpeed: number;
};
export type WorldDefinition = {
  id: WorldId;
  name: string;
  description: string;
  colors: [string, string, string];
  materials: readonly string[];
  enemies: EnemyDefinition[];
  boss: BossDefinition;
  hazard: HazardDefinition;
  architecture: "grove" | "courtyard" | "glacier" | "caldera";
};
const archetypes: EnemyKind[] = ["slime", "goblin", "wolf", "caster", "elite"];
function enemies(names: string[], power: number): EnemyDefinition[] {
  return archetypes.map((kind, i) => ({
    kind,
    name: names[i],
    behavior: (["pursuit", "pursuit", "charge", "ranged", "denial"] as const)[
      i
    ],
    hp: [18, 26, 32, 45, 180][i] * power,
    speed: [40, 72, 90, 48, 32][i],
    damage: [12, 10, 14, 10, 22][i] * Math.sqrt(power),
  }));
}
export const WORLDS: WorldDefinition[] = [
  {
    id: "forest",
    name: "Whispering Forest",
    description:
      "Ruined paths beneath a living canopy. Avoid the grasping briars.",
    colors: ["#26382e", "#496344", "#a0c485"],
    materials: ["wood", "slime-core", "copper-ore"],
    architecture: "grove",
    enemies: enemies(
      [
        "Moss Slime",
        "Briar Goblin",
        "Forest Wolf",
        "Thorn Caster",
        "Armored Guardian",
      ],
      1,
    ),
    boss: {
      name: "Forest Guardian",
      patterns: ["Root eruption", "Thorn ring", "Call of the grove"],
      hp: 2600,
      reward: "verdant-relic",
      projectileSpeed: 115,
    },
    hazard: {
      kind: "thorns",
      damage: 10,
      slow: 0.55,
      burn: 0,
      radius: 58,
      delay: 1.5,
      period: 10,
      color: 0xb4c681,
    },
  },
  {
    id: "desert",
    name: "Lost Desert",
    description:
      "Buried sanctuaries and sweeping sandstorms. Sidestep the archers’ volleys.",
    colors: ["#a28458", "#d1b47b", "#e4c17c"],
    materials: ["ancient-shard", "gold-ore", "desert-relic"],
    architecture: "courtyard",
    enemies: enemies(
      [
        "Sand Crawler",
        "Desert Bandit",
        "Scorpion",
        "Ancient Archer",
        "Sand Golem",
      ],
      1.15,
    ),
    boss: {
      name: "Sand Colossus",
      patterns: ["Buried shockwave", "Sun spear fan", "Dune charge"],
      hp: 3000,
      reward: "solar-relic",
      projectileSpeed: 150,
    },
    hazard: {
      kind: "sandstorm",
      damage: 6,
      slow: 0.7,
      burn: 0,
      radius: 90,
      delay: 2,
      period: 12,
      color: 0xe6c681,
    },
  },
  {
    id: "frozen",
    name: "Frozen Abyss",
    description:
      "Fractured glaciers and ancient ice halls. Keep clear of freezing runes.",
    colors: ["#354e65", "#779ca8", "#94e6ec"],
    materials: ["frost-crystal", "frozen-essence", "enhancement-stone"],
    architecture: "glacier",
    enemies: enemies(
      [
        "Frost Slime",
        "Ice Wolf",
        "Frozen Knight",
        "Frost Mage",
        "Crystal Elemental",
      ],
      1.3,
    ),
    boss: {
      name: "Frost Warden",
      patterns: ["Glacial prison", "Ice lance spiral", "Crystal awakening"],
      hp: 3400,
      reward: "glacial-relic",
      projectileSpeed: 135,
    },
    hazard: {
      kind: "ice",
      damage: 0,
      slow: 0.45,
      burn: 0,
      radius: 75,
      delay: 1.6,
      period: 9,
      color: 0x8be4f3,
    },
  },
  {
    id: "infernal",
    name: "Infernal Depths",
    description:
      "Obsidian islands above burning rivers. Magma warnings demand swift movement.",
    colors: ["#30282d", "#694233", "#ef9b47"],
    materials: ["infernal-core", "obsidian", "epic-gear-materials"],
    architecture: "caldera",
    enemies: enemies(
      [
        "Fire Imp",
        "Magma Beast",
        "Flame Knight",
        "Infernal Archer",
        "Lava Golem",
      ],
      1.5,
    ),
    boss: {
      name: "Infernal Sovereign",
      patterns: [
        "Magma eruption",
        "Hellfire barrage",
        "Infernal reinforcements",
      ],
      hp: 3900,
      reward: "sovereign-relic",
      projectileSpeed: 170,
    },
    hazard: {
      kind: "lava",
      damage: 16,
      slow: 1,
      burn: 3,
      radius: 64,
      delay: 1.8,
      period: 8,
      color: 0xff9451,
    },
  },
];
export type LootTableDefinition = {
  id: string;
  gold: number;
  xp: number;
  materials: { id: string; chance: number; min: number; max: number }[];
  candidates: string[];
};
export const ITEM_IDS = [
  ...WORLDS.flatMap((w) => w.materials),
  ...WORLDS.map((w) => w.boss.reward),
];
export type StageDefinition = {
  id: string;
  worldId: WorldId;
  number: number;
  name: string;
  environment: { seed: number; layout: WorldDefinition["architecture"] };
  spawn: { interval: number; composition: EnemyKind[] };
  recommendedPower: number;
  modifiers: { health: number; pressure: number };
  clear: { kind: "survive" | "boss"; seconds: number };
  rewards: {
    enemy: LootTableDefinition;
    elite: LootTableDefinition;
    boss: LootTableDefinition;
    completion: LootTableDefinition;
    firstClear: LootTableDefinition;
  };
  unlock: { previous: string | null };
};
const names = [
  [
    "Mossbound Trail",
    "Ruined Crossing",
    "Thornwatch",
    "The Deepwood",
    "Heart of the Grove",
  ],
  [
    "Dune Approach",
    "Buried Causeway",
    "Sunken Citadel",
    "Sands of Trial",
    "Throne of the Sun",
  ],
  [
    "Snowfall Reach",
    "Fractured Lake",
    "Icebound Hall",
    "Blizzard Pass",
    "The Silent Warden",
  ],
  [
    "Ashen Gate",
    "Obsidian Crossing",
    "Burning Sanctum",
    "Ember Crucible",
    "Sovereign’s Fall",
  ],
];
function loot(
  id: string,
  gold: number,
  xp: number,
  items: readonly string[],
  chance: number,
  candidates: string[] = [],
): LootTableDefinition {
  return {
    id,
    gold,
    xp,
    materials: items.map((id) => ({ id, chance, min: 1, max: 3 })),
    candidates,
  };
}
export const STAGES: StageDefinition[] = WORLDS.flatMap((w, wi) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `${w.id}-${i + 1}`,
    worldId: w.id,
    number: i + 1,
    name: names[wi][i],
    environment: { seed: 109 + wi * 100 + i * 19, layout: w.architecture },
    spawn: {
      interval: 1.35 - i * 0.16,
      composition: (i === 0
        ? ["slime", "goblin"]
        : i === 1
          ? ["slime", "goblin", "wolf"]
          : ["slime", "goblin", "wolf", "caster", "elite"]) as EnemyKind[],
    },
    recommendedPower: 10 + wi * 30 + i * 6,
    modifiers: { health: 1 + i * 0.12, pressure: 1 + i * 0.12 },
    clear: { kind: i === 4 ? "boss" : "survive", seconds: 480 + i * 45 },
    rewards: {
      enemy: loot("enemy", 1, 1, w.materials.slice(0, 1), 0.14),
      elite: loot("elite", 8, 8, w.materials.slice(0, 2), 0.65),
      boss: loot("boss", 100, 100, w.materials, 1, [w.boss.reward]),
      completion: loot(
        "completion",
        50 + wi * 30 + i * 15,
        30 + i * 10,
        w.materials,
        0.8,
      ),
      firstClear: loot("first-clear", 100, 75, w.materials, 1),
    },
    unlock: {
      previous: i ? `${w.id}-${i}` : wi ? `${WORLDS[wi - 1].id}-5` : null,
    },
  })),
);
export const stageById = (id: string) => {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage) throw new Error("Unknown stage: " + id);
  return stage;
};
export const worldById = (id: WorldId) => WORLDS.find((w) => w.id === id)!;
export function seeded(seed: number) {
  let x = seed >>> 0;
  const next = () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
  return Object.assign(next, {
    getState: () => x,
    setState: (state: number) => {
      x = state >>> 0;
    },
  });
}
