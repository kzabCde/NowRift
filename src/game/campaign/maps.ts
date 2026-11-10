import { seeded, type StageDefinition, worldById } from "./content";
import type { Obstacle } from "../content/forest";
export type MapLayout = {
  width: number;
  height: number;
  tiles: number[][];
  props: Obstacle[];
  zones: { x: number; y: number; r: number }[];
};
export function constructMap(
  stage: StageDefinition,
  seed = stage.environment.seed,
): MapLayout {
  const random = seeded(seed),
    world = worldById(stage.worldId),
    tiles: number[][] = [],
    props: Obstacle[] = [],
    zones: { x: number; y: number; r: number }[] = [];
  for (let y = 0; y < 44; y++) {
    const row: number[] = [];
    for (let x = 0; x < 56; x++) {
      const safe = Math.hypot(x - 28, y - 22) < 5;
      const path =
        world.architecture === "grove"
          ? Math.abs(x - 28 - M.sin(y * 0.2) * 3) < 2
          : world.architecture === "courtyard"
            ? x % 14 < 3 || y % 11 < 3
            : world.architecture === "glacier"
              ? Math.abs(y - 22 - M.sin(x * 0.12) * 8) < 3
              : Math.abs(x - 28) < 3 || Math.abs(y - 22) < 3;
      const special =
        world.id === "infernal"
          ? Math.abs(x - 12 - M.sin(y * 0.22) * 3) < 2 ||
            Math.abs(x - 44 - M.sin(y * 0.19) * 3) < 2
          : world.id === "frozen"
            ? (x - 10) ** 2 / 36 + (y - 12) ** 2 / 49 < 1 ||
              (x - 45) ** 2 / 25 + (y - 32) ** 2 / 36 < 1
            : random() < 0.08;
      const terrain = safe || path ? 1 : special ? 2 : 0;
      row.push(terrain);
      if (
        !safe &&
        !path &&
        x > 2 &&
        x < 53 &&
        y > 2 &&
        y < 41 &&
        x % 4 === 0 &&
        y % 4 === 0
      ) {
        const ox = x * 32 + 16,
          oy = y * 32 + 16;
        if (random() < 0.62)
          props.push({
            x: ox,
            y: oy,
            r: 18,
            type: random() < 0.65 ? "tree" : "rock",
          });
        else if (zones.length < 18)
          zones.push({ x: ox, y: oy, r: world.hazard.radius });
      }
    }
    tiles.push(row);
  }
  return { width: 1800, height: 1400, tiles, props, zones };
}
const M = Math;
