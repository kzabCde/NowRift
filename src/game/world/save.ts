import { CITY } from "./city";
import { INITIAL_WAYPOINTS, WAYPOINTS, legacyTownPosition } from "./waypoints";
import { HAVEN, LANDMARKS, validPosition, type Point } from "./content";
import {
  validCustomization,
  type AppearanceCustomization,
} from "../presentation/customization";
export const OUTFITS = ["moss", "ember", "tide"] as const;
export type Outfit = (typeof OUTFITS)[number];
export type WorldSave = {
  schema: 2;
  layoutRevision: 3;
  positionEpoch: number;
  waypoints: string[];
  position: Point;
  outfit: Outfit;
  customization?: AppearanceCustomization;
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
  schema: 2,
  layoutRevision: 3,
  positionEpoch: 0,
  waypoints: [...INITIAL_WAYPOINTS],
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
    w.schema === 2 &&
    w.layoutRevision === CITY.schema &&
    Number.isSafeInteger(w.positionEpoch) &&
    w.positionEpoch >= 0 &&
    Array.isArray(w.waypoints) &&
    new Set(w.waypoints).size === w.waypoints.length &&
    INITIAL_WAYPOINTS.every((id) => w.waypoints.includes(id)) &&
    w.waypoints.every((id) => WAYPOINTS.some((p) => p.id === id)) &&
    !!w.position &&
    validPosition(w.position) &&
    OUTFITS.includes(w.outfit) &&
    (w.customization === undefined || validCustomization(w.customization)) &&
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
/** Strict and idempotent: migration adds navigation metadata without awarding anything. */
export function migrateWorld(value: unknown): WorldSave | null {
  if (!value || typeof value !== "object") return null;
  const old = value as WorldSave;
  if ((old as { schema: number }).schema === 1) {
    const next = {
      ...structuredClone(old),
      schema: 2 as const,
      layoutRevision: 3 as const,
      positionEpoch: 0,
      position: legacyTownPosition(old.position),
      waypoints: WAYPOINTS.filter(
        (p) =>
          p.initial ||
          p.unlocksFrom.some((id) => old.discoveries?.includes(id)),
      ).map((p) => p.id),
    };
    return validWorld(next) ? next : null;
  }
  if (old.schema !== 2 || old.layoutRevision !== 3) return null;
  const next = validPosition(old.position)
    ? old
    : {
        ...structuredClone(old),
        position: { ...HAVEN.spawn },
      };
  return validWorld(next) ? next : null;
}
export type WorldCommand =
  | {
      type: "weapon";
      writer: string;
      weapon: import("../content/forest").WeaponId;
    }
  | { type: "enter"; writer: string }
  | {
      type: "position";
      writer: string;
      sequence: number;
      position: Point;
      epoch?: number;
    }
  | {
      type: "fast-travel";
      writer: string;
      waypointId: string;
      expectedEpoch: number;
    }
  | { type: "visit"; writer: string; id: string; position: Point }
  | { type: "outfit"; writer: string; outfit: Outfit }
  | {
      type: "appearance";
      writer: string;
      outfit: Outfit;
      customization: AppearanceCustomization;
    }
  | {
      type: "accept" | "claim" | "rest" | "treasure" | "tutorial" | "travel";
      writer: string;
    };
