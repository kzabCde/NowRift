import type { CityLayout } from "./regional-city";
import type { RegionId } from "./regions";

const materials = [
  "grass",
  "cobble",
  "sandstone",
  "charcoal",
  "garden",
  "wood",
  "sand",
  "limestone",
  "water",
  "soil",
  "ash",
  "flowers",
  "clay",
  "slate",
  "rune",
  "steps",
];
function segmentDistance(x: number, y: number, a: number[], b: number[]) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    t = Math.max(
      0,
      Math.min(
        1,
        ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
export function regionalTerrain(city: CityLayout, region: RegionId) {
  const columns = city.width / 32,
    rows = city.height / 32;
  const layers = Object.fromEntries(
    ["ground", "terrain", "structures", "foreground", "collision"].map(
      (name) => [
        name,
        Array.from({ length: rows }, () => Array<number>(columns).fill(-1)),
      ],
    ),
  );
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const px = x * 32 + 16,
        py = y * 32 + 16,
        variant = ((x * 13 + y * 7) ^ (x * y)) & 3;
      let material = region === "northeast" ? "sand" : "grass";
      for (const yard of city.yards)
        if (
          px >= yard.x &&
          py >= yard.y &&
          px < yard.x + yard.w &&
          py < yard.y + yard.h
        )
          material = yard.material;
      for (const road of city.roads)
        for (let p = 1; p < road.points.length; p++)
          if (
            segmentDistance(px, py, road.points[p - 1], road.points[p]) <
            road.width / 2
          )
            material = road.material;
      if (
        city.water.some(
          (r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h,
        )
      )
        material = "water";
      if (
        city.bridges.some(
          (r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h,
        )
      )
        material = "wood";
      layers.ground[y][x] =
        Math.max(0, materials.indexOf(material)) * 4 + variant;
      if (material === "grass" && (x * 17 + y * 31) % 19 === 0)
        layers.foreground[y][x] = 68 + variant;
      if (material === "wood" && y % 4 === 0)
        layers.terrain[y][x] = 64 + variant;
    }
  return { layers };
}
