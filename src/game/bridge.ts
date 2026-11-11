import type { Loadout } from "./loadout";
import type { StageSelection } from "./campaign/loader";
import type { CampaignResult } from "./campaign/rewards";
import type { Snapshot } from "./engine";
import type { UpgradeId, WeaponId } from "./content/forest";
export type Command =
  | { type: "transition-lock"; locked: boolean }
  | import("./world/bridge").HavenCommand
  | { type: "expedition-interact" }
  | {
      type: "start";
      weapon: WeaponId;
      stage?: StageSelection;
      loadout?: Loadout;
      run?: import("./persistence/model").RunOwner;
      checkpoint?: import("./persistence/checkpoint").RunCheckpoint | null;
      hold?: boolean;
    }
  | { type: "pause" }
  | { type: "checkpoint" | "storage-blocked" | "storage-ready" }
  | { type: "upgrade"; id: UpgradeId }
  | { type: "exit" }
  | {
      type: "tonic";
      runId: string;
      receiptId: string;
      definitionId: "health-tonic" | "focus-tonic";
    }
  | { type: "tonic-lock" | "tonic-unlock"; runId: string };
export type RunResult = {
  run?: import("./persistence/model").RunOwner;
  campaign?: CampaignResult;
  id: string;
  at: number;
  outcome: "victory" | "gameover";
  kills: number;
  gold: number;
  level: number;
  seconds: number;
  weapon: WeaponId;
};
export type GameEvents = {
  haven: import("./world/bridge").HavenSnapshot;
  interaction: { id: string; position: import("./world/content").Point };
  "haven-save": import("./world/content").Point;
  "haven-shortcut": "inventory" | "map" | "quests" | "pause";
  expedition: import("./world/farming").ExpeditionPrompt;
  command: Command;
  hud: Snapshot;
  ready: boolean;
  loading: number;
  error: string;
  result: RunResult;
  touch: boolean;
  checkpoint: import("./persistence/checkpoint").RunCheckpoint;
};
/** One bridge per mounted game; no global scene singleton or shared simulation. */
export class GameBridge {
  private listeners = new Map<keyof GameEvents, Set<(value: never) => void>>();
  on<K extends keyof GameEvents>(key: K, fn: (value: GameEvents[K]) => void) {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(fn as (value: never) => void);
    return () => {
      set.delete(fn as (value: never) => void);
    };
  }
  emit<K extends keyof GameEvents>(key: K, value: GameEvents[K]) {
    for (const fn of this.listeners.get(key) ?? []) fn(value as never);
  }
  clear() {
    this.listeners.clear();
  }
}
