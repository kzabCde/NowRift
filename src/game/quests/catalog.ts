import { MISSIONS, words } from "../story/content";
import { SIDE_QUESTS } from "./side-content";
import { GUILD_QUESTS } from "./guild-content";
import { NPC_QUESTS } from "./npc-content";
import type { QuestDefinition } from "./types";

const materials = {
  forest: "wood",
  desert: "ancient-shard",
  frozen: "frost-crystal",
  infernal: "obsidian",
};
const givers = {
  forest: "mara",
  desert: "guild",
  frozen: "workshop",
  infernal: "forge",
};
export const mainQuestId = (stageId: string) => "main-" + stageId;
/** Main objectives mirror the exact mission definition; completion requires verified Story settlement. */
const MAIN_QUESTS: QuestDefinition[] = MISSIONS.map((m) => {
  const number = Number(m.id.split("-").at(-1));
  return {
    id: mainQuestId(m.id),
    category: "main",
    chapterId: m.worldId,
    missionStage: m.id,
    title: m.questTitle,
    description: m.briefing,
    giver: givers[m.worldId],
    prerequisites: [],
    ...(number > 1 ? { requiredClear: `${m.worldId}-${number - 1}` } : {}),
    allowedModes: ["story"],
    sequential: true,
    objectives: [
      ...m.objectives.map(({ objects: _objects, ...o }) => ({
        ...o,
        stageId: m.id,
        worldId: m.worldId,
      })),
      {
        id: m.id + "-complete",
        type: "CompleteStage",
        target: m.id,
        count: 1,
        stageId: m.id,
        worldId: m.worldId,
        text: words("Complete the Story mission", "สำเร็จภารกิจเนื้อเรื่อง"),
      },
    ],
    reward: {
      gold: 80 + number * 15,
      xp: 100 + number * 25,
      materials: { [materials[m.worldId]]: 2 },
      flags: ["story:" + m.id],
    },
    dialogue: {
      offer: m.briefing,
      progress: words(
        "Follow your mission's clues beyond the Rift. I will be here when you return.",
        "ตามเบาะแสภารกิจอีกฝั่งของรอยแยก ข้าจะรออยู่ที่นี่เมื่อเจ้ากลับมา",
      ),
      ready: m.returnDialogue,
      complete: words(
        "The city remembers what you have done. Take these supplies for the road ahead.",
        "เมืองนี้จดจำสิ่งที่เจ้าทำ รับเสบียงเหล่านี้ไว้สำหรับหนทางข้างหน้า",
      ),
    },
  };
});
export const QUEST_CATALOG: QuestDefinition[] = [
  ...MAIN_QUESTS,
  ...SIDE_QUESTS,
  ...GUILD_QUESTS,
  ...NPC_QUESTS,
];
export const questById = (id: string) => QUEST_CATALOG.find((q) => q.id === id);
