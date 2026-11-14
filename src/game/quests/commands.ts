import type { SaveData } from "../persistence/model";
import { near, validPosition, type Point } from "../world/content";
import { grantGift, recordMetrics } from "../persistence/daily";
import { addEquipment, findEntry, removeEntry } from "../rpg/inventory";
import { seededEquipment } from "../rpg/items";
import { ITEMS } from "../rpg/content";
import { currentRegion } from "../world/exploration";
import { regionalCity } from "../world/regional-city";
import { questById } from "./catalog";
import {
  acceptQuest,
  advanceQuests,
  completeQuest,
  currentObjectives,
  trackQuest,
} from "./engine";
import { reconcileJournal } from "./save";
import { inventoryQuestGains } from "./events";

export type QuestCommand =
  | { type: "track"; questId: string | null }
  | { type: "read-return"; stageId: string }
  | {
      type: "accept" | "claim" | "deliver";
      questId: string;
      writer: string;
      epoch: number;
      position: Point;
      objectiveId?: string;
    };
export function applyQuestCommand(p: SaveData, c: QuestCommand, at: number) {
  const j = p.local.journal!;
  reconcileJournal(j, p.clears);
  if (c.type === "track") {
    trackQuest(j, c.questId);
    return;
  }
  if (c.type === "read-return") {
    if (j.returns.includes(c.stageId)) {
      j.returns = j.returns.filter((id) => id !== c.stageId);
      if (!j.seenDialogues.includes(c.stageId)) j.seenDialogues.push(c.stageId);
    }
    return;
  }
  const d = questById(c.questId),
    w = p.local.world;
  if (
    !d ||
    !w ||
    w.location !== "haven" ||
    w.writer !== c.writer ||
    w.positionEpoch !== c.epoch
  )
    throw new Error("Return to this quest giver in Rift Haven.");
  const region = currentRegion(w),
    giver = regionalCity(region).landmarks.find((l) => l.id === d.giver);
  if (
    !giver ||
    !validPosition(c.position, region) ||
    !near(c.position, giver.entrance)
  )
    throw new Error("Move closer to the quest giver.");
  const q = j.quests[d.id];
  if (c.type === "accept") {
    acceptQuest(j, d, at);
    return;
  }
  if (c.type === "deliver") {
    const o = currentObjectives(q, d).find(
      (o) => o.type === "DeliverItem" && o.id === c.objectiveId,
    );
    if (!o || !["ACTIVE", "OBJECTIVE_COMPLETED"].includes(q.status))
      throw new Error("This delivery objective is not active.");
    const quantity = o.count - (q.progress[o.id] ?? 0),
      entry = findEntry(p, "stack:" + o.target);
    removeEntry(p, entry, quantity);
    p.rpg!.revision++;
    p.rpg!.history.push({
      id: `delivery:${p.local.id}:${d.id}:${o.id}`,
      at,
      kind: "gift",
      gold: 0,
      message: d.title.en,
      items: [`Delivered ${ITEMS[o.target].name} ×${quantity}`],
    });
    const source = { mode: "haven" as const };
    advanceQuests(
      j,
      [d],
      {
        id: `delivery:${p.local.id}:${d.id}:${o.id}`,
        type: "DeliverItem",
        target: o.target,
        amount: quantity,
        source,
      },
      source,
    );
    return;
  }
  if (q.status === "COMPLETED" && q.rewardClaimed) return;
  if (q.status !== "READY_TO_CLAIM")
    throw new Error("Complete every quest objective before claiming.");
  const receipt = `quest:${p.local.id}:${d.id}`;
  if (p.receipts.includes(receipt)) {
    completeQuest(j, d, at);
    reconcileJournal(j, p.clears);
    return;
  }
  const before = structuredClone(p);
  grantGift(
    p,
    { gold: d.reward.gold, materials: d.reward.materials },
    receipt,
    at,
    d.title.en,
  );
  p.rpg!.history.at(-1)!.items = Object.entries(d.reward.materials).map(
    ([id, n]) => `Obtained ${ITEMS[id].name} ×${n}`,
  );
  const xp = p.xp + d.reward.xp;
  if (!Number.isSafeInteger(xp)) throw new Error("Invalid quest XP.");
  p.xp = xp;
  if (d.reward.equipment) {
    const e = d.reward.equipment;
    addEquipment(
      p,
      seededEquipment(
        receipt + ":equipment",
        e.definitionId,
        e.rarity,
        e.level,
      ),
      receipt + ":equipment-parcel",
    );
    p.rpg!.history.at(-1)!.items.push(
      `Obtained ${ITEMS[e.definitionId].name} ×1`,
    );
  }
  completeQuest(j, d, at);
  recordMetrics(
    p,
    {
      goldEarned: d.reward.gold,
      materials: Object.values(d.reward.materials).reduce((a, b) => a + b, 0),
      equipment: d.reward.equipment ? 1 : 0,
    },
    at,
  );
  reconcileJournal(j, p.clears);
  inventoryQuestGains(before, p, { mode: "haven" });
}
