import type Phaser from "phaser";
import type { StageRuntime } from "../campaign/runtime";
export function buildWorld(scene: Phaser.Scene, c: StageRuntime) {
  const key = c.world.id + "-tiles";
  const map = scene.make.tilemap({
    data: c.map.tiles,
    tileWidth: 32,
    tileHeight: 32,
  });
  const set = map.addTilesetImage(key, key, 32, 32, 0, 0);
  if (set) map.createLayer(0, set, 0, 0)?.setDepth(-100);
  for (const o of c.map.props)
    scene.add
      .image(o.x, o.y, c.world.id + "-" + o.type)
      .setOrigin(0.5, 0.87)
      .setScale(1.5)
      .setDepth(o.y);
  const runes = scene.add.graphics().setDepth(-90);
  runes.lineStyle(2, c.world.hazard.color, 0.24);
  for (const z of c.map.zones) runes.strokeCircle(z.x, z.y, z.r);
  // Fixed pools of ambient motes: fog spores, wind-blown dust, snow or rising embers.
  const motes = Array.from({ length: 22 }, (_, i) =>
    scene.add
      .image(
        (i * 139) % 1800,
        (i * 197) % 1400,
        "particles",
        c.world.id === "infernal" ? 1 : c.world.id === "frozen" ? 2 : 0,
      )
      .setAlpha(0.4)
      .setDepth(6500),
  );
  const tick = (time: number) =>
    motes.forEach((m, i) => {
      m.y =
        (i * 197 +
          time * (c.world.id === "infernal" ? -0.014 : 0.009) +
          1400 * 100) %
        1400;
      m.x = (i * 139 + Math.sin(time / 1700 + i) * 16) % 1800;
    });
  scene.events.on("update", tick);
  scene.events.once("shutdown", () => {
    scene.events.off("update", tick);
    map.destroy();
  });
}
