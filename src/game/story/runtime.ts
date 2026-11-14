import type { Game, Enemy } from "../engine";
import type { ObjectiveType } from "../quests/types";
import type {
  MissionDefinition,
  MissionHooks,
  MissionObject,
  MissionReceipt,
  MissionState,
} from "./types";
import type { MapLayout } from "../campaign/maps";
import { missionById } from "./content";
import { missionPath, safeMissionPoint } from "./navigation";

const running = (s: MissionState) =>
  s.phase === "OBJECTIVE_ACTIVE" || s.phase === "BOSS_OR_FINAL_ENCOUNTER";
export function createMission(
  def: MissionDefinition,
  map: MapLayout,
): MissionState {
  return {
    schema: 1,
    definitionId: def.id,
    phase: "INTRO_DIALOGUE",
    step: 0,
    progress: {},
    completed: [],
    used: [],
    spawned: [],
    events: [],
    sequence: 0,
    transition: 0,
    wave: 0,
    elapsed: 0,
    ally: null,
    gathered: {},
    feedback: null,
    objects: def.objectives
      .flatMap((o) => o.objects)
      .map((o) => ({
        ...structuredClone(o),
        ...safeMissionPoint(o, map.props),
      })),
  };
}
const state = (g: Game) =>
  g.campaign?.mode === "story" ? g.campaign.mission : undefined;
export function activeMissionStep(g: Game) {
  const s = state(g);
  return s ? missionById(s.definitionId)?.objectives[s.step] : undefined;
}
function enterStep(g: Game) {
  const s = state(g)!,
    step = activeMissionStep(g)!;
  s.phase =
    step.type === "DefeatBoss" ? "BOSS_OR_FINAL_ENCOUNTER" : "OBJECTIVE_ACTIVE";
  s.wave = 0;
  s.elapsed = 0;
  s.ally = null;
  if (step.type === "DefendLocation" || step.type === "EscortNPC") {
    const spec = step.objects.find((o) => o.kind === "ally");
    const object = s.objects.find((o) => o.id === spec?.id);
    if (!object) throw new Error("Mission ally is missing.");
    let from = { x: object.x, y: object.y };
    const route = [];
    for (const point of object.route ?? []) {
      const path = missionPath(from, point, g.obstacles);
      route.push(...path);
      from = path.at(-1)!;
    }
    s.ally = {
      id: object.id,
      x: object.x,
      y: object.y,
      r: 12,
      hp: Math.max(160, Math.min(5000, Math.round(g.player.maxHp * 1.6))),
      maxHp: Math.max(160, Math.min(5000, Math.round(g.player.maxHp * 1.6))),
      route,
      waypoint: 0,
      hurtCooldown: 0,
    };
  }
}
export function beginMission(g: Game) {
  const s = state(g);
  if (!s || s.phase !== "INTRO_DIALOGUE") return false;
  enterStep(g);
  s.feedback = "updated";
  return true;
}
/** This is called by verified physical interactions, kills and simulation time. */
function progress(
  g: Game,
  type: ObjectiveType,
  target: string,
  amount: number,
) {
  const s = state(g),
    step = activeMissionStep(g);
  if (
    !s ||
    !step ||
    !running(s) ||
    step.type !== type ||
    step.target !== target ||
    !Number.isFinite(amount) ||
    amount <= 0
  )
    return false;
  const before = s.progress[step.id] ?? 0,
    after = Math.min(step.count, before + amount);
  s.progress[step.id] = after;
  const delta = Math.floor(after) - Math.floor(before);
  if (delta > 0) {
    if (s.events.length >= 512)
      throw new Error("Mission event budget exceeded.");
    s.events.push({ sequence: ++s.sequence, type, target, amount: delta });
  }
  if (after >= step.count) {
    s.completed.push(step.id);
    s.phase = "OBJECTIVE_COMPLETED";
    s.transition = 0.65;
    s.feedback = "objective";
  }
  return true;
}
export function missionPrompt(g: Game) {
  const s = state(g),
    step = activeMissionStep(g);
  if (!s || !step || !running(s) || g.phase !== "playing") return null;
  const available = new Set(step.objects.map((o) => o.id));
  return (
    s.objects
      .filter(
        (o) =>
          available.has(o.id) &&
          !s.used.includes(o.id) &&
          ["npc", "item", "mechanism", "rescue"].includes(o.kind) &&
          Math.hypot(o.x - g.player.x, o.y - g.player.y) <= o.radius,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - g.player.x, a.y - g.player.y) -
          Math.hypot(b.x - g.player.x, b.y - g.player.y),
      )[0] ?? null
  );
}
export function interactMission(g: Game, expectedId?: string) {
  const s = state(g),
    o = missionPrompt(g),
    step = activeMissionStep(g);
  if (!s || !o || !step || (expectedId && expectedId !== o.id)) return null;
  if (
    o.order !== undefined &&
    o.order !== Math.floor(s.progress[step.id] ?? 0)
  ) {
    s.feedback = "mechanism-order";
    return { object: o, advanced: false };
  }
  const type = (
    {
      npc: "TalkToNPC",
      item: "CollectItem",
      mechanism: "ActivateMechanism",
      rescue: "RescueNPC",
    } as const
  )[o.kind as "npc" | "item" | "mechanism" | "rescue"];
  if (step.type !== type || step.target !== o.target) return null;
  if (progress(g, type, o.target, 1)) {
    s.used.push(o.id);
    if (type === "CollectItem")
      s.gathered[o.target] = (s.gathered[o.target] ?? 0) + 1;
    return { object: o, advanced: true };
  }
  return null;
}
export function missionEnemyDefeated(g: Game, enemy: Enemy) {
  const s = state(g);
  if (!s) return;
  const step = activeMissionStep(g);
  if (
    step?.objects.some((o) => o.kind === "elite") &&
    !step.objects.some((o) => o.id === enemy.missionTarget?.objectId)
  )
    return;
  if (enemy.missionTarget?.kind === "destructible") {
    const o = s.objects.find((o) => o.id === enemy.missionTarget!.objectId);
    if (o && !s.used.includes(o.id)) {
      s.used.push(o.id);
      progress(g, "DestroyObject", o.target, 1);
    }
    return;
  }
  if (enemy.kind === "boss") progress(g, "DefeatBoss", "boss", 1);
  else progress(g, "DefeatEnemy", enemy.kind, 1);
}
export function missionEnemyTarget(g: Game, enemy: Enemy) {
  const s = state(g);
  return enemy.missionRaider && s && running(s) && s.ally?.hp ? s.ally : null;
}
export function hurtMissionAlly(g: Game, amount: number) {
  const s = state(g),
    ally = s?.ally;
  if (!s || !ally || !running(s) || ally.hurtCooldown > 0) return;
  ally.hp = Math.max(0, ally.hp - amount);
  ally.hurtCooldown = 0.6;
  if (ally.hp === 0) {
    s.phase = "FAILED";
    s.feedback = "failed";
    g.phase = "gameover";
  }
}
function spawnTargets(g: Game, hooks: MissionHooks) {
  const s = state(g)!,
    step = activeMissionStep(g)!,
    def = missionById(s.definitionId)!;
  for (const spec of step.objects) {
    if (
      !["boss", "elite", "destructible"].includes(spec.kind) ||
      s.spawned.includes(spec.id)
    )
      continue;
    const o = s.objects.find((o) => o.id === spec.id)!;
    const kind = spec.kind === "boss" ? "boss" : "elite",
      e = hooks.spawn(kind, o.x, o.y);
    if (!e) continue;
    e.missionTarget = {
      objectId: o.id,
      kind: spec.kind as "boss" | "elite" | "destructible",
    };
    if (spec.kind === "destructible") {
      e.hp = e.maxHp = 85;
      e.speed = 0;
      e.attack = 1e9;
    }
    if (spec.kind === "elite") {
      e.hp *= 2;
      e.maxHp = e.hp;
    }
    if (spec.kind === "boss" && def.finale) {
      e.missionFinale = true;
      e.hp *= 1.35;
      e.maxHp = e.hp;
    }
    if (spec.kind === "boss") g.bossSpawned = true;
    s.spawned.push(o.id);
  }
}
export function stepMission(g: Game, seconds: number, hooks: MissionHooks) {
  const s = state(g);
  if (!s || g.phase !== "playing" || g.player.hp <= 0) return;
  if (s.phase === "OBJECTIVE_COMPLETED") {
    s.transition = Math.max(0, s.transition - seconds);
    if (s.transition > 0) return;
    s.step++;
    const def = missionById(s.definitionId)!;
    if (s.step >= def.objectives.length) {
      s.phase = "MISSION_COMPLETED";
      s.feedback = "complete";
      g.phase = "victory";
      return;
    }
    s.phase = "NEXT_OBJECTIVE";
    enterStep(g);
  }
  if (!running(s)) return;
  const step = activeMissionStep(g)!;
  s.elapsed += seconds;
  spawnTargets(g, hooks);
  for (const spec of step.objects) {
    const o = s.objects.find((o) => o.id === spec.id)!;
    if (
      o.kind === "location" &&
      !s.used.includes(o.id) &&
      Math.hypot(o.x - g.player.x, o.y - g.player.y) <= o.radius &&
      ["DiscoverArea", "VisitLocation", "InteractWithObject"].includes(
        step.type,
      )
    ) {
      if (progress(g, step.type, o.target, 1)) s.used.push(o.id);
    }
  }
  if (step.type === "SurviveEncounter")
    progress(g, step.type, step.target, seconds);
  const ally = s.ally;
  if (ally) {
    ally.hurtCooldown = Math.max(0, ally.hurtCooldown - seconds);
    const distance = Math.hypot(g.player.x - ally.x, g.player.y - ally.y);
    if (step.type === "DefendLocation" && distance <= 180)
      progress(g, step.type, step.target, seconds);
    if (
      step.type === "EscortNPC" &&
      distance <= 190 &&
      ally.waypoint < ally.route.length
    ) {
      const p = ally.route[ally.waypoint],
        dx = p.x - ally.x,
        dy = p.y - ally.y,
        d = Math.hypot(dx, dy),
        movement = Math.min(d, 76 * seconds);
      if (d <= 7) ally.waypoint++;
      else {
        ally.x += (dx / d) * movement;
        ally.y += (dy / d) * movement;
        hooks.collide(ally);
      }
      if (ally.waypoint === ally.route.length)
        progress(g, step.type, step.target, 1);
    }
    s.wave -= seconds;
    if (s.wave <= 0 && running(s)) {
      for (let i = 0; i < 2; i++) {
        const a = s.elapsed * 0.7 + i * Math.PI,
          p = safeMissionPoint(
            { x: ally.x + Math.cos(a) * 180, y: ally.y + Math.sin(a) * 180 },
            g.obstacles,
          ),
          e = hooks.spawn("goblin", p.x, p.y);
        if (e) e.missionRaider = true;
      }
      s.wave = 5.5;
    }
  }
}
export function missionReceipt(g: Game): MissionReceipt | null {
  const s = state(g);
  if (!s || s.phase !== "MISSION_COMPLETED" || g.phase !== "victory")
    return null;
  return {
    schema: 1,
    stageId: s.definitionId,
    completed: [...s.completed],
    events: structuredClone(s.events),
    gathered: { ...s.gathered },
  };
}
export function missionAmbient(g: Game) {
  const step = activeMissionStep(g);
  if (step?.objects.some((o) => o.kind === "elite")) return false;
  return (
    !state(g) ||
    (!!step &&
      [
        "DefeatEnemy",
        "DefendLocation",
        "EscortNPC",
        "SurviveEncounter",
      ].includes(step.type))
  );
}
export function missionEnemyKind(g: Game) {
  const step = activeMissionStep(g);
  return step?.type === "DefeatEnemy" &&
    ["slime", "goblin", "wolf", "caster", "elite"].includes(step.target)
    ? (step.target as Enemy["kind"])
    : null;
}
export function missionSummary(g: Game) {
  const s = state(g);
  if (!s) return undefined;
  const def = missionById(s.definitionId)!,
    o = def.objectives[s.step];
  const objects = activeMissionObjects(g).filter(
    (object) =>
      object.order === undefined ||
      object.order === Math.floor(o ? (s.progress[o.id] ?? 0) : 0),
  );
  const target = objects
    .map((object) => {
      const actor =
        g.enemies.find((e) => e.missionTarget?.objectId === object.id) ??
        (s.ally?.id === object.id ? s.ally : object);
      return { x: actor.x, y: actor.y };
    })
    .sort(
      (a, b) =>
        Math.hypot(a.x - g.player.x, a.y - g.player.y) -
        Math.hypot(b.x - g.player.x, b.y - g.player.y),
    )[0];
  return {
    stageId: def.id,
    phase: s.phase,
    step: s.step,
    total: def.objectives.length,
    objectiveId: o?.id ?? null,
    progress: o ? Math.floor(s.progress[o.id] ?? 0) : 0,
    goal: o?.count ?? 0,
    completed: [...s.completed],
    ally: s.ally ? { hp: Math.ceil(s.ally.hp), maxHp: s.ally.maxHp } : null,
    prompt: missionPrompt(g)?.id ?? null,
    feedback: s.feedback,
    direction:
      target && running(s)
        ? {
            angle: Math.atan2(target.y - g.player.y, target.x - g.player.x),
            tiles: Math.ceil(
              Math.hypot(target.x - g.player.x, target.y - g.player.y) / 32,
            ),
          }
        : null,
  };
}
export function activeMissionObjects(g: Game): MissionObject[] {
  const s = state(g),
    o = activeMissionStep(g);
  if (!s || !o) return [];
  const ids = new Set(o.objects.map((o) => o.id));
  return s.objects.filter((o) => ids.has(o.id) && !s.used.includes(o.id));
}
