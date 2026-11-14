import { missionById } from "./content";
import type {
  MissionDefinition,
  MissionFact,
  MissionReceipt,
  MissionState,
} from "./types";

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, min = 0, max = 1e9): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min = 0, max = 1e9): v is number =>
  finite(v, min, max) && Number.isSafeInteger(v);
function replay(value: unknown, def: MissionDefinition) {
  if (!Array.isArray(value) || value.length > 512) return null;
  const progress: Record<string, number> = {},
    gathered: Record<string, number> = {};
  let step = 0;
  for (let n = 0; n < value.length; n++) {
    const e = value[n] as MissionFact;
    while (
      step < def.objectives.length &&
      (progress[def.objectives[step].id] ?? 0) >= def.objectives[step].count
    )
      step++;
    const o = def.objectives[step];
    if (
      !record(e) ||
      !o ||
      e.sequence !== n + 1 ||
      e.type !== o.type ||
      e.target !== o.target ||
      !integer(e.amount, 1, o.count)
    )
      return null;
    progress[o.id] = (progress[o.id] ?? 0) + e.amount;
    if (progress[o.id] > o.count) return null;
    if (e.type === "CollectItem")
      gathered[e.target] = (gathered[e.target] ?? 0) + e.amount;
  }
  return { progress, gathered };
}
const sameCounts = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);
export function validMissionReceipt(
  value: unknown,
  stageId: string,
): value is MissionReceipt {
  if (!record(value)) return false;
  const r = value as MissionReceipt,
    def = missionById(stageId);
  if (
    !def ||
    r.schema !== 1 ||
    r.stageId !== stageId ||
    !Array.isArray(r.completed) ||
    r.completed.length !== def.objectives.length ||
    !r.completed.every((id, i) => id === def.objectives[i].id) ||
    !record(r.gathered)
  )
    return false;
  const facts = replay(r.events, def);
  return (
    !!facts &&
    def.objectives.every((o) => facts.progress[o.id] === o.count) &&
    sameCounts(r.gathered, facts.gathered)
  );
}
export function validMissionState(
  value: unknown,
  stageId: string,
): value is MissionState {
  if (!record(value)) return false;
  const s = value as MissionState,
    def = missionById(stageId);
  if (
    !def ||
    s.schema !== 1 ||
    s.definitionId !== stageId ||
    ![
      "MISSION_START",
      "INTRO_DIALOGUE",
      "OBJECTIVE_ACTIVE",
      "OBJECTIVE_COMPLETED",
      "NEXT_OBJECTIVE",
      "BOSS_OR_FINAL_ENCOUNTER",
      "MISSION_COMPLETED",
      "FAILED",
    ].includes(s.phase) ||
    !integer(s.step, 0, def.objectives.length) ||
    !record(s.progress) ||
    !Array.isArray(s.completed) ||
    !Array.isArray(s.used) ||
    !Array.isArray(s.spawned) ||
    !Array.isArray(s.objects) ||
    !integer(s.sequence) ||
    !finite(s.transition) ||
    !finite(s.wave, -1e9) ||
    !finite(s.elapsed) ||
    !record(s.gathered)
  )
    return false;
  const facts = replay(s.events, def);
  if (
    !facts ||
    s.sequence !== s.events.length ||
    !sameCounts(s.gathered, facts.gathered)
  )
    return false;
  if (
    Object.entries(s.progress).some(([id, n]) => {
      const o = def.objectives.find((o) => o.id === id);
      return (
        !o ||
        !finite(n, 0, o.count) ||
        Math.floor(n) !== (facts.progress[id] ?? 0)
      );
    })
  )
    return false;
  if (
    Object.entries(facts.progress).some(
      ([id, n]) => Math.floor(s.progress[id] ?? 0) !== n,
    )
  )
    return false;
  const completed = def.objectives
    .filter((o) => (s.progress[o.id] ?? 0) === o.count)
    .map((o) => o.id);
  if (
    s.completed.length !== completed.length ||
    !s.completed.every((id, i) => id === completed[i]) ||
    s.completed.some((id, i) => id !== def.objectives[i].id)
  )
    return false;
  if (s.phase === "INTRO_DIALOGUE" && (s.step !== 0 || s.events.length > 0))
    return false;
  if (
    (["OBJECTIVE_ACTIVE", "BOSS_OR_FINAL_ENCOUNTER", "NEXT_OBJECTIVE"].includes(
      s.phase,
    ) &&
      s.step !== completed.length) ||
    (s.phase === "OBJECTIVE_COMPLETED" && s.step !== completed.length - 1)
  )
    return false;
  if (
    s.phase === "MISSION_COMPLETED" &&
    (s.step !== def.objectives.length ||
      s.completed.length !== def.objectives.length)
  )
    return false;
  const specs = def.objectives.flatMap((o) => o.objects),
    ids = new Set(specs.map((o) => o.id));
  if (
    s.objects.length !== specs.length ||
    new Set(s.objects.map((o) => o.id)).size !== specs.length
  )
    return false;
  if (
    s.objects.some((o) => {
      const spec = specs.find((p) => p.id === o.id);
      return (
        !spec ||
        o.kind !== spec.kind ||
        o.target !== spec.target ||
        o.radius !== spec.radius ||
        o.order !== spec.order ||
        JSON.stringify(o.route) !== JSON.stringify(spec.route) ||
        !finite(o.x, 40, 1760) ||
        !finite(o.y, 40, 1360) ||
        Math.hypot(o.x - spec.x, o.y - spec.y) > 230 ||
        !record(o.label) ||
        typeof o.label.en !== "string" ||
        typeof o.label.th !== "string"
      );
    })
  )
    return false;
  if (
    [s.used, s.spawned].some(
      (a) => new Set(a).size !== a.length || a.some((id) => !ids.has(id)),
    )
  )
    return false;
  if (s.ally !== null) {
    const a = s.ally;
    if (
      !record(a) ||
      !ids.has(a.id) ||
      !finite(a.x, 0, 1800) ||
      !finite(a.y, 0, 1400) ||
      !finite(a.hp, 0, 5000) ||
      !finite(a.maxHp, 1, 5000) ||
      a.hp > a.maxHp ||
      a.r !== 12 ||
      !finite(a.hurtCooldown) ||
      !Array.isArray(a.route) ||
      a.route.length > 300 ||
      !integer(a.waypoint, 0, a.route.length) ||
      a.route.some(
        (p) => !record(p) || !finite(p.x, 0, 1800) || !finite(p.y, 0, 1400),
      )
    )
      return false;
  }
  return (
    s.feedback === null ||
    ["updated", "objective", "mechanism-order", "complete", "failed"].includes(
      s.feedback,
    )
  );
}
