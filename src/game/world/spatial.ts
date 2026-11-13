import type { Point, Solid } from "./city";

/** Static broad phase for the hub. Long river banks are inserted into every touched bucket. */
export class CollisionIndex {
  private buckets = new Map<string, Solid[]>();
  constructor(
    solids: readonly Solid[],
    readonly cellSize = 192,
  ) {
    for (const solid of solids)
      for (
        let y = Math.floor(solid.y / cellSize);
        y <= Math.floor((solid.y + solid.h) / cellSize);
        y++
      )
        for (
          let x = Math.floor(solid.x / cellSize);
          x <= Math.floor((solid.x + solid.w) / cellSize);
          x++
        ) {
          const key = `${x},${y}`,
            bucket = this.buckets.get(key) ?? [];
          bucket.push(solid);
          this.buckets.set(key, bucket);
        }
  }
  near(p: Point, radius: number) {
    const found = new Set<Solid>();
    for (
      let y = Math.floor((p.y - radius) / this.cellSize);
      y <= Math.floor((p.y + radius) / this.cellSize);
      y++
    )
      for (
        let x = Math.floor((p.x - radius) / this.cellSize);
        x <= Math.floor((p.x + radius) / this.cellSize);
        x++
      )
        for (const solid of this.buckets.get(`${x},${y}`) ?? [])
          found.add(solid);
    return found;
  }
  get size() {
    return this.buckets.size;
  }
}
