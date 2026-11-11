import type { CharacterId } from "../loadout";
import type { Outfit } from "./save";
import type { Point } from "./content";
import type { WeaponSnapshot } from "../rpg/model";
export type HavenStart = {
  session: string;
  position: Point;
  outfit: Outfit;
  character: CharacterId;
  weapon: WeaponSnapshot | null;
};
export type HavenSnapshot = {
  position: Point;
  near: string | null;
  paused: boolean;
  moving: boolean;
  training: number;
};
export type HavenCommand =
  | {
      type: "haven-test";
    }
  | {
      type: "haven-equipment";
      character: CharacterId;
      weapon: WeaponSnapshot | null;
    }
  | { type: "haven-lock"; locked: boolean }
  | { type: "haven-interact" }
  | { type: "haven-look"; outfit: Outfit }
  | { type: "haven-locate"; id: string };
