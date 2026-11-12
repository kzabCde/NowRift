import { describe, expect, test } from "vitest";
import { WEAPONS } from "../content/forest";
import type { Feedback } from "../feedback";
import {
  VFX,
  VFX_SHEETS,
  VfxTimeline,
  effectBudget,
  effectDefinition,
  inEffectView,
  skillVisuals,
  vfxFrame,
} from "./vfx";

const prefs = { quality: "high" as const, reducedEffects: false, particles: 1 };
function event(
  kind: Feedback["kind"] = "spark",
  extra: Partial<Feedback> = {},
): Feedback {
  return {
    kind,
    x: 100,
    y: 100,
    tx: 100,
    ty: 100,
    color: 0xffffff,
    radius: 24,
    angle: 0,
    important: false,
    ...extra,
  };
}
describe("pixel effect definitions", () => {
  test("all existing skills resolve to appropriate release/impact families and valid atlas frames", () => {
    expect(Object.keys(skillVisuals).sort()).toEqual(
      Object.keys(WEAPONS).sort(),
    );
    expect(skillVisuals.arcane.impact.family).toBe("arcane");
    expect(skillVisuals.frost.impact.family).toBe("frost");
    expect(skillVisuals.sweep.release.family).toBe("fire");
    expect(skillVisuals.slash.release.family).toBe("physical");
    for (const def of [
      ...Object.values(VFX),
      ...Object.values(skillVisuals).flatMap((skill) => [
        skill.release,
        skill.impact,
      ]),
    ]) {
      const sheet = VFX_SHEETS.find(
        (sheet) => sheet.id === `pixel-vfx-${def.family}`,
      )!;
      expect(sheet).toBeDefined();
      expect(def.frameStart).toBeGreaterThanOrEqual(0);
      expect(def.frameStart + def.frameCount).toBeLessThanOrEqual(sheet.frames);
      expect(def.fps).toBeGreaterThan(0);
      expect(def.origin).toEqual([0.5, 0.5]);
    }
  });
  test("actual release and impact events select distinct appropriate art without scheduling gameplay", () => {
    expect(
      effectDefinition(event("spark", { skill: "fire", stage: "impact" })),
    ).toBe(skillVisuals.fire.impact);
    expect(
      effectDefinition(event("magic", { skill: "frost", stage: "release" })),
    ).toBe(skillVisuals.frost.release);
    expect(effectDefinition(event("spark"))).toBe(VFX.spark);
    expect(
      effectDefinition(event("spark", { skill: "arcane", stage: "impact" }))
        .frameStart,
    ).toBe(8);
  });
});
describe("single-clock pooled effect lifecycle", () => {
  test("pause keeps frames and lifetimes fixed; resuming advances and expires the same event", () => {
    const timeline = new VfxTimeline();
    timeline.emit(event("explosion"), prefs);
    const active = timeline.active[0];
    const firstFrame = vfxFrame(active);
    timeline.update(0, prefs);
    expect(vfxFrame(active)).toBe(firstFrame);
    expect(active.age).toBe(0);
    timeline.update(0.2, prefs);
    expect(vfxFrame(active)).toBeGreaterThan(firstFrame);
    timeline.update(10, prefs);
    expect(timeline.active).toHaveLength(0);
    expect(timeline.recycled).toBe(1);
  });
  test("producer queue recycling cannot change an already emitted effect", () => {
    const timeline = new VfxTimeline(),
      source = event("freeze");
    timeline.emit(source, prefs);
    source.kind = "burn";
    source.x = 900;
    expect(timeline.active[0].kind).toBe("freeze");
    expect(timeline.active[0].x).toBe(100);
  });
  test("every effect ends on a valid frame for arbitrary clock steps", () => {
    for (const kind of Object.keys(VFX) as Feedback["kind"][]) {
      const timeline = new VfxTimeline();
      timeline.emit(event(kind), prefs);
      for (let i = 0; i < 100 && timeline.active.length; i++) {
        const active = timeline.active[0],
          def = effectDefinition(active);
        expect(vfxFrame(active)).toBeGreaterThanOrEqual(def.frameStart);
        expect(vfxFrame(active)).toBeLessThan(def.frameStart + def.frameCount);
        timeline.update(0.017, prefs);
      }
      expect(timeline.active).toHaveLength(0);
    }
  });
  test("combat floods stay bounded and important warnings displace cosmetic effects", () => {
    const timeline = new VfxTimeline();
    for (let i = 0; i < 200; i++) timeline.emit(event("step"), prefs);
    expect(timeline.active).toHaveLength(effectBudget(prefs));
    timeline.emit(event("telegraph", { important: true }), prefs);
    expect(timeline.active.some((effect) => effect.kind === "telegraph")).toBe(
      true,
    );
    timeline.update(0, { ...prefs, quality: "low" });
    expect(timeline.active).toHaveLength(32);
    expect(timeline.active.some((effect) => effect.kind === "telegraph")).toBe(
      true,
    );
    timeline.update(0, { ...prefs, reducedEffects: true });
    expect(timeline.active).toHaveLength(20);
    expect(timeline.active.some((effect) => effect.kind === "telegraph")).toBe(
      true,
    );
  });
  test("world cleanup returns all objects to the pool and reuses them without stale source metadata", () => {
    const timeline = new VfxTimeline();
    timeline.emit(event("magic", { skill: "arcane", stage: "release" }), prefs);
    const old = timeline.active[0];
    timeline.clear();
    expect(timeline.active).toHaveLength(0);
    timeline.emit(event("death"), prefs);
    expect(timeline.active[0]).toBe(old);
    expect(timeline.active[0].skill).toBeUndefined();
    expect(timeline.active[0].stage).toBeUndefined();
    expect(vfxFrame(timeline.active[0])).toBe(VFX.death.frameStart);
  });
  test("offscreen checks retain partial radii and linked attacks that cross the viewport", () => {
    const view = { left: 0, right: 300, top: 0, bottom: 200 };
    expect(inEffectView(event("spark", { x: 800, tx: 800 }), view)).toBe(false);
    expect(
      inEffectView(event("freeze", { x: 310, tx: 310, radius: 50 }), view),
    ).toBe(true);
    expect(inEffectView(event("lightning", { x: -100, tx: 400 }), view)).toBe(
      true,
    );
  });
});
