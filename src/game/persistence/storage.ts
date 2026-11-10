import { saveStarted, saveFinished } from "./status";
export const DB_NAME = "nowrift-campaign",
  STORE = "progress";
export function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Local storage is unavailable."));
    request.onblocked = () =>
      reject(
        new Error(
          "Close other NowRift tabs, then retry opening local storage.",
        ),
      );
  });
}
/** All callbacks are synchronous inside one read/write transaction. Never await between read and put. */
export async function transact<T>(
  fn: (records: Map<string, unknown>, store: IDBObjectStore) => T,
  includeBackups = false,
): Promise<T> {
  saveStarted();
  let db: IDBDatabase | undefined;
  try {
    db = await openStorage();
    const result = await new Promise<T>((resolve, reject) => {
      const tx = db!.transaction(STORE, "readwrite"),
        store = tx.objectStore(STORE),
        keys = store.getAllKeys();
      let result: T, failed: unknown;
      const records = new Map<string, unknown>();
      const apply = () => {
        try {
          result = fn(records, store);
        } catch (error) {
          failed = error;
          tx.abort();
        }
      };
      keys.onsuccess = () => {
        const selected = keys.result
          .map(String)
          .filter(
            (key) =>
              key === "player" ||
              key === "profile" ||
              key.startsWith("slot:") ||
              (includeBackups && key.startsWith("backup:")),
          );
        if (!selected.length) {
          apply();
          return;
        }
        let left = selected.length;
        for (const key of selected) {
          const request = store.get(key);
          request.onsuccess = () => {
            records.set(key, request.result);
            if (!--left) apply();
          };
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () =>
        reject(
          failed ??
            tx.error ??
            new Error("Save interrupted. Previous data was preserved."),
        );
      tx.onerror = () => {
        failed ??= tx.error;
      };
    });
    saveFinished();
    return result;
  } catch (error) {
    saveFinished(error);
    throw error;
  } finally {
    db?.close();
  }
}
