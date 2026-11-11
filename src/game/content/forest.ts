/** Original NowRift content. Simulation imports data, never React or Phaser. */
export type EnemyKind =
  | "slime"
  | "goblin"
  | "wolf"
  | "caster"
  | "elite"
  | "boss";
export const ENEMIES = {
  slime: {
    name: "Moss Slime",
    hp: 18,
    speed: 40,
    radius: 12,
    damage: 12,
    xp: 8,
    gold: 1,
    from: 0,
  },
  goblin: {
    name: "Briar Goblin",
    hp: 26,
    speed: 72,
    radius: 12,
    damage: 10,
    xp: 12,
    gold: 2,
    from: 90,
  },
  wolf: {
    name: "Forest Wolf",
    hp: 32,
    speed: 90,
    radius: 12,
    damage: 14,
    xp: 14,
    gold: 2,
    from: 120,
  },
  caster: {
    name: "Thorn Caster",
    hp: 45,
    speed: 48,
    radius: 13,
    damage: 10,
    xp: 22,
    gold: 3,
    from: 240,
  },
  elite: {
    name: "Armored Guardian",
    hp: 180,
    speed: 32,
    radius: 20,
    damage: 22,
    xp: 50,
    gold: 8,
    from: 270,
  },
  boss: {
    name: "Forest Guardian",
    hp: 2600,
    speed: 35,
    radius: 38,
    damage: 25,
    xp: 200,
    gold: 100,
    from: 480,
  },
} as const;
export type WeaponId =
  | "arcane"
  | "daggers"
  | "fire"
  | "frost"
  | "slash"
  | "sweep";
export const PRACTICE_WEAPONS = ["arcane", "daggers", "fire", "frost"] as const;
export function attackRange(
  attack: AttackDefinition,
  range = attack.range,
  area = 1,
) {
  return (
    range *
    (["pulse", "slash", "sweep"].includes(attack.kind ?? "projectile")
      ? area
      : 1)
  );
}
export type AttackDefinition = {
  name: string;
  description: string;
  damage: number;
  interval: number;
  range: number;
  speed: number;
  color: string;
  icon: number;
  kind?: "projectile" | "pulse" | "slash" | "sweep";
  projectiles?: number;
  arc?: number;
  blast?: number;
};
export const WEAPONS: Record<WeaponId, AttackDefinition> = {
  arcane: {
    kind: "projectile",
    name: "Arcane Bolt",
    description: "Precise magic bolts. A balanced companion for the long hunt.",
    damage: 10,
    interval: 0.8,
    range: 420,
    speed: 430,
    color: "#a8dcff",
    icon: 0,
  },
  daggers: {
    kind: "projectile",
    projectiles: 2,
    name: "Twin Daggers",
    description: "Paired, rapid blades. High pressure, close range.",
    damage: 6,
    interval: 0.35,
    range: 230,
    speed: 560,
    color: "#e4e4cf",
    icon: 1,
  },
  fire: {
    kind: "projectile",
    blast: 64,
    name: "Fire Orb",
    description: "Slow embers explode on impact, burning clustered enemies.",
    damage: 16,
    interval: 1.3,
    range: 380,
    speed: 270,
    color: "#ffb369",
    icon: 2,
  },
  frost: {
    kind: "pulse",
    name: "Frost Pulse",
    description: "A chilling pulse around you. Slows every enemy it touches.",
    damage: 12,
    interval: 1.6,
    range: 155,
    speed: 0,
    color: "#b5f1ec",
    icon: 3,
  },
  slash: {
    name: "Blade Slash",
    description: "A close sword technique. Cuts enemies in a forward arc.",
    kind: "slash",
    damage: 18,
    interval: 0.75,
    range: 120,
    speed: 0,
    arc: 1.8,
    color: "#e4d5a0",
    icon: 1,
  },
  sweep: {
    name: "Ember Sweep",
    description:
      "A broad, fire-lit glaive sweep that strikes clustered enemies.",
    kind: "sweep",
    damage: 27,
    interval: 1.15,
    range: 160,
    speed: 0,
    arc: 2.9,
    color: "#ffb369",
    icon: 2,
  },
};
export type UpgradeId =
  | "power"
  | "rapid"
  | "stride"
  | "vitality"
  | "critical"
  | "fury"
  | "multishot"
  | "velocity"
  | "area"
  | "regen"
  | "magnet";
export const UPGRADES: {
  id: UpgradeId;
  name: string;
  description: string;
  max: number;
  icon: number;
  accent: string;
}[] = [
  {
    id: "power",
    name: "Arcane Might",
    description: "+25% base attack damage",
    max: 8,
    icon: 0,
    accent: "#e8bb73",
  },
  {
    id: "rapid",
    name: "Quickening",
    description: "Attack interval ×0.88",
    max: 8,
    icon: 1,
    accent: "#c6d4a1",
  },
  {
    id: "stride",
    name: "Windwalker",
    description: "+10% base movement speed",
    max: 5,
    icon: 6,
    accent: "#c6d4a1",
  },
  {
    id: "vitality",
    name: "Oakheart",
    description: "+25 maximum HP; heal 25",
    max: 8,
    icon: 7,
    accent: "#ed9f91",
  },
  {
    id: "critical",
    name: "Keen Eye",
    description: "+5% critical chance (max 50%)",
    max: 9,
    icon: 4,
    accent: "#e8bb73",
  },
  {
    id: "fury",
    name: "Ruin",
    description: "+25% critical damage multiplier",
    max: 6,
    icon: 5,
    accent: "#ed9f91",
  },
  {
    id: "multishot",
    name: "Echoes",
    description: "+1 projectile; Frost Pulse gains +15% damage",
    max: 4,
    icon: 0,
    accent: "#b0c9e6",
  },
  {
    id: "velocity",
    name: "Swift Cast",
    description: "+20% projectile speed; Frost Pulse slows longer",
    max: 5,
    icon: 3,
    accent: "#b0c9e6",
  },
  {
    id: "area",
    name: "Wide Reach",
    description: "+20% blast / pulse area; +8% targeting range",
    max: 5,
    icon: 2,
    accent: "#e8bb73",
  },
  {
    id: "regen",
    name: "Wild Renewal",
    description: "Regenerate +0.5 HP per second",
    max: 6,
    icon: 7,
    accent: "#c6d4a1",
  },
  {
    id: "magnet",
    name: "Gathering",
    description: "+30 XP crystal attraction radius",
    max: 5,
    icon: 4,
    accent: "#c6d4a1",
  },
];
export const FOREST = {
  id: "whispering-forest",
  name: "Whispering Forest",
  duration: 480,
  width: 1800,
  height: 1400,
  maxEnemies: 180,
  maxBullets: 240,
  maxDrops: 240,
  maxParticles: 180,
};
export type Obstacle = {
  x: number;
  y: number;
  r: number;
  type: "tree" | "rock";
};
// Keep the starting clearing free; scenery and collision share this definition.
export const OBSTACLES: Obstacle[] = Array.from({ length: 52 }, (_, i) => {
  const angle = i * 2.399963;
  const radius = 330 + ((i * 97) % 460);
  return {
    x: 900 + Math.cos(angle) * radius,
    y: 700 + Math.sin(angle) * radius * 0.72,
    r: i % 4 ? 19 : 23,
    type: i % 4 ? "tree" : "rock",
  };
});
