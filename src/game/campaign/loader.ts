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
  const reason =
    selection.activity === "farming"
      ? null
      : lockedReason(selection.stageId, selection.difficulty, selection.clears);
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
  if (selection.activity === "farming") {
    g.campaign.activity = "farming";
    g.campaign.harvested = [];
  }
  g.obstacles = g.campaign.map.props;
  if (selection.weaponSnapshot)
    applyBuild(g, selection.weaponSnapshot.stats, true);
  else if (selection.build) applyBuild(g, selection.build, true);
  // The hero level comes from the latest persistent RPG build.
  g.level =
    selection.weaponSnapshot?.stats.level ?? selection.build?.level ?? 1;
  g.appearance = selection.appearance;
  beginGame(g);
  if (selection.startingHp !== undefined)
    g.player.hp = Math.max(1, Math.min(g.player.maxHp, selection.startingHp));
  return g;
}
