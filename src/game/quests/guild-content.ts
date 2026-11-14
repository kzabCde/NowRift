import { authored, w, kill } from "./authoring";
import { worldById, type WorldId } from "../campaign/content";
import type { LocalizedText } from "./types";

type Contract = [
  title: LocalizedText,
  briefing: LocalizedText,
  kind: string,
  count: number,
];
const enemyThai: Record<WorldId, string[]> = {
  forest: [
    "สไลม์มอส",
    "กอบลินหนาม",
    "หมาป่าป่า",
    "นักเวทหนาม",
    "ผู้พิทักษ์เกราะ",
  ],
  desert: ["ตัวคลานทราย", "โจรทะเลทราย", "แมงป่อง", "พลธนูโบราณ", "โกเลมทราย"],
  frozen: [
    "สไลม์น้ำแข็ง",
    "หมาป่าน้ำแข็ง",
    "อัศวินเยือกแข็ง",
    "จอมเวทน้ำแข็ง",
    "วิญญาณผลึก",
  ],
  infernal: ["อิมป์ไฟ", "สัตว์แมกมา", "อัศวินเพลิง", "พลธนูเพลิง", "โกเลมลาวา"],
};
const contracts: Record<WorldId, Contract[]> = {
  forest: [
    [
      w("Bounty · Moss at the Milestones", "ค่าหัว · มอสที่หลักทาง"),
      w(
        "Moss Slimes are hiding the old route markers. Clear twelve so the next caravan can find its way.",
        "สไลม์มอสปิดหลักทางเก่า กำจัดสิบสองตัวให้คาราวานหาทางได้",
      ),
      "slime",
      12,
    ],
    [
      w("Bounty · The Stolen Rations", "ค่าหัว · เสบียงถูกขโมย"),
      w(
        "Ten Briar Goblins have been raiding the shelter's carriers. End the raids before the next supply day.",
        "กอบลินหนามสิบตัวปล้นคนขนเสบียงที่พัก หยุดก่อนวันส่งของถัดไป",
      ),
      "goblin",
      10,
    ],
    [
      w("Bounty · Howls at the Crossing", "ค่าหัว · เสียงหอนที่ทางข้าม"),
      w(
        "Eight Forest Wolves have made the crossing their hunting ground. Give travelers a safer road.",
        "หมาป่าแปดตัวใช้ทางข้ามเป็นที่ล่า เปิดทางปลอดภัยให้นักเดินทาง",
      ),
      "wolf",
      8,
    ],
    [
      w("Bounty · Thorns in the Canopy", "ค่าหัว · หนามบนเรือนยอด"),
      w(
        "Six Thorn Casters are feeding the briars. Break their hold before the paths close again.",
        "นักเวทหนามหกตัวเลี้ยงพงหนาม ทำลายอำนาจก่อนเส้นทางปิดอีก",
      ),
      "caster",
      6,
    ],
    [
      w("Bounty · Armor Among Roots", "ค่าหัว · เกราะกลางรากไม้"),
      w(
        "Three Armored Guardians block the ranger patrols. The guild needs a route its apprentices can walk.",
        "ผู้พิทักษ์เกราะสามตัวขวางพราน กิลด์ต้องมีทางที่ศิษย์เดินได้",
      ),
      "elite",
      3,
    ],
    [
      w("Contract · Keep the Grove Free", "สัญญา · รักษาอิสระพงไพร"),
      w(
        "Overcome two Story guardian encounters in the forest. Return with proof that the corruption cannot close the road again.",
        "ผ่านผู้พิทักษ์เนื้อเรื่องในป่าสองครั้ง กลับมายืนยันว่ามลทินปิดถนนไม่ได้อีก",
      ),
      "boss",
      2,
    ],
  ],
  desert: [
    [
      w("Bounty · Crawlers at the Well", "ค่าหัว · ตัวคลานที่บ่อ"),
      w(
        "Twelve Sand Crawlers infest the well approach. Clear them before the diggers lower their water jars.",
        "ตัวคลานทรายสิบสองตัวอยู่ทางเข้าบ่อ กำจัดก่อนคนขุดหย่อนเหยือกน้ำ",
      ),
      "slime",
      12,
    ],
    [
      w("Bounty · The Water Toll", "ค่าหัว · ค่าผ่านทางน้ำ"),
      w(
        "Ten Desert Bandits charge a toll on a road no king owns. End their claim.",
        "โจรทะเลทรายสิบตัวเก็บค่าผ่านทางที่ไม่มีกษัตริย์เป็นเจ้าของ ยุติการอ้างสิทธิ์",
      ),
      "goblin",
      10,
    ],
    [
      w("Bounty · Scorpions in the Shade", "ค่าหัว · แมงป่องในร่ม"),
      w(
        "Eight Scorpions have claimed the caravan shelters. Make the shade safe to rest in.",
        "แมงป่องแปดตัวยึดที่พักคาราวาน ทำให้ร่มเงาพักได้ปลอดภัย",
      ),
      "wolf",
      8,
    ],
    [
      w("Bounty · Arrows After Sunset", "ค่าหัว · ธนูหลังตะวันตก"),
      w(
        "Six Ancient Archers still fire on travelers after dusk. Silence the old watch.",
        "พลธนูโบราณหกตัวยิงนักเดินทางยามพลบ หยุดเวรยามเก่า",
      ),
      "caster",
      6,
    ],
    [
      w("Bounty · Golems on the Causeway", "ค่าหัว · โกเล็มบนทางเดิน"),
      w(
        "Three Sand Golems block the repaired causeway. Remove them before another wagon is lost.",
        "โกเล็มทรายสามตัวขวางทางซ่อมใหม่ กำจัดก่อนเสียรถอีกคัน",
      ),
      "elite",
      3,
    ],
    [
      w("Contract · An Open Meridian", "สัญญา · เมอริเดียนเปิด"),
      w(
        "Overcome two desert Story guardian encounters. The public water road must remain open.",
        "ผ่านผู้พิทักษ์เนื้อเรื่องทะเลทรายสองครั้ง ถนนน้ำสาธารณะต้องเปิดอยู่",
      ),
      "boss",
      2,
    ],
  ],
  frozen: [
    [
      w("Bounty · Frost at the Door", "ค่าหัว · น้ำแข็งที่ประตู"),
      w(
        "Twelve Frost Slimes haunt the witness shelters. Clear the doorways for the waking.",
        "สไลม์น้ำแข็งสิบสองตัวหลอนที่พักพยาน เปิดประตูให้ผู้ตื่น",
      ),
      "slime",
      12,
    ],
    [
      w("Bounty · Footsteps Not Our Own", "ค่าหัว · รอยเท้าที่ไม่ใช่เรา"),
      w(
        "Ten Ice Wolves are following the returning pilgrims. Break the pursuit.",
        "หมาป่าน้ำแข็งสิบตัวตามผู้แสวงที่กลับมา หยุดการไล่ล่า",
      ),
      "goblin",
      10,
    ],
    [
      w("Bounty · Hunters Beyond the Lamps", "ค่าหัว · นักล่าเลยโคมไฟ"),
      w(
        "Eight Frozen Knights wait beyond Edda's lamps. Keep the stragglers safe.",
        "อัศวินเยือกแข็งแปดตัวรอเลยโคมเอ็ดดา ปกป้องคนรั้งท้าย",
      ),
      "wolf",
      8,
    ],
    [
      w("Bounty · The False Blizzard", "ค่าหัว · พายุหิมะลวง"),
      w(
        "Six Frost Mages keep the evacuation road frozen. Give the thaw room to work.",
        "จอมเวทน้ำแข็งหกตัวแช่ทางอพยพ เปิดที่ให้การละลายทำงาน",
      ),
      "caster",
      6,
    ],
    [
      w("Bounty · Armor That Will Not Wake", "ค่าหัว · เกราะที่ไม่ยอมตื่น"),
      w(
        "Three Crystal Elementals ignore the witnesses' release orders. The living must be allowed to pass.",
        "วิญญาณผลึกสามตัวไม่ฟังคำปลดพยาน ผู้มีชีวิตต้องผ่านได้",
      ),
      "elite",
      3,
    ],
    [
      w("Contract · A Watch Fulfilled", "สัญญา · เวรยามสำเร็จ"),
      w(
        "Overcome two northern Story guardian encounters. Make certain the witnesses can choose the road home.",
        "ผ่านผู้พิทักษ์เนื้อเรื่องเหนือสองครั้ง ให้พยานเลือกทางกลับได้",
      ),
      "boss",
      2,
    ],
  ],
  infernal: [
    [
      w("Bounty · Imps in the Intake", "ค่าหัว · อิมป์ในช่องรับ"),
      w(
        "Twelve Fire Imps clog the cooling intake. Clear it before Neri starts another repair.",
        "อิมป์ไฟสิบสองตัวอุดช่องระบาย กำจัดก่อนเนริซ่อมครั้งใหม่",
      ),
      "slime",
      12,
    ],
    [
      w("Bounty · Beasts on the Night Shift", "ค่าหัว · สัตว์ร้ายเวรดึก"),
      w(
        "Ten Magma Beasts stalk the workers' route. Nobody should need an armed escort to end a shift.",
        "สัตว์แมกมาสิบตัวดักทางคนงาน ไม่มีใครควรต้องมียามเพื่อเลิกเวร",
      ),
      "goblin",
      10,
    ],
    [
      w("Bounty · Knights Without a Crown", "ค่าหัว · อัศวินไร้มงกุฎ"),
      w(
        "Eight Flame Knights defend an empty throne. Open the control-room approach.",
        "อัศวินเพลิงแปดตัวเฝ้าบัลลังก์ว่าง เปิดทางห้องควบคุม",
      ),
      "wolf",
      8,
    ],
    [
      w("Bounty · Arrows Across the Furnace", "ค่าหัว · ธนูข้ามเตาหลอม"),
      w(
        "Six Infernal Archers pin down the repair crews. Give the engineers a clear line.",
        "พลธนูเพลิงหกตัวตรึงทีมซ่อม เปิดแนวให้วิศวกร",
      ),
      "caster",
      6,
    ],
    [
      w("Bounty · The Engine's Fists", "ค่าหัว · หมัดแกนจักร"),
      w(
        "Three Lava Golems still treat every repair as sabotage. Stop their patrols.",
        "โกเลมลาวาสามตัวมองการซ่อมเป็นทำลาย หยุดการลาดตระเวน",
      ),
      "elite",
      3,
    ],
    [
      w("Contract · No One Holds Alone", "สัญญา · ไม่มีใครพยุงลำพัง"),
      w(
        "Overcome two infernal Story guardian encounters. Keep the shared return lines free for everyone.",
        "ผ่านผู้พิทักษ์เนื้อเรื่องเพลิงสองครั้ง รักษาทางกลับร่วมให้ทุกคน",
      ),
      "boss",
      2,
    ],
  ],
};
export const GUILD_QUESTS = Object.entries(contracts).flatMap(([world, rows]) =>
  rows.map(([title, briefing, kind, count], i) =>
    authored(
      world as WorldId,
      i + 1,
      "guild",
      title,
      briefing,
      w(
        "Guild registrar: The route is safer. Your payment is recorded, and so are the people your work protected.",
        "นายทะเบียนกิลด์: เส้นทางปลอดภัยขึ้น ลงค่าจ้างไว้แล้ว รวมถึงผู้คนที่งานเจ้าปกป้อง",
      ),
      [
        kill(
          world as WorldId,
          kind,
          count,
          w(
            `Defeat ${count} × ${kind === "boss" ? "Story guardian" : worldById(world as WorldId).enemies.find((e) => e.kind === kind)!.name} · ${worldById(world as WorldId).name}`,
            `กำจัด${kind === "boss" ? "ผู้พิทักษ์เนื้อเรื่อง" : enemyThai[world as WorldId][i]} ${count} ตัวใน${{ forest: "ป่า", desert: "ทะเลทราย", frozen: "แดนน้ำแข็ง", infernal: "แดนเพลิง" }[world]}`,
          ),
        ),
      ],
      {
        category: "guild",
        allowedModes: kind === "boss" ? ["story"] : ["story", "free"],
        reward: {
          gold: 160 + i * 40,
          xp: 130 + i * 30,
          materials: { "enhancement-stone": i === 5 ? 2 : 1 },
          flags: [`guild:${world}:${kind}`],
        },
      },
    ),
  ),
);
