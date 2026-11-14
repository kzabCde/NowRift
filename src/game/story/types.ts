import type { EnemyKind } from "../content/forest";
import type {
  LocalizedText,
  ObjectiveType,
  QuestObjective,
} from "../quests/types";
import type { WorldId } from "../campaign/content";

export type MissionPhase =
  | "MISSION_START"
  | "INTRO_DIALOGUE"
  | "OBJECTIVE_ACTIVE"
  | "OBJECTIVE_COMPLETED"
  | "NEXT_OBJECTIVE"
  | "BOSS_OR_FINAL_ENCOUNTER"
  | "MISSION_COMPLETED"
  | "REWARD_SETTLEMENT"
  | "RETURN_TO_HAVEN"
  | "FAILED";
export type MissionPoint = { x: number; y: number };
export type MissionObjectKind =
  | "npc"
  | "location"
  | "item"
  | "mechanism"
  | "destructible"
  | "ally"
  | "boss"
  | "elite"
  | "rescue";
export type MissionObject = MissionPoint & {
  id: string;
  target: string;
  kind: MissionObjectKind;
  label: LocalizedText;
  radius: number;
  order?: number;
  dialogue?: LocalizedText;
  route?: MissionPoint[];
};
export type MissionStep = QuestObjective & { objects: MissionObject[] };
export type MissionDefinition = {
  schema: 1;
  id: string;
  worldId: WorldId;
  title: LocalizedText;
  questTitle: LocalizedText;
  briefing: LocalizedText;
  returnDialogue: LocalizedText;
  objectives: MissionStep[];
  finale?: { name: LocalizedText; phases: 3 };
};
export type MissionFact = {
  sequence: number;
  type: ObjectiveType;
  target: string;
  amount: number;
};
export type MissionAlly = MissionPoint & {
  id: string;
  r: number;
  hp: number;
  maxHp: number;
  route: MissionPoint[];
  waypoint: number;
  hurtCooldown: number;
};
export type MissionState = {
  schema: 1;
  definitionId: string;
  phase: MissionPhase;
  step: number;
  progress: Record<string, number>;
  completed: string[];
  used: string[];
  spawned: string[];
  objects: MissionObject[];
  events: MissionFact[];
  sequence: number;
  transition: number;
  wave: number;
  elapsed: number;
  ally: MissionAlly | null;
  gathered: Record<string, number>;
  feedback:
    | "updated"
    | "objective"
    | "mechanism-order"
    | "complete"
    | "failed"
    | null;
};
export type MissionHooks = {
  spawn: (
    kind: EnemyKind,
    x: number,
    y: number,
  ) => import("../engine").Enemy | undefined;
  collide: (point: MissionPoint & { r: number }) => void;
};
export type MissionReceipt = {
  schema: 1;
  stageId: string;
  completed: string[];
  events: MissionFact[];
  gathered: Record<string, number>;
};
