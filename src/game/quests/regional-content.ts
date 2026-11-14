import { authored, deliver, task, visit, w } from "./authoring";

const investigations = [
  {
    world: "frozen",
    giver: "north-guild",
    site: "north-lore-grove",
    material: "frost-crystal",
    flag: "regional-north:watch-lit",
    title: w("A Warm Bell in the Frost", "เสียงกระดิ่งอุ่นท่ามกลางน้ำแข็ง"),
    description: w(
      "The lodge has stopped receiving news from the high shrine. Read its lantern record, deliver three frost crystals for the watch lamps, then confront the Frost Warden in Story Mode. We need a road home, not another conquest.",
      "เรือนกิลด์ไม่ได้ข่าวจากวิหารสูงแล้ว อ่านบันทึกโคม ส่งผลึกน้ำแข็งสามชิ้นเพื่อซ่อมไฟยาม แล้วเผชิญผู้คุมเหมันต์ในโหมดเนื้อเรื่อง เราต้องการทางกลับบ้าน ไม่ใช่การยึดครอง",
    ),
    reply: w(
      "The bell rang before the cold broke. Every family heard it. The watch will keep the road lit.",
      "กระดิ่งดังขึ้นก่อนความหนาวคลาย ทุกครอบครัวได้ยิน หน่วยยามจะรักษาแสงไฟตามทาง",
    ),
  },
  {
    world: "desert",
    giver: "northeast-guild",
    site: "northeast-lore-guild",
    material: "ancient-shard",
    flag: "regional-northeast:covenant-read",
    title: w("The Line Beneath the Sand", "บรรทัดใต้ผืนทราย"),
    description: w(
      "The research camp found a missing line in the old water covenant. Read the copy, deliver three ancient shards to brace the archive, then return to the Sand Colossus's sanctuary in Story Mode. The record must belong to everyone.",
      "ค่ายสำรวจพบข้อความที่หายไปจากข้อตกลงแบ่งน้ำ อ่านสำเนา ส่งเศษโบราณสามชิ้นเพื่อค้ำหอจดหมายเหตุ แล้วกลับสู่วิหารยักษ์ทรายในโหมดเนื้อเรื่อง บันทึกต้องเป็นของทุกคน",
    ),
    reply: w(
      "We carved the missing line where every visitor can read it. A kingdom is more than the names on its gates.",
      "เราแกะบรรทัดที่หายไว้ให้ผู้มาเยือนทุกคนอ่าน อาณาจักรมีค่ามากกว่าชื่อบนประตู",
    ),
  },
  {
    world: "infernal",
    giver: "guild",
    site: "lore-gate",
    material: "obsidian",
    flag: "regional-central:canals-steady",
    title: w("A Capital Built on Promises", "เมืองหลวงบนคำสัญญา"),
    description: w(
      "The guild traced the capital's tremors to the deep Rift. Read the gate wardens' account, deliver three obsidian braces, then face the Infernal Sovereign in Story Mode. The canals above still carry ordinary lives.",
      "กิลด์ตามรอยแรงสั่นของเมืองหลวงไปถึงริฟต์ลึก อ่านคำบอกเล่าผู้เฝ้าประตู ส่งออบซิเดียนสามชิ้นทำคานค้ำ แล้วเผชิญราชันเพลิงนรกในโหมดเนื้อเรื่อง เหนือขึ้นมาคลองยังหล่อเลี้ยงชีวิตผู้คน",
    ),
    reply: w(
      "The water jars stopped trembling this morning. We will remember who kept the city standing, and why it was worth saving.",
      "เช้านี้โอ่งน้ำหยุดสั่นแล้ว เราจะจดจำผู้รักษาเมืองไว้ และเหตุผลที่เมืองนี้ควรได้รับการปกป้อง",
    ),
  },
  {
    world: "forest",
    giver: "south-guild",
    site: "south-lore-gate",
    material: "wood",
    flag: "regional-south:nursery-mended",
    title: w("The Seed We Bring Home", "เมล็ดที่เราพากลับบ้าน"),
    description: w(
      "The mangrove watch needs more than a warning. Read the living gate's message, deliver three timber pieces for the damaged nursery, then face the Forest Guardian in Story Mode. Bring the coast a chance to grow again.",
      "ยามป่าชายเลนต้องการมากกว่าคำเตือน อ่านข้อความประตูรากไม้ ส่งไม้สามชิ้นซ่อมเรือนเพาะชำ แล้วเผชิญผู้พิทักษ์พงไพรในโหมดเนื้อเรื่อง นำโอกาสให้ชายฝั่งเติบโตอีกครั้ง",
    ),
    reply: w(
      "The nursery has new shoots. The fishers have started calling them by their children's names. That is the future we hoped for.",
      "เรือนเพาะชำมียอดใหม่แล้ว ชาวประมงเริ่มเรียกต้นอ่อนตามชื่อลูกของตน อนาคตเช่นนี้เองที่เราหวังไว้",
    ),
  },
] as const;
/** Optional investigations consume real materials and finish only after a verified Story guardian clear. */
export const REGIONAL_QUESTS = investigations.map((s) =>
  authored(
    s.world,
    21,
    s.giver,
    s.title,
    s.description,
    s.reply,
    [
      visit(
        s.site,
        w("Read the regional wardens' record", "อ่านบันทึกของผู้ดูแลภูมิภาค"),
      ),
      deliver(
        s.material,
        3,
        w(
          "Deliver three repair materials to the guild",
          "ส่งวัสดุซ่อมแซมสามชิ้นให้กิลด์",
        ),
      ),
      task(
        "CompleteStage",
        s.world + "-5",
        1,
        w(
          "Complete this region's guardian mission in Story Mode",
          "ผ่านภารกิจผู้พิทักษ์ภูมิภาคนี้ในโหมดเนื้อเรื่อง",
        ),
        { worldId: s.world, stageId: s.world + "-5" },
      ),
    ],
    {
      category: "npc",
      reward: {
        gold: 140,
        xp: 110,
        materials: { [s.material]: 1 },
        flags: [s.flag],
      },
    },
  ),
);
