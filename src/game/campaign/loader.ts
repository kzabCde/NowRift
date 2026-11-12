import type { CharacterStats, Rarity, WeaponSnapshot } from "../rpg/model";
import type { CharacterId } from "../loadout";
import { makeGame, beginGame, applyBuild } from "../engine";
import type { WeaponId } from "../content/forest";
import { stageById, seeded, type DifficultyId } from "./content";
import { lockedReason } from "./progression";
import { stageRuntime } from "./runtime";
export type StageSelection = {
  character?: CharacterId;
  weaponSnapshot?: WeaponSnapshot;
  activity?: "farming";
  mode?: "story" | "free";
  returnTo?: "haven";
  startingHp?: number;
  outfit?: import("../world/save").Outfit;
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
  const reason = selection.mode === "free" ? null : lockedReason(
    selection.stageId,
    selection.difficulty,
    selection.clears,
  );
  if (reason) throw new Error(reason);
  const stage = stageById(selection.stageId),
    g = makeGame(
      1800,
      1400,
      selection.weaponSnapshot?.attackId ?? weapon,
      seeded(selection.seed),
    );
  g.character = selection.character ?? "wanderer";
  if (selection.weaponSnapshot)
    g.equippedWeapon = structuredClone(selection.weaponSnapshot);
  g.campaign = stageRuntime(stage, selection.difficulty, selection.seed);
  g.campaign.mode = selection.mode ?? "story";
  if (selection.activity === "farming") {
    if (selection.stageId !== "forest-1")
      throw new Error("Invalid expedition.");
    g.campaign.activity = "farming";
    g.campaign.harvested = [];
  }
  g.obstacles = g.campaign.map.props;
  if (selection.weaponSnapshot)
    applyBuild(g, selection.weaponSnapshot.stats, true);
  else if (selection.build) applyBuild(g, selection.build, true);
  // The permanent character level is derived from saved profile XP, not a new run.
  if (selection.build) g.level = selection.build.level;
  if (selection.weaponSnapshot) g.level = selection.weaponSnapshot.stats.level;
  g.appearance = selection.appearance;
  beginGame(g);
  if (selection.startingHp !== undefined)
    g.player.hp = Math.max(1, Math.min(g.player.maxHp, selection.startingHp));
  return g;
}
