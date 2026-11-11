export const SLOTS = [
  "weapon",
  "armor",
  "helmet",
  "boots",
  "ring",
  "necklace",
] as const;
export type Slot = (typeof SLOTS)[number];
export const RARITY_IDS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;
export type Rarity = (typeof RARITY_IDS)[number];
export type Attributes = {
  maxHp: number;
  damage: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  armor: number;
  speed: number;
  regen: number;
  projectiles: number;
  area: number;
};
export type StatKey = keyof Attributes;
export type ItemDefinition = {
  weapon?: {
    family: "staff" | "sword" | "scepter" | "glaive";
    attack: import("../content/forest").WeaponId;
    frame: number;
  };
  id: string;
  name: string;
  kind: "equipment" | "material" | "consumable";
  slot?: Slot;
  icon: number;
  description: string;
  primary?: StatKey;
  buyPrice?: number;
  sellPrice?: number;
};
export type EquipmentInstance = {
  id: string;
  definitionId: string;
  rarity: Rarity;
  level: number;
  enhancement: number;
  pity: number;
  affixes: Partial<Attributes>;
  locked: boolean;
  favorite: boolean;
};
export type OverflowItem = {
  id: string;
  equipment?: EquipmentInstance;
  definitionId?: string;
  quantity?: number;
};
export type LedgerEntry = {
  id: string;
  at: number;
  kind: string;
  message: string;
  gold: number;
  items: string[];
  itemId?: string;
  enhancement?: {
    before: number;
    after: number;
    success: boolean;
    base: number;
    bonus: number;
    effective: number;
    pityBefore: number;
    pityAfter: number;
    cost: number;
    materials: Record<string, number>;
  };
};
export type RpgState = {
  schema: 1;
  revision: number;
  capacity: number;
  equipment: EquipmentInstance[];
  equipped: Record<Slot, string | null>;
  consumables: Record<string, number>;
  stackFlags: Record<string, { favorite: boolean; locked: boolean }>;
  overflow: OverflowItem[];
  upgrades: Record<string, number>;
  history: LedgerEntry[];
};
export type InventoryEntry = {
  id: string;
  definitionId: string;
  quantity: number;
  equipment?: EquipmentInstance;
  favorite: boolean;
  locked: boolean;
  equipped: boolean;
};
export type CharacterStats = Attributes & {
  interval: number;
  power: number;
  level: number;
};
/** Immutable run-start equipment and attack configuration; independent of the live inventory. */
export type WeaponSnapshot = {
  schema: 1;
  instanceId: string;
  definitionId: string;
  name: string;
  family: NonNullable<ItemDefinition["weapon"]>["family"];
  attackId: import("../content/forest").WeaponId;
  attack: import("../content/forest").AttackDefinition;
  assetKey: "equipment-weapons";
  frame: number;
  rarity: Rarity;
  enhancement: number;
  instance: EquipmentInstance;
  stats: CharacterStats;
};
