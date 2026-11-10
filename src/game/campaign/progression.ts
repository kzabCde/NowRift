import { validEquipment, type Equipment } from "../loadout";
import {
  ITEM_IDS,
  STAGES,
  WORLDS,
  stageById,
  type DifficultyId,
} from "./content";
export type Progress = {
  equipment?: Equipment;
  version: 1;
  clears: string[];
  receipts: string[];
  gold: number;
  xp: number;
  materials: Record<string, number>;
  candidates: string[];
};
export const emptyProgress = (): Progress => ({
  version: 1,
  clears: [],
  receipts: [],
  gold: 0,
  xp: 0,
  materials: {},
  candidates: [],
});
export const clearKey = (stage: string, difficulty: DifficultyId) =>
  `${stage}:${difficulty}`;
export function lockedReason(
  stageId: string,
  difficulty: DifficultyId,
  clears: readonly string[],
): string | null {
  const s = stageById(stageId),
    worldStages = STAGES.filter((x) => x.worldId === s.worldId),
    wi = WORLDS.findIndex((w) => w.id === s.worldId);
  if (difficulty !== "normal") {
    const prerequisite = difficulty === "hard" ? "normal" : "hard";
    if (
      !worldStages.every((x) => clears.includes(clearKey(x.id, prerequisite)))
    )
      return `Clear all five ${prerequisite.toUpperCase()} stages in this world.`;
  }
  if (
    s.number > 1 &&
    !clears.includes(clearKey(`${s.worldId}-${s.number - 1}`, difficulty))
  )
    return `Clear Stage ${s.number - 1} on ${difficulty.toUpperCase()}.`;
  if (
    s.number === 1 &&
    wi > 0 &&
    !clears.includes(clearKey(`${WORLDS[wi - 1].id}-5`, "normal"))
  )
    return "Defeat the previous world’s Normal final boss.";
  return null;
}
export function validProgress(p: unknown): p is Progress {
  if (!p || typeof p !== "object") return false;
  const v = p as Progress;
  return (
    v.version === 1 &&
    (v.equipment === undefined ||
      (validEquipment(v.equipment) &&
        (v.equipment.equipped === null ||
          (Array.isArray(v.candidates) &&
            v.candidates.includes(v.equipment.equipped))))) &&
    Array.isArray(v.clears) &&
    v.clears.every((k) =>
      STAGES.some((s) =>
        ["normal", "hard", "nightmare"].some((d) => k === `${s.id}:${d}`),
      ),
    ) &&
    Array.isArray(v.receipts) &&
    v.receipts.every((x) => typeof x === "string") &&
    Number.isFinite(v.gold) &&
    v.gold >= 0 &&
    Number.isFinite(v.xp) &&
    v.xp >= 0 &&
    !!v.materials &&
    typeof v.materials === "object" &&
    !Array.isArray(v.materials) &&
    Object.keys(v.materials).every((id) => ITEM_IDS.includes(id)) &&
    Object.values(v.materials).every((n) => Number.isFinite(n) && n >= 0) &&
    Array.isArray(v.candidates) &&
    v.candidates.every((id) => typeof id === "string" && ITEM_IDS.includes(id))
  );
}
