import type { CharacterAppearance } from "../presentation/appearance";
import type { CharacterStats, Rarity, WeaponSnapshot } from "../rpg/model";
import type { CharacterId } from "../loadout";
import { makeGame, beginGame, applyBuild } from "../engine";
import type { WeaponId } from "../content/forest";
import { stageById, seeded, type DifficultyId } from "./content";
import { lockedReason } from "./progression";
import { stageRuntime } from "./runtime";
import { characterLevel } from "../rpg/stats";
import { missionById } from "../story/content";
import { createMission } from "../story/runtime";
import { CAMPAIGN_BOUNDS } from "./maps";
import { emptyFog, revealFog, validFog } from "../world/exploration";
import { regionForWorld } from "../world/regions";
export type StageSelection = {
  mapExplored?: string;
  missionVersion?: 0 | 1;
  legacyAccess?: string[];
  visualAppearance?: CharacterAppearance;
  character?: CharacterId;
  weaponSnapshot?: WeaponSnapshot;
  activity?: "farming";
  mode?: "story" | "free";
  /** Lifetime XP when this run started; retained by the checkpoint. */
  startingXp?: number;
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
  if (
    (selection.mode !== undefined &&
      !["story", "free"].includes(selection.mode)) ||
    (selection.activity === "farming" && selection.mode === "story")
  )
    throw new Error("Invalid expedition.");
  const reason = lockedReason(
    selection.stageId,
    selection.difficulty,
    selection.clears,
    selection.legacyAccess,
  );
  if (reason) throw new Error(reason);
  const stage = stageById(selection.stageId),
    g = makeGame(
      CAMPAIGN_BOUNDS.width,
      CAMPAIGN_BOUNDS.height,
      selection.weaponSnapshot?.attackId ?? weapon,
      seeded(selection.seed),
    );
  g.character = selection.character ?? "wanderer";
  if (selection.visualAppearance)
    g.visualAppearance = structuredClone(selection.visualAppearance);
  if (selection.weaponSnapshot)
    g.equippedWeapon = structuredClone(selection.weaponSnapshot);
  g.campaign = stageRuntime(stage, selection.difficulty, selection.seed);
  const region = regionForWorld(stage.worldId).id;
  if (
    selection.mapExplored !== undefined &&
    !validFog(selection.mapExplored, region, "wilderness")
  )
    throw new Error("Invalid exploration data.");
  g.campaign.explored = revealFog(
    selection.mapExplored ?? emptyFog(region, "wilderness"),
    region,
    g.player,
    "wilderness",
  );
  g.campaign.mode =
    selection.activity === "farming" ? "free" : (selection.mode ?? "story");
  const mission =
    (selection.missionVersion === 1 || stage.number > 5) &&
    g.campaign.mode === "story"
      ? missionById(stage.id)
      : undefined;
  if (mission) g.campaign.mission = createMission(mission, g.campaign.map);
  if (selection.activity === "farming") {
    g.campaign.activity = "farming";
    g.campaign.harvested = [];
  }
  g.obstacles = g.campaign.map.props;
  if (selection.weaponSnapshot)
    applyBuild(g, selection.weaponSnapshot.stats, true);
  else if (selection.build) applyBuild(g, selection.build, true);
  // The same permanent XP curve drives Story and Free Mode HUD progression.
  const xp = characterLevel(selection.startingXp ?? 0);
  g.level =
    selection.startingXp === undefined
      ? (selection.weaponSnapshot?.stats.level ?? selection.build?.level ?? 1)
      : xp.level;
  g.xp = selection.startingXp === undefined ? 0 : xp.xp;
  g.xpToNext = 100 + (g.level - 1) * 50;
  g.appearance = selection.appearance;
  beginGame(g);
  if (mission) g.enemies.length = 0;
  if (selection.startingHp !== undefined)
    g.player.hp = Math.max(1, Math.min(g.player.maxHp, selection.startingHp));
  return g;
}
