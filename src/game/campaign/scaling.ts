import type { EnemyKind } from "../content/forest";
import { WORLDS, type StageDefinition, type WorldId } from "./content";

/** Scaling tracks the saved hero level, never temporary run upgrades. */
export function enemyScaling(
  playerLevel: number,
  stage: StageDefinition,
  worldId: WorldId,
  kind: EnemyKind,
) {
  const tier = Math.max(0, WORLDS.findIndex((w) => w.id === worldId));
  const archetype = kind === "boss" ? 4 : kind === "elite" ? 2 : kind === "caster" ? 1 : 0;
  const level = Math.max(1, Math.floor(Math.max(1, playerLevel)) + tier * 2 + stage.number - 1 + archetype);
  return {
    level,
    hp: 1 + 0.08 * (level - 1),
    damage: 1 + 0.05 * (level - 1),
    speed: Math.min(1.18, 1 + 0.002 * (level - 1)),
  };
}

export function enemyLevelRange(playerLevel: number, stage: StageDefinition) {
  return {
    min: enemyScaling(playerLevel, stage, stage.worldId, "slime").level,
    max: enemyScaling(playerLevel, stage, stage.worldId, "boss").level,
  };
}
