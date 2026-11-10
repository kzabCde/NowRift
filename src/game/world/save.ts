import { HAVEN, LANDMARKS, validPosition, type Point } from "./content";
export const OUTFITS = ["moss", "ember", "tide"] as const;
export type Outfit = (typeof OUTFITS)[number];
export type WorldSave = {
  schema: 1;
  position: Point;
  outfit: Outfit;
  hp: number;
  writer: string;
  sequence: number;
  location: "haven" | "expedition";
  tutorial: boolean;
  quest: "available" | "active" | "completed" | "claimed";
  extractions: number;
  discoveries: string[];
  cacheClaimed: boolean;
};
export const defaultWorld = (): WorldSave => ({
  schema: 1,
  position: { ...HAVEN.spawn },
  outfit: "moss",
  hp: 100,
  writer: "",
  sequence: 0,
  location: "haven",
  tutorial: true,
  quest: "available",
  extractions: 0,
  discoveries: [],
  cacheClaimed: false,
});
export function validWorld(value: unknown): value is WorldSave {
  if (!value || typeof value !== "object") return false;
  const w = value as WorldSave;
  return (
    w.schema === 1 &&
    !!w.position &&
    validPosition(w.position) &&
    OUTFITS.includes(w.outfit) &&
    Number.isFinite(w.hp) &&
    w.hp >= 1 &&
    w.hp <= 5000 &&
    typeof w.writer === "string" &&
    Number.isSafeInteger(w.sequence) &&
    w.sequence >= 0 &&
    ["haven", "expedition"].includes(w.location) &&
    typeof w.tutorial === "boolean" &&
    ["available", "active", "completed", "claimed"].includes(w.quest) &&
    Number.isSafeInteger(w.extractions) &&
    w.extractions >= 0 &&
    Array.isArray(w.discoveries) &&
    new Set(w.discoveries).size === w.discoveries.length &&
    w.discoveries.every((id) => LANDMARKS.some((l) => l.id === id)) &&
    typeof w.cacheClaimed === "boolean"
  );
}
export type WorldCommand =
  | { type: "enter"; writer: string }
  | { type: "position"; writer: string; sequence: number; position: Point }
  | { type: "visit"; writer: string; id: string; position: Point }
  | { type: "outfit"; writer: string; outfit: Outfit }
  | {
      type: "accept" | "claim" | "rest" | "treasure" | "tutorial" | "travel";
      writer: string;
    };
