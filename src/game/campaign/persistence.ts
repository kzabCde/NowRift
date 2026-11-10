import { initializeRpg } from "../rpg/profile";
import { settleRpg } from "../rpg/settlement";
import { applyCommand, type RpgCommand } from "../rpg/actions";
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
  act(command: RpgCommand): Promise<ReturnType<typeof applyCommand>>;
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
  if (value === undefined) return initializeRpg(emptyProgress());
  if (!validProgress(value))
    throw new Error(
      "Campaign save is damaged. Original data was preserved; stage entry is disabled.",
    );
  return initializeRpg(value);
}
export function applyResult(progress: Progress, run: CampaignResult) {
  if (
    typeof run.id !== "string" ||
    !run.id.length ||
    typeof run.victory !== "boolean" ||
    !Number.isInteger(run.seed) ||
    run.seed < 0 ||
    run.seed > 4294967295 ||
    ![run.enemies, run.elites, run.bosses].every(
      (n) => Number.isSafeInteger(n) && n >= 0 && n <= 50000,
    ) ||
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
  const settled = settleRpg(progress, run, reward),
    next = settled.progress;
  next.receipts.push(run.id);
  if (run.victory && !next.clears.includes(key)) next.clears.push(key);
  reward.equipmentCount = settled.equipmentCount;
  reward.overflow = settled.overflow;
  return { progress: next, reward };
}
export const campaignRepository: CampaignRepository = {
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
  async act(command) {
    const db = await open();
    try {
      return await new Promise<ReturnType<typeof applyCommand>>(
        (resolve, reject) => {
          const t = db.transaction("progress", "readwrite"),
            store = t.objectStore("progress"),
            r = store.get("profile");
          let result: ReturnType<typeof applyCommand>;
          r.onsuccess = () => {
            try {
              result = applyCommand(read(r.result), command);
              store.put(result.progress, "profile");
            } catch (e) {
              t.abort();
              reject(e);
            }
          };
          t.oncomplete = () => resolve(result);
          t.onabort = () =>
            reject(t.error ?? new Error("Economy transaction interrupted"));
          t.onerror = () => reject(t.error);
        },
      );
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
