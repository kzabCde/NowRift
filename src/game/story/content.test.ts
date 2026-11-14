import { expect, test } from "vitest";
import { MISSIONS } from "./content";
import { missionFixture, playMission, playObjective } from "./testing/driver";
import { beginMission } from "./runtime";
import { missionPath, missionWalkable } from "./navigation";
import { validMissionReceipt } from "./validation";
import {
  captureCheckpoint,
  validCheckpoint,
  restoreCheckpoint,
} from "../persistence/checkpoint";
import { STAGES } from "../campaign/content";
import { ITEMS } from "../rpg/content";

for (const m of MISSIONS)
  for (const difficulty of ["normal", "hard", "nightmare"] as const)
    test(`${m.id} / ${difficulty}: authored objectives complete through production events`, () => {
      const { g, selection } = missionFixture(m.id, difficulty);
      expect(m.objectives.length).toBeGreaterThanOrEqual(2);
      expect(m.objectives.length).toBeLessThanOrEqual(4);
      const receipt = playMission(g);
      expect(validMissionReceipt(receipt, m.id)).toBe(true);
      expect(g.phase).toBe("victory");
      expect(g.time).toBeLessThan(
        STAGES.find((s) => s.id === m.id)!.clear.seconds,
      );
      expect(
        captureCheckpoint(
          g,
          { id: g.id!, slotId: "fixture", writer: "fixture", sequence: 1 },
          selection.seed,
          selection,
        ).environment!.mission!.completed,
      ).toHaveLength(m.objectives.length);
    });
test("every Forest objective checkpoint restores its exact mission state", () => {
  for (const m of MISSIONS) {
    const { g, selection } = missionFixture(m.id);
    beginMission(g);
    while (g.phase !== "victory") {
      const c = captureCheckpoint(
        g,
        { id: g.id!, slotId: "fixture", writer: "fixture", sequence: 1 },
        selection.seed,
        selection,
      );
      expect(validCheckpoint(c), m.id).toBe(true);
      expect(restoreCheckpoint(c).campaign!.mission).toEqual(
        g.campaign!.mission,
      );
      playObjective(g);
    }
  }
});
test("all authored landmarks and escort paths have safe ground across stage seeds", () => {
  for (const m of MISSIONS)
    for (let seed = 1; seed <= 12; seed++) {
      const { g } = missionFixture(m.id, "normal", seed),
        s = g.campaign!.mission!;
      for (const o of s.objects) {
        expect(
          missionWalkable(o, g.obstacles, 24),
          `${m.id}/${o.id}/${seed}`,
        ).toBe(true);
        if (seed <= 3)
          expect(
            missionPath({ x: 900, y: 700 }, o, g.obstacles).length,
            `${m.id}/${o.id} reachable from spawn`,
          ).toBeGreaterThan(0);
        if (o.kind === "item") expect(ITEMS[o.target]).toBeDefined();
        if (o.route) {
          let from = { x: o.x, y: o.y };
          for (const to of o.route) {
            const path = missionPath(from, to, g.obstacles);
            for (const p of path)
              expect(missionWalkable(p, g.obstacles, 18)).toBe(true);
            from = path.at(-1)!;
          }
        }
      }
    }
});
