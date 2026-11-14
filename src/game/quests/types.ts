import type { WorldId } from "../campaign/content";
import type { Rarity } from "../rpg/model";

export type LocalizedText = { en: string; th: string };
export type QuestMode = "haven" | "story" | "free";
export type QuestCategory = "main" | "side" | "guild" | "npc";
export type ObjectiveType =
  | "TalkToNPC"
  | "VisitLocation"
  | "DiscoverArea"
  | "DefeatEnemy"
  | "DefeatBoss"
  | "CollectItem"
  | "DeliverItem"
  | "InteractWithObject"
  | "DefendLocation"
  | "EscortNPC"
  | "RescueNPC"
  | "ActivateMechanism"
  | "DestroyObject"
  | "SurviveEncounter"
  | "CompleteStage";
export type QuestStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "ACTIVE"
  | "OBJECTIVE_COMPLETED"
  | "READY_TO_CLAIM"
  | "COMPLETED"
  | "FAILED";
export type QuestObjective = {
  id: string;
  type: ObjectiveType;
  target: string;
  count: number;
  text: LocalizedText;
  stageId?: string;
  worldId?: WorldId;
};
export type QuestReward = {
  xp: number;
  gold: number;
  materials: Record<string, number>;
  equipment?: { definitionId: string; rarity: Rarity; level: number };
  flags?: string[];
};
export type QuestDefinition = {
  missionStage?: string;
  id: string;
  category: QuestCategory;
  chapterId: WorldId;
  title: LocalizedText;
  description: LocalizedText;
  giver: string;
  prerequisites: string[];
  requiredClear?: string;
  allowedModes: QuestMode[];
  sequential: boolean;
  objectives: QuestObjective[];
  reward: QuestReward;
  dialogue: {
    offer: LocalizedText;
    progress: LocalizedText;
    ready: LocalizedText;
    complete: LocalizedText;
  };
  failOnMissionLoss?: boolean;
};
export type QuestInstance = {
  status: QuestStatus;
  progress: Record<string, number>;
  completedObjectives: string[];
  acceptedAt: number | null;
  completedAt: number | null;
  rewardClaimed: boolean;
  legacy?: boolean;
};
export type QuestNotice = {
  sequence: number;
  kind: "accepted" | "objective" | "ready" | "claimed" | "failed";
  questId: string;
  objectiveId?: string;
};
export type QuestJournal = {
  runLedger: {
    id: string;
    missionSequence: number;
    kills: Record<string, number>;
    seconds: number;
  } | null;
  returns: string[];
  seenDialogues: string[];
  schema: 1;
  quests: Record<string, QuestInstance>;
  tracked: string | null;
  flags: string[];
  legacyAccess: string[];
  seenEvents: string[];
  notices: QuestNotice[];
  sequence: number;
};
export type QuestSource = {
  mode: QuestMode;
  runId?: string;
  stageId?: string;
  worldId?: WorldId;
};
export type QuestEvent = {
  id: string;
  type: ObjectiveType;
  target: string;
  amount: number;
  source: QuestSource;
};
/** Built by the repository from its active run/session, never from event labels. */
export type QuestAuthority = QuestSource & {
  verifiedStageCompletion?: boolean;
  verifiedMissionFailure?: boolean;
};
