import { ITEMS, WEARABLE_SLOTS } from "../rpg/content";
export const OUTFITTER_ART = {
  key: "outfitters-items",
  path: "/assets/items/outfitters.png",
  size: 32,
  columns: 4,
  rows: 4,
} as const;
export function wearableIcon(id: string) {
  const def = ITEMS[id];
  const column = WEARABLE_SLOTS.findIndex((slot) => slot === def?.slot);
  const row = ["forest", "desert", "frozen", "infernal"].findIndex(
    (world) => id === `${world}-${def?.slot}`,
  );
  return column < 0 || row < 0
    ? null
    : { ...OUTFITTER_ART, frame: row * 4 + column };
}
