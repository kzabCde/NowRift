import type { CharacterId } from "../loadout";
import type { Outfit } from "../world/save";
import type { WeaponId } from "../content/forest";
import { animationFrame, type AnimationPose } from "./animation";
export type Facing = "down" | "right" | "up" | "left";
export type Pose = AnimationPose | "attack";
export const CHARACTER_ART = {
  size: 48,
  columns: 26,
  rows: 4,
  directions: ["down", "right", "up", "left"] as const,
};
export const WEAPON_ART = { size: 32, columns: 18 };
/** Retained composite paths are fallback art; actual actors use independent layers. */
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
  return animationFrame(
    pose === "attack" ? "melee" : pose,
    facing,
    pose === "death" ? deathAge : time,
  );
}
export const BODY_BOB = [
  0, -1, 0, 0, 0, -1, 0, 1, 0, -1, -1, -2, 0, 1, -1, -2, -2, -1, 1, 0, 0, 0, 1,
  2, 3, 1,
] as const;
/** These exact source-pixel anchors match scripts/character-layers.py anatomy. */
export function handPoint(
  character: CharacterId,
  facing: Facing,
  _attacking = false,
  frame = 0,
) {
  const width = character === "sentinel" ? 10 : character === "strider" ? 7 : 8;
  const lean =
    frame >= 10 && frame < 14
      ? [-1, 0, 2, 1][frame - 10]
      : frame === 18
        ? -2
        : 0;
  const stride = frame >= 4 && frame <= 9 ? [-2, -3, 0, 2, 3, 0][frame - 4] : 0;
  const arm =
    frame >= 10 && frame <= 11
      ? -5
      : frame >= 14 && frame <= 17
        ? -7
        : frame >= 22
          ? [-6, -3, 4, 1][frame - 22]
          : Math.round(-stride / 2);
  return {
    x: facing === "left" ? -width - lean - 3 : width + lean + 2,
    y: -9 + (BODY_BOB[frame] ?? 0) + arm,
  };
}
export const practiceFrame: Record<WeaponId, number> = {
  arcane: 0,
  daggers: 4,
  fire: 5,
  frost: 2,
  slash: 1,
  sweep: 3,
};
