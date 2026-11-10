import type { Progress } from "../campaign/progression";
import { ITEMS } from "./content";
export function gold(p: Progress, delta: number) {
  if (
    !Number.isSafeInteger(delta) ||
    !Number.isSafeInteger(p.gold + delta) ||
    p.gold + delta < 0
  )
    throw new Error("Insufficient gold or invalid amount.");
  p.gold += delta;
}
export function spend(
  p: Progress,
  cost: number,
  materials: Record<string, number> = {},
) {
  if (!Number.isSafeInteger(cost) || cost < 0) throw new Error("Invalid cost");
  if (p.gold < cost) throw new Error("Not enough gold.");
  for (const [id, n] of Object.entries(materials))
    if (
      ITEMS[id]?.kind !== "material" ||
      !Number.isSafeInteger(n) ||
      n < 0 ||
      (p.materials[id] ?? 0) < n
    )
      throw new Error("Missing required materials.");
  gold(p, -cost);
  for (const [id, n] of Object.entries(materials)) p.materials[id] -= n;
}
export function quantity(n: number) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 10000)
    throw new Error("Quantity must be a whole number from 1 to 10000.");
  return n;
}
