import type { Progress } from "../campaign/progression";
import type { CharacterId } from "../loadout";
import type { WeaponId } from "../content/forest";
import type { RunResult } from "../bridge";
import type { RunCheckpoint } from "./checkpoint";
export const SAVE_SCHEMA = 2;
export type Metrics = {
  kills: number;
  bestKills: number;
  bosses: number;
  seconds: number;
  stages: number;
  materials: number;
  goldEarned: number;
  enhancements: number;
  dismantled: number;
  equipment: number;
  legendary: number;
  highestEnhancement: number;
};
export const emptyMetrics = (): Metrics => ({
  kills: 0,
  bestKills: 0,
  bosses: 0,
  seconds: 0,
  stages: 0,
  materials: 0,
  goldEarned: 0,
  enhancements: 0,
  dismantled: 0,
  equipment: 0,
  legendary: 0,
  highestEnhancement: 0,
});
export type DailyProgress = {
  day: string;
  progress: Record<string, number>;
  claimed: string[];
};
export type AchievementState = {
  progress: number;
  unlockedAt: number | null;
  claimed: boolean;
};
export type RunOwner = {
  id: string;
  slotId: string;
  writer: string;
  sequence: number;
};
export type ActiveRun = RunOwner & {
  stage?: import("../campaign/identity").RunStageIdentity;
  updatedAt: number;
  metrics: Pick<Metrics, "kills" | "bosses" | "seconds">;
};
export type SlotState = {
  journal?: import("../quests/types").QuestJournal;
  world?: import("../world/save").WorldSave;
  schema: 2;
  id: string;
  name: string;
  createdAt: number;
  lastPlayed: number;
  revision: number;
  character: CharacterId;
  weapon: WeaponId;
  stats: Metrics;
  daily: DailyProgress;
  achievements: Record<string, AchievementState>;
  legacyImported: boolean;
  legacyWarning?: string;
  records: RunResult[];
  activeRun: ActiveRun | null;
  checkpoint: RunCheckpoint | null;
};
export type SaveData = Progress & { local: SlotState };
export type PlayerProfile = {
  schema: 2;
  id: string;
  username: string;
  createdAt: number;
  revision: number;
  activeSlotId: string;
  slots: { id: string; key: string }[];
  checkins: { day: string; cycle: number; slotId: string; at: number }[];
};
export type PlayerView = {
  player: PlayerProfile;
  slots: SaveData[];
  active: SaveData | null;
  errors: Record<string, string>;
};
export type Backup = {
  schema: 2;
  id: string;
  at: number;
  reason: string;
  player: PlayerProfile;
  save: SaveData;
};
export type SaveBundle = {
  format: "nowrift-save";
  version: 2;
  exportedAt: number;
  player: Pick<PlayerProfile, "id" | "username" | "createdAt" | "checkins">;
  save: SaveData;
};
export type ExportFile = {
  format: "nowrift-backup";
  checksum: string;
  payload: SaveBundle;
};
