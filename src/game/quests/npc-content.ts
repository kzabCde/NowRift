import {
  authored as q,
  w,
  task,
  deliver,
  collect,
  visit,
  speak,
} from "./authoring";
import type { QuestDefinition } from "./types";
const npc = { category: "npc" as const };

/** Four recurring voices, four connected entries each. Flags describe completed aid, never simulate a station. */
export const NPC_QUESTS: QuestDefinition[] = [
  q(
    "forest",
    1,
    "mara",
    w("Mara I · The Keeper's Walk", "มารา I · ทางเดินผู้ดูแล"),
    w(
      "Mara: I learned every rune on the gate before I learned who cooked at the inn. Read the broken watch's account, then greet Fen for me. A keeper ought to know both.",
      "มารา: ข้ารู้อักขระประตูทุกตัวก่อนรู้ว่าใครทำครัวโรงเตี๊ยม อ่านเรื่องเวรยามแตกสลายแล้วทักเฟนแทนข้า ผู้ดูแลควรรู้ทั้งสอง",
    ),
    w(
      "Mara: Fen sent soup. Apparently I have forgotten lunch for three days. Thank you for keeping the keeper.",
      "มารา: เฟนส่งซุปมา เห็นว่าข้าลืมมื้อกลางวันสามวันแล้ว ขอบใจที่ดูแลผู้ดูแล",
    ),
    [
      visit(
        "lore-gate",
        w("Read the broken watch's account", "อ่านเรื่องเวรยามแตกสลาย"),
      ),
      speak("inn", w("Greet Fen at the inn", "ทักเฟนที่โรงเตี๊ยม")),
    ],
    { ...npc, allowedModes: ["haven"] },
  ),
  q(
    "desert",
    1,
    "mara",
    w("Mara II · The Mark We Inherited", "มารา II · ตราที่เรารับมา"),
    w(
      "Mara: Aurel's crest matches our gate. Bring one desert relic so I can compare the marks. I need to know which promises we inherited without asking.",
      "มารา: ตราออเรลตรงกับประตูเรา นำวัตถุทะเลทรายหนึ่งชิ้นมาเทียบ ข้าต้องรู้ว่ารับคำมั่นใดมาโดยไม่เคยถาม",
    ),
    w(
      "Mara: The marks match, but the stories do not. I will keep asking until they do.",
      "มารา: ตราตรงกัน แต่เรื่องเล่าไม่ตรง ข้าจะถามจนกว่าจะตรง",
    ),
    [
      deliver(
        "desert-relic",
        1,
        w(
          "Deliver one Desert Relic to Mara",
          "ส่งวัตถุทะเลทรายหนึ่งชิ้นให้มารา",
        ),
      ),
    ],
    { ...npc, prerequisites: ["npc-forest-1"], requiredClear: "desert-5" },
  ),
  q(
    "frozen",
    1,
    "mara",
    w("Mara III · An Oath with a Name", "มารา III · คำสัตย์ที่มีนาม"),
    w(
      "Mara: Ask the guild to copy Teth's testimony, then bring two frozen essences for my keeper lamp. I want its light to remember people, not just borders.",
      "มารา: ขอให้กิลด์คัดคำให้การเทธ แล้วนำน้ำแก่นเหมันต์สองชิ้นให้โคมผู้ดูแล ข้าอยากให้แสงจำผู้คน ไม่ใช่แค่พรมแดน",
    ),
    w(
      "Mara: I have added a name beneath my oath: whoever comes through this gate needing help.",
      "มารา: ข้าเติมนามใต้คำสัตย์ว่า ผู้ใดก็ตามที่ข้ามประตูมาขอความช่วยเหลือ",
    ),
    [
      speak(
        "guild",
        w("Request Teth's testimony at the guild", "ขอคำให้การเทธที่กิลด์"),
      ),
      deliver(
        "frozen-essence",
        2,
        w(
          "Deliver two Frozen Essence for Mara's lamp",
          "ส่งน้ำแก่นเหมันต์สองชิ้นให้โคมมารา",
        ),
      ),
    ],
    { ...npc, prerequisites: ["npc-desert-1"], requiredClear: "frozen-6" },
  ),
  q(
    "infernal",
    1,
    "mara",
    w("Mara IV · A Door Worth Keeping", "มารา IV · ประตูที่ควรเฝ้า"),
    w(
      "Mara: Finish the First Fracture, then meet the shelter tree again. I want to write a new keeper's oath after Aven is safely home, not before.",
      "มารา: สำเร็จรอยร้าวแรกแล้วกลับไปต้นไม้พักพิง ข้าอยากเขียนคำสัตย์ผู้ดูแลใหม่หลังอาเวนกลับปลอดภัย ไม่ใช่ก่อน",
    ),
    w(
      "Mara: 'No one holds the door alone.' That is the whole oath. I think it will be enough.",
      "มารา: ไม่มีใครพยุงประตูลำพัง นั่นคือคำสัตย์ทั้งหมด ข้าว่ามันเพียงพอ",
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
        w("Return to the shelter tree", "กลับสู่ต้นไม้พักพิง"),
      ),
    ],
    {
      ...npc,
      prerequisites: ["npc-frozen-1"],
      requiredClear: "infernal-6",
      allowedModes: ["story", "haven"],
      reward: {
        gold: 450,
        xp: 650,
        materials: { "enhancement-stone": 5 },
        flags: ["npc:mara:keeper-oath"],
      },
    },
  ),

  q(
    "forest",
    2,
    "forge",
    w("Orin I · The Apprentice's Hammer", "โอริน I · ค้อนของศิษย์"),
    w(
      "Orin: Neri left copper on her bench before the gate closed. Bring four ore pieces. Keeping a second hammer ready is a foolish habit I intend to keep.",
      "โอริน: เนริทิ้งทองแดงบนโต๊ะก่อนประตูปิด นำแร่สี่ชิ้นมา การเตรียมค้อนที่สองเป็นนิสัยโง่ที่ข้าจะเก็บไว้",
    ),
    w(
      "Orin: Two balanced hammers. One for me, one for when she gets back.",
      "โอริน: ค้อนสมดุลสองด้าม หนึ่งของข้า หนึ่งไว้เมื่อนางกลับ",
    ),
    [
      deliver(
        "copper-ore",
        4,
        w(
          "Deliver four Copper Ore for Neri's hammer",
          "ส่งแร่ทองแดงสี่ชิ้นทำค้อนเนริ",
        ),
      ),
    ],
    npc,
  ),
  q(
    "desert",
    2,
    "forge",
    w("Orin II · The Sun's Joinery", "โอริน II · งานต่อของสุริยัน"),
    w(
      "Orin: Sun-forged joints expand without splitting. Bring three gold ore and two ancient shards. I want to learn the trick before I boast about it.",
      "โอริน: ข้อต่อหลอมสุริยันขยายโดยไม่ปริ นำแร่ทองสามกับเศษโบราณสองมา ข้าอยากเรียนก่อนอวดฝีมือ",
    ),
    w(
      "Orin: A little space for movement. That was the whole trick. I should try it with apprentices too.",
      "โอริน: เว้นที่ให้ขยับได้ นั่นคือเคล็ดทั้งหมด ข้าควรลองใช้กับศิษย์ด้วย",
    ),
    [
      deliver("gold-ore", 3, w("Deliver three Gold Ore", "ส่งแร่ทองสามชิ้น")),
      deliver(
        "ancient-shard",
        2,
        w("Deliver two Ancient Shards", "ส่งเศษโบราณสองชิ้น"),
      ),
    ],
    { ...npc, prerequisites: ["npc-forest-2"] },
  ),
  q(
    "frozen",
    2,
    "forge",
    w("Orin III · Steel That Can Yield", "โอริน III · เหล็กที่ยอมงอ"),
    w(
      "Orin: The northern blades bend instead of breaking. Bring two frost crystals and three enhancement stones. Strength is not always being rigid.",
      "โอริน: ดาบเหนือยอมงอแทนหัก นำผลึกน้ำแข็งสองกับหินเสริมสามมา ความแข็งแรงไม่ใช่แข็งทื่อเสมอ",
    ),
    w(
      "Orin: A blade for the road, made to survive a mistake. Every good traveler makes a few.",
      "โอริน: ดาบเดินทางที่ทนความผิดพลาด นักเดินทางที่ดีทุกคนย่อมพลาดบ้าง",
    ),
    [
      deliver(
        "frost-crystal",
        2,
        w("Deliver two Frost Crystals", "ส่งผลึกน้ำแข็งสองชิ้น"),
      ),
      deliver(
        "enhancement-stone",
        3,
        w("Deliver three Enhancement Stones", "ส่งหินเสริมพลังสามชิ้น"),
      ),
    ],
    {
      ...npc,
      prerequisites: ["npc-desert-2"],
      reward: {
        gold: 230,
        xp: 280,
        materials: {},
        equipment: { definitionId: "frozen-weapon", rarity: "rare", level: 15 },
        flags: ["npc:orin:flexible-steel"],
      },
    },
  ),
  q(
    "infernal",
    2,
    "forge",
    w("Orin IV · Leave Room to Return", "โอริน IV · เว้นที่ให้กลับมา"),
    w(
      "Orin: Neri sent measurements for the return valves. Bring four obsidian and two infernal cores. This time I'll build exactly what she asked for.",
      "โอริน: เนริส่งขนาดวาล์วกลับมา นำออบซิเดียนสี่กับแกนเพลิงสอง คราวนี้ข้าจะสร้างตรงตามที่นางขอ",
    ),
    w(
      "Orin: Her measurements were right. Tell her there is still room at the bench—and she gets to choose the tools.",
      "โอริน: ขนาดนางถูกแล้ว บอกว่าโต๊ะยังมีที่ และนางเลือกเครื่องมือเองได้",
    ),
    [
      deliver(
        "obsidian",
        4,
        w("Deliver four Obsidian", "ส่งออบซิเดียนสี่ชิ้น"),
      ),
      deliver(
        "infernal-core",
        2,
        w("Deliver two Infernal Cores", "ส่งแกนเพลิงสองชิ้น"),
      ),
    ],
    {
      ...npc,
      prerequisites: ["npc-frozen-2"],
      requiredClear: "infernal-8",
      reward: {
        gold: 400,
        xp: 500,
        materials: { "enhancement-stone": 4 },
        equipment: {
          definitionId: "infernal-weapon",
          rarity: "epic",
          level: 20,
        },
        flags: ["npc:orin:shared-bench"],
      },
    },
  ),

  q(
    "forest",
    3,
    "market",
    w("Nim I · Learn the Other Stalls", "นิม I · รู้จักแผงอื่น"),
    w(
      "Nim: A trader who only knows his own stall is just guarding a box. Visit the armor, helmet and boot sellers. Ask what travelers actually need.",
      "นิม: พ่อค้าที่รู้จักแต่แผงตนก็แค่เฝ้ากล่อง เยี่ยมคนขายเกราะ หมวก และรองเท้า ถามว่านักเดินทางต้องการอะไรจริง",
    ),
    w(
      "Nim: Dry feet, a whole helmet and someone who listens. That is a useful inventory.",
      "นิม: เท้าแห้ง หมวกไม่แตก และคนรับฟัง เป็นรายการของที่มีประโยชน์",
    ),
    [
      visit("vendor-armor", w("Consult the armor seller", "ปรึกษาคนขายเกราะ")),
      visit("vendor-helmet", w("Consult the helmet seller", "ปรึกษาคนขายหมวก")),
      visit("vendor-boots", w("Consult the bootmaker", "ปรึกษาช่างรองเท้า")),
    ],
    { ...npc, allowedModes: ["haven"] },
  ),
  q(
    "desert",
    3,
    "market",
    w("Nim II · An Honest Measure", "นิม II · ตวงอย่างซื่อสัตย์"),
    w(
      "Nim: Bring five fresh ancient shards for new cup measures. The old royal measure always left a little water missing. Mine won't.",
      "นิม: เก็บเศษโบราณใหม่ห้าชิ้นมาทำถ้วยตวง ถ้วยหลวงเก่าทำให้น้ำขาดนิดหนึ่งเสมอ ของข้าจะไม่เป็นเช่นนั้น",
    ),
    w(
      "Nim: A full cup, no thumb on the scale. We can build a market on that.",
      "นิม: ถ้วยเต็ม ไม่กดตาชั่ง เราสร้างตลาดบนสิ่งนี้ได้",
    ),
    [
      collect(
        "ancient-shard",
        5,
        w("Collect five new Ancient Shards", "เก็บเศษโบราณใหม่ห้าชิ้น"),
      ),
      deliver(
        "ancient-shard",
        5,
        w("Deliver the shards for honest measures", "ส่งเศษทำถ้วยตวงซื่อสัตย์"),
      ),
    ],
    { ...npc, prerequisites: ["npc-forest-3"] },
  ),
  q(
    "frozen",
    3,
    "market",
    w("Nim III · Credit for a New Morning", "นิม III · เชื่อใจเช้าวันใหม่"),
    w(
      "Nim: The witnesses returned without purses. Bring five wood pieces for a shared goods shelf, then tell Fen nobody needs to pay before breakfast.",
      "นิม: พยานกลับมาโดยไร้กระเป๋าเงิน นำไม้ห้าชิ้นทำชั้นของแบ่งปัน แล้วบอกเฟนว่าไม่มีใครต้องจ่ายก่อนกินเช้า",
    ),
    w(
      "Nim: They can repay us by becoming neighbors. I like that currency.",
      "นิม: พวกเขาตอบแทนด้วยการเป็นเพื่อนบ้านได้ ข้าชอบเงินสกุลนี้",
    ),
    [
      deliver(
        "wood",
        5,
        w(
          "Deliver five wood pieces for the shared shelf",
          "ส่งไม้ห้าชิ้นทำชั้นแบ่งปัน",
        ),
      ),
      speak("inn", w("Arrange breakfast with Fen", "จัดอาหารเช้ากับเฟน")),
    ],
    {
      ...npc,
      prerequisites: ["npc-desert-3"],
      requiredClear: "frozen-8",
      allowedModes: ["haven"],
    },
  ),
  q(
    "infernal",
    3,
    "market",
    w("Nim IV · A Route That Gives Back", "นิม IV · เส้นทางที่ตอบแทน"),
    w(
      "Nim: We carried the engine's gifts away for years. Bring two infernal cores for public tools. Let the return wagons carry something useful for once.",
      "นิม: เราขนของจากแกนจักรออกมาหลายปี นำแกนเพลิงสองทำเครื่องมือส่วนรวม ให้รถกลับขนสิ่งมีประโยชน์บ้าง",
    ),
    w(
      "Nim: Outward, supplies. Homeward, people. That's a trade route worth keeping open.",
      "นิม: ขาออกเสบียง ขากลับผู้คน นี่คือทางค้าที่ควรเปิดไว้",
    ),
    [
      collect(
        "infernal-core",
        2,
        w("Collect two Infernal Cores", "เก็บแกนเพลิงสองชิ้น"),
      ),
      deliver(
        "infernal-core",
        2,
        w("Deliver the cores for public tools", "ส่งแกนเพื่อเครื่องมือส่วนรวม"),
      ),
    ],
    {
      ...npc,
      prerequisites: ["npc-frozen-3"],
      requiredClear: "infernal-8",
      reward: {
        gold: 550,
        xp: 450,
        materials: { "health-tonic": 3 },
        flags: ["npc:nim:return-route"],
      },
    },
  ),

  q(
    "forest",
    4,
    "workshop",
    w("Luma I · A Bed for Small Roots", "ลูมา I · แปลงให้รากเล็ก"),
    w(
      "Luma: Three slime cores and three wood pieces will make a seed bed. I have spent too long brewing remedies for damage we could prevent.",
      "ลูมา: แกนสไลม์สามกับไม้สามทำแปลงเมล็ดได้ ข้าเสียเวลาปรุงยารักษาความเสียหายที่ป้องกันได้มานาน",
    ),
    w(
      "Luma: Tomorrow I plant something. No antidote, no emergency. Just seeds.",
      "ลูมา: พรุ่งนี้ข้าจะปลูกบางสิ่ง ไม่ใช่ยาแก้พิษ ไม่ใช่เหตุฉุกเฉิน เพียงเมล็ดพันธุ์",
    ),
    [
      deliver(
        "slime-core",
        3,
        w("Deliver three Slime Cores", "ส่งแกนสไลม์สามชิ้น"),
      ),
      deliver("wood", 3, w("Deliver three wood pieces", "ส่งไม้สามชิ้น")),
    ],
    npc,
  ),
  q(
    "desert",
    4,
    "workshop",
    w("Luma II · Borrowed Sunlight", "ลูมา II · แสงตะวันที่ยืมมา"),
    w(
      "Luma: Bring two desert relics, then read the old Moonbloom notes. The gardeners before us knew how to borrow light without stealing it.",
      "ลูมา: นำวัตถุทะเลทรายสองชิ้น แล้วอ่านบันทึกสวนจันทรา ชาวสวนก่อนเรารู้วิธียืมแสงโดยไม่ขโมย",
    ),
    w(
      "Luma: The notes say to leave one pane open to the rain. Even a greenhouse should welcome the weather.",
      "ลูมา: บันทึกบอกให้เว้นกระจกหนึ่งช่องรับฝน แม้เรือนกระจกก็ควรต้อนรับอากาศ",
    ),
    [
      deliver(
        "desert-relic",
        2,
        w("Deliver two Desert Relics", "ส่งวัตถุทะเลทรายสองชิ้น"),
      ),
      visit(
        "lore-garden",
        w("Read the Moonbloom garden notes", "อ่านบันทึกสวนจันทรา"),
      ),
    ],
    { ...npc, prerequisites: ["npc-forest-4"] },
  ),
  q(
    "frozen",
    4,
    "workshop",
    w("Luma III · Thaw Gently", "ลูมา III · ละลายอย่างอ่อนโยน"),
    w(
      "Luma: Help Edda hold the final thaw relay, then bring two frost crystals. I want the greenhouse to remember that warming takes patience.",
      "ลูมา: ช่วยเอ็ดดาพยุงหอส่งละลายสุดท้าย แล้วนำผลึกน้ำแข็งสองชิ้นมา ข้าอยากให้เรือนกระจกจำว่าความอุ่นต้องอดทน",
    ),
    w(
      "Luma: The first seedlings survived the thaw. I have named none of them. They can choose what to become.",
      "ลูมา: ต้นอ่อนแรกรอดการละลาย ข้ายังไม่ตั้งชื่อ ให้มันเลือกว่าจะเป็นอะไร",
    ),
    [
      task(
        "DefendLocation",
        "frozen-10-edda",
        18,
        w(
          "Protect Edda in Story Stage 10",
          "คุ้มกันเอ็ดดาในเนื้อเรื่องด่าน 10",
        ),
        { stageId: "frozen-10" },
      ),
      deliver(
        "frost-crystal",
        2,
        w("Deliver two Frost Crystals", "ส่งผลึกน้ำแข็งสองชิ้น"),
      ),
    ],
    {
      ...npc,
      prerequisites: ["npc-desert-4"],
      requiredClear: "frozen-6",
      allowedModes: ["story", "haven"],
    },
  ),
  q(
    "infernal",
    4,
    "workshop",
    w("Luma IV · A Season of Our Own", "ลูมา IV · ฤดูกาลของเรา"),
    w(
      "Luma: Three infernal cores and two enhancement stones will finish the greenhouse regulator. Four realms of weather, and room for a seed to grow at its own pace.",
      "ลูมา: แกนเพลิงสามกับหินเสริมสองจะทำตัวควบคุมเรือนกระจกเสร็จ อากาศสี่ดินแดน กับที่ให้เมล็ดเติบโตตามจังหวะตน",
    ),
    w(
      "Luma: The regulator is steady. Sit a while. We have finally made something that can wait.",
      "ลูมา: ตัวควบคุมนิ่งแล้ว นั่งพักเถิด ในที่สุดเราสร้างสิ่งที่รอได้แล้ว",
    ),
    [
      deliver(
        "infernal-core",
        3,
        w("Deliver three Infernal Cores", "ส่งแกนเพลิงสามชิ้น"),
      ),
      deliver(
        "enhancement-stone",
        2,
        w("Deliver two Enhancement Stones", "ส่งหินเสริมพลังสองชิ้น"),
      ),
    ],
    {
      ...npc,
      prerequisites: ["npc-frozen-4"],
      requiredClear: "infernal-8",
      reward: {
        gold: 400,
        xp: 500,
        materials: { "health-tonic": 3, "focus-tonic": 3 },
        flags: ["npc:luma:four-seasons"],
      },
    },
  ),
];
