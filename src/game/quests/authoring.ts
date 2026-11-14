import type { WorldId } from "../campaign/content";
import type {
  LocalizedText,
  QuestDefinition,
  QuestObjective,
  QuestMode,
  ObjectiveType,
} from "./types";
import { w } from "../story/builders";
export { w };
export type ObjectiveDraft = Omit<QuestObjective, "id">;
export const task = (
  type: ObjectiveType,
  target: string,
  count: number,
  text: LocalizedText,
  scope: Pick<QuestObjective, "stageId" | "worldId"> = {},
): ObjectiveDraft => ({ type, target, count, text, ...scope });
export const deliver = (item: string, count: number, text: LocalizedText) =>
  task("DeliverItem", item, count, text);
export const collect = (item: string, count: number, text: LocalizedText) =>
  task("CollectItem", item, count, text);
export const visit = (id: string, text: LocalizedText) =>
  task("VisitLocation", id, 1, text);
export const speak = (id: string, text: LocalizedText) =>
  task("TalkToNPC", id, 1, text);
export const kill = (
  worldId: WorldId,
  kind: string,
  count: number,
  text: LocalizedText,
) =>
  task(kind === "boss" ? "DefeatBoss" : "DefeatEnemy", kind, count, text, {
    worldId,
  });
export function authored(
  world: WorldId,
  number: number,
  giver: string,
  title: LocalizedText,
  description: LocalizedText,
  reply: LocalizedText,
  objectives: ObjectiveDraft[],
  options: Partial<
    Pick<
      QuestDefinition,
      "category" | "prerequisites" | "requiredClear" | "allowedModes" | "reward"
    >
  > = {},
): QuestDefinition {
  const category = options.category ?? "side",
    id = `${category}-${world}-${number}`;
  const tier = ["forest", "desert", "frozen", "infernal"].indexOf(world);
  return {
    id,
    category,
    chapterId: world,
    giver,
    title,
    description,
    prerequisites: options.prerequisites ?? [],
    requiredClear: options.requiredClear ?? world + "-1",
    allowedModes:
      options.allowedModes ?? (["haven", "story", "free"] as QuestMode[]),
    sequential: true,
    objectives: objectives.map((o, i) => ({
      ...o,
      id: id + "-objective-" + (i + 1),
    })),
    reward: options.reward ?? {
      gold: 100 + tier * 45 + number * 8,
      xp: 80 + tier * 40 + number * 12,
      materials: {
        [["wood", "ancient-shard", "frost-crystal", "obsidian"][tier]]: 2,
      },
      flags: [id + ":helped"],
    },
    dialogue: {
      offer: description,
      progress: w(
        "Your journal records what is still needed. Come back when the work is done.",
        "บันทึกบอกสิ่งที่ยังต้องทำ กลับมาเมื่อเสร็จงานเถิด",
      ),
      ready: reply,
      complete: reply,
    },
  };
}
