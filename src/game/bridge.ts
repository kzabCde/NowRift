import type { Loadout } from "./loadout";
import type { StageSelection } from "./campaign/loader";
import type { CampaignResult } from "./campaign/rewards";
import type { Snapshot } from "./engine";
import type { UpgradeId, WeaponId } from "./content/forest";
export type Command =
  | {
      type: "start";
      weapon: WeaponId;
      stage?: StageSelection;
      loadout?: Loadout;
    }
  | { type: "pause" }
  | { type: "upgrade"; id: UpgradeId }
  | { type: "exit" };
export type RunResult = {
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
  command: Command;
  hud: Snapshot;
  ready: boolean;
  loading: number;
  error: string;
  result: RunResult;
  touch: boolean;
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
