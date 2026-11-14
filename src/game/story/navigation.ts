import type { Obstacle } from "../content/forest";
import type { MissionPoint } from "./types";

export function missionWalkable(
  p: MissionPoint,
  obstacles: readonly Obstacle[],
  radius = 18,
) {
  return (
    p.x >= 40 &&
    p.y >= 40 &&
    p.x <= 1760 &&
    p.y <= 1360 &&
    obstacles.every((o) => Math.hypot(p.x - o.x, p.y - o.y) >= o.r + radius)
  );
}
export function safeMissionPoint(
  p: MissionPoint,
  obstacles: readonly Obstacle[],
): MissionPoint {
  for (let radius = 0; radius <= 160; radius += 16)
    for (const [dx, dy] of [
      [0, 0],
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
      [radius, radius],
      [-radius, radius],
      [radius, -radius],
      [-radius, -radius],
    ]) {
      const q = { x: Math.round(p.x + dx), y: Math.round(p.y + dy) };
      if (missionWalkable(q, obstacles, 24)) return q;
    }
  throw new Error("Mission landmark has no safe ground.");
}
/** Short authored escort routes get a grid path around the actual stage's prop feet. */
export function missionPath(
  from: MissionPoint,
  to: MissionPoint,
  obstacles: readonly Obstacle[],
): MissionPoint[] {
  const destination = safeMissionPoint(to, obstacles);
  const segment = (a: MissionPoint, b: MissionPoint) => {
    const steps = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 8);
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      if (
        !missionWalkable(
          { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
          obstacles,
          18,
        )
      )
        return false;
    }
    return true;
  };
  const candidates: MissionPoint[] = [];
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -2; dy <= 2; dy++) {
      const p = {
        x: Math.round(from.x / 32) + dx,
        y: Math.round(from.y / 32) + dy,
      };
      if (
        missionWalkable({ x: p.x * 32, y: p.y * 32 }, obstacles, 26) &&
        segment(from, { x: p.x * 32, y: p.y * 32 })
      )
        candidates.push(p);
    }
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x * 32 - from.x, a.y * 32 - from.y) -
      Math.hypot(b.x * 32 - from.x, b.y * 32 - from.y),
  );
  const start = candidates[0],
    key = (x: number, y: number) => `${x},${y}`;
  if (!start) throw new Error("Mission escort cannot reach the road.");
  const queue = [start],
    previous = new Map<string, string | null>([[key(start.x, start.y), null]]);
  let end: string | null = null;
  for (let n = 0; n < queue.length; n++) {
    const p = queue[n],
      id = key(p.x, p.y);
    if (
      Math.hypot(p.x * 32 - destination.x, p.y * 32 - destination.y) < 64 &&
      segment({ x: p.x * 32, y: p.y * 32 }, destination)
    ) {
      end = id;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const x = p.x + dx,
        y = p.y + dy,
        k = key(x, y);
      if (
        previous.has(k) ||
        !missionWalkable({ x: x * 32, y: y * 32 }, obstacles, 26) ||
        !segment({ x: p.x * 32, y: p.y * 32 }, { x: x * 32, y: y * 32 })
      )
        continue;
      previous.set(k, id);
      queue.push({ x, y });
    }
  }
  if (!end) throw new Error("Mission escort route is unreachable.");
  const result: MissionPoint[] = [];
  for (let id: string | null = end; id; id = previous.get(id) ?? null) {
    const [x, y] = id.split(",").map(Number);
    result.push({ x: x * 32, y: y * 32 });
  }
  result.reverse();
  result.push(destination);
  return result;
}
