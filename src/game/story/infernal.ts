import type { MissionDefinition } from "./types";
import {
  w,
  talk,
  visit,
  eliminate,
  rescue,
  defense,
  puzzle,
  champion,
  collect,
  sabotage,
  escort,
  survive,
} from "./builders";

/** Chapter IV: repair the load-sharing engine; no new sacrifice replaces the old one. */
export const INFERNAL_MISSIONS: MissionDefinition[] = [
  {
    schema: 1,
    id: "infernal-1",
    worldId: "infernal",
    title: w("Ashen Gate", "ประตูเถ้าถ่าน"),
    questTitle: w("A Workshop Still Warm", "โรงงานที่ยังอุ่น"),
    briefing: w(
      "Orin: My apprentice Neri crossed before the gate sealed. Her tools are still warm in my shop. Find her marks below; she always leaves a way back.",
      "โอริน: เนริศิษย์ข้าข้ามไปก่อนประตูผนึก เครื่องมือนางยังอุ่นในร้าน หาตรานางเบื้องล่าง นางทิ้งทางกลับเสมอ",
    ),
    returnDialogue: w(
      "Neri: Master Orin still keeps my bench? Then I had better finish this repair and come home. The engine hasn't stopped asking for help.",
      "เนริ: อาจารย์โอรินยังเก็บโต๊ะข้าหรือ งั้นข้าควรซ่อมให้เสร็จแล้วกลับบ้าน แกนจักรยังไม่หยุดร้องขอความช่วยเหลือ",
    ),
    objectives: [
      talk(
        "infernal-1-neri",
        w("Find Neri's workshop mark", "พบเนริที่ตราโรงงาน"),
        w(
          "Neri: Take the obsidian fittings. They won't melt when we open the pressure gate. And tell Orin I kept his hammer.",
          "เนริ: เก็บข้อต่อออบซิเดียน มันไม่ละลายตอนเปิดประตูแรงดัน แล้วบอกโอรินว่าข้ายังเก็บค้อนเขาไว้",
        ),
      ),
      visit(
        "infernal-1-furnace",
        w("Inspect the unattended gate furnace", "ตรวจเตาประตูที่ไร้คนเฝ้า"),
        590,
        430,
      ),
      collect(
        "infernal-1-fittings",
        "obsidian",
        w("Gather two heatproof gate fittings", "เก็บข้อต่อทนร้อนสองชิ้น"),
        [
          { x: 590, y: 560 },
          { x: 780, y: 450 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-2",
    worldId: "infernal",
    title: w("Obsidian Crossing", "ทางข้ามออบซิเดียน"),
    questTitle: w("The Last Shift", "เวรสุดท้าย"),
    briefing: w(
      "Neri: Furnace keeper Cairn stayed to count the workers out. The crossing sealed before he could follow them. Clear the magma beasts and bring him off shift.",
      "เนริ: แคร์นผู้ดูแลเตาอยู่จนตรวจคนงานออกครบ ทางข้ามผนึกก่อนเขาจะตามไป กำจัดสัตว์แมกมาแล้วพาเขาพ้นเวร",
    ),
    returnDialogue: w(
      "Cairn: Everyone out? You are certain? Good. I have been holding that question longer than I can remember.",
      "แคร์น: ทุกคนออกแล้วหรือ แน่ใจนะ ดีแล้ว ข้าแบกคำถามนี้มานานเกินจำ",
    ),
    objectives: [
      eliminate(
        "infernal-2-beasts",
        "goblin",
        5,
        w(
          "Drive five Magma Beasts from the crossing",
          "ขับไล่สัตว์แมกมาห้าตัวจากทางข้าม",
        ),
      ),
      rescue(
        "infernal-2-cairn",
        w(
          "Release Cairn from the sealed watch post",
          "ช่วยแคร์นจากป้อมยามผนึก",
        ),
        w(
          "Cairn: The first maker is still below. He said the next shift would relieve him. No one came.",
          "แคร์น: ผู้สร้างคนแรกยังอยู่ข้างล่าง เขาบอกว่าเวรถัดไปจะมาแทน แต่ไม่มีใครมา",
        ),
        1180,
        550,
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-3",
    worldId: "infernal",
    title: w("Burning Sanctum", "วิหารลุกไหม้"),
    questTitle: w("Hands Steadier Than Fire", "มือที่นิ่งกว่าไฟ"),
    briefing: w(
      "Neri: The pressure gauge is cracked. I can mend it if you keep the engine's guards busy. The old machine attacks anything it cannot measure.",
      "เนริ: มาตรวัดแรงดันร้าว ข้าซ่อมได้หากเจ้ากันยามแกนจักร เครื่องเก่าโจมตีทุกสิ่งที่มันวัดไม่ได้",
    ),
    returnDialogue: w(
      "Neri: The needle dropped for the first time in years. It isn't asking for more power. It's asking for somewhere to send what it already carries.",
      "เนริ: เข็มลดครั้งแรกในหลายปี มันไม่ได้ขอพลังเพิ่ม มันขอที่ส่งพลังที่แบกอยู่",
    ),
    objectives: [
      defense(
        "infernal-3-neri",
        w(
          "Protect Neri while she repairs the pressure gauge",
          "คุ้มกันเนริระหว่างซ่อมมาตรวัดแรงดัน",
        ),
        24,
      ),
      collect(
        "infernal-3-gauge",
        "infernal-core",
        w("Recover the stable pressure core", "เก็บแกนแรงดันที่เสถียร"),
        [{ x: 1130, y: 510 }],
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-4",
    worldId: "infernal",
    title: w("Ember Crucible", "เบ้าหลอมถ่านเพลิง"),
    questTitle: w("Teach the Furnace to Breathe", "สอนเตาให้หายใจ"),
    briefing: w(
      "Neri: Intake, chamber, exhaust. That is the order the furnace forgot. Reset the vents, then break the clamps that hold them shut.",
      "เนริ: ช่องรับ ห้องเผา ช่องระบาย นี่คือลำดับที่เตาลืมไป ตั้งช่องลมใหม่แล้วทำลายแคลมป์ที่ล็อกมัน",
    ),
    returnDialogue: w(
      "Orin: That sound through the gate? A forge cooling properly. Neri always did hear what a machine needed before I did.",
      "โอริน: เสียงผ่านประตูนั้นหรือ คือเตาที่เย็นลงอย่างถูกต้อง เนริได้ยินสิ่งที่เครื่องต้องการก่อนข้าเสมอ",
    ),
    objectives: [
      puzzle(
        "infernal-4-vents",
        w(
          "Open intake I, chamber II, then exhaust III",
          "เปิดช่องรับ I ห้องเผา II แล้วระบาย III",
        ),
      ),
      sabotage(
        "infernal-4-clamp",
        w("Break the two fused vent clamps", "ทำลายแคลมป์ช่องลมหลอมติดสองตัว"),
        [
          { x: 650, y: 470 },
          { x: 1150, y: 530 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-5",
    worldId: "infernal",
    title: w("Sovereign’s Fall", "การล่มสลายของราชัน"),
    questTitle: w("The Crown Above the Engine", "มงกุฎเหนือแกนจักร"),
    briefing: w(
      "Cairn: The Infernal Sovereign made a throne of the control room. It feeds the machine commands, never answers. Break its rule so we can reach the maker below.",
      "แคร์น: ราชันเพลิงทำห้องควบคุมเป็นบัลลังก์ ป้อนแต่คำสั่ง ไม่เคยตอบแกนจักร ทำลายอำนาจมันเพื่อถึงผู้สร้างข้างล่าง",
    ),
    returnDialogue: w(
      "Neri: No crown can mend this. Under the throne is a workbench and a name: Aven. The first maker was a person, just like us.",
      "เนริ: มงกุฎซ่อมสิ่งนี้ไม่ได้ ใต้บัลลังก์คือโต๊ะช่างกับชื่ออาเวน ผู้สร้างคนแรกเป็นคนเช่นเรา",
    ),
    objectives: [
      visit(
        "infernal-5-room",
        w("Enter the seized control room", "เข้าสู่ห้องควบคุมที่ถูกยึด"),
        1060,
        450,
      ),
      champion(
        "infernal-5-sovereign",
        w("Defeat the Infernal Sovereign", "โค่นราชันเพลิง"),
        true,
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-6",
    worldId: "infernal",
    title: w("The First Workshop", "โรงงานแรกเริ่ม"),
    questTitle: w("The Name Under the Crown", "นามใต้มงกุฎ"),
    briefing: w(
      "Mara: Aven taught the first Rift keepers to share the engine's burden. His notes may still show us how. Listen to his workshop echo before touching the controls.",
      "มารา: อาเวนสอนผู้ดูแลรอยแยกรุ่นแรกให้แบ่งภาระแกนจักร บันทึกอาจยังบอกวิธี ฟังเสียงสะท้อนในโรงงานก่อนแตะตัวควบคุม",
    ),
    returnDialogue: w(
      "Mara: He stayed because someone had to hold the pressure. We made a legend of his sacrifice and forgot to send help. That ends with us.",
      "มารา: เขาอยู่เพราะต้องมีคนพยุงแรงดัน เราทำการเสียสละให้เป็นตำนานแล้วลืมส่งคนช่วย เรื่องนั้นจบที่เรา",
    ),
    objectives: [
      talk(
        "infernal-6-aven",
        w("Hear Aven's workshop echo", "ฟังเสียงสะท้อนอาเวนในโรงงาน"),
        w(
          "Aven: If this reaches you, do not replace me. Open the four returns together. Build a world that doesn't need someone trapped here.",
          "อาเวน: หากเจ้าได้ยิน อย่ามาแทนข้า เปิดทางกลับทั้งสี่พร้อมกัน สร้างโลกที่ไม่ต้องขังใครไว้ที่นี่",
        ),
      ),
      visit(
        "infernal-6-bench",
        w("Find the original load-sharing diagram", "ค้นหาแผนผังแบ่งภาระเดิม"),
        600,
        420,
      ),
      collect(
        "infernal-6-diagram",
        "epic-gear-materials",
        w(
          "Recover two surviving diagram plates",
          "เก็บแผ่นแผนผังที่เหลือสองชิ้น",
        ),
        [
          { x: 620, y: 550 },
          { x: 800, y: 440 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-7",
    worldId: "infernal",
    title: w("Chains of the Engine", "โซ่แกนจักร"),
    questTitle: w("No More Single Shoulders", "ไม่แบกเพียงบ่าเดียว"),
    briefing: w(
      "Neri: These chains force every return line back into one heart. Cut all three, then weather the pressure release. The four realms are ready to take their share.",
      "เนริ: โซ่เหล่านี้บังคับทางกลับทุกสายสู่หัวใจเดียว ตัดทั้งสามแล้วฝ่าการระบายแรงดัน สี่ดินแดนพร้อมรับส่วนของตน",
    ),
    returnDialogue: w(
      "Yara: The desert gauges rose as the forest's fell. Edda's relay answered. For the first time, the numbers tell a shared story.",
      "ยารา: มาตรวัดทะเลทรายสูงขึ้นขณะของป่าลดลง หอส่งเอ็ดดาขานตอบ ครั้งแรกที่ตัวเลขเล่าเรื่องร่วมกัน",
    ),
    objectives: [
      sabotage(
        "infernal-7-chain",
        w(
          "Break three forced-return anchors",
          "ทำลายสมอยึดทางกลับบังคับสามตัว",
        ),
        [
          { x: 590, y: 470 },
          { x: 900, y: 410 },
          { x: 1180, y: 540 },
        ],
      ),
      survive(
        "infernal-7-release",
        w(
          "Survive the eighteen-second pressure release",
          "รอดจากการระบายแรงดันสิบแปดวินาที",
        ),
        18,
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-8",
    worldId: "infernal",
    title: w("The Way Back", "หนทางกลับ"),
    questTitle: w("Leave a Door Open", "เปิดประตูรอไว้"),
    briefing: w(
      "Neri: The workers' route is clear, but the engine still sends guards after us. Walk me to the return relay and hold it long enough for everyone to cross.",
      "เนริ: ทางคนงานเปิดแล้ว แต่แกนจักรยังส่งยามตาม คุ้มกันข้าไปหอส่งกลับ แล้วยื้อให้ทุกคนข้ามได้",
    ),
    returnDialogue: w(
      "Orin: Neri's hammer is back on the bench. She says she'll explain the scorch marks after you return. Come home so I can hear the whole argument.",
      "โอริน: ค้อนเนริกลับมาอยู่บนโต๊ะ นางบอกจะอธิบายรอยไหม้หลังเจ้ากลับ จงกลับมาให้ข้าได้ฟังทั้งเรื่อง",
    ),
    objectives: [
      escort(
        "infernal-8-neri",
        w(
          "Escort Neri to the workers' return relay",
          "คุ้มกันเนริไปหอส่งกลับคนงาน",
        ),
        { x: 620, y: 500 },
        [
          { x: 900, y: 700 },
          { x: 1160, y: 850 },
        ],
      ),
      defense(
        "infernal-8-cairn",
        w(
          "Protect Cairn while the last workers cross",
          "คุ้มกันแคร์นขณะคนงานชุดสุดท้ายข้าม",
        ),
        18,
        1140,
        830,
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-9",
    worldId: "infernal",
    title: w("The Ashbound Architect", "สถาปนิกพันธนาการเถ้า"),
    questTitle: w("The Last Wrong Answer", "คำตอบผิดครั้งสุดท้าย"),
    briefing: w(
      "Aven's echo: My safety construct learned one answer: close every door. It is standing between you and the heart. Show it a safer answer can still be an open one.",
      "เสียงอาเวน: กลไกความปลอดภัยข้าเรียนรู้คำตอบเดียว ปิดทุกประตู มันขวางเจ้ากับหัวใจ จงแสดงว่าคำตอบปลอดภัยอาจเป็นการเปิดได้",
    ),
    returnDialogue: w(
      "Mara: The architect has fallen quiet. Aven is still there, beneath the fractured core. No more guards stand between us and an honest repair.",
      "มารา: สถาปนิกเงียบแล้ว อาเวนยังอยู่ใต้แกนแตกร้าว ไม่มียามขวางระหว่างเรากับการซ่อมที่แท้จริงอีก",
    ),
    objectives: [
      champion(
        "infernal-9-architect",
        w("Defeat the Ashbound Architect", "โค่นสถาปนิกพันธนาการเถ้า"),
      ),
      talk(
        "infernal-9-aven",
        w("Answer Aven at the heart's threshold", "ตอบอาเวนที่ธรณีหัวใจ"),
        w(
          "Aven: I thought you came to take my place. Thank you for coming to bring me home instead.",
          "อาเวน: ข้านึกว่าเจ้ามาแทนที่ข้า ขอบใจที่มาเพื่อพาข้ากลับบ้าน",
        ),
        1170,
        500,
      ),
    ],
  },
  {
    schema: 1,
    id: "infernal-10",
    worldId: "infernal",
    title: w("The First Fracture", "รอยร้าวแรกเริ่ม"),
    questTitle: w("A Rift Held by Everyone", "รอยแยกที่ทุกคนพยุง"),
    briefing: w(
      "Mara: The four return lines are ready. Open them in order, face the Fractured Heart, then meet Aven at the gate. We finish this together.",
      "มารา: ทางกลับทั้งสี่พร้อมแล้ว เปิดตามลำดับ เผชิญหัวใจแตกร้าว แล้วพบอาเวนที่ประตู เราจะจบเรื่องนี้ด้วยกัน",
    ),
    returnDialogue: w(
      "Mara: Four realms, one shared horizon. Aven is resting by the sanctuary fire. The Rift is no longer held shut by one tired pair of hands. Wanderer, welcome home.",
      "มารา: สี่ดินแดน ขอบฟ้าร่วมกัน อาเวนพักข้างไฟในที่พักพิง รอยแยกไม่ต้องถูกพยุงด้วยสองมืออ่อนล้าคู่เดียวอีก ผู้พเนจร ยินดีต้อนรับกลับบ้าน",
    ),
    finale: { name: w("The Fractured Heart", "หัวใจแตกร้าว"), phases: 3 },
    objectives: [
      puzzle(
        "infernal-10-returns",
        w(
          "Open the shared return valves I → II → III",
          "เปิดวาล์วทางกลับร่วม I → II → III",
        ),
      ),
      champion(
        "infernal-10-heart",
        w(
          "Stabilize all three phases of the Fractured Heart",
          "ทำให้หัวใจแตกร้าวเสถียรครบสามช่วง",
        ),
        true,
      ),
      visit(
        "infernal-10-home",
        w("Meet Aven at the open gate", "พบอาเวนที่ประตูเปิด"),
        1180,
        390,
      ),
    ],
  },
];
