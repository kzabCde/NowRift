/** Test fixture only: positioning, actors and projectiles exercise production triggers. Imported only by tests and the NEXT_PUBLIC_E2E fixture. */
import {
  advanceGame,
  chooseUpgrade,
  spawnEnemy,
  type Game,
} from "../../engine";
import {
  STAGES,
  DIFFICULTIES,
  type DifficultyId,
} from "../../campaign/content";
import { loadStage } from "../../campaign/loader";
import {
  activeMissionStep,
  beginMission,
  interactMission,
  missionReceipt,
} from "../runtime";
export const allClears = STAGES.flatMap((s) =>
  Object.keys(DIFFICULTIES).map((d) => `${s.id}:${d}`),
);
export function missionFixture(
  stageId: string,
  difficulty: DifficultyId = "normal",
  seed = 42,
) {
  const selection = {
    stageId,
    difficulty,
    seed,
    clears: allClears,
    mode: "story" as const,
    missionVersion: 1 as const,
  };
  const g = loadStage(selection);
  g.id = "mission-fixture";
  g.player.invincible = 99999;
  return { g, selection };
}
export function fixtureTick(g: Game, seconds = 0.8) {
  for (let t = 0; t < seconds; t += 0.05) {
    if (g.phase === "upgrade") chooseUpgrade(g, g.offers[0]);
    advanceGame(g, 0.05, 0, 0);
  }
}
export function strike(g: Game) {
  for (const e of g.enemies)
    g.bullets.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: 0,
      r: 8,
      life: 0.3,
      damage: e.hp + 1,
      color: "#fff",
    });
}
export function playObjective(g: Game) {
  const s = g.campaign!.mission!,
    step = activeMissionStep(g)!;
  const objects = s.objects.filter((o) =>
    step.objects.some((spec) => spec.id === o.id),
  );
  if (
    ["TalkToNPC", "RescueNPC", "CollectItem", "ActivateMechanism"].includes(
      step.type,
    )
  ) {
    for (const o of objects) {
      Object.assign(g.player, { x: o.x, y: o.y });
      if (!interactMission(g, o.id)?.advanced)
        throw new Error("Fixture could not interact: " + o.id);
    }
  } else if (
    ["VisitLocation", "DiscoverArea", "InteractWithObject"].includes(step.type)
  ) {
    for (const o of objects) {
      Object.assign(g.player, { x: o.x, y: o.y });
      fixtureTick(g, 0.05);
    }
  } else if (step.type === "DefeatEnemy" && !objects.length) {
    g.spawnCooldown = 999;
    for (let n = 0; n < step.count; n++) {
      spawnEnemy(g, step.target as "slime", g.player.x + 70, g.player.y);
      strike(g);
      fixtureTick(g, 0.05);
    }
  } else {
    for (
      let frame = 0;
      frame < 2400 &&
      ["OBJECTIVE_ACTIVE", "BOSS_OR_FINAL_ENCOUNTER"].includes(s.phase);
      frame++
    ) {
      if (s.ally) Object.assign(g.player, { x: s.ally.x, y: s.ally.y });
      strike(g);
      fixtureTick(g, 0.05);
      if (g.phase === "gameover")
        throw new Error("Mission companion died: " + s.definitionId);
    }
  }
  if (s.phase !== "OBJECTIVE_COMPLETED")
    throw new Error(
      `Objective is not achievable: ${s.definitionId}/${step.id} (${s.phase})`,
    );
  fixtureTick(g);
}
export function playMission(g: Game) {
  if (!beginMission(g)) throw new Error("Could not begin mission");
  while (g.phase !== "victory") playObjective(g);
  return missionReceipt(g)!;
}
