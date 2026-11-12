import type { Progress } from "../campaign/progression";
import type { LedgerEntry } from "../rpg/model";
import type { ActionBody } from "../rpg/actions";
import type { SaveData } from "../persistence/model";
import type { WorldCommand } from "../world/save";
import { ITEMS } from "../rpg/content";
import { animationDuration, type AnimationPose } from "./animation";

export type InteractionPose = Extract<
  AnimationPose,
  "interact" | "mine" | "gather" | "craft" | "respawn"
>;
export type ActionVisualReceipt = {
  id: string;
  pose: InteractionPose;
  effect: "spark" | "heal" | "rare" | "pickup" | "magic";
  label: string;
  items: { definitionId: string; quantity: number }[];
  gold: number;
};
function quantities(p: Progress) {
  const totals = new Map<string, number>();
  const add = (id: string, n: number) =>
    totals.set(id, (totals.get(id) ?? 0) + n);
  for (const [id, n] of Object.entries(p.materials)) add(id, n);
  for (const [id, n] of Object.entries(p.rpg?.consumables ?? {})) add(id, n);
  for (const item of p.rpg?.equipment ?? []) add(item.definitionId, 1);
  return totals;
}
/** Positive, committed inventory deltas; equip and enhancement never invent an item reward. */
export function committedItems(before: Progress, after: Progress) {
  const old = quantities(before);
  return [...quantities(after)].flatMap(([definitionId, quantity]) => {
    const gained = quantity - (old.get(definitionId) ?? 0);
    return ITEMS[definitionId] && gained > 0
      ? [{ definitionId, quantity: gained }]
      : [];
  });
}
export function committedRpgVisual(
  before: Progress,
  result: { progress: Progress; entry: LedgerEntry | null },
  action: ActionBody,
): ActionVisualReceipt | null {
  const { entry, progress: after } = result;
  if (
    !entry ||
    !entry.id ||
    entry.kind !== action.type ||
    before.receipts.includes(entry.id) ||
    !after.receipts.includes(entry.id) ||
    (after.rpg?.revision ?? 0) <= (before.rpg?.revision ?? 0) ||
    action.type === "flag"
  )
    return null;
  const crafting = ["craft", "enhance", "dismantle"].includes(action.type);
  return {
    id: entry.id,
    pose: crafting ? "craft" : "interact",
    effect:
      action.type === "consume"
        ? "heal"
        : action.type === "enhance"
          ? entry.enhancement?.success
            ? "rare"
            : "spark"
          : action.type === "craft"
            ? "rare"
            : action.type === "upgrade"
              ? "magic"
              : "pickup",
    label: entry.message,
    items: committedItems(before, after),
    gold: Math.max(0, after.gold - before.gold),
  };
}
export function committedWorldVisual(
  before: SaveData | null,
  after: SaveData,
  command: WorldCommand,
): ActionVisualReceipt | null {
  if (
    !before ||
    ![
      "visit",
      "appearance",
      "outfit",
      "rest",
      "accept",
      "claim",
      "treasure",
    ].includes(command.type) ||
    after.local.revision <= before.local.revision
  )
    return null;
  return {
    id: `${command.writer}:${after.local.revision}:${command.type}`,
    pose: "interact",
    effect:
      command.type === "rest"
        ? "heal"
        : command.type === "claim" || command.type === "treasure"
          ? "rare"
          : "magic",
    label: "Saved",
    items: committedItems(before, after),
    gold: Math.max(0, after.gold - before.gold),
  };
}
export type VisualActionState = {
  active: { id: string; pose: InteractionPose; ageMs: number } | null;
  seen: string[];
};
export const createVisualActionState = (): VisualActionState => ({
  active: null,
  seen: [],
});
export function commitVisualAction(
  state: VisualActionState,
  receipt: ActionVisualReceipt,
) {
  if (state.seen.includes(receipt.id)) return false;
  state.seen.push(receipt.id);
  if (state.seen.length > 64) state.seen.shift();
  state.active = { id: receipt.id, pose: receipt.pose, ageMs: 0 };
  return true;
}
/** Scene delta drives the presentation only. It never changes resource or transaction state. */
export function advanceVisualAction(
  state: VisualActionState,
  deltaMs: number,
  paused = false,
) {
  if (!state.active || paused) return;
  state.active.ageMs += Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);
  if (state.active.ageMs >= animationDuration(state.active.pose))
    state.active = null;
}
