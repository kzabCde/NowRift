import { expect, test } from "vitest";
import {
  ANIMATIONS,
  ANIMATION_COLUMNS,
  ANIMATION_DIRECTIONS,
  animationDuration,
  animationFrame,
  animationPhase,
  createAnimationState,
  requestAnimation,
  advanceAnimation,
  sampleAnimation,
  type AnimationPose,
} from "./animation";

test("all tracks have valid frames in every direction, distinct speeds and finite terminal frames", () => {
  for (const pose of Object.keys(ANIMATIONS) as AnimationPose[])
    for (const facing of ANIMATION_DIRECTIONS) {
      for (const time of [0, 20, 100, 500, 10000, NaN, -1]) {
        const frame = animationFrame(pose, facing, time);
        expect(Number.isSafeInteger(frame)).toBe(true);
        expect(frame).toBeGreaterThanOrEqual(
          ANIMATION_DIRECTIONS.indexOf(facing) * ANIMATION_COLUMNS,
        );
        expect(frame).toBeLessThan(
          (ANIMATION_DIRECTIONS.indexOf(facing) + 1) * ANIMATION_COLUMNS,
        );
      }
    }
  expect(
    new Set(Object.values(ANIMATIONS).map((track) => track.fps)).size,
  ).toBeGreaterThan(5);
  expect(animationFrame("death", "up", 10000)).toBe(2 * ANIMATION_COLUMNS + 21);
});
test("render requests do not restart actions and locomotion cannot interrupt an impact", () => {
  const state = createAnimationState();
  expect(
    requestAnimation(state, {
      pose: "melee",
      eventId: "attack-1",
      facing: "right",
    }),
  ).toBe(true);
  advanceAnimation(state, 90);
  expect(animationPhase(state)).toBe("impact");
  const before = sampleAnimation(state);
  expect(requestAnimation(state, { pose: "melee", eventId: "attack-1" })).toBe(
    false,
  );
  expect(state.elapsed).toBe(90);
  expect(sampleAnimation(state)).toBe(before);
  expect(requestAnimation(state, { pose: "walk" })).toBe(false);
  advanceAnimation(state, animationDuration("melee"));
  expect(state.complete).toBe(true);
  expect(requestAnimation(state, { pose: "walk", facing: "left" })).toBe(true);
});
test("damage and death interrupt work, and death remains terminal until an explicit respawn", () => {
  const state = createAnimationState("mine");
  expect(requestAnimation(state, { pose: "hit", eventId: 1 })).toBe(true);
  expect(requestAnimation(state, { pose: "craft", eventId: 2 })).toBe(false);
  expect(requestAnimation(state, { pose: "death", eventId: 3 })).toBe(true);
  advanceAnimation(state, 10000);
  expect(requestAnimation(state, { pose: "idle" })).toBe(false);
  expect(requestAnimation(state, { pose: "respawn", eventId: 4 })).toBe(true);
  advanceAnimation(state, animationDuration("respawn"));
  expect(requestAnimation(state, { pose: "idle" })).toBe(true);
});
test("pause/resume and delta partitioning preserve deterministic frames without browser timers", () => {
  const one = createAnimationState("walk", "down"),
    many = createAnimationState("walk", "down");
  advanceAnimation(one, 1250);
  for (let i = 0; i < 50; i++) advanceAnimation(many, 25);
  expect(many.elapsed).toBeCloseTo(one.elapsed);
  expect(sampleAnimation(many)).toBe(sampleAnimation(one));
  const paused = { ...many };
  advanceAnimation(many, 0);
  advanceAnimation(many, NaN);
  advanceAnimation(many, -10);
  expect(many).toEqual(paused);
});
test("new receipt tokens can replay a completed action while duplicate receipts do not", () => {
  const state = createAnimationState();
  requestAnimation(state, { pose: "gather", eventId: "receipt-a" });
  advanceAnimation(state, 800);
  expect(
    requestAnimation(state, { pose: "gather", eventId: "receipt-a" }),
  ).toBe(false);
  expect(
    requestAnimation(state, { pose: "gather", eventId: "receipt-b" }),
  ).toBe(true);
  expect(state.elapsed).toBe(0);
});
