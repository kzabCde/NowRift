import type { StageSelection } from "./loader";
import type { CampaignResult } from "./rewards";
import { missionById } from "../story/content";
import { STAGES, DIFFICULTIES } from "./content";

export type RunStageIdentity = {
  stageId: string;
  difficulty: StageSelection["difficulty"];
  seed: number;
  mode: "story" | "free";
  activity?: "farming";
  missionVersion: 0 | 1;
};
export function validRunStageIdentity(
  value: unknown,
): value is RunStageIdentity {
  if (!value || typeof value !== "object") return false;
  const s = value as RunStageIdentity;
  return (
    STAGES.some((t) => t.id === s.stageId) &&
    Object.hasOwn(DIFFICULTIES, s.difficulty) &&
    Number.isSafeInteger(s.seed) &&
    s.seed >= 0 &&
    s.seed <= 4294967295 &&
    ["story", "free"].includes(s.mode) &&
    [0, 1].includes(s.missionVersion) &&
    (s.activity === undefined ||
      (s.activity === "farming" && s.mode === "free")) &&
    (s.missionVersion !== 1 || (s.mode === "story" && !!missionById(s.stageId)))
  );
}
export function stageIdentity(
  s: StageSelection,
  fresh = false,
): RunStageIdentity {
  const mode = s.activity === "farming" ? "free" : (s.mode ?? "story");
  return {
    stageId: s.stageId,
    difficulty: s.difficulty,
    seed: s.seed,
    mode,
    ...(mode === "free" && s.activity === "farming"
      ? { activity: "farming" as const }
      : {}),
    missionVersion:
      mode === "story" &&
      (fresh ? !!missionById(s.stageId) : s.missionVersion === 1)
        ? 1
        : 0,
  };
}
export function sameRunStage(
  a: RunStageIdentity,
  b: StageSelection | CampaignResult,
) {
  const mode = b.activity === "farming" ? "free" : (b.mode ?? "story");
  return (
    a.stageId === b.stageId &&
    a.difficulty === b.difficulty &&
    a.seed === b.seed &&
    a.mode === mode &&
    a.activity === b.activity
  );
}
