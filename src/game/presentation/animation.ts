import type { Facing } from "./character";

/** Animation is presentation only. Damage and successful transactions supply events. */
export type AnimationPose =
  | "idle"
  | "walk"
  | "run"
  | "melee"
  | "ranged"
  | "cast"
  | "hit"
  | "knockback"
  | "dash"
  | "death"
  | "respawn"
  | "interact"
  | "mine"
  | "gather"
  | "craft";
export type AnimationDefinition = {
  frames: readonly number[];
  fps: number;
  loop: boolean;
  priority: number;
};
export const ANIMATION_COLUMNS = 26;
export const ANIMATION_DIRECTIONS = ["down", "right", "up", "left"] as const;
export const ANIMATIONS = {
  idle: { frames: [0, 1, 2, 3], fps: 6, loop: true, priority: 0 },
  walk: { frames: [4, 5, 6, 7, 8, 9], fps: 10, loop: true, priority: 10 },
  run: { frames: [4, 5, 6, 7, 8, 9], fps: 13, loop: true, priority: 20 },
  melee: { frames: [10, 11, 12, 13], fps: 16, loop: false, priority: 60 },
  ranged: { frames: [10, 11, 12, 13], fps: 14, loop: false, priority: 60 },
  cast: { frames: [14, 15, 16, 17], fps: 12, loop: false, priority: 60 },
  hit: { frames: [18], fps: 10, loop: false, priority: 80 },
  knockback: { frames: [18], fps: 10, loop: false, priority: 85 },
  // A supported track for existing movement events, never a grant of a dash ability.
  dash: { frames: [4, 5, 6, 7, 8, 9], fps: 14, loop: false, priority: 70 },
  death: { frames: [19, 20, 21], fps: 9, loop: false, priority: 100 },
  respawn: { frames: [21, 20, 19, 0], fps: 8, loop: false, priority: 95 },
  interact: { frames: [22, 23, 24, 25], fps: 8, loop: false, priority: 50 },
  mine: { frames: [22, 23, 24, 25], fps: 10, loop: false, priority: 50 },
  gather: { frames: [22, 23, 24, 25], fps: 7, loop: false, priority: 50 },
  craft: { frames: [22, 23, 24, 25], fps: 9, loop: false, priority: 50 },
} as const satisfies Record<AnimationPose, AnimationDefinition>;

export function animationDuration(pose: AnimationPose): number {
  const animation = ANIMATIONS[pose];
  return (animation.frames.length / animation.fps) * 1000;
}
const elapsed = (time: number) =>
  Number.isFinite(time) ? Math.max(0, time) : 0;
export function animationFrame(
  pose: AnimationPose,
  facing: Facing,
  timeMs: number,
): number {
  const animation = ANIMATIONS[pose],
    index = Math.floor((elapsed(timeMs) * animation.fps) / 1000);
  return (
    ANIMATION_DIRECTIONS.indexOf(facing) * ANIMATION_COLUMNS +
    animation.frames[
      animation.loop
        ? index % animation.frames.length
        : Math.min(index, animation.frames.length - 1)
    ]
  );
}
export type AnimationState = {
  pose: AnimationPose;
  facing: Facing;
  elapsed: number;
  complete: boolean;
  eventId?: string | number;
};
export function createAnimationState(
  pose: AnimationPose = "idle",
  facing: Facing = "down",
): AnimationState {
  return { pose, facing, elapsed: 0, complete: false };
}
export function requestAnimation(
  state: AnimationState,
  request: { pose: AnimationPose; facing?: Facing; eventId?: string | number },
): boolean {
  const current = ANIMATIONS[state.pose],
    incoming = ANIMATIONS[request.pose];
  // A repeated render request must not restart a one-shot action every frame.
  if (state.pose === request.pose && state.eventId === request.eventId) {
    if (request.facing) state.facing = request.facing;
    return false;
  }
  if (state.pose === "death" && request.pose !== "respawn") return false;
  if (
    request.pose !== "respawn" &&
    !current.loop &&
    !state.complete &&
    incoming.priority < current.priority
  )
    return false;
  state.pose = request.pose;
  state.facing = request.facing ?? state.facing;
  state.elapsed = 0;
  state.eventId = request.eventId;
  state.complete = false;
  return true;
}
export function advanceAnimation(
  state: AnimationState,
  deltaMs: number,
): number {
  const definition = ANIMATIONS[state.pose];
  state.elapsed += elapsed(deltaMs);
  if (definition.loop) state.elapsed %= animationDuration(state.pose);
  else {
    const duration = animationDuration(state.pose);
    state.complete = state.elapsed >= duration;
    state.elapsed = Math.min(state.elapsed, duration);
  }
  return sampleAnimation(state);
}
export function sampleAnimation(state: AnimationState): number {
  return animationFrame(state.pose, state.facing, state.elapsed);
}
export function animationPhase(
  state: AnimationState,
): "loop" | "windup" | "impact" | "recovery" | "complete" {
  if (ANIMATIONS[state.pose].loop) return "loop";
  if (state.complete) return "complete";
  const progress = state.elapsed / animationDuration(state.pose);
  return progress < 0.25 ? "windup" : progress < 0.75 ? "impact" : "recovery";
}
