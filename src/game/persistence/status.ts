export type SaveStatus = {
  phase: "idle" | "saving" | "saved" | "failed";
  at: number;
  error: string;
  revision: number;
};
type Source = "data" | "preferences";
let status: SaveStatus = { phase: "idle", at: 0, error: "", revision: 0 };
const listeners = new Set<() => void>(),
  pending = new Map<Source, number>(),
  batchFailed = new Set<Source>(),
  failures = new Map<Source, string>();
export const saveStatus = {
  get: () => status,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
function publish(patch: Partial<SaveStatus>) {
  status = { ...status, ...patch, revision: status.revision + 1 };
  listeners.forEach((fn) => fn());
}
export function saveStarted(source: Source = "data") {
  if (!pending.get(source)) batchFailed.delete(source);
  pending.set(source, (pending.get(source) ?? 0) + 1);
  publish({ phase: "saving", error: [...failures.values()].join(" ") });
}
export function saveFinished(error?: unknown, source: Source = "data") {
  pending.set(source, Math.max(0, (pending.get(source) ?? 0) - 1));
  if (error) {
    batchFailed.add(source);
    failures.set(source, storageError(error));
  }
  if (!pending.get(source) && !batchFailed.has(source)) failures.delete(source);
  const working = [...pending.values()].some((n) => n > 0);
  publish({
    phase: working ? "saving" : failures.size ? "failed" : "saved",
    error: [...failures.values()].join(" "),
    at: Date.now(),
  });
}
export function storageError(error: unknown) {
  if (error instanceof Error && error.name === "QuotaExceededError")
    return "Device storage is full. Export a backup and free space, then retry. Existing data was preserved.";
  return error instanceof Error
    ? error.message
    : "Local storage is unavailable. Existing data was preserved.";
}
