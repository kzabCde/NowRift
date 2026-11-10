import type { CharacterStats, Rarity } from "../rpg/model";
import { makeGame, beginGame, applyBuild } from "../engine";
import type { WeaponId } from "../content/forest";
import { stageById, seeded, type DifficultyId } from "./content";
import { lockedReason } from "./progression";
import { stageRuntime } from "./runtime";
export type StageSelection = {
  build?: CharacterStats;
  appearance?: { rarity: Rarity; icon: number };
  stageId: string;
  difficulty: DifficultyId;
  seed: number;
  clears: string[];
};
export function loadStage(
  selection: StageSelection,
  weapon: WeaponId = "arcane",
) {
  const reason = lockedReason(
    selection.stageId,
    selection.difficulty,
    selection.clears,
  );
  if (reason) throw new Error(reason);
  const stage = stageById(selection.stageId),
    g = makeGame(1800, 1400, weapon, seeded(selection.seed));
  g.campaign = stageRuntime(stage, selection.difficulty, selection.seed);
  g.obstacles = g.campaign.map.props;
  if (selection.build) applyBuild(g, selection.build, true);
  g.appearance = selection.appearance;
  beginGame(g);
  return g;
}
