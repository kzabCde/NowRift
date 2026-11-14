import {
  authored as q,
  w,
  task,
  deliver,
  collect,
  visit,
  speak,
  kill,
} from "./authoring";
import type { QuestDefinition } from "./types";

/** Forty small, authored stories. Resource requests consume actual inventory at the giver. */
export const SIDE_QUESTS: QuestDefinition[] = [
  q(
    "forest",
    1,
    "workshop",
    w("A Pot That Holds Spring", "กระถางที่เก็บฤดูใบไม้ผลิ"),
    w(
      "Alchemist Luma: The shelter seedlings need living-wood pots. Gather fresh wood, then bring four pieces here. I won't uproot another tree for them.",
      "ลูมานักปรุงยา: ต้นอ่อนที่พักต้องใช้กระถางไม้มีชีวิต เก็บไม้ใหม่แล้วนำมาสี่ชิ้น ข้าจะไม่ถอนต้นไม้อีกเพื่อมัน",
    ),
    w(
      "Luma: Four pots, four chances to grow. Thank you for bringing the forest home gently.",
      "ลูมา: สี่กระถาง สี่โอกาสเติบโต ขอบใจที่พาป่ากลับบ้านอย่างอ่อนโยน",
    ),
    [
      collect(
        "wood",
        4,
        w("Gather four fresh wood pieces", "เก็บไม้ใหม่สี่ชิ้น"),
      ),
      deliver("wood", 4, w("Deliver the wood to Luma", "ส่งไม้ให้ลูมา")),
    ],
  ),
  q(
    "forest",
    2,
    "board",
    w("The Ninefold Promise", "คำมั่นเก้าส่วน"),
    w(
      "A guild note asks new Wanderers to read the accord in the plaza, the market promise and the shelter tree's story. Know the city you return to.",
      "บันทึกกิลด์ขอให้ผู้พเนจรอ่านข้อตกลงลานเมือง คำมั่นตลาด และเรื่องต้นไม้พักพิง จงรู้จักเมืองที่เจ้ากลับมา",
    ),
    w(
      "The registrar adds your name beneath the accord. A home is also a promise to one another.",
      "นายทะเบียนเพิ่มชื่อเจ้าใต้ข้อตกลง บ้านคือคำมั่นที่มีต่อกันเช่นกัน",
    ),
    [
      visit("lore-plaza", w("Read the Ninefold Accord", "อ่านข้อตกลงเก้าส่วน")),
      visit("lore-market", w("Read the roadward promise", "อ่านคำมั่นต่อถนน")),
      visit(
        "lore-grove",
        w("Learn the shelter tree's story", "เรียนรู้เรื่องต้นไม้พักพิง"),
      ),
    ],
    { allowedModes: ["haven"] },
  ),
  q(
    "forest",
    3,
    "guild",
    w("A Dull Blade's Lesson", "บทเรียนอาวุธทื่อ"),
    w(
      "The guild wants Orin's advice in its new field guide. Visit his forge, then consult the training captain. Preparation saves more lives than a bold charge.",
      "กิลด์อยากได้คำแนะนำโอรินในคู่มือใหม่ ไปโรงหลอมแล้วปรึกษาครูฝึก การเตรียมพร้อมช่วยชีวิตมากกว่าการพุ่งอย่างกล้า",
    ),
    w(
      "The guide begins with Orin's words: check the edge before you cross the gate.",
      "คู่มือเริ่มด้วยคำโอริน ตรวจคมก่อนข้ามประตู",
    ),
    [
      task(
        "InteractWithObject",
        "forge",
        1,
        w("Inspect Orin's forge", "ตรวจโรงหลอมของโอริน"),
      ),
      visit("training", w("Consult the training captain", "ปรึกษาครูฝึก")),
    ],
    { allowedModes: ["haven"] },
  ),
  q(
    "forest",
    4,
    "board",
    w("Briars on the Supply Road", "หนามบนทางเสบียง"),
    w(
      "Nim's forest carriers are turning back at every rustle. Drive six Briar Goblins from the route so food reaches the shelter again.",
      "คนขนของนิมหันกลับทุกครั้งที่ได้ยินใบไม้ ขับไล่กอบลินหนามหกตัวให้เสบียงถึงที่พักอีกครั้ง",
    ),
    w(
      "Nim: The carriers took the road this morning. They even complained about the weather. That's a good sign.",
      "นิม: คนขนของออกทางเมื่อเช้า ถึงกับบ่นอากาศแล้ว นับเป็นสัญญาณดี",
    ),
    [
      kill(
        "forest",
        "goblin",
        6,
        w(
          "Defeat six Briar Goblins in the forest",
          "กำจัดกอบลินหนามหกตัวในป่า",
        ),
      ),
    ],
  ),
  q(
    "forest",
    5,
    "workshop",
    w("Moss That Remembers Rain", "มอสที่จำสายฝน"),
    w(
      "Luma: Slime cores hold moisture without choking roots. Bring me three intact cores for the greenhouse beds. Collected or traded, all three must reach this bench.",
      "ลูมา: แกนสไลม์เก็บความชื้นโดยไม่อุดราก นำแกนสมบูรณ์สามชิ้นมาแปลงเรือนกระจก จะเก็บหรือแลกก็ต้องนำมาถึงโต๊ะนี้",
    ),
    w(
      "Luma: The beds can wait out a dry week now. Some magic is simply keeping things alive.",
      "ลูมา: แปลงทนสัปดาห์แห้งได้แล้ว เวทบางอย่างก็แค่รักษาชีวิต",
    ),
    [
      deliver(
        "slime-core",
        3,
        w("Deliver three Slime Cores", "ส่งแกนสไลม์สามชิ้น"),
      ),
    ],
  ),
  q(
    "forest",
    6,
    "mara",
    w("A Ferryman Owed a Morning", "เช้าที่คนแจวสมควรได้เห็น"),
    w(
      "Mara: Tovin kept a return bell for travelers who never came. Find him at the Ruined Crossing and bring him out alive.",
      "มารา: โทวินเก็บระฆังกลับบ้านให้ผู้เดินทางที่ไม่เคยมา หาเขาที่ทางข้ามพังทลายและช่วยให้รอด",
    ),
    w(
      "Mara: He asked for breakfast before he asked for his boat. I think he'll be all right.",
      "มารา: เขาถามหาอาหารเช้าก่อนเรือเสียอีก ข้าว่าเขาจะไม่เป็นไร",
    ),
    [
      task(
        "RescueNPC",
        "forest-2-tovin",
        1,
        w("Rescue Tovin in Story Stage 2", "ช่วยโทวินในเนื้อเรื่องด่าน 2"),
        { stageId: "forest-2", worldId: "forest" },
      ),
    ],
    { allowedModes: ["story"] },
  ),
  q(
    "forest",
    7,
    "inn",
    w("Lanterns for the Late Arrivals", "ตะเกียงรอผู้มาช้า"),
    w(
      "Innkeeper Fen: A courier left a letter in Hearthside. Check its story, then ask the tonic seller to keep a light for returning travelers.",
      "เฟนเจ้าของโรงเตี๊ยม: คนส่งสารทิ้งจดหมายไว้ในย่านบ้าน ไปอ่านแล้วขอคนขายยาเปิดไฟรอนักเดินทางกลับ",
    ),
    w(
      "Fen: One more lantern, one less person wondering if anyone waited.",
      "เฟน: เพิ่มโคมหนึ่งดวง ลดคนที่สงสัยว่ามีใครรอหนึ่งคน",
    ),
    [
      visit(
        "lore-hearthside",
        w("Read the courier's letter", "อ่านจดหมายคนส่งสาร"),
      ),
      speak(
        "vendor-supplies",
        w("Speak to the roadside tonic seller", "คุยกับคนขายยาริมทาง"),
      ),
    ],
    { allowedModes: ["haven"] },
  ),
  q(
    "forest",
    8,
    "mara",
    w("The Last Lantern Keeper", "ผู้ดูแลตะเกียงคนสุดท้าย"),
    w(
      "Mara: Ilen's lantern has not gone out. When you reach Lantern Refuge, make sure its keeper reaches safety with Tovin.",
      "มารา: ตะเกียงอิเลนยังไม่ดับ เมื่อถึงที่พักตะเกียง ช่วยให้ผู้ดูแลไปถึงที่ปลอดภัยกับโทวิน",
    ),
    w(
      "Mara: Ilen is teaching the shelter children how to trim a wick. A small lesson with a long future.",
      "มารา: อิเลนสอนเด็กที่พักเล็มไส้ตะเกียง บทเรียนเล็กที่มีอนาคตยาวนาน",
    ),
    [
      task(
        "EscortNPC",
        "forest-8-tovin",
        1,
        w(
          "Escort the Lantern Refuge survivors in Story Stage 8",
          "คุ้มกันผู้รอดจากที่พักตะเกียงในเนื้อเรื่องด่าน 8",
        ),
        { stageId: "forest-8", worldId: "forest" },
      ),
    ],
    { requiredClear: "forest-6", allowedModes: ["story"] },
  ),
  q(
    "forest",
    9,
    "guild",
    w("Pages for the Missing", "หน้ากระดาษให้ผู้สูญหาย"),
    w(
      "The registrar has names for the missing but no clean bark sheets left. Deliver three wood pieces for a ledger that will not be erased again.",
      "นายทะเบียนมีชื่อผู้สูญหายแต่หมดแผ่นเปลือกไม้สะอาด ส่งไม้สามชิ้นทำสมุดที่จะไม่ถูกลบอีก",
    ),
    w(
      "The first page is left blank for the people still coming home.",
      "หน้าแรกเว้นว่างให้คนที่ยังกำลังกลับบ้าน",
    ),
    [
      deliver(
        "wood",
        3,
        w(
          "Deliver three wood pieces for ledger pages",
          "ส่งไม้สามชิ้นทำหน้าสมุด",
        ),
      ),
    ],
    { requiredClear: "forest-5" },
  ),
  q(
    "forest",
    10,
    "board",
    w("Where the Roots Point", "รากไม้ชี้ทางใด"),
    w(
      "The guild requests a firsthand account of the Heartwood Conduit. Finish its Story mission, then read the plaza accord again in its new light.",
      "กิลด์ขอคำให้การจากท่อแก่นพฤกษา สำเร็จภารกิจเนื้อเรื่องนั้นแล้วกลับอ่านข้อตกลงลานเมืองด้วยความเข้าใจใหม่",
    ),
    w(
      "The registrar writes: the forest was our first neighbor, and our first unpaid debt.",
      "นายทะเบียนเขียนว่า ป่าคือเพื่อนบ้านแรกและหนี้แรกที่เรายังไม่ชำระ",
    ),
    [
      task(
        "CompleteStage",
        "forest-10",
        1,
        w(
          "Complete the Heartwood Conduit in Story Mode",
          "สำเร็จท่อแก่นพฤกษาในโหมดเนื้อเรื่อง",
        ),
      ),
      visit(
        "lore-plaza",
        w("Revisit the Ninefold Accord", "กลับไปอ่านข้อตกลงเก้าส่วน"),
      ),
    ],
    { requiredClear: "forest-5", allowedModes: ["story", "haven"] },
  ),

  q(
    "desert",
    1,
    "forge",
    w("Copper That Holds the Sun", "ทองแดงที่เก็บตะวัน"),
    w(
      "Orin: Desert gold ore takes heat differently. Bring four pieces; I'll test a joint that won't split when the gate warms.",
      "โอริน: แร่ทองทะเลทรายรับความร้อนต่างไป นำมาสี่ชิ้น ข้าจะลองข้อต่อที่ไม่ปริเมื่อประตูอุ่น",
    ),
    w(
      "Orin: A sound joint. The old makers knew their craft. Now we know a little of it too.",
      "โอริน: ข้อต่อแน่นดี ช่างเก่ารู้ฝีมือ บัดนี้เราก็รู้เพิ่มอีกนิด",
    ),
    [
      deliver(
        "gold-ore",
        4,
        w("Deliver four Gold Ore to Orin", "ส่งแร่ทองสี่ชิ้นให้โอริน"),
      ),
    ],
  ),
  q(
    "desert",
    2,
    "market",
    w("Cups Before Crowns", "ถ้วยมาก่อนมงกุฎ"),
    w(
      "Nim: I need six ancient shards for water-cup linings. A relic locked in a cabinet never helped a thirsty traveler.",
      "นิม: ข้าต้องใช้เศษโบราณหกชิ้นบุถ้วยน้ำ วัตถุในตู้ล็อกไม่เคยช่วยผู้กระหาย",
    ),
    w(
      "Nim: Six cups are ready. I'll lend them out until they stop coming back; then I'll make six more.",
      "นิม: หกถ้วยพร้อม ข้าจะให้ยืมจนมันไม่กลับมา แล้วทำเพิ่มอีกหก",
    ),
    [
      collect(
        "ancient-shard",
        6,
        w("Collect six Ancient Shards", "เก็บเศษโบราณหกชิ้น"),
      ),
      deliver(
        "ancient-shard",
        6,
        w("Deliver the cup-lining shards", "ส่งเศษบุถ้วยน้ำ"),
      ),
    ],
  ),
  q(
    "desert",
    3,
    "guild",
    w("A Map Without a Palace", "แผนที่ไร้ราชวัง"),
    w(
      "Yara: Visit the citadel's clock and learn how its dawn mirrors worked. Our next map will mark wells and shelters before palaces.",
      "ยารา: ไปนาฬิกาป้อมและเรียนรู้กระจกอรุณ แผนที่ต่อไปจะทำเครื่องหมายบ่อกับที่พักก่อนราชวัง",
    ),
    w(
      "Yara: The water road finally has its own page in the atlas.",
      "ยารา: ในที่สุดถนนน้ำมีหน้าของตนในแผนที่",
    ),
    [
      task(
        "ActivateMechanism",
        "desert-3-mirrors",
        3,
        w(
          "Align all three citadel mirrors in Story Stage 3",
          "เรียงกระจกป้อมทั้งสามในเนื้อเรื่องด่าน 3",
        ),
        { stageId: "desert-3" },
      ),
    ],
    { allowedModes: ["story"] },
  ),
  q(
    "desert",
    4,
    "board",
    w("Arrows Against the Caravan", "ลูกธนูต้านคาราวาน"),
    w(
      "The caravan guards cannot see the ancient archers through the blowing sand. Defeat five before another water wagon turns back.",
      "ยามคาราวานมองพลธนูโบราณไม่เห็นผ่านทราย กำจัดห้าตัวก่อนรถน้ำต้องหันกลับอีก",
    ),
    w(
      "A guard pins an unbroken waterskin beside the contract. The road stayed open.",
      "ยามติดถุงน้ำไม่ขาดข้างสัญญา ถนนยังเปิดอยู่",
    ),
    [
      kill(
        "desert",
        "caster",
        5,
        w("Defeat five Ancient Archers", "กำจัดพลธนูโบราณห้าตัว"),
      ),
    ],
  ),
  q(
    "desert",
    5,
    "workshop",
    w("Rain in a Glass Roof", "ฝนในหลังคากระจก"),
    w(
      "Luma: A desert relic can guide light without burning a leaf. Bring two for the Moonbloom greenhouse. The seedlings deserve a gentler sun.",
      "ลูมา: วัตถุทะเลทรายชี้แสงโดยไม่เผาใบ นำมาสองชิ้นให้เรือนกระจกจันทรา ต้นอ่อนสมควรได้แดดอ่อนโยน",
    ),
    w(
      "Luma: Look at the new leaves. The forest and desert make good neighbors when we let them.",
      "ลูมา: ดูใบใหม่สิ ป่ากับทะเลทรายเป็นเพื่อนบ้านดีได้เมื่อเรายอม",
    ),
    [
      deliver(
        "desert-relic",
        2,
        w(
          "Deliver two Desert Relics for the greenhouse",
          "ส่งวัตถุทะเลทรายสองชิ้นให้เรือนกระจก",
        ),
      ),
    ],
  ),
  q(
    "desert",
    6,
    "guild",
    w("The Year Left Blank", "ปีที่เว้นว่าง"),
    w(
      "Yara: I need a second witness at the archive. Stand with me while the tablet is copied so no one can call it another clerical error.",
      "ยารา: ข้าต้องมีพยานอีกคนที่หอจดหมายเหตุ อยู่ด้วยขณะคัดแผ่นจารึกเพื่อไม่มีใครเรียกมันว่าความผิดพลาดเสมียนอีก",
    ),
    w(
      "Yara: Two witnesses, one account. This page stays in the record.",
      "ยารา: สองพยาน หนึ่งคำให้การ หน้านี้จะอยู่ในบันทึก",
    ),
    [
      task(
        "DefendLocation",
        "desert-4-yara",
        24,
        w(
          "Protect Yara's tablet copying in Story Stage 4",
          "คุ้มกันยาราคัดจารึกในเนื้อเรื่องด่าน 4",
        ),
        { stageId: "desert-4" },
      ),
    ],
    { allowedModes: ["story"] },
  ),
  q(
    "desert",
    7,
    "market",
    w("The People's Pump", "ปั๊มของประชาชน"),
    w(
      "Nim: I promised the diggers the royal locks would come off. Break all three at the Sunforge Reservoir. A promise needs working hands.",
      "นิม: ข้าสัญญากับคนขุดว่าจะปลดล็อกหลวง ทำลายทั้งสามที่อ่างเตาสุริยัน คำสัญญาต้องมีมือทำงาน",
    ),
    w(
      "Nim: The well has a queue now. Not for soldiers—for families.",
      "นิม: บ่อมีคนต่อแถวแล้ว เป็นครอบครัว ไม่ใช่ทหาร",
    ),
    [
      task(
        "DestroyObject",
        "desert-7-pump",
        3,
        w(
          "Destroy the reservoir's three pump locks in Story Stage 7",
          "ทำลายตัวล็อกปั๊มสามตัวในเนื้อเรื่องด่าน 7",
        ),
        { stageId: "desert-7" },
      ),
    ],
    { requiredClear: "desert-5", allowedModes: ["story"] },
  ),
  q(
    "desert",
    8,
    "mara",
    w("A Sister in the Snow", "พี่น้องกลางหิมะ"),
    w(
      "Mara: Amel remembers the northern keeper's name. Bring her safely to the caravan. We cannot ask a memory to travel without its keeper.",
      "มารา: อาเมลจำนามผู้ดูแลเหนือได้ พานางถึงคาราวานปลอดภัย เราขอให้ความจำเดินทางโดยไร้ผู้เก็บไม่ได้",
    ),
    w(
      "Mara: Amel said 'Edda' before she asked for a bed. I have written it where I cannot forget.",
      "มารา: อาเมลกล่าวชื่อเอ็ดดาก่อนขอเตียง ข้าเขียนไว้ในที่ที่จะไม่ลืม",
    ),
    [
      task(
        "EscortNPC",
        "desert-8-amel",
        1,
        w("Escort Amel in Story Stage 8", "คุ้มกันอาเมลในเนื้อเรื่องด่าน 8"),
        { stageId: "desert-8" },
      ),
    ],
    { requiredClear: "desert-6", allowedModes: ["story"] },
  ),
  q(
    "desert",
    9,
    "inn",
    w("A Place at the Table", "ที่นั่งที่โต๊ะ"),
    w(
      "Fen: We have room for the desert travelers, but the benches need repair. Bring five wood pieces and ask the vault keeper to set aside blankets.",
      "เฟน: มีที่ให้ผู้เดินทางทะเลทราย แต่ม้านั่งต้องซ่อม นำไม้ห้าชิ้นมาแล้วขอผู้ดูแลคลังแยกผ้าห่ม",
    ),
    w(
      "Fen: Everyone has somewhere to sit. Now we can argue about whose soup tastes best.",
      "เฟน: ทุกคนมีที่นั่งแล้ว คราวนี้เถียงกันได้ว่าซุปใครอร่อยสุด",
    ),
    [
      deliver(
        "wood",
        5,
        w(
          "Deliver five wood pieces for the benches",
          "ส่งไม้ห้าชิ้นซ่อมม้านั่ง",
        ),
      ),
      speak(
        "store",
        w("Arrange blankets with the vault keeper", "จัดผ้าห่มกับผู้ดูแลคลัง"),
      ),
    ],
    { allowedModes: ["haven"] },
  ),
  q(
    "desert",
    10,
    "board",
    w("A Dawn for Four Horizons", "อรุณแก่สี่ขอบฟ้า"),
    w(
      "The guild requests a witnessed opening of the Last Meridian. Complete its Story mission, then report at the Rift Gate.",
      "กิลด์ขอพยานการเปิดเมอริเดียนสุดท้าย สำเร็จภารกิจเนื้อเรื่องแล้วรายงานที่ประตูรอยแยก",
    ),
    w(
      "The atlas now draws a line from the desert toward the ice. This time the line has names beside it.",
      "แผนที่ลากเส้นจากทะเลทรายสู่น้ำแข็งแล้ว คราวนี้มีนามผู้คนข้างเส้นด้วย",
    ),
    [
      task(
        "CompleteStage",
        "desert-10",
        1,
        w(
          "Complete the Last Meridian in Story Mode",
          "สำเร็จเมอริเดียนสุดท้ายในโหมดเนื้อเรื่อง",
        ),
      ),
      visit(
        "portal",
        w(
          "Report the northern route at the Rift Gate",
          "รายงานทางเหนือที่ประตูรอยแยก",
        ),
      ),
    ],
    { requiredClear: "desert-5", allowedModes: ["story", "haven"] },
  ),

  q(
    "frozen",
    1,
    "workshop",
    w("Warmth Without Fire", "ความอุ่นไร้ไฟ"),
    w(
      "Luma: Frost crystals can hold a room at a steady temperature. Deliver four and I can keep the witness medicines from spoiling.",
      "ลูมา: ผลึกน้ำแข็งรักษาอุณหภูมิห้องให้คงที่ได้ ส่งมาสี่ชิ้น ข้าจะเก็บยาพยานไม่ให้เสีย",
    ),
    w(
      "Luma: The medicines will keep. The people who need them can take their time coming home.",
      "ลูมา: ยาเก็บได้นานแล้ว ผู้ที่ต้องใช้มันค่อยกลับบ้านได้ตามกำลัง",
    ),
    [
      deliver(
        "frost-crystal",
        4,
        w("Deliver four Frost Crystals", "ส่งผลึกน้ำแข็งสี่ชิ้น"),
      ),
    ],
  ),
  q(
    "frozen",
    2,
    "mara",
    w("A Name Answered", "นามที่มีผู้ขาน"),
    w(
      "Mara: Amel asked me to be sure her sister wakes. Release Edda at Snowfall Reach. I will keep Amel's lantern lit until you return.",
      "มารา: อาเมลขอให้ข้าแน่ใจว่าน้องจะตื่น ช่วยเอ็ดดาที่แดนหิมะโปรย ข้าจะเปิดโคมอาเมลรอเจ้ากลับ",
    ),
    w(
      "Mara: When I said Edda's name, Amel stopped holding her breath.",
      "มารา: เมื่อข้ากล่าวชื่อเอ็ดดา อาเมลก็เลิกกลั้นหายใจ",
    ),
    [
      task(
        "RescueNPC",
        "frozen-1-edda",
        1,
        w("Release Edda in Story Stage 1", "ช่วยเอ็ดดาในเนื้อเรื่องด่าน 1"),
        { stageId: "frozen-1" },
      ),
    ],
    { allowedModes: ["story"] },
  ),
  q(
    "frozen",
    3,
    "forge",
    w("A Hinge Against Winter", "บานพับต้านเหมันต์"),
    w(
      "Orin: The shelter door sticks whenever the northern gate opens. Bring three enhancement stones and I'll make a hinge that can take the cold.",
      "โอริน: ประตูที่พักติดทุกครั้งที่ประตูเหนือเปิด นำหินเสริมพลังสามชิ้นมา ข้าจะทำบานพับทนหนาว",
    ),
    w(
      "Orin: Try it. A door should open without a fight.",
      "โอริน: ลองดู ประตูควรเปิดได้โดยไม่ต้องต่อสู้",
    ),
    [
      deliver(
        "enhancement-stone",
        3,
        w("Deliver three Enhancement Stones", "ส่งหินเสริมพลังสามชิ้น"),
      ),
    ],
  ),
  q(
    "frozen",
    4,
    "board",
    w("Hunters at the Thaw Line", "นักล่าริมแนวละลาย"),
    w(
      "The returning witnesses cannot outrun Frozen Knights. Defeat six along their route. Let the slowest traveler set the pace.",
      "พยานที่กลับหนีอัศวินเยือกแข็งไม่ทัน กำจัดหกตัวบนทาง ให้ผู้เดินช้าที่สุดเป็นผู้กำหนดจังหวะ",
    ),
    w(
      "The next group arrived without losing anyone. The registrar underlines that sentence twice.",
      "กลุ่มถัดไปมาถึงโดยไม่เสียใคร นายทะเบียนขีดเส้นใต้ประโยคนั้นสองครั้ง",
    ),
    [
      kill(
        "frozen",
        "wolf",
        6,
        w("Defeat six Frozen Knights", "กำจัดอัศวินเยือกแข็งหกตัว"),
      ),
    ],
  ),
  q(
    "frozen",
    5,
    "guild",
    w("The Questions We Owe", "คำถามที่เราติดค้าง"),
    w(
      "The guild wants the witness seals recorded properly. Answer the three questions in the Icebound Hall; do not replace consent with force.",
      "กิลด์ต้องการบันทึกผนึกพยานให้ถูกต้อง ตอบสามคำถามในโถงน้ำแข็ง อย่าใช้กำลังแทนความยินยอม",
    ),
    w(
      "The field guide now asks what a seal protects before asking how to break it.",
      "คู่มือถามแล้วว่าผนึกปกป้องสิ่งใด ก่อนถามวิธีทำลาย",
    ),
    [
      task(
        "ActivateMechanism",
        "frozen-3-questions",
        3,
        w(
          "Answer the three witness questions in Story Stage 3",
          "ตอบคำถามพยานสามข้อในเนื้อเรื่องด่าน 3",
        ),
        { stageId: "frozen-3" },
      ),
    ],
    { allowedModes: ["story"] },
  ),
  q(
    "frozen",
    6,
    "inn",
    w("Ordinary Things for Renn", "ของธรรมดาให้เรนน์"),
    w(
      "Fen: A northern pilgrim wants to see the market. Visit the cloth stall and the bootmaker so we can tell her there will be things worth choosing.",
      "เฟน: ผู้แสวงเหนืออยากเห็นตลาด ไปร้านผ้ากับช่างรองเท้า เราจะได้บอกนางว่ามีสิ่งให้เลือก",
    ),
    w(
      "Fen: I'll save a chair by the window. Shopping stories take time.",
      "เฟน: ข้าจะเก็บเก้าอี้ริมหน้าต่าง เรื่องเล่าซื้อของใช้เวลา",
    ),
    [
      visit(
        "vendor-pants",
        w("Visit the travel cloth stall", "เยี่ยมร้านผ้าเดินทาง"),
      ),
      visit(
        "vendor-boots",
        w("Visit the bootmaker's stall", "เยี่ยมร้านช่างรองเท้า"),
      ),
    ],
    { allowedModes: ["haven"] },
  ),
  q(
    "frozen",
    7,
    "workshop",
    w("A Memory Kept Warm", "ความทรงจำที่เก็บให้อุ่น"),
    w(
      "Luma: Frozen essence preserves a voice as well as a potion. Bring three for a lantern Amel can keep beside Edda's bed.",
      "ลูมา: น้ำแก่นเหมันต์เก็บเสียงได้เช่นเดียวกับยา นำมาสามชิ้นทำโคมให้อาเมลวางข้างเตียงเอ็ดดา",
    ),
    w(
      "Luma: A sister's voice, without the cold around it. That is enough magic for today.",
      "ลูมา: เสียงพี่น้องที่ไร้ความหนาวล้อม นั่นก็เป็นเวทพอสำหรับวันนี้",
    ),
    [
      collect(
        "frozen-essence",
        3,
        w("Collect three Frozen Essence", "เก็บน้ำแก่นเหมันต์สามชิ้น"),
      ),
      deliver(
        "frozen-essence",
        3,
        w("Deliver the essence for Amel's lantern", "ส่งน้ำแก่นเพื่อโคมอาเมล"),
      ),
    ],
    { requiredClear: "frozen-5" },
  ),
  q(
    "frozen",
    8,
    "mara",
    w("The Pace of Returning", "จังหวะของการกลับมา"),
    w(
      "Mara: Renn will need someone who can wait. Escort Teth and her out of Pilgrim's Thaw. A rescue is not finished when a door opens.",
      "มารา: เรนน์ต้องมีคนรอเป็น คุ้มกันนางกับเทธจากทางละลาย การช่วยเหลือไม่จบเมื่อเปิดประตู",
    ),
    w(
      "Mara: Renn asked whether she could return to the snow someday. A place is different when leaving it is a choice.",
      "มารา: เรนน์ถามว่าวันหนึ่งกลับไปหิมะได้ไหม สถานที่ย่อมเปลี่ยนเมื่อเลือกจากได้",
    ),
    [
      task(
        "EscortNPC",
        "frozen-8-teth",
        1,
        w(
          "Escort the pilgrims in Story Stage 8",
          "คุ้มกันผู้แสวงในเนื้อเรื่องด่าน 8",
        ),
        { stageId: "frozen-8" },
      ),
    ],
    { requiredClear: "frozen-6", allowedModes: ["story"] },
  ),
  q(
    "frozen",
    9,
    "guild",
    w("Read Before You Swear", "อ่านก่อนสาบาน"),
    w(
      "Teth asks the guild to study its own promises. Read the names beyond the gate, then the empty training ring's record. An oath needs people, not just words.",
      "เทธขอให้กิลด์ศึกษาคำมั่นตน อ่านนามอีกฝั่งประตูแล้วอ่านบันทึกลานฝึกว่าง คำสัตย์ต้องมีผู้คน ไม่ใช่เพียงถ้อยคำ",
    ),
    w(
      "The registrar leaves space beside every oath for the person it is meant to protect.",
      "นายทะเบียนเว้นที่ข้างทุกคำสัตย์ให้ชื่อผู้ที่มันควรปกป้อง",
    ),
    [
      visit(
        "lore-guild",
        w(
          "Read the guild's names beyond the gate",
          "อ่านนามอีกฝั่งประตูของกิลด์",
        ),
      ),
      visit(
        "lore-training",
        w("Read the empty ring's record", "อ่านบันทึกลานฝึกว่าง"),
      ),
    ],
    { requiredClear: "frozen-5", allowedModes: ["haven"] },
  ),
  q(
    "frozen",
    10,
    "board",
    w("The First Running Water", "น้ำไหลครั้งแรก"),
    w(
      "The guild requests a report when the Unsealed Truth is complete. Afterward, visit the sanctuary tree and remember why the witnesses waited.",
      "กิลด์ขอรายงานเมื่อสำเร็จความจริงพ้นผนึก จากนั้นเยี่ยมต้นไม้พักพิงและจำเหตุที่พยานยอมรอ",
    ),
    w(
      "The report ends with a plain line: everyone who wished to leave was allowed to leave.",
      "รายงานจบด้วยบรรทัดเรียบง่ายว่า ทุกคนที่ต้องการจาก ได้จากไป",
    ),
    [
      task(
        "CompleteStage",
        "frozen-10",
        1,
        w(
          "Complete the Unsealed Truth in Story Mode",
          "สำเร็จความจริงพ้นผนึกในโหมดเนื้อเรื่อง",
        ),
      ),
      visit(
        "lore-grove",
        w("Reflect beside the sanctuary tree", "รำลึกข้างต้นไม้พักพิง"),
      ),
    ],
    { requiredClear: "frozen-5", allowedModes: ["story", "haven"] },
  ),

  q(
    "infernal",
    1,
    "forge",
    w("Tools That Come Home", "เครื่องมือที่กลับบ้าน"),
    w(
      "Orin: Bring four obsidian pieces. I need handles that won't burn Neri's hands when she goes back to finish the engine repair.",
      "โอริน: นำออบซิเดียนสี่ชิ้นมา ข้าต้องทำด้ามที่ไม่เผามือเนริเมื่อกลับไปซ่อมแกนจักร",
    ),
    w(
      "Orin: A tool should protect the hand that trusts it. Give me a moment; I'll stamp hers with a return mark.",
      "โอริน: เครื่องมือควรปกป้องมือที่ไว้ใจ รอสักครู่ ข้าจะตอกตรากลับบ้านให้นาง",
    ),
    [
      deliver(
        "obsidian",
        4,
        w(
          "Deliver four Obsidian for Neri's tools",
          "ส่งออบซิเดียนสี่ชิ้นทำเครื่องมือเนริ",
        ),
      ),
    ],
  ),
  q(
    "infernal",
    2,
    "market",
    w("A Fair Price for Heat", "ราคาที่เป็นธรรมแก่ความร้อน"),
    w(
      "Nim: The workshop needs three infernal cores, and I refuse to let panic set their price. Bring them here and I'll make sure every bench gets its share.",
      "นิม: โรงงานต้องใช้แกนเพลิงสามชิ้น ข้าไม่ให้ความตื่นกลัวกำหนดราคา นำมาแล้วข้าจะแบ่งให้ทุกโต๊ะ",
    ),
    w(
      "Nim: No auction, no hoarding. Just three working benches.",
      "นิม: ไม่ประมูล ไม่กักตุน มีเพียงสามโต๊ะที่ทำงานได้",
    ),
    [
      deliver(
        "infernal-core",
        3,
        w("Deliver three Infernal Cores", "ส่งแกนเพลิงสามชิ้น"),
      ),
    ],
  ),
  q(
    "infernal",
    3,
    "guild",
    w("Relieve the Keeper", "ผลัดเวรผู้ดูแล"),
    w(
      "The guild has Cairn listed as missing. Rescue him at Obsidian Crossing so the record can finally say 'returned.'",
      "กิลด์ลงชื่อแคร์นว่าสูญหาย ช่วยเขาที่ทางข้ามออบซิเดียนเพื่อบันทึกจะได้ระบุว่ากลับมาแล้ว",
    ),
    w(
      "The registrar crosses out one word, then carefully writes another. Cairn watches until the ink dries.",
      "นายทะเบียนขีดคำหนึ่งแล้วเขียนอีกคำอย่างตั้งใจ แคร์นมองจนหมึกแห้ง",
    ),
    [
      task(
        "RescueNPC",
        "infernal-2-cairn",
        1,
        w("Rescue Cairn in Story Stage 2", "ช่วยแคร์นในเนื้อเรื่องด่าน 2"),
        { stageId: "infernal-2" },
      ),
    ],
    { allowedModes: ["story"] },
  ),
  q(
    "infernal",
    4,
    "board",
    w("Arrows at the Return Line", "ลูกธนูที่ทางกลับ"),
    w(
      "Infernal Archers are firing at the workers' return route. Defeat six so the next shift can travel without shields over their heads.",
      "พลธนูเพลิงยิงทางกลับคนงาน กำจัดหกตัวเพื่อเวรถัดไปเดินได้โดยไม่ต้องชูโล่เหนือหัว",
    ),
    w(
      "A worker leaves a clean glove beside the board. Someone had time to wash it.",
      "คนงานทิ้งถุงมือสะอาดข้างกระดาน มีคนได้เวลาซักมันแล้ว",
    ),
    [
      kill(
        "infernal",
        "caster",
        6,
        w("Defeat six Infernal Archers", "กำจัดพลธนูเพลิงหกตัว"),
      ),
    ],
  ),
  q(
    "infernal",
    5,
    "workshop",
    w("A Cauldron That Cools", "หม้อต้มที่เย็นลง"),
    w(
      "Luma: The infernal essence is too hot for ordinary glass. Bring two obsidian pieces and one core; I'll build a cooling jacket for the cauldron.",
      "ลูมา: น้ำแก่นเพลิงร้อนเกินแก้วธรรมดา นำออบซิเดียนสองชิ้นกับแกนหนึ่งชิ้นมา ข้าจะทำปลอกเย็นให้หม้อ",
    ),
    w(
      "Luma: A steady simmer. The best potion begins with a patient flame.",
      "ลูมา: เดือดพอดี ยาที่ดีที่สุดเริ่มจากไฟอดทน",
    ),
    [
      deliver(
        "obsidian",
        2,
        w(
          "Deliver two Obsidian for the cooling jacket",
          "ส่งออบซิเดียนสองชิ้นทำปลอกเย็น",
        ),
      ),
      deliver(
        "infernal-core",
        1,
        w(
          "Deliver one Infernal Core for its regulator",
          "ส่งแกนเพลิงหนึ่งชิ้นทำตัวควบคุม",
        ),
      ),
    ],
  ),
  q(
    "infernal",
    6,
    "mara",
    w("Do Not Replace Me", "อย่ามาแทนข้า"),
    w(
      "Mara: I want the guild to hear Aven's words exactly. Find his workshop echo in Story Stage 6. We owe him more than a better legend.",
      "มารา: ข้าอยากให้กิลด์ได้ยินคำอาเวนตรงตามที่กล่าว หาเสียงสะท้อนโรงงานในเนื้อเรื่องด่าน 6 เราติดค้างเขามากกว่าตำนานที่ดีขึ้น",
    ),
    w(
      "Mara: 'Do not replace me.' I will put those words above every keeper's oath.",
      "มารา: อย่ามาแทนข้า ข้าจะวางถ้อยคำนั้นเหนือคำสัตย์ผู้ดูแลทุกคน",
    ),
    [
      task(
        "TalkToNPC",
        "infernal-6-aven",
        1,
        w(
          "Hear Aven's echo in Story Stage 6",
          "ฟังเสียงอาเวนในเนื้อเรื่องด่าน 6",
        ),
        { stageId: "infernal-6" },
      ),
    ],
    { requiredClear: "infernal-5", allowedModes: ["story"] },
  ),
  q(
    "infernal",
    7,
    "forge",
    w("Measure Twice, Break Once", "วัดสองครั้ง ทำลายครั้งเดียว"),
    w(
      "Orin: Neri says three forced-return anchors are crushing the engine. Break all three at the Chains of the Engine. Some repairs begin by removing bad work.",
      "โอริน: เนริบอกว่าสมอทางกลับสามตัวบีบแกนจักร ทำลายทั้งสามที่โซ่แกนจักร การซ่อมบางอย่างเริ่มด้วยรื้องานผิด",
    ),
    w(
      "Orin: She was right about the anchors. Don't tell her I doubted the measurement.",
      "โอริน: นางถูกเรื่องสมอ อย่าบอกนางว่าข้าสงสัยการวัด",
    ),
    [
      task(
        "DestroyObject",
        "infernal-7-chain",
        3,
        w(
          "Break three return anchors in Story Stage 7",
          "ทำลายสมอทางกลับสามตัวในเนื้อเรื่องด่าน 7",
        ),
        { stageId: "infernal-7" },
      ),
    ],
    { requiredClear: "infernal-5", allowedModes: ["story"] },
  ),
  q(
    "infernal",
    8,
    "guild",
    w("Every Worker Counted", "นับคนงานทุกคน"),
    w(
      "Cairn asks for one final watch at the workers' relay. Protect him during Story Stage 8. This time the keeper leaves with the last traveler.",
      "แคร์นขอเฝ้าหอส่งคนงานครั้งสุดท้าย คุ้มกันในเนื้อเรื่องด่าน 8 คราวนี้ผู้ดูแลจะออกพร้อมคนสุดท้าย",
    ),
    w(
      "Cairn signs the ledger himself. The line beneath his name reads: shift ended.",
      "แคร์นลงชื่อเอง บรรทัดใต้ชื่อระบุว่า สิ้นสุดเวร",
    ),
    [
      task(
        "DefendLocation",
        "infernal-8-cairn",
        18,
        w(
          "Protect Cairn's final shift in Story Stage 8",
          "คุ้มกันเวรสุดท้ายของแคร์นในเนื้อเรื่องด่าน 8",
        ),
        { stageId: "infernal-8" },
      ),
    ],
    { requiredClear: "infernal-6", allowedModes: ["story"] },
  ),
  q(
    "infernal",
    9,
    "inn",
    w("A Bench for the First Maker", "ม้านั่งให้ผู้สร้างคนแรก"),
    w(
      "Fen: Legends never mention tired backs. Bring six wood pieces for a bench by the sanctuary fire. Aven will need somewhere ordinary to sit.",
      "เฟน: ตำนานไม่เคยกล่าวถึงหลังเมื่อย นำไม้หกชิ้นทำม้านั่งข้างไฟที่พัก อาเวนต้องมีที่ธรรมดาให้นั่ง",
    ),
    w(
      "Fen: It's a good bench. No plaque, no crown. Just somewhere to rest.",
      "เฟน: ม้านั่งดี ไม่มีป้าย ไม่มีมงกุฎ มีเพียงที่พัก",
    ),
    [
      deliver(
        "wood",
        6,
        w(
          "Deliver six wood pieces for Aven's bench",
          "ส่งไม้หกชิ้นทำม้านั่งอาเวน",
        ),
      ),
    ],
    { requiredClear: "infernal-5" },
  ),
  q(
    "infernal",
    10,
    "board",
    w("The Report After the Ending", "รายงานหลังตอนจบ"),
    w(
      "The guild needs a final report from the First Fracture. Complete the Story finale and visit the shelter tree. Write what people can do next, not only what they survived.",
      "กิลด์ต้องการรายงานสุดท้ายจากรอยร้าวแรก สำเร็จฉากจบแล้วเยี่ยมต้นไม้พักพิง เขียนสิ่งที่ผู้คนทำต่อได้ ไม่ใช่แค่สิ่งที่รอดมา",
    ),
    w(
      "The final page has room left on it. A shared world will need more stories.",
      "หน้าสุดท้ายยังมีที่ว่าง โลกที่แบ่งปันต้องมีเรื่องเล่าอีกมาก",
    ),
    [
      task(
        "CompleteStage",
        "infernal-10",
        1,
        w(
          "Complete the First Fracture in Story Mode",
          "สำเร็จรอยร้าวแรกในโหมดเนื้อเรื่อง",
        ),
      ),
      visit(
        "lore-grove",
        w("Return to the sanctuary tree", "กลับสู่ต้นไม้พักพิง"),
      ),
    ],
    { requiredClear: "infernal-5", allowedModes: ["story", "haven"] },
  ),
];
