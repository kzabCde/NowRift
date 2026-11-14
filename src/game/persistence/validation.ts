import { validProgress, type Progress } from "../campaign/progression";
import { initializeRpg, validRpg } from "../rpg/profile";
import { usedSlots } from "../rpg/inventory";
import { ITEMS, AFFIX_BOUNDS, RARITIES } from "../rpg/content";
import { CHARACTERS } from "../loadout";
import { WEAPONS } from "../content/forest";
import type { PlayerProfile, SaveData, SlotState } from "./model";
import { emptyMetrics } from "./model";
import { gameDay, reconcile, QUESTS, ACHIEVEMENTS } from "./daily";
import { validCheckpoint } from "./checkpoint";
import { defaultWorld, validWorld, migrateWorld } from "../world/save";
import { calculateStats } from "../rpg/stats";
import { validRunStageIdentity } from "../campaign/identity";
import { validJournal } from "../quests/validation";
import { QUEST_CATALOG } from "../quests/catalog";
import { migrateJournal } from "../quests/save";
import { validCalendarDay } from "./calendar";
export const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const count = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const validDay = validCalendarDay;
const date = (v: unknown): v is number => count(v, 8640000000000000);
export function safeJson(
  value: unknown,
  depth = 0,
  budget = { n: 0 },
): boolean {
  if (depth > 24 || ++budget.n > 300000) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= 20000;
  if (value === null || typeof value === "boolean") return true;
  if (Array.isArray(value))
    return (
      value.length <= 100000 &&
      value.every((v) => safeJson(v, depth + 1, budget))
    );
  if (record(value))
    return Object.entries(value).every(
      ([key, v]) =>
        !["__proto__", "prototype", "constructor"].includes(key) &&
        safeJson(v, depth + 1, budget),
    );
  return false;
}
export function assertProgress(value: unknown): Progress {
  try {
    if (
      !validProgress(value) ||
      !count(value.gold) ||
      !count(value.xp) ||
      !Object.values(value.materials).every((n) => count(n))
    )
      throw new Error();
    if (
      new Set(value.clears).size !== value.clears.length ||
      new Set(value.receipts).size !== value.receipts.length
    )
      throw new Error();
    const p = initializeRpg(value);
    if (!validRpg(p.rpg) || usedSlots(p) > p.rpg!.capacity) throw new Error();
    for (const e of [
      ...p.rpg!.equipment,
      ...p.rpg!.overflow.flatMap((o) => (o.equipment ? [o.equipment] : [])),
    ]) {
      if (
        !Object.hasOwn(ITEMS, e.definitionId) ||
        !Object.hasOwn(RARITIES, e.rarity)
      )
        throw new Error();
      for (const [key, n] of Object.entries(e.affixes)) {
        if (!Object.hasOwn(AFFIX_BOUNDS, key)) throw new Error();
        const bounds = AFFIX_BOUNDS[key as keyof typeof AFFIX_BOUNDS];
        if (
          !Number.isFinite(n) ||
          n < 0 ||
          n >
            bounds[1] * (key === "projectiles" ? 1 : 1 + e.level * 0.035) +
              0.001
        )
          throw new Error();
      }
    }
    if (p.rpg!.overflow.some((o) => !o.id)) throw new Error();
    for (const h of p.rpg!.history) {
      if (
        !date(h.at) ||
        !Number.isSafeInteger(h.gold) ||
        h.items.some((i) => typeof i !== "string")
      )
        throw new Error();
      const e = h.enhancement;
      if (
        e &&
        (!count(e.before, 15) ||
          !count(e.after, 15) ||
          typeof e.success !== "boolean" ||
          ![e.base, e.bonus, e.effective].every(
            (n) =>
              typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
          ) ||
          !count(e.pityBefore, 10000) ||
          !count(e.pityAfter, 10000) ||
          !count(e.cost) ||
          !record(e.materials) ||
          !Object.entries(e.materials).every(
            ([id, n]) => ITEMS[id]?.kind === "material" && count(n),
          ) ||
          (e.success
            ? e.after !== e.before + 1
            : ![e.before, e.before - 1].includes(e.after)))
      )
        throw new Error();
    }
    return p;
  } catch {
    throw new Error(
      "Campaign save is damaged or contains missing items. Original data was preserved. Restore a validated backup to recover.",
    );
  }
}
export function validPlayer(v: unknown): v is PlayerProfile {
  if (!record(v)) return false;
  const p = v as unknown as PlayerProfile;
  return (
    p.schema === 2 &&
    /^NR-[0-9A-F]{8}$/.test(p.id) &&
    typeof p.username === "string" &&
    p.username.trim().length > 0 &&
    p.username.length <= 24 &&
    date(p.createdAt) &&
    count(p.revision) &&
    Array.isArray(p.slots) &&
    p.slots.length >= 1 &&
    p.slots.length <= 3 &&
    p.slots.every(
      (s) =>
        record(s) &&
        typeof s.id === "string" &&
        s.id.length > 0 &&
        typeof s.key === "string" &&
        (s.key === "profile" || s.key.startsWith("slot:")),
    ) &&
    new Set(p.slots.map((s) => s.id)).size === p.slots.length &&
    new Set(p.slots.map((s) => s.key)).size === p.slots.length &&
    p.slots.some((s) => s.id === p.activeSlotId) &&
    Array.isArray(p.checkins) &&
    p.checkins.every(
      (c) =>
        record(c) &&
        validDay(c.day) &&
        ((c.calendarVersion === undefined && count(c.cycle, 6)) ||
          (c.calendarVersion === 1 && c.cycle === undefined)) &&
        date(c.at) &&
        typeof c.slotId === "string",
    ) &&
    new Set(p.checkins.map((c) => c.day)).size === p.checkins.length
  );
}
export function validLocal(v: unknown): v is SlotState {
  if (!record(v)) return false;
  const s = v as unknown as SlotState;
  if (s.world !== undefined && !validWorld(s.world)) return false;
  if (s.journal !== undefined && !validJournal(s.journal, QUEST_CATALOG))
    return false;
  if (
    s.activeRun?.stage !== undefined &&
    !validRunStageIdentity(s.activeRun.stage)
  )
    return false;
  if (
    s.schema !== 2 ||
    typeof s.id !== "string" ||
    !s.id ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    s.name.length > 24 ||
    !date(s.createdAt) ||
    !date(s.lastPlayed) ||
    !count(s.revision) ||
    !Object.hasOwn(CHARACTERS, s.character) ||
    !Object.hasOwn(WEAPONS, s.weapon) ||
    !record(s.stats)
  )
    return false;
  if (
    !Object.keys(emptyMetrics()).every(
      (k) =>
        typeof s.stats[k as keyof typeof s.stats] === "number" &&
        Number.isFinite(s.stats[k as keyof typeof s.stats]) &&
        s.stats[k as keyof typeof s.stats] >= 0,
    ) ||
    s.stats.highestEnhancement > 15
  )
    return false;
  if (
    !record(s.daily) ||
    !validDay(s.daily.day) ||
    !record(s.daily.progress) ||
    !Object.entries(s.daily.progress).every(([id, n]) =>
      QUESTS.some((q) => q.id === id && count(n, q.target)),
    ) ||
    !Array.isArray(s.daily.claimed) ||
    new Set(s.daily.claimed).size !== s.daily.claimed.length ||
    !s.daily.claimed.every((id) =>
      QUESTS.some(
        (q) => q.id === id && (s.daily.progress[id] ?? 0) >= q.target,
      ),
    )
  )
    return false;
  if (
    !record(s.achievements) ||
    !Object.entries(s.achievements).every(
      ([id, a]) =>
        record(a) &&
        ACHIEVEMENTS.some(
          (d) =>
            d.id === id &&
            count(a.progress, d.target) &&
            (a.unlockedAt === null || date(a.unlockedAt)) &&
            typeof a.claimed === "boolean" &&
            (!a.claimed ||
              (a.unlockedAt !== null && Number(a.progress) >= d.target)),
        ),
    )
  )
    return false;
  if (typeof s.legacyImported !== "boolean") return false;
  if (
    !Array.isArray(s.records) ||
    s.records.length > 100000 ||
    !s.records.every(
      (r) =>
        record(r) &&
        typeof r.id === "string" &&
        date(r.at) &&
        (r.realSeconds === undefined ||
          (typeof r.realSeconds === "number" &&
            Number.isFinite(r.realSeconds) &&
            r.realSeconds >= 0)) &&
        ["victory", "gameover"].includes(r.outcome) &&
        Object.hasOwn(WEAPONS, r.weapon) &&
        [r.kills, r.gold, r.level, r.seconds].every((n) => count(n)),
    ) ||
    new Set(s.records.map((r) => r.id)).size !== s.records.length
  )
    return false;
  if (
    s.activeRun !== null &&
    (!record(s.activeRun) ||
      typeof s.activeRun.id !== "string" ||
      s.activeRun.slotId !== s.id ||
      typeof s.activeRun.writer !== "string" ||
      !count(s.activeRun.sequence) ||
      !date(s.activeRun.updatedAt) ||
      !record(s.activeRun.metrics) ||
      !["kills", "bosses", "seconds"].every((key) => {
        const n = s.activeRun!.metrics[key as keyof typeof s.activeRun.metrics];
        return typeof n === "number" && Number.isFinite(n) && n >= 0;
      }))
  )
    return false;
  return (
    s.checkpoint === null ||
    (validCheckpoint(s.checkpoint) &&
      s.checkpoint.run.slotId === s.id &&
      !s.records.some((r) => r.id === s.checkpoint!.run.id))
  );
}
export function migrateSave(
  value: unknown,
  id: string,
  at: number,
  name = "Rift Wanderer",
): SaveData {
  const p = structuredClone(assertProgress(value)) as SaveData;
  if (p.local !== undefined) {
    if (!record(p.local))
      throw new Error(
        "Character save metadata is damaged. Original data was preserved.",
      );
    p.local.journal = migrateJournal(
      p.local.journal,
      p.clears,
      Number.isFinite(p.local.lastPlayed) ? p.local.lastPlayed : at,
    );
    // A stale map coordinate is recoverable; retain every other field and validate it normally.
    if (p.local.world) {
      const migrated = migrateWorld(p.local.world);
      if (!migrated)
        throw new Error(
          "Character world data is damaged or incompatible. Original data was preserved.",
        );
      p.local.world = migrated;
    }
    if (!validLocal(p.local) || p.local.id !== id)
      throw new Error(
        "Character save metadata is damaged or belongs to another slot. Original data was preserved.",
      );
    if (!p.local.world) {
      p.local.world = defaultWorld();
      p.local.world.hp = calculateStats(
        p,
        p.local.weapon,
        p.local.character,
      ).maxHp;
    }
    return p;
  }
  p.local = {
    schema: 2,
    id,
    name,
    createdAt: at,
    lastPlayed: at,
    revision: 0,
    character: "wanderer",
    weapon: "arcane",
    stats: emptyMetrics(),
    daily: { day: gameDay(at), progress: {}, claimed: [] },
    achievements: {},
    legacyImported: false,
    records: [],
    activeRun: null,
    checkpoint: null,
  };
  p.local.stats.equipment =
    p.rpg!.equipment.length + p.rpg!.overflow.filter((o) => o.equipment).length;
  p.local.stats.stages = p.clears.length;
  p.local.stats.highestEnhancement = Math.max(
    0,
    ...p.rpg!.history.flatMap((h) =>
      h.enhancement ? [h.enhancement.before, h.enhancement.after] : [],
    ),
  );
  p.local.stats.enhancements = p.rpg!.history.filter(
    (h) => h.enhancement?.success,
  ).length;
  p.local.stats.dismantled = p.rpg!.history.filter(
    (h) => h.kind === "dismantle",
  ).length;
  reconcile(p, at);
  p.local.world = defaultWorld();
  p.local.world.hp = calculateStats(p, p.local.weapon, p.local.character).maxHp;
  p.local.journal = migrateJournal(undefined, p.clears, at);
  return p;
}
