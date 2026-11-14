import Phaser from "phaser";
import type { Game } from "../engine";
import { activeMissionObjects } from "../story/runtime";
import { ITEMS } from "../rpg/content";
import { translateText } from "../../i18n/translator";
import { useLocale } from "../../state/locale";

/** Scene-owned, bounded mission actors and landmarks; no progression is awarded here. */
export class StoryWorld {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private areas: Phaser.GameObjects.Graphics;
  constructor(private scene: Phaser.Scene) {
    this.areas = scene.add.graphics().setDepth(-10);
  }
  draw(g: Game) {
    const s = g.campaign?.mission,
      visible = new Set<string>();
    this.areas.clear();
    for (const o of activeMissionObjects(g)) {
      if (o.kind === "boss" || o.kind === "elite" || o.kind === "destructible")
        continue;
      visible.add(o.id);
      const ally = s?.ally?.id === o.id ? s.ally : null,
        x = ally?.x ?? o.x,
        y = ally?.y ?? o.y;
      this.areas
        .lineStyle(2, 0xd7c185, 0.7)
        .strokeCircle(x, y, o.radius)
        .fillStyle(0xaecbb2, 0.06)
        .fillCircle(x, y, o.radius);
      if (o.kind !== "location") {
        const npc = ["npc", "ally", "rescue"].includes(o.kind),
          key = npc
            ? "haven-city-residents"
            : o.kind === "item"
              ? "items"
              : "haven-city-props";
        let image = this.images.get(o.id);
        if (!image) {
          image = this.scene.add.image(x, y, key);
          this.images.set(o.id, image);
        }
        const cast: Record<string, number> = {
          sera: 2,
          tovin: 3,
          yara: 4,
          nim: 5,
          edda: 6,
          teth: 7,
          neri: 8,
          cairn: 9,
          aven: 10,
          ilen: 11,
          amel: 12,
          renn: 13,
        };
        const variant = cast[o.target.split("-").at(-1)!] ?? 2;
        const next = ally?.route[ally.waypoint],
          walking = !!next && Math.hypot(g.player.x - x, g.player.y - y) < 190;
        const dx = (next?.x ?? g.player.x) - x,
          dy = (next?.y ?? g.player.y) - y;
        const facing =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy < 0 ? 2 : 0;
        const frame = npc
          ? variant * 16 +
            facing * 4 +
            (walking ? 1 + (Math.floor(g.time * 5) % 3) : 0)
          : o.kind === "item"
            ? (ITEMS[o.target]?.icon ?? 0)
            : 32;
        image
          .setTexture(key, frame)
          .setPosition(Math.round(x), Math.round(y))
          .setOrigin(0.5, npc ? 0.75 : 1)
          .setScale(npc ? 1.6 : 1.8)
          .setDepth(y)
          .setVisible(true);
      }
      let label = this.labels.get(o.id);
      if (!label) {
        label = this.scene.add
          .text(x, y + 26, "", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#efe1b9",
            backgroundColor: "#172d2bc9",
            padding: { x: 5, y: 4 },
          })
          .setOrigin(0.5, 0);
        this.labels.set(o.id, label);
      }
      label
        .setPosition(x, y + 28)
        .setText(translateText(useLocale.getState().locale, o.label.en))
        .setDepth(y + 100)
        .setVisible(true);
    }
    for (const [id, image] of this.images)
      if (!visible.has(id)) image.setVisible(false);
    for (const [id, label] of this.labels)
      if (!visible.has(id)) label.setVisible(false);
  }
}
