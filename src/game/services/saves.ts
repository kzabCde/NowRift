import { profileRepository } from "../persistence/repository";
import { legacyRunRepository, validRun } from "./legacy-runs";
import type { RunResult } from "../bridge";
export { validRun };
export const runRepository = {
  list: (slotId?: string) =>
    slotId ? profileRepository.runs(slotId) : legacyRunRepository.list(),
  put: async (run: RunResult) => {
    if (!validRun(run)) throw new Error("Invalid run result");
    if (run.run) await profileRepository.record(run);
    else await legacyRunRepository.put(run);
  },
};
export type RunRepository = typeof runRepository;
