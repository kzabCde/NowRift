/** Centralized encounter scaling. World tiers and archetypes retain identity as the hero grows. */
import type { EnemyKind } from "../content/forest";
import type { WorldId } from "./content";

const WORLD_OFFSET: Record<WorldId, number> = {
  forest: -2,
  desert: 1,
  frozen: 3,
  infernal: 5,
};
const ENEMY_OFFSET: Partial<Record<EnemyKind, number>> = {
  elite: 2,
  boss: 4,
};

export function enemyScale(
  playerLevel: number,
  world: WorldId,
  stageNumber: number,
  kind: EnemyKind,
) {
  const effectiveLevel = Math.max(
    1,
    Math.min(
      60,
      Math.floor(playerLevel) +
        WORLD_OFFSET[world] +
        Math.max(0, stageNumber - 1) +
        (ENEMY_OFFSET[kind] ?? 0),
    ),
  );
  return {
    level: effectiveLevel,
    hp: 1 + 0.08 * (effectiveLevel - 1),
    damage: 1 + 0.05 * (effectiveLevel - 1),
    speed: Math.min(1.12, 1 + 0.002 * (effectiveLevel - 1)),
  };
}
