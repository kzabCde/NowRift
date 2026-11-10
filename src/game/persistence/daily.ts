import type { SaveData, Metrics } from "./model";
import { gold } from "../rpg/economy";
import { grantStack, addEquipment } from "../rpg/inventory";
import { seededEquipment } from "../rpg/items";
import { WORLDS } from "../campaign/content";
import { characterLevel } from "../rpg/stats";
export const GAME_TIMEZONE = "Asia/Bangkok";
export function gameDay(at = Date.now()): string {
  if (!Number.isFinite(at)) throw new Error("Invalid game clock.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GAME_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export type Gift = {
  gold?: number;
  materials?: Record<string, number>;
  epic?: boolean;
};
export const CHECKINS: { name: string; gift: Gift }[] = [
  { name: "500 Gold", gift: { gold: 500 } },
  { name: "1,000 Gold", gift: { gold: 1000 } },
  {
    name: "5 Enhancement Stones",
    gift: { materials: { "enhancement-stone": 5 } },
  },
  { name: "1,500 Gold", gift: { gold: 1500 } },
  {
    name: "Rare Material Chest",
    gift: {
      materials: { "ancient-shard": 5, "frost-crystal": 5, "gold-ore": 5 },
    },
  },
  { name: "2,500 Gold", gift: { gold: 2500 } },
  { name: "Epic Reward Chest", gift: { gold: 500, epic: true } },
];
export const QUESTS = [
  {
    id: "hunt",
    name: "Thin the horde",
    detail: "Defeat 100 enemies",
    metric: "kills",
    target: 100,
    gift: { gold: 150 },
  },
  {
    id: "stages",
    name: "Walk the rifts",
    detail: "Complete 3 campaign stages",
    metric: "stages",
    target: 3,
    gift: { gold: 350 },
  },
  {
    id: "boss",
    name: "Face the guardian",
    detail: "Defeat 1 boss",
    metric: "bosses",
    target: 1,
    gift: { gold: 250 },
  },
  {
    id: "gather",
    name: "Gathering grounds",
    detail: "Collect 20 campaign materials",
    metric: "materials",
    target: 20,
    gift: { gold: 100 },
  },
  {
    id: "gold",
    name: "An honest fortune",
    detail: "Earn 2,000 Gold from combat or sales",
    metric: "goldEarned",
    target: 2000,
    gift: { materials: { "enhancement-stone": 3 } },
  },
  {
    id: "enhance",
    name: "A brighter edge",
    detail: "Complete 1 successful enhancement",
    metric: "enhancements",
    target: 1,
    gift: { gold: 100 },
  },
  {
    id: "salvage",
    name: "Nothing wasted",
    detail: "Dismantle 3 equipment items",
    metric: "dismantled",
    target: 3,
    gift: { gold: 150 },
  },
] satisfies {
  id: string;
  name: string;
  detail: string;
  metric: keyof Metrics;
  target: number;
  gift: Gift;
}[];
export const ACHIEVEMENTS = [
  {
    id: "first-blood",
    category: "Combat",
    name: "First Blood",
    detail: "Defeat your first enemy",
    icon: 0,
    target: 1,
    gift: { gold: 100 },
  },
  {
    id: "hunter",
    category: "Combat",
    name: "Monster Hunter",
    detail: "Defeat 1,000 enemies",
    icon: 3,
    target: 1000,
    gift: { gold: 1000 },
  },
  {
    id: "forest",
    category: "Exploration",
    name: "Forest Conqueror",
    detail: "Clear all five Normal forest stages",
    icon: 5,
    target: 5,
    gift: { gold: 500 },
  },
  {
    id: "explorer",
    category: "Exploration",
    name: "World Explorer",
    detail: "Unlock all four worlds",
    icon: 23,
    target: 4,
    gift: { gold: 750 },
  },
  {
    id: "veteran",
    category: "Combat",
    name: "Veteran Adventurer",
    detail: "Complete 100 campaign stages",
    icon: 9,
    target: 100,
    gift: { gold: 2500 },
  },
  {
    id: "level",
    category: "Character Progression",
    name: "A lasting light",
    detail: "Reach permanent character level 10",
    icon: 16,
    target: 10,
    gift: { gold: 500 },
  },
  {
    id: "outfit",
    category: "Equipment",
    name: "Ready for the rift",
    detail: "Fill all six equipment slots",
    icon: 1,
    target: 6,
    gift: { gold: 100 },
  },
  {
    id: "blacksmith",
    category: "Enhancement",
    name: "Master Blacksmith",
    detail: "Reach +10 enhancement",
    icon: 42,
    target: 10,
    gift: { gold: 1500 },
  },
  {
    id: "legendary",
    category: "Collection",
    name: "Legendary Collector",
    detail: "Obtain a Legendary item",
    icon: 22,
    target: 1,
    gift: { gold: 1000 },
  },
  {
    id: "collector",
    category: "Collection",
    name: "Relic keeper",
    detail: "Obtain 25 equipment items",
    icon: 4,
    target: 25,
    gift: { materials: { "enhancement-stone": 5 } },
  },
] satisfies {
  id: string;
  category: string;
  name: string;
  detail: string;
  icon: number;
  target: number;
  gift: Gift;
}[];
export function rollDay(save: SaveData, at: number) {
  const day = gameDay(at);
  if (save.local.daily.day !== day) {
    const claimed = QUESTS.filter((q) =>
      save.receipts.includes(`quest:${save.local.id}:${day}:${q.id}`),
    );
    save.local.daily = {
      day,
      progress: Object.fromEntries(claimed.map((q) => [q.id, q.target])),
      claimed: claimed.map((q) => q.id),
    };
  }
}
export function recordMetrics(
  save: SaveData,
  delta: Partial<Metrics>,
  at: number,
) {
  rollDay(save, at);
  for (const [key, value] of Object.entries(delta)) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error("Invalid gameplay metric.");
    const k = key as keyof Metrics;
    if (k === "highestEnhancement" || k === "bestKills")
      save.local.stats[k] = Math.max(save.local.stats[k], value);
    else save.local.stats[k] += value;
    for (const quest of QUESTS)
      if (quest.metric === k)
        save.local.daily.progress[quest.id] = Math.min(
          quest.target,
          (save.local.daily.progress[quest.id] ?? 0) + value,
        );
  }
  reconcile(save, at);
}
export function reconcile(save: SaveData, at: number) {
  const r = save.rpg!,
    equipment = [
      ...r.equipment,
      ...r.overflow.flatMap((o) => (o.equipment ? [o.equipment] : [])),
    ];
  save.local.stats.highestEnhancement = Math.max(
    save.local.stats.highestEnhancement,
    ...equipment.map((e) => e.enhancement),
  );
  save.local.stats.legendary = Math.max(
    save.local.stats.legendary,
    equipment.some((e) => e.rarity === "legendary") ? 1 : 0,
  );
  const progress: Record<string, number> = {
    "first-blood": save.local.stats.kills,
    hunter: save.local.stats.kills,
    forest: save.clears.filter((c) => /^forest-[1-5]:normal$/.test(c)).length,
    explorer:
      1 +
      WORLDS.slice(0, -1).filter((w) =>
        save.clears.includes(w.id + "-5:normal"),
      ).length,
    veteran: save.local.stats.stages,
    level: characterLevel(save.xp).level,
    outfit: Object.values(r.equipped).filter(Boolean).length,
    blacksmith: save.local.stats.highestEnhancement,
    legendary: save.local.stats.legendary,
    collector: save.local.stats.equipment,
  };
  for (const def of ACHIEVEMENTS) {
    const old = save.local.achievements[def.id],
      value = Math.min(def.target, progress[def.id]);
    save.local.achievements[def.id] = {
      progress: Math.max(old?.progress ?? 0, value),
      unlockedAt: old?.unlockedAt ?? (value >= def.target ? at : null),
      claimed: old?.claimed ?? false,
    };
  }
}
export function grantGift(
  save: SaveData,
  gift: Gift,
  id: string,
  at: number,
  message: string,
) {
  if (save.receipts.includes(id))
    throw new Error("This reward has already been claimed.");
  gold(save, gift.gold ?? 0);
  for (const [item, n] of Object.entries(gift.materials ?? {}))
    grantStack(save, item, n, id + ":" + item);
  if (gift.epic)
    addEquipment(
      save,
      seededEquipment(
        id + ":epic",
        "forest-weapon",
        "epic",
        Math.min(17, characterLevel(save.xp).level),
      ),
      id + ":parcel",
    );
  if (gift.epic) save.local.stats.equipment++;
  save.rpg!.revision++;
  save.rpg!.history.push({
    id,
    at,
    kind: "gift",
    gold: gift.gold ?? 0,
    message,
    items: [
      ...Object.entries(gift.materials ?? {}).map(([key, n]) => `${key} ×${n}`),
      ...(gift.epic ? ["Epic equipment chest opened"] : []),
    ],
  });
  save.receipts.push(id);
  reconcile(save, at);
}
