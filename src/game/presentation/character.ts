import type { CharacterId } from "../loadout";
import type { Outfit } from "../world/save";
import type { WeaponId } from "../content/forest";
export type Facing = "down" | "right" | "up" | "left";
export type Pose = "idle" | "walk" | "attack" | "hit" | "death";
export const CHARACTER_ART = {
  size: 32,
  columns: 12,
  rows: 4,
  directions: ["down", "right", "up", "left"] as const,
};
export const bodyKey = (character: CharacterId, outfit: Outfit) =>
  `character-${character}-${outfit}`;
export const bodyPath = (character: CharacterId, outfit: Outfit) =>
  `/assets/characters/${character}-${outfit}.png`;
export function facingFromAngle(angle: number): Facing {
  return (["right", "down", "left", "up"] as const)[
    (Math.round(angle / (Math.PI / 2)) + 4) % 4
  ];
}
export function bodyFrame(
  facing: Facing,
  pose: Pose,
  time: number,
  deathAge = 0,
) {
  const offset =
    CHARACTER_ART.directions.indexOf(facing) * CHARACTER_ART.columns;
  return (
    offset +
    (pose === "death"
      ? 9 + Math.min(2, Math.floor(deathAge / 160))
      : pose === "hit"
        ? 8
        : pose === "attack"
          ? 6 + (Math.floor(time / 85) % 2)
          : pose === "walk"
            ? 2 + (Math.floor(time / 120) % 4)
            : Math.floor(time / 600) % 2)
  );
}
export function handPoint(
  character: CharacterId,
  facing: Facing,
  attacking = false,
  frame = 0,
) {
  const width = character === "sentinel" ? 8 : character === "strider" ? 5 : 6;
  const bob = [0, -1, 0, -1, 0, 1, -1, 0, 1][frame] ?? 0;
  return {
    x: facing === "left" || facing === "up" ? -width : width,
    y: -5 + bob + (attacking ? -1 : 0),
  };
}
/** Explicit temporary practice visuals, never represented as inventory ownership. */
export const practiceFrame: Record<WeaponId, number> = {
  arcane: 0,
  daggers: 4,
  fire: 5,
  frost: 2,
  slash: 1,
  sweep: 3,
};
