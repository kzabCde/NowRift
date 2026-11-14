import type { CharacterId } from "../loadout";
import type { Outfit } from "./save";
import type { Point } from "./content";
import type { WeaponSnapshot } from "../rpg/model";
import type { CharacterAppearance } from "../presentation/appearance";
import type { ActionVisualReceipt } from "../presentation/action-feedback";
import type { CityMilestones } from "./city";
export type HavenStart = {
  questStates?: import("../quests/presentation").QuestGiverStates;
  milestones?: CityMilestones;
  session: string;
  position: Point;
  positionEpoch?: number;
  outfit: Outfit;
  character: CharacterId;
  weapon: WeaponSnapshot | null;
  visualAppearance?: CharacterAppearance;
};
export type HavenSnapshot = {
  position: Point;
  near: string | null;
  paused: boolean;
  moving: boolean;
  training: number;
  district?: string;
  night?: boolean;
};
export type HavenCommand =
  | {
      type: "haven-test";
    }
  | {
      type: "haven-equipment";
      questStates?: import("../quests/presentation").QuestGiverStates;
      milestones?: CityMilestones;
      character: CharacterId;
      weapon: WeaponSnapshot | null;
      visualAppearance?: CharacterAppearance;
    }
  | { type: "haven-feedback"; receipt: ActionVisualReceipt }
  | { type: "haven-lock"; locked: boolean }
  | {
      type: "haven-teleport";
      position: Point;
      epoch: number;
      facing: "down" | "up" | "left" | "right";
    }
  | { type: "haven-interact" }
  | { type: "haven-look"; outfit: Outfit }
  | { type: "haven-locate"; id: string };
