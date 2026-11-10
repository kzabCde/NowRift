import {
  RELICS,
  emptyEquipment,
  enhancementCost,
  type RelicId,
} from "../loadout";
import {
  emptyProgress,
  validProgress,
  lockedReason,
  clearKey,
  type Progress,
} from "./progression";
import { resolveRewards, type CampaignResult, type Rewards } from "./rewards";
import { DIFFICULTIES, stageById } from "./content";
export interface CampaignRepository {
  load(): Promise<Progress>;
  equip(id: RelicId | null): Promise<Progress>;
  enhance(id: RelicId): Promise<Progress>;
  settle(
    run: CampaignResult,
  ): Promise<{ progress: Progress; reward: Rewards | null }>;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("nowrift-campaign", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("progress");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("Close another NowRift tab to enable campaign saves."));
  });
}
function read(value: unknown): Progress {
  if (value === undefined) return emptyProgress();
  if (!validProgress(value))
    throw new Error(
      "Campaign save is damaged. Original data was preserved; stage entry is disabled.",
    );
  return value;
}
export function applyResult(progress: Progress, run: CampaignResult) {
  if (
    !DIFFICULTIES[run.difficulty] ||
    ![run.enemies, run.elites, run.bosses, run.seconds].every(
      (n) => Number.isFinite(n) && n >= 0,
    )
  )
    throw new Error("Invalid result");
  const stage = stageById(run.stageId),
    reason = lockedReason(stage.id, run.difficulty, progress.clears);
  if (reason) throw new Error(reason);
  if (
    run.victory &&
    (run.seconds <
      stage.clear.seconds * DIFFICULTIES[run.difficulty].duration ||
      (stage.clear.kind === "boss" && run.bosses < 1))
  )
    throw new Error("Clear condition not met");
  if (progress.receipts.includes(run.id)) return { progress, reward: null };
  const key = clearKey(run.stageId, run.difficulty),
    reward = resolveRewards(run, !progress.clears.includes(key));
  const next: Progress = {
    ...progress,
    clears: [...progress.clears],
    receipts: [...progress.receipts, run.id],
    gold: progress.gold + reward.gold,
    xp: progress.xp + reward.xp,
    materials: { ...progress.materials },
    candidates: [...progress.candidates, ...reward.candidates],
  };
  if (run.victory && !next.clears.includes(key)) next.clears.push(key);
  for (const [id, n] of Object.entries(reward.materials))
    next.materials[id] = (next.materials[id] ?? 0) + n;
  return { progress: next, reward };
}
export function changeEquipment(
  progress: Progress,
  action: "equip" | "enhance",
  id: RelicId | null,
): Progress {
  if (
    id !== null &&
    (!Object.hasOwn(RELICS, id) || !progress.candidates.includes(id))
  )
    throw new Error("Earn this relic by defeating its world guardian first.");
  const equipment = progress.equipment ?? emptyEquipment();
  const next: Progress = {
    ...progress,
    materials: { ...progress.materials },
    equipment: { ...equipment, ranks: { ...equipment.ranks } },
  };
  if (action === "equip") {
    next.equipment!.equipped = id;
    return next;
  }
  if (!id) throw new Error("Choose a relic to enhance.");
  const rank = equipment.ranks[id] ?? 0;
  if (rank >= 3) throw new Error("This relic is fully enhanced.");
  const cost = enhancementCost(rank),
    material = RELICS[id].material;
  if (next.gold < cost.gold || (next.materials[material] ?? 0) < cost.material)
    throw new Error("Not enough campaign gold or materials.");
  next.gold -= cost.gold;
  next.materials[material] -= cost.material;
  next.equipment!.ranks[id] = rank + 1;
  return next;
}
async function updateEquipment(
  action: "equip" | "enhance",
  id: RelicId | null,
): Promise<Progress> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction("progress", "readwrite"),
        store = t.objectStore("progress"),
        r = store.get("profile");
      let next: Progress;
      r.onsuccess = () => {
        try {
          next = changeEquipment(read(r.result), action, id);
          store.put(next, "profile");
        } catch (e) {
          t.abort();
          reject(e);
        }
      };
      t.oncomplete = () => resolve(next);
      t.onerror = () => reject(t.error);
      t.onabort = () =>
        reject(t.error ?? new Error("Equipment save interrupted"));
    });
  } finally {
    db.close();
  }
}
export const campaignRepository: CampaignRepository = {
  equip: (id) => updateEquipment("equip", id),
  enhance: (id) => updateEquipment("enhance", id),
  async load() {
    const db = await open();
    try {
      return await new Promise<Progress>((resolve, reject) => {
        const t = db.transaction("progress", "readonly"),
          r = t.objectStore("progress").get("profile");
        r.onsuccess = () => {
          try {
            resolve(read(r.result));
          } catch (e) {
            reject(e);
          }
        };
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  },
  async settle(run) {
    const db = await open();
    try {
      return await new Promise<{ progress: Progress; reward: Rewards | null }>(
        (resolve, reject) => {
          const t = db.transaction("progress", "readwrite"),
            store = t.objectStore("progress"),
            r = store.get("profile");
          let result: ReturnType<typeof applyResult>;
          r.onsuccess = () => {
            try {
              result = applyResult(read(r.result), run);
              store.put(result.progress, "profile");
            } catch (e) {
              t.abort();
              reject(e);
            }
          };
          t.oncomplete = () => resolve(result);
          t.onabort = () =>
            reject(t.error ?? new Error("Campaign save interrupted"));
          t.onerror = () => reject(t.error);
        },
      );
    } finally {
      db.close();
    }
  },
};
