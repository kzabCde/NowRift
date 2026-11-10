import type { CharacterId } from "../loadout";
import type { Outfit } from "./save";
import type { Point } from "./content";
export type HavenStart = {
  session: string;
  position: Point;
  outfit: Outfit;
  character: CharacterId;
  damage: number;
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
      weapon: import("../content/forest").WeaponId;
      build: import("../rpg/model").CharacterStats;
    }
  | { type: "haven-lock"; locked: boolean }
  | { type: "haven-interact" }
  | { type: "haven-look"; outfit: Outfit }
  | { type: "haven-locate"; id: string };
