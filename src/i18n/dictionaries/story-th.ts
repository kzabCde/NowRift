import { QUEST_CATALOG } from "../../game/quests/catalog";
import { CHAPTERS, MISSIONS } from "../../game/story/content";

const entries: [string, string][] = [];
function collect(value: unknown) {
  if (!value || typeof value !== "object") return;
  const v = value as Record<string, unknown>;
  if (typeof v.en === "string" && typeof v.th === "string") {
    entries.push([v.en, v.th]);
    return;
  }
  Object.values(v).forEach(collect);
}
collect(CHAPTERS);
collect(MISSIONS);
collect(QUEST_CATALOG);
export const storyStageTh = Object.fromEntries(
  MISSIONS.map((m) => [m.title.en, m.title.th]),
);
export const storyTh: Record<string, string> = {
  ...Object.fromEntries(entries),
  "THE SHATTERED RIFT": "รอยแยกอันแตกสลาย",
  "NPC chain": "ชุดภารกิจตัวละคร",
  "Story + Free Mode": "เนื้อเรื่องและโหมดอิสระ",
  "Story Mode objectives": "เป้าหมายโหมดเนื้อเรื่อง",
  "Haven activities": "กิจกรรมในเฮเวน",
  "Unlock requirement": "เงื่อนไขปลดล็อก",
  "Complete Story stage": "สำเร็จด่านเนื้อเรื่อง",
  "Complete the previous chapter": "สำเร็จบทก่อนหน้า",
  "Quest Journal": "บันทึกภารกิจ",
  "Quest categories": "หมวดภารกิจ",
  "Main Story": "เนื้อเรื่องหลัก",
  "Side Quests": "ภารกิจเสริม",
  "Guild Contracts": "สัญญากิลด์",
  Completed: "สำเร็จแล้ว",
  Available: "พร้อมรับ",
  Locked: "ยังไม่ปลดล็อก",
  Active: "กำลังทำ",
  Failed: "ล้มเหลว",
  "Reward ready": "รางวัลพร้อมรับ",
  "Stop tracking": "หยุดติดตาม",
  "Track quest": "ติดตามภารกิจ",
  "Deliver items": "ส่งมอบสิ่งของ",
  "Quest giver": "ผู้มอบภารกิจ",
  "Visit the quest giver to accept, deliver or claim rewards.":
    "ไปพบผู้มอบภารกิจเพื่อรับงาน ส่งของ หรือรับรางวัล",
  "Story missions advance the campaign. Free expeditions only advance contracts that allow Free Mode.":
    "ภารกิจเนื้อเรื่องพาเรื่องราวเดินหน้า การสำรวจอิสระเพิ่มความคืบหน้าเฉพาะสัญญาที่อนุญาตโหมดอิสระ",
  "No quests in this category yet.": "ยังไม่มีภารกิจในหมวดนี้",
  "Requests & stories": "คำขอและเรื่องเล่า",
  "Return to the quest giver": "กลับไปหาผู้มอบภารกิจ",
  "Return to Rift Haven": "กลับสู่ริฟต์เฮเวน",
  "Supply route · Mara's first request": "เส้นทางเสบียง · คำขอแรกของมารา",
  "Close journal": "ปิดบันทึก",
  "New stage unlocked": "ปลดล็อกด่านใหม่",
  "Game mode": "โหมดเกม",
  "Story Mode": "โหมดเนื้อเรื่อง",
  "Free Mode · Supply Expeditions": "โหมดอิสระ · การสำรวจหาเสบียง",
  "Story mission": "ภารกิจเนื้อเรื่อง",
  "Three-phase chapter finale": "ฉากจบบทสามช่วง",
  "Choose an accessible area to gather supplies and extract. Story progression is not changed.":
    "เลือกพื้นที่ที่เข้าถึงได้เพื่อเก็บเสบียงแล้วถอนตัว ความคืบหน้าเนื้อเรื่องไม่เปลี่ยน",
  "FRACTURE · PHASE III": "รอยร้าว · ช่วงที่ III",
  "Return to this quest giver in Rift Haven.":
    "กลับไปหาผู้มอบภารกิจนี้ในริฟต์เฮเวน",
  "Move closer to the quest giver.": "เข้าใกล้ผู้มอบภารกิจมากกว่านี้",
  "This delivery objective is not active.": "เป้าหมายส่งมอบนี้ยังไม่เริ่ม",
  "Complete every quest objective before claiming.":
    "ทำเป้าหมายภารกิจให้ครบก่อนรับรางวัล",
  "This quest is not available.": "ภารกิจนี้ยังไม่พร้อมรับ",
  "Quest journal is damaged or incompatible.":
    "บันทึกภารกิจเสียหายหรือไม่เข้ากัน",
  "Invalid enemy evidence.": "หลักฐานศัตรูไม่ถูกต้อง",
  "Complete the Story mission objectives first.":
    "ทำเป้าหมายภารกิจเนื้อเรื่องให้ครบก่อน",
  "Quest evidence moved behind the saved checkpoint.":
    "หลักฐานภารกิจเก่ากว่าจุดบันทึก",
  "Quest kill evidence moved behind the saved checkpoint.":
    "หลักฐานกำจัดศัตรูเก่ากว่าจุดบันทึก",
  "Quest accepted": "รับภารกิจแล้ว",
  "QUEST UPDATED": "อัปเดตภารกิจ",
  "OBJECTIVE COMPLETED": "เป้าหมายสำเร็จ",
  "MISSION COMPLETE": "ภารกิจสำเร็จ",
  "NEW STAGE UNLOCKED": "ปลดล็อกด่านใหม่",

  "Mission landmark": "จุดหมายภารกิจ",
  tiles: "ช่อง",
  "The Shattered Rift": "รอยแยกอันแตกสลาย",
  "Mission briefing": "คำชี้แจงภารกิจ",
  "Begin mission": "เริ่มภารกิจ",
  "Mission objectives": "เป้าหมายภารกิจ",
  "Objective completed": "เป้าหมายสำเร็จ",
  "Mission complete": "ภารกิจสำเร็จ",
  "Quest updated": "อัปเดตภารกิจ",
  "Follow the highlighted mission landmark.":
    "ไปยังจุดหมายภารกิจที่มีเครื่องหมาย",
  Continue: "ดำเนินต่อ",
  Speak: "สนทนา",
  Collect: "เก็บรวบรวม",
  Activate: "เปิดใช้งาน",
  Rescue: "ช่วยเหลือ",
  "Protect your companion": "ปกป้องผู้ร่วมทาง",
  "Follow the rune sequence.": "เปิดอักขระตามลำดับ",
  "Story objectives replace the survival timer in this mission.":
    "ภารกิจนี้ใช้เป้าหมายเนื้อเรื่องแทนเวลาการเอาชีวิตรอด",
  "Invalid Story mission completion.":
    "ข้อมูลการสำเร็จภารกิจเนื้อเรื่องไม่ถูกต้อง",
  "The result does not match this run's activity and objectives.":
    "ผลลัพธ์ไม่ตรงกับกิจกรรมและเป้าหมายของการเดินทางครั้งนี้",
  "The checkpoint belongs to a different activity or mission.":
    "จุดบันทึกนี้เป็นของกิจกรรมหรือภารกิจอื่น",
};
