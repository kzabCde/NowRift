import type { RunResult } from "../bridge";
const DB = "nowrift-saves";
export interface RunRepository {
  list(): Promise<RunResult[]>;
  put(run: RunResult): Promise<void>;
}
export function validRun(value: unknown): value is RunResult {
  if (!value || typeof value !== "object") return false;
  const r = value as RunResult;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    Number.isFinite(r.at) &&
    ["victory", "gameover"].includes(r.outcome) &&
    ["arcane", "daggers", "fire", "frost"].includes(r.weapon) &&
    [r.kills, r.gold, r.level, r.seconds].every(
      (v) => Number.isFinite(v) && v >= 0,
    )
  );
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("runs"))
        request.result.createObjectStore("runs", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Save storage is unavailable"));
    request.onblocked = () =>
      reject(new Error("Close another NowRift tab to upgrade local storage."));
  });
}
export const runRepository: RunRepository = {
  async list() {
    const db = await open();
    try {
      return await new Promise<RunResult[]>((resolve, reject) => {
        const tx = db.transaction("runs", "readonly");
        const req = tx.objectStore("runs").getAll();
        req.onsuccess = () => {
          if (!req.result.every(validRun)) {
            reject(
              new Error(
                "A local run record is damaged. Original data has been preserved.",
              ),
            );
            return;
          }
          resolve(
            req.result
              .sort((a: RunResult, b: RunResult) => b.at - a.at)
              .slice(0, 20),
          );
        };
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  },
  async put(run) {
    if (!validRun(run)) throw new Error("Invalid run result");
    const db = await open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("runs", "readwrite");
        tx.objectStore("runs").put(run);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () =>
          reject(tx.error ?? new Error("Save transaction interrupted"));
      });
    } finally {
      db.close();
    }
  },
};
