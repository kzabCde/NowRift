import { afterEach, expect, test } from "vitest";
import { makeGame, spawnEnemy, type Game } from "../engine";
import { stageById } from "../campaign/content";
import {
  stageRuntime,
  campaignBossAttack,
  finalePhase,
} from "../campaign/runtime";
import { MISSIONS, words } from "./content";
import {
  activeMissionStep,
  beginMission,
  createMission,
  hurtMissionAlly,
  interactMission,
  missionEnemyDefeated,
  missionPrompt,
  missionReceipt,
  stepMission,
} from "./runtime";
import { missionPath, missionWalkable } from "./navigation";
import type { MissionDefinition, MissionHooks, MissionStep } from "./types";

const original = MISSIONS.length;
afterEach(() => {
  MISSIONS.splice(original);
});
function game(def = MISSIONS[0], seed = 42) {
  const g = makeGame(1800, 1400);
  g.phase = "playing";
  g.campaign = stageRuntime(stageById("forest-1"), "normal", seed);
  g.campaign.mode = "story";
  g.obstacles = g.campaign.map.props;
  g.campaign.mission = createMission(def, g.campaign.map);
  return g;
}
const hooks = (g: Game): MissionHooks => ({
  spawn: (kind, x, y) => spawnEnemy(g, kind, x, y),
  collide: () => {},
});
function at(g: Game, id: string) {
  const p = g.campaign!.mission!.objects.find((o) => o.id === id)!;
  g.player.x = p.x;
  g.player.y = p.y;
}
function primitive(step: MissionStep) {
  const d: MissionDefinition = {
    ...MISSIONS[0],
    id: "test-primitive",
    objectives: [step],
  };
  MISSIONS.push(d);
  return d;
}
const label = words("Keep the promise", "รักษาคำสัญญา");
test("chapter finale has three health-driven attack phases; legacy bosses retain two", () => {
  const g = game(),
    e = spawnEnemy(g, "boss", 1100, 700)!;
  e.missionFinale = true;
  const attacks = () => {
    g.hazards.length = 0;
    g.bullets.length = 0;
    e.pattern = 0;
    campaignBossAttack(g, e, {
      hurt: () => {},
      spawn: (kind, x, y) => spawnEnemy(g, kind, x, y),
      bullet: (b) => g.bullets.push(b),
    });
    return {
      hazards: g.hazards.length,
      bullets: g.bullets.length,
      cooldown: e.attack,
    };
  };
  expect(finalePhase(e)).toBe(1);
  expect(attacks().hazards).toBe(3);
  e.hp = e.maxHp * 0.6;
  expect(finalePhase(e)).toBe(2);
  expect(attacks().bullets).toBeGreaterThan(10);
  e.hp = e.maxHp * 0.3;
  expect(finalePhase(e)).toBe(3);
  const last = attacks();
  expect(last.hazards).toBe(5);
  expect(last.bullets).toBe(4);
  expect(last.cooldown).toBeLessThan(2.7);
  e.missionFinale = false;
  expect(finalePhase(e)).toBe(2);
  expect(attacks().bullets).toBe(0);
});
test("Forest Stage 1 requires a real nearby conversation, discovered clearing, four kills and three distinct pickups", () => {
  const g = game(),
    s = g.campaign!.mission!;
  expect(interactMission(g)).toBeNull();
  expect(missionReceipt(g)).toBeNull();
  beginMission(g);
  expect(interactMission(g)).toBeNull();
  at(g, "forest-1-sera");
  expect(missionPrompt(g)?.id).toBe("forest-1-sera");
  expect(interactMission(g)?.advanced).toBe(true);
  expect(interactMission(g)).toBeNull();
  stepMission(g, 0.7, hooks(g));
  expect(activeMissionStep(g)?.type).toBe("DiscoverArea");
  at(g, "forest-1-oak");
  stepMission(g, 0.05, hooks(g));
  stepMission(g, 0.7, hooks(g));
  expect(activeMissionStep(g)?.type).toBe("DefeatEnemy");
  for (let i = 0; i < 4; i++)
    missionEnemyDefeated(g, spawnEnemy(g, "slime", 700 + i * 30, 700)!);
  stepMission(g, 0.7, hooks(g));
  expect(activeMissionStep(g)?.type).toBe("CollectItem");
  for (const id of [
    "forest-1-wood-west",
    "forest-1-wood-south",
    "forest-1-wood-east",
  ]) {
    at(g, id);
    expect(interactMission(g, id)?.advanced).toBe(true);
    expect(interactMission(g, id)).toBeNull();
  }
  expect(g.phase).toBe("playing");
  stepMission(g, 0.7, hooks(g));
  expect(g.phase).toBe("victory");
  expect(g.time).toBe(0);
  expect(missionReceipt(g)?.completed).toEqual(
    MISSIONS[0].objectives.map((o) => o.id),
  );
  expect(s.gathered).toEqual({ wood: 3 });
  expect(s.events.reduce((n, e) => n + e.amount, 0)).toBe(9);
});
test("Free Mode cannot start or interact with Story mission state", () => {
  const g = game();
  g.campaign!.mode = "free";
  expect(beginMission(g)).toBe(false);
  at(g, "forest-1-sera");
  expect(interactMission(g)).toBeNull();
  stepMission(g, 100, hooks(g));
  expect(missionReceipt(g)).toBeNull();
});
test("a mechanism sequence rejects an out-of-order physical interaction", () => {
  const d = primitive({
    id: "runes",
    type: "ActivateMechanism",
    target: "seal",
    count: 3,
    text: label,
    objects: [0, 1, 2].map((i) => ({
      id: "rune-" + i,
      target: "seal",
      kind: "mechanism",
      x: 700 + i * 130,
      y: 700,
      radius: 64,
      label,
      order: i,
    })),
  });
  const g = game(d);
  beginMission(g);
  at(g, "rune-2");
  expect(interactMission(g)?.advanced).toBe(false);
  expect(g.campaign!.mission!.progress).toEqual({});
  for (const i of [0, 1, 2]) {
    at(g, "rune-" + i);
    expect(interactMission(g)?.advanced).toBe(true);
  }
  stepMission(g, 0.7, hooks(g));
  expect(g.phase).toBe("victory");
});
test("defense advances only near the living ally, spawns real raiders and fails if the ally dies", () => {
  const d = primitive({
    id: "defend",
    type: "DefendLocation",
    target: "keeper",
    count: 10,
    text: label,
    objects: [
      {
        id: "keeper",
        target: "keeper",
        kind: "ally",
        x: 900,
        y: 700,
        radius: 64,
        label,
      },
    ],
  });
  const g = game(d);
  beginMission(g);
  g.player.x = 100;
  g.player.y = 100;
  stepMission(g, 2, hooks(g));
  expect(g.campaign!.mission!.progress.defend ?? 0).toBe(0);
  expect(g.enemies.some((e) => e.missionRaider)).toBe(true);
  g.player.x = 900;
  g.player.y = 700;
  stepMission(g, 3, hooks(g));
  expect(g.campaign!.mission!.progress.defend).toBe(3);
  hurtMissionAlly(g, 1000);
  expect(g.phase).toBe("gameover");
  expect(missionReceipt(g)).toBeNull();
});
test("escort movement pauses when the player leaves and reaches a collision-safe destination when accompanied", () => {
  const d = primitive({
    id: "escort",
    type: "EscortNPC",
    target: "scout",
    count: 1,
    text: label,
    objects: [
      {
        id: "scout",
        target: "scout",
        kind: "ally",
        x: 900,
        y: 700,
        radius: 64,
        label,
        route: [{ x: 1100, y: 850 }],
      },
    ],
  });
  const g = game(d);
  beginMission(g);
  const a = g.campaign!.mission!.ally!;
  g.player.x = 100;
  g.player.y = 100;
  stepMission(g, 1, hooks(g));
  expect({ x: a.x, y: a.y }).toEqual({ x: 900, y: 700 });
  for (let i = 0; i < 2000 && g.phase === "playing"; i++) {
    g.player.x = a.x;
    g.player.y = a.y;
    stepMission(g, 0.05, hooks(g));
  }
  expect(g.phase).toBe("victory");
  expect(Math.hypot(a.x - 1100, a.y - 850)).toBeLessThan(45);
});
test("destructible goals require actual defeated targets, never an interact click", () => {
  const d = primitive({
    id: "sabotage",
    type: "DestroyObject",
    target: "totem",
    count: 1,
    text: label,
    objects: [
      {
        id: "totem",
        target: "totem",
        kind: "destructible",
        x: 900,
        y: 600,
        radius: 64,
        label,
      },
    ],
  });
  const g = game(d);
  beginMission(g);
  stepMission(g, 0.1, hooks(g));
  at(g, "totem");
  expect(interactMission(g)).toBeNull();
  const target = g.enemies.find((e) => e.missionTarget?.objectId === "totem")!;
  expect(target.speed).toBe(0);
  missionEnemyDefeated(g, target);
  stepMission(g, 0.7, hooks(g));
  expect(g.phase).toBe("victory");
});
test("authored mission landmarks and escort routing remain navigable across seeded stage props", () => {
  for (let seed = 0; seed < 80; seed++) {
    const g = game(MISSIONS[0], seed);
    for (const o of g.campaign!.mission!.objects)
      expect(missionWalkable(o, g.obstacles), o.id + ":" + seed).toBe(true);
    const route = missionPath(
      { x: 900, y: 700 },
      { x: 1300, y: 1050 },
      g.obstacles,
    );
    expect(route.length).toBeGreaterThan(1);
    expect(route.every((p) => missionWalkable(p, g.obstacles))).toBe(true);
  }
});
