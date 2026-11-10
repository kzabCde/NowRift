import { parseBestKills, BEST_SCORE_KEY } from "../services/metadata";
import { readLegacyRuns } from "../services/legacy-runs";
import { transact } from "./storage";
import { preferences } from "./preferences";
import { migrateSave, validPlayer, validLocal } from "./validation";
import { emptyProgress } from "../campaign/progression";
import { applyResult, changeEquipment } from "../campaign/commands";
import { applyCommand, type RpgCommand } from "../rpg/actions";
import type { CampaignResult } from "../campaign/rewards";
import type { RelicId, CharacterId } from "../loadout";
import { CHARACTERS } from "../loadout";
import { WEAPONS, type WeaponId } from "../content/forest";
import type { RunResult } from "../bridge";
import type {
  PlayerProfile,
  PlayerView,
  SaveData,
  RunOwner,
  Metrics,
  Backup,
} from "./model";
import {
  CHECKINS,
  QUESTS,
  ACHIEVEMENTS,
  gameDay,
  rollDay,
  reconcile,
  recordMetrics,
  grantGift,
} from "./daily";
import { validCheckpoint, type RunCheckpoint } from "./checkpoint";
import { applyWorldCommand } from "../world/actions";
import type { WorldCommand } from "../world/save";
import { HAVEN } from "../world/content";
let selected: string | null = null,
  writerId: string | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
function changed() {
  listeners.forEach((f) => f());
  if (typeof window !== "undefined") {
    channel ??= new BroadcastChannel("nowrift-save-changes-v2");
    channel.postMessage({ at: Date.now() });
  }
}
export function subscribeSaves(fn: () => void) {
  listeners.add(fn);
  if (typeof window !== "undefined") {
    channel ??= new BroadcastChannel("nowrift-save-changes-v2");
    channel.onmessage = () => listeners.forEach((f) => f());
  }
  return () => {
    listeners.delete(fn);
  };
}
export function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
}
export function playerId() {
  const value =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(1))[0]
      : Math.floor(Math.random() * 4294967296);
  return "NR-" + value.toString(16).toUpperCase().padStart(8, "0");
}
function session() {
  return (writerId ??= uid());
}
export function activeSlotId() {
  return selected;
}
function name(value: string) {
  const n = value.trim();
  if (!n || n.length > 24 || Array.from(n).some((c) => c.charCodeAt(0) < 32))
    throw new Error("Use a name from 1 to 24 characters.");
  return n;
}
function scope(
  records: Map<string, unknown>,
  store: IDBObjectStore,
  at: number,
): PlayerProfile {
  const raw = records.get("player");
  if (raw !== undefined) {
    if (!validPlayer(raw))
      throw new Error(
        "Local player profile is damaged or incompatible. Original data was preserved. Import a backup to recover.",
      );
    return structuredClone(raw);
  }
  const id = uid(),
    root: PlayerProfile = {
      schema: 2,
      id: playerId(),
      username: "Guest Wanderer",
      createdAt: at,
      revision: 0,
      activeSlotId: id,
      slots: [{ id, key: "profile" }],
      checkins: [],
    };
  const progress = migrateSave(
    records.get("profile") ?? emptyProgress(),
    id,
    at,
  );
  try {
    progress.local.stats.bestKills = parseBestKills(
      preferences.get(BEST_SCORE_KEY),
    );
    const legacy = preferences.get("nowrift-character-v1");
    if (legacy && Object.hasOwn(CHARACTERS, legacy))
      progress.local.character = legacy as CharacterId;
  } catch {
    /* Original data remains in storage. */
  }
  store.put(progress, "profile");
  store.put(root, "player");
  records.set("profile", progress);
  selected = id;
  return root;
}
function choose(root: PlayerProfile) {
  if (!selected) {
    try {
      const cached = preferences.get("nowrift-active-slot-v2");
      if (root.slots.some((s) => s.id === cached)) selected = cached;
    } catch {
      /* IndexedDB remains authoritative. */
    }
    selected ??= root.activeSlotId;
  }
  if (!root.slots.some((s) => s.id === selected))
    throw new Error(
      "This character was deleted in another tab. Open Profiles & Saves and select a character.",
    );
  return selected;
}
function slot(
  records: Map<string, unknown>,
  root: PlayerProfile,
  at: number,
  id = choose(root),
): SaveData {
  const ref = root.slots.find((s) => s.id === id);
  if (!ref)
    throw new Error(
      "This save slot no longer exists. Select another character.",
    );
  const raw = records.get(ref.key);
  if (raw === undefined)
    throw new Error(
      "Character save is missing. Import a backup; existing data was preserved.",
    );
  return migrateSave(raw, id, at);
}
function put(
  store: IDBObjectStore,
  root: PlayerProfile,
  p: SaveData,
  at: number,
) {
  if (!validLocal(p.local))
    throw new Error("Invalid character save transition.");
  p.local.revision++;
  p.local.lastPlayed = at;
  store.put(p, root.slots.find((s) => s.id === p.local.id)!.key);
}
function checkRevision(p: SaveData, revision: number) {
  if (p.local.revision !== revision)
    throw new Error(
      "This character changed in another tab. Refresh the profile and review the latest values.",
    );
}
function recordAction(
  before: SaveData,
  after: SaveData,
  entry: ReturnType<typeof applyCommand>["entry"],
  at: number,
) {
  if (!entry || before.receipts.includes(entry.id)) return;
  const delta: Partial<Metrics> = {};
  if (entry.kind === "enhance") {
    delta.enhancements = entry.enhancement?.success ? 1 : 0;
    delta.highestEnhancement = entry.enhancement?.after ?? 0;
  }
  if (entry.kind === "dismantle") delta.dismantled = 1;
  if (entry.kind === "sell") delta.goldEarned = Math.max(0, entry.gold);
  if (entry.kind === "buy")
    delta.equipment = Math.max(
      0,
      after.rpg!.equipment.length - before.rpg!.equipment.length,
    );
  recordMetrics(after, delta, at);
}
function assertOwner(p: SaveData, run: RunOwner) {
  const active = p.local.activeRun;
  if (
    !active ||
    active.id !== run.id ||
    active.slotId !== run.slotId ||
    active.writer !== run.writer
  )
    throw new Error(
      "This run was replaced or resumed in another tab. Return to the Hub to reload this character.",
    );
}
function milestone(
  p: SaveData,
  run: RunOwner,
  totals: { kills: number; bosses: number; seconds: number },
  at: number,
) {
  assertOwner(p, run);
  const active = p.local.activeRun!;
  recordMetrics(
    p,
    {
      bestKills: totals.kills,
      kills: Math.max(0, totals.kills - active.metrics.kills),
      bosses: Math.max(0, totals.bosses - active.metrics.bosses),
      seconds: Math.max(0, totals.seconds - active.metrics.seconds),
    },
    at,
  );
  active.metrics = {
    kills: Math.max(active.metrics.kills, totals.kills),
    bosses: Math.max(active.metrics.bosses, totals.bosses),
    seconds: Math.max(active.metrics.seconds, totals.seconds),
  };
}
async function update<T>(
  fn: (
    p: SaveData,
    root: PlayerProfile,
    store: IDBObjectStore,
    records: Map<string, unknown>,
    at: number,
  ) => T,
  id?: string,
): Promise<T> {
  const value = await transact((records, store) => {
    const at = Date.now(),
      root = scope(records, store, at),
      p = slot(records, root, at, id);
    rollDay(p, at);
    return fn(p, root, store, records, at);
  });
  changed();
  return value;
}
export const profileRepository = {
  async world(slotId: string, command: WorldCommand) {
    return update((p, root, store, _, at) => {
      applyWorldCommand(p, command, at);
      put(store, root, p, at);
      return p;
    }, slotId);
  },
  subscribe: subscribeSaves,
  async view(): Promise<PlayerView> {
    return transact((records, store) => {
      const at = Date.now(),
        root = scope(records, store, at),
        slots: SaveData[] = [],
        errors: Record<string, string> = {};
      let active: string;
      try {
        active = choose(root);
      } catch (error) {
        active = root.activeSlotId;
        errors.selection = String(error);
      }
      for (const ref of root.slots) {
        try {
          const p = slot(records, root, at, ref.id);
          rollDay(p, at);
          reconcile(p, at);
          store.put(p, ref.key);
          slots.push(p);
        } catch (error) {
          errors[ref.id] = String(error);
        }
      }
      return {
        player: root,
        slots,
        active: slots.find((p) => p.local.id === active) ?? null,
        errors,
      };
    });
  },
  async load(id?: string): Promise<SaveData> {
    const p = await update((p, root, store) => {
      store.put(p, root.slots.find((s) => s.id === p.local.id)!.key);
      return p;
    }, id);
    if (p.local.legacyImported) return p;
    let runs: RunResult[] = [],
      warning = "";
    try {
      runs = await readLegacyRuns();
    } catch (error) {
      warning = String(error);
    }
    return update((next, root, store, _, at) => {
      if (next.local.legacyImported) return next;
      if (root.slots.find((s) => s.id === next.local.id)!.key === "profile") {
        next.local.records = runs;
        next.local.stats.kills += runs.reduce((n, r) => n + r.kills, 0);
        next.local.stats.bestKills = Math.max(
          next.local.stats.bestKills,
          ...runs.map((r) => r.kills),
        );
        next.local.stats.seconds += runs.reduce((n, r) => n + r.seconds, 0);
        next.local.stats.bosses += runs.reduce(
          (n, r) =>
            n + (r.campaign?.bosses ?? (r.outcome === "victory" ? 1 : 0)),
          0,
        );
        next.local.stats.stages = Math.max(
          next.local.stats.stages,
          runs.filter((r) => r.campaign?.victory).length,
        );
        if (warning) next.local.legacyWarning = warning;
      }
      next.local.legacyImported = true;
      reconcile(next, at);
      put(store, root, next, at);
      return next;
    }, p.local.id);
  },
  async select(id: string) {
    const value = await transact((records, store) => {
      const at = Date.now(),
        root = scope(records, store, at),
        p = slot(records, root, at, id);
      root.activeSlotId = id;
      root.revision++;
      store.put(root, "player");
      put(store, root, p, at);
      return p;
    });
    selected = id;
    try {
      preferences.set("nowrift-active-slot-v2", id);
    } catch {
      /* Selection still works for this tab. */
    }
    changed();
    return value;
  },
  async create(characterName: string, character: CharacterId = "wanderer") {
    const result = await transact((records, store) => {
      const at = Date.now(),
        root = scope(records, store, at);
      if (root.slots.length >= 3)
        throw new Error("All three save slots are occupied.");
      if (!Object.hasOwn(CHARACTERS, character))
        throw new Error("Unknown character.");
      const id = uid(),
        p = migrateSave(emptyProgress(), id, at, name(characterName));
      p.local.character = character;
      p.local.legacyImported = true;
      root.slots.push({ id, key: "slot:" + id });
      root.activeSlotId = id;
      root.revision++;
      store.put(root, "player");
      store.put(p, "slot:" + id);
      return p;
    });
    selected = result.local.id;
    try {
      preferences.set("nowrift-active-slot-v2", selected);
    } catch {
      /* Original data remains in storage. */
    }
    changed();
    return result;
  },
  async renameSlot(id: string, value: string, revision: number) {
    return update((p, root, store, _, at) => {
      checkRevision(p, revision);
      p.local.name = name(value);
      put(store, root, p, at);
      return p;
    }, id);
  },
  async renamePlayer(value: string, revision: number) {
    const root = await transact((records, store) => {
      const r = scope(records, store, Date.now());
      if (r.revision !== revision)
        throw new Error("The player profile changed. Refresh and try again.");
      r.username = name(value);
      r.revision++;
      store.put(r, "player");
      return r;
    });
    changed();
    return root;
  },
  async deleteSlot(id: string, revision: number) {
    const next = await transact((records, store) => {
      const at = Date.now(),
        root = scope(records, store, at),
        p = slot(records, root, at, id);
      checkRevision(p, revision);
      if (root.slots.length === 1)
        throw new Error(
          "Keep at least one character. Create another slot before deleting this one.",
        );
      if (
        p.local.activeRun &&
        p.local.activeRun.writer !== session() &&
        at - p.local.activeRun.updatedAt < 45000
      )
        throw new Error(
          "This character is active in another tab. Close it or take over its saved checkpoint first.",
        );
      backup(store, root, p, at, "Before character deletion");
      const ref = root.slots.find((s) => s.id === id)!;
      store.delete(ref.key);
      root.slots = root.slots.filter((s) => s.id !== id);
      if (root.activeSlotId === id) root.activeSlotId = root.slots[0].id;
      root.revision++;
      store.put(root, "player");
      return root.activeSlotId;
    });
    if (selected === id) selected = next;
    try {
      preferences.set("nowrift-active-slot-v2", selected ?? next);
    } catch {
      /* Original data remains in storage. */
    }
    changed();
    return next;
  },
  async configure(
    patch: { character?: CharacterId; weapon?: WeaponId },
    id?: string,
  ) {
    return update((p, root, store, _, at) => {
      if (
        (patch.character && !Object.hasOwn(CHARACTERS, patch.character)) ||
        (patch.weapon && !Object.hasOwn(WEAPONS, patch.weapon))
      )
        throw new Error("Invalid character loadout.");
      Object.assign(p.local, patch);
      put(store, root, p, at);
      return p;
    }, id);
  },
  async claim(
    kind: "checkin" | "quest" | "achievement",
    id: string,
    revision: number,
    slotId?: string,
  ) {
    return update((p, root, store, _, at) => {
      checkRevision(p, revision);
      const day = gameDay(at);
      rollDay(p, at);
      reconcile(p, at);
      if (kind === "checkin") {
        if (root.checkins.some((c) => c.day === day))
          throw new Error(
            "Today's check-in has already been claimed for this local player.",
          );
        if (root.checkins.some((c) => c.day > day))
          throw new Error(
            "The device clock is earlier than your last check-in. Correct the clock before claiming.",
          );
        const cycle = root.checkins.length % 7;
        grantGift(
          p,
          CHECKINS[cycle].gift,
          "checkin:" + root.id + ":" + day,
          at,
          "Daily check-in: " + CHECKINS[cycle].name,
        );
        root.checkins.push({ day, cycle, slotId: p.local.id, at });
        root.revision++;
        store.put(root, "player");
      } else if (kind === "quest") {
        const def = QUESTS.find((q) => q.id === id);
        if (
          !def ||
          p.local.daily.claimed.includes(id) ||
          (p.local.daily.progress[id] ?? 0) < def.target
        )
          throw new Error(
            "This daily objective is incomplete or already claimed.",
          );
        grantGift(
          p,
          def.gift,
          `quest:${p.local.id}:${day}:${id}`,
          at,
          "Daily objective: " + def.name,
        );
        p.local.daily.claimed.push(id);
      } else {
        const def = ACHIEVEMENTS.find((a) => a.id === id),
          state = p.local.achievements[id];
        if (
          !def ||
          state?.unlockedAt == null ||
          state.claimed ||
          state.progress < def.target
        )
          throw new Error("This achievement is locked or already claimed.");
        grantGift(
          p,
          def.gift,
          `achievement:${p.local.id}:${id}`,
          at,
          "Achievement: " + def.name,
        );
        p.local.achievements[id].claimed = true;
      }
      put(store, root, p, at);
      return p;
    }, slotId);
  },
  async act(command: RpgCommand) {
    return update((p, root, store, _, at) => {
      if (command.run) assertOwner(p, command.run);
      const result = applyCommand(p, command);
      const next = result.progress as SaveData;
      recordAction(p, next, result.entry, at);
      put(store, root, next, at);
      return { ...result, progress: next };
    }, command.slotId);
  },
  async equipment(action: "equip" | "enhance", id: RelicId | null) {
    return update((p, root, store, _, at) => {
      const next = changeEquipment(p, action, id) as SaveData;
      recordAction(p, next, next.rpg!.history.at(-1) ?? null, at);
      put(store, root, next, at);
      return next;
    });
  },
  async beginRun(
    slotId: string,
    resume = false,
    replaceId?: string,
  ): Promise<{
    run: RunOwner;
    checkpoint: RunCheckpoint | null;
    save: SaveData;
  }> {
    return update((p, root, store, _, at) => {
      const old = p.local.activeRun,
        c = p.local.checkpoint;
      if (resume && !c)
        throw new Error("No valid run checkpoint is available.");
      if (resume && (!validCheckpoint(c) || p.receipts.includes(c.run.id)))
        throw new Error(
          "This checkpoint is invalid or its rewards were already settled. Discard it to continue.",
        );
      if (!resume && c && replaceId !== old?.id)
        throw new Error(
          "Resume or discard the saved checkpoint before starting a different run.",
        );
      if (
        !resume &&
        old &&
        old.writer !== session() &&
        at - old.updatedAt < 45000
      )
        throw new Error(
          "This character is already in a run in another tab. Use Resume checkpoint to take over.",
        );
      const run: RunOwner = {
        id: resume ? c!.run.id : uid(),
        slotId: p.local.id,
        writer: session(),
        sequence: resume ? c!.run.sequence + 1 : 0,
      };
      p.local.activeRun = {
        ...run,
        updatedAt: at,
        metrics: resume
          ? {
              kills: c!.state.kills,
              bosses: c!.environment?.bosses ?? 0,
              seconds: c!.state.time,
            }
          : { kills: 0, bosses: 0, seconds: 0 },
      };
      if (!resume) p.local.checkpoint = null;
      else p.local.checkpoint = { ...c!, run };
      put(store, root, p, at);
      return { run, checkpoint: resume ? p.local.checkpoint : null, save: p };
    }, slotId);
  },
  async checkpoint(c: RunCheckpoint) {
    if (!validCheckpoint(c))
      throw new Error(
        "Run checkpoint could not be validated. The previous checkpoint was preserved.",
      );
    return update((p, root, store, _, at) => {
      assertOwner(p, c.run);
      if (p.receipts.includes(c.run.id))
        throw new Error("This run has already finished.");
      if (c.run.sequence <= p.local.activeRun!.sequence) return p;
      milestone(
        p,
        c.run,
        {
          kills: c.state.kills,
          bosses: c.environment?.bosses ?? 0,
          seconds: c.state.time,
        },
        at,
      );
      p.local.checkpoint = c;
      p.local.activeRun!.updatedAt = at;
      p.local.activeRun!.sequence = c.run.sequence;
      put(store, root, p, at);
      return p;
    }, c.run.slotId);
  },
  async discardDamagedCheckpoint(slotId: string) {
    const value = await transact((records, store) => {
      const at = Date.now(),
        root = scope(records, store, at),
        ref = root.slots.find((s) => s.id === slotId);
      if (!ref) throw new Error("This character no longer exists.");
      const raw = records.get(ref.key);
      if (!raw || typeof raw !== "object")
        throw new Error("Import a backup to recover this character.");
      const p = structuredClone(raw) as SaveData;
      if (!p.local || typeof p.local !== "object")
        throw new Error(
          "Character metadata is damaged. Import a backup instead.",
        );
      const quarantine = "quarantine:" + uid();
      store.put({ schema: 2, id: quarantine, at, raw }, quarantine);
      p.local.checkpoint = null;
      p.local.activeRun = null;
      const valid = migrateSave(p, ref.id, at);
      put(store, root, valid, at);
      return valid;
    });
    changed();
    return value;
  },
  async discardRun(slotId: string, run?: RunOwner) {
    return update((p, root, store, _, at) => {
      if (run) assertOwner(p, run);
      p.local.checkpoint = null;
      p.local.activeRun = null;
      if (p.local.world?.location === "expedition") {
        p.local.world.location = "haven";
        p.local.world.position = { ...HAVEN.return };
      }
      put(store, root, p, at);
      return p;
    }, slotId);
  },
  async settle(result: CampaignResult) {
    return update((p, root, store, _, at) => {
      if (p.receipts.includes(result.id)) return { progress: p, reward: null };
      if (result.run)
        milestone(
          p,
          result.run,
          {
            kills: result.enemies + result.elites + result.bosses,
            bosses: result.bosses,
            seconds: result.seconds,
          },
          at,
        );
      const settled = applyResult(p, result),
        next = settled.progress as SaveData;
      const items =
        next.rpg!.equipment.length +
        next.rpg!.overflow.filter((o) => o.equipment).length -
        (p.rpg!.equipment.length +
          p.rpg!.overflow.filter((o) => o.equipment).length);
      recordMetrics(
        next,
        {
          ...(!result.run
            ? {
                kills: result.enemies + result.elites + result.bosses,
                bestKills: result.enemies + result.elites + result.bosses,
                bosses: result.bosses,
                seconds: result.seconds,
              }
            : {}),
          stages: result.victory && !result.activity ? 1 : 0,
          goldEarned: settled.reward?.gold ?? 0,
          materials: Object.values(settled.reward?.materials ?? {}).reduce(
            (a, b) => a + b,
            0,
          ),
          equipment: Math.max(0, items),
        },
        at,
      );
      next.local.checkpoint = null;
      next.local.activeRun = null;
      if (result.activity === "farming" && next.local.world) {
        const w = next.local.world;
        w.location = "haven";
        w.position = { ...HAVEN.return };
        w.hp = Math.max(1, Math.min(5000, result.hp ?? 1));
        if (result.victory) {
          w.extractions++;
          if (w.quest === "active") w.quest = "completed";
        }
      }
      put(store, root, next, at);
      return { ...settled, progress: next };
    }, result.run?.slotId);
  },
  async runs(slotId: string) {
    const p = await profileRepository.load(slotId);
    return [...p.local.records].sort((a, b) => b.at - a.at).slice(0, 20);
  },
  async record(run: RunResult) {
    return update((p, root, store, _, at) => {
      if (p.local.records.some((r) => r.id === run.id)) return;
      if (!run.campaign) {
        if (run.run)
          milestone(
            p,
            run.run,
            {
              kills: run.kills,
              bosses: run.outcome === "victory" ? 1 : 0,
              seconds: run.seconds,
            },
            at,
          );
        else
          recordMetrics(
            p,
            {
              kills: run.kills,
              bosses: run.outcome === "victory" ? 1 : 0,
              seconds: run.seconds,
            },
            at,
          );
        p.receipts.push(run.id);
        p.local.checkpoint = null;
        p.local.activeRun = null;
      }
      p.local.records.push(run);
      p.local.records = p.local.records.slice(-200);
      put(store, root, p, at);
    }, run.run?.slotId);
  },
  async backups() {
    return transact(
      (records) =>
        Array.from(records)
          .filter(([key]) => key.startsWith("backup:"))
          .map(([, v]) => {
            const b = v as Backup;
            if (
              !b ||
              b.schema !== 2 ||
              !validPlayer(b.player) ||
              !b.save ||
              !validLocal(b.save.local)
            )
              throw new Error(
                "A recovery backup is damaged; its original data was preserved.",
              );
            return b;
          })
          .sort((a, b) => b.at - a.at),
      true,
    );
  },
  async replace(
    incoming: SaveData,
    checkins: PlayerProfile["checkins"],
    expected: number | null,
    slotId: string | null,
    owner?: import("./model").SaveBundle["player"],
  ) {
    incoming = migrateSave(incoming, incoming.local.id, Date.now());
    const result = await transact((records, store) => {
      const at = Date.now();
      let root: PlayerProfile;
      if (slotId === null) {
        if (validPlayer(records.get("player")))
          throw new Error(
            "The player profile is readable again. Refresh before importing.",
          );
        const id = uid();
        root = {
          schema: 2,
          id: owner?.id ?? playerId(),
          username: owner?.username ?? "Recovered Wanderer",
          createdAt: owner?.createdAt ?? at,
          revision: 0,
          activeSlotId: id,
          slots: [{ id, key: "slot:" + id }],
          checkins: [],
        };
        if (records.has("player"))
          store.put(
            {
              schema: 2,
              id: "quarantine:" + uid(),
              at,
              reason: "Before damaged profile recovery",
              raw: records.get("player"),
            },
            "quarantine:" + uid(),
          );
        slotId = id;
      } else root = scope(records, store, at);
      const ref = root.slots.find((s) => s.id === slotId);
      if (!ref) throw new Error("Target character no longer exists.");
      const raw = records.get(ref.key);
      let current: SaveData | null = null;
      try {
        if (raw !== undefined) current = migrateSave(raw, ref.id, at);
      } catch {
        /* Original data remains in storage. */
      }
      if (expected !== null) {
        if (!current)
          throw new Error(
            "The target save changed or became unreadable. Refresh before importing.",
          );
        checkRevision(current, expected);
      } else if (current)
        throw new Error(
          "The target save changed. Review the new character before importing.",
        );
      if (current) backup(store, root, current, at, "Before save import");
      else if (raw !== undefined) {
        const id = "quarantine:" + uid();
        store.put(
          {
            schema: 2,
            id,
            at,
            slotId: ref.id,
            reason: "Before damaged character recovery",
            raw,
          },
          id,
        );
      }
      const next = structuredClone(incoming);
      const previousSlot = next.local.id;
      const rebindReceipt = (id: string) => {
        for (const kind of ["quest", "achievement"]) {
          const prefix = `${kind}:${previousSlot}:`;
          if (id.startsWith(prefix))
            return `${kind}:${ref.id}:${id.slice(prefix.length)}`;
        }
        return id;
      };
      next.receipts = next.receipts.map(rebindReceipt);
      next.rpg!.history = next.rpg!.history.map((entry) => ({
        ...entry,
        id: rebindReceipt(entry.id),
      }));
      next.local.id = ref.id;
      next.local.revision = current?.local.revision ?? 0;
      next.local.activeRun = null;
      next.local.records = next.local.records.map((r) => ({
        ...r,
        run: r.run
          ? { ...r.run, slotId: ref.id, writer: "imported" }
          : undefined,
      }));
      if (next.local.checkpoint) {
        next.local.checkpoint.run.slotId = ref.id;
        next.local.checkpoint.run.writer = "imported";
      }
      next.rpg!.revision =
        Math.max(next.rpg!.revision, current?.rpg!.revision ?? 0) + 1;
      for (const c of checkins)
        if (!root.checkins.some((x) => x.day === c.day)) root.checkins.push(c);
      root.checkins.sort((a, b) => a.day.localeCompare(b.day));
      root.revision++;
      store.put(root, "player");
      if (!validPlayer(root))
        throw new Error("Invalid imported player metadata.");
      reconcile(next, at);
      const validated = migrateSave(next, ref.id, at);
      put(store, root, validated, at);
      return validated;
    });
    selected = result.local.id;
    try {
      preferences.set("nowrift-active-slot-v2", selected);
    } catch {
      /* Original data remains in storage. */
    }
    changed();
    return result;
  },
};
function backup(
  store: IDBObjectStore,
  root: PlayerProfile,
  p: SaveData,
  at: number,
  reason: string,
) {
  const id = "backup:" + at + ":" + uid();
  const b: Backup = { schema: 2, id, at, reason, player: root, save: p };
  store.put(b, id);
}
export function resetClientSelectionForTests() {
  selected = null;
  writerId = null;
}
