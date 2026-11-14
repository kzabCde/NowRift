import type { LocalizedText } from "../quests/types";
import type { MissionDefinition } from "./types";
import { FOREST_MISSIONS } from "./forest";
import { DESERT_MISSIONS } from "./desert";
import { FROZEN_MISSIONS } from "./frozen";
import { INFERNAL_MISSIONS } from "./infernal";

export const words = (en: string, th: string): LocalizedText => ({ en, th });
export const CHAPTERS = [
  {
    id: "forest",
    title: words("Corruption and the Heartwood", "มลทินแห่งแก่นพฤกษา"),
    introduction: words(
      "Mara once heard four realms singing through the Rift. Now the forest's voice is a cry for help. Follow the missing ranger's trail.",
      "มาราเคยได้ยินเสียงสี่ดินแดนขับขานผ่านรอยแยก บัดนี้เสียงของป่ากลายเป็นคำร้องขอความช่วยเหลือ จงตามรอยพรานที่หายไป",
    ),
  },
  {
    id: "desert",
    title: words("The Civilization Beneath the Sand", "อารยธรรมใต้ผืนทราย"),
    introduction: words(
      "The Heartwood remembers a sunlit city. Its builders left more than ruins: they left a promise the Rift has forgotten.",
      "แก่นพฤกษาจดจำเมืองใต้แสงอาทิตย์ได้ ผู้สร้างทิ้งไว้มากกว่าซากปรัก พวกเขาทิ้งคำสัญญาที่รอยแยกลืมเลือน",
    ),
  },
  {
    id: "frozen",
    title: words("The Sealed Witnesses", "พยานใต้ผนึกเหมันต์"),
    introduction: words(
      "A desert inscription names the wardens of the northern seal. Find out whether they imprisoned the corruption—or the truth.",
      "จารึกทะเลทรายกล่าวถึงผู้พิทักษ์ผนึกแดนเหนือ จงค้นหาว่าพวกเขาจองจำมลทิน หรือจองจำความจริง",
    ),
  },
  {
    id: "infernal",
    title: words("The First Fracture", "รอยร้าวแรกเริ่ม"),
    introduction: words(
      "Beneath the last gate burns the engine that joined the realms. The Wanderer must decide what a restored Rift should protect.",
      "ใต้ประตูสุดท้ายมีแกนเพลิงที่เคยเชื่อมทุกดินแดน ผู้พเนจรต้องค้นหาว่ารอยแยกที่ฟื้นคืนควรพิทักษ์สิ่งใด",
    ),
  },
] as const;

/** Authored mission geometry is independent of the repeatable supply expedition. */
export const MISSIONS: MissionDefinition[] = [
  {
    schema: 1,
    id: "forest-1",
    worldId: "forest",
    title: words("Mossbound Trail", "เส้นทางมอส"),
    questTitle: words("The Heartwood's First Wound", "บาดแผลแรกของแก่นพฤกษา"),
    briefing: words(
      "Mara: Sera knows these paths better than anyone. She stopped sending reports three nights ago. Find her, and listen before you draw your blade.",
      "มารา: เซรารู้จักเส้นทางนี้ดีกว่าใคร แต่นางหยุดส่งข่าวมาสามคืนแล้ว จงตามหานาง และรับฟังก่อนชักอาวุธ",
    ),
    returnDialogue: words(
      "Mara: Living wood, blackened from within. The forest is fighting something it cannot name. Rest here, Wanderer. Tomorrow we follow Sera to the crossing.",
      "มารา: ไม้ยังมีชีวิต แต่ดำคล้ำจากข้างใน ป่ากำลังต่อสู้กับสิ่งที่มันเรียกชื่อไม่ได้ พักเถิดผู้พเนจร พรุ่งนี้เราจะตามเซราไปยังทางข้าม",
    ),
    objectives: [
      {
        id: "forest-1-ranger",
        type: "TalkToNPC",
        target: "ranger-sera",
        count: 1,
        text: words(
          "Find Sera at the broken trail marker",
          "พบเซราที่ป้ายทางแตกหัก",
        ),
        objects: [
          {
            id: "forest-1-sera",
            target: "ranger-sera",
            kind: "npc",
            x: 900,
            y: 560,
            radius: 72,
            label: words("Sera · Forest ranger", "เซรา · พรานพิทักษ์ป่า"),
            dialogue: words(
              "Sera: The moss used to glow when I sang. Now it recoils. Go west to the hollow oak. Clear the creatures there, but bring me living wood—not ash.",
              "เซรา: มอสเคยเรืองแสงยามข้าร้องเพลง บัดนี้มันกลับหดหนี ไปที่โอ๊กโพรงทางตะวันตก กำจัดสิ่งที่เฝ้าอยู่ แล้วนำไม้ที่ยังมีชีวิตกลับมา อย่าเผามัน",
            ),
          },
        ],
      },
      {
        id: "forest-1-clearing",
        type: "DiscoverArea",
        target: "wounded-oak",
        count: 1,
        text: words(
          "Investigate the wounded oak clearing",
          "สำรวจลานโอ๊กที่บาดเจ็บ",
        ),
        objects: [
          {
            id: "forest-1-oak",
            target: "wounded-oak",
            kind: "location",
            x: 590,
            y: 450,
            radius: 70,
            label: words("Wounded oak", "โอ๊กที่บาดเจ็บ"),
          },
        ],
      },
      {
        id: "forest-1-purge",
        type: "DefeatEnemy",
        target: "slime",
        count: 4,
        text: words(
          "Clear four corrupted Moss Slimes",
          "กำจัดสไลม์มอสติดมลทินสี่ตัว",
        ),
        objects: [],
      },
      {
        id: "forest-1-samples",
        type: "CollectItem",
        target: "wood",
        count: 3,
        text: words(
          "Recover three living-wood samples",
          "เก็บตัวอย่างไม้มีชีวิตสามชิ้น",
        ),
        objects: [
          {
            id: "forest-1-wood-west",
            target: "wood",
            kind: "item",
            x: 550,
            y: 550,
            radius: 66,
            label: words("Living-wood sample", "ตัวอย่างไม้มีชีวิต"),
          },
          {
            id: "forest-1-wood-south",
            target: "wood",
            kind: "item",
            x: 650,
            y: 670,
            radius: 66,
            label: words("Living-wood sample", "ตัวอย่างไม้มีชีวิต"),
          },
          {
            id: "forest-1-wood-east",
            target: "wood",
            kind: "item",
            x: 760,
            y: 490,
            radius: 66,
            label: words("Living-wood sample", "ตัวอย่างไม้มีชีวิต"),
          },
        ],
      },
    ],
  },
  ...FOREST_MISSIONS,
  ...DESERT_MISSIONS,
  ...FROZEN_MISSIONS,
  ...INFERNAL_MISSIONS,
];
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id);
