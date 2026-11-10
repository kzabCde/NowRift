import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import { runRepository, validRun } from "./saves";
import type { RunResult } from "../bridge";
const run: RunResult = {
  id: "run-1",
  at: 1,
  outcome: "victory",
  kills: 42,
  gold: 250,
  level: 10,
  seconds: 510,
  weapon: "fire",
};
test("IndexedDB round trip, stable IDs, and newest-first ordering", async () => {
  await runRepository.put(run);
  await runRepository.put(run);
  await runRepository.put({ ...run, id: "run-2", at: 2 });
  const records = await runRepository.list();
  expect(records.map((r) => r.id)).toEqual(["run-2", "run-1"]);
});
test("invalid saves rejected without changing good records", async () => {
  expect(validRun({ ...run, seconds: NaN })).toBe(false);
  await expect(runRepository.put({ ...run, kills: -1 })).rejects.toThrow(
    "Invalid run",
  );
  expect((await runRepository.list()).length).toBe(2);
});
test("corrupt existing record is reported and preserved", async () => {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open("nowrift-saves", 1);
    req.onsuccess = () => {
      const db = req.result,
        tx = db.transaction("runs", "readwrite");
      tx.objectStore("runs").put({ id: "corrupt", kills: "broken" });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
  await expect(runRepository.list()).rejects.toThrow("damaged");
});
