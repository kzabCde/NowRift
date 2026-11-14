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
} from "./builders";

/** Chapter II: the sun engineers built a shared water network, then erased its cost. */
export const DESERT_MISSIONS: MissionDefinition[] = [
  {
    schema: 1,
    id: "desert-1",
    worldId: "desert",
    title: w("Dune Approach", "ทางเข้าสู่เนินทราย"),
    questTitle: w("The City the Sand Remembers", "เมืองที่ทรายจดจำ"),
    briefing: w(
      "Guild archivist Yara: Your copper fitting belongs to Aurel, a city our maps call a myth. Meet me at its wayhouse. Myths do not leave engineering marks.",
      "ยารานักจดหมายเหตุกิลด์: ข้อต่อทองแดงเป็นของออเรล เมืองที่แผนที่เรียกว่าเรื่องเล่า พบข้าที่ที่พักทาง ตำนานไม่ทิ้งตราวิศวกรไว้",
    ),
    returnDialogue: w(
      "Yara: The milestones count water, not distance. Aurel's roads were a promise to share. Why bury a promise like that?",
      "ยารา: หลักทางนับน้ำ ไม่ใช่ระยะทาง ถนนออเรลคือสัญญาแบ่งปัน เหตุใดจึงฝังคำสัญญาเช่นนี้",
    ),
    objectives: [
      talk(
        "desert-1-yara",
        w("Meet Yara at the sunken wayhouse", "พบยาราที่ที่พักจมทราย"),
        w(
          "Yara: Three fragments survived the storm. Find them around the old milestone; together they name our destination.",
          "ยารา: เศษจารึกสามชิ้นรอดพายุ หาแถวหลักทางเก่า เมื่อนำมารวมกันจะบอกจุดหมาย",
        ),
      ),
      visit(
        "desert-1-mile",
        w("Read the buried water milestone", "อ่านหลักทางน้ำใต้ทราย"),
        610,
        430,
      ),
      collect(
        "desert-1-fragments",
        "ancient-shard",
        w("Recover three route fragments", "เก็บเศษเส้นทางสามชิ้น"),
        [
          { x: 590, y: 540 },
          { x: 760, y: 420 },
          { x: 1080, y: 500 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-2",
    worldId: "desert",
    title: w("Buried Causeway", "ทางเดินใต้ทราย"),
    questTitle: w("A Caravan Worth More Than Gold", "คาราวานที่มีค่ากว่าทอง"),
    briefing: w(
      "Merchant Nim: I carry water for the diggers, not relics for a prince. Bandits don't believe me. Clear the causeway and walk my caravan to the cistern.",
      "นิมพ่อค้า: ข้าขนน้ำให้คนขุด ไม่ใช่โบราณวัตถุให้เจ้าชาย แต่โจรไม่เชื่อ เปิดทางเดินแล้วคุ้มกันคาราวานถึงบ่อน้ำ",
    ),
    returnDialogue: w(
      "Nim: Every cup made it. Yara can keep her treasure; hearing those workers laugh was worth the journey.",
      "นิม: น้ำถึงครบทุกถ้วย ให้ยาราเก็บสมบัติเถิด เสียงหัวเราะคนงานคุ้มการเดินทางแล้ว",
    ),
    objectives: [
      eliminate(
        "desert-2-bandits",
        "goblin",
        5,
        w("Clear five bandits from the water road", "กำจัดโจรห้าตัวบนถนนน้ำ"),
      ),
      escort(
        "desert-2-nim",
        w(
          "Escort Nim to the sheltered cistern",
          "คุ้มกันนิมไปยังบ่อน้ำมีหลังคา",
        ),
        { x: 610, y: 500 },
        [
          { x: 900, y: 700 },
          { x: 1190, y: 860 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-3",
    worldId: "desert",
    title: w("Sunken Citadel", "ป้อมปราการจมทราย"),
    questTitle: w("Three Hours of Sunlight", "สามยามแห่งแสงอาทิตย์"),
    briefing: w(
      "Yara: The citadel's clock has no hands. Its mirrors mark dawn, noon, dusk. Wake them in that order. Someone wanted this door opened by patience, not force.",
      "ยารา: นาฬิกาป้อมไม่มีเข็ม กระจกแทนอรุณ เที่ยง และพลบ ปลุกตามลำดับ ผู้สร้างอยากให้ประตูเปิดด้วยความอดทน ไม่ใช่กำลัง",
    ),
    returnDialogue: w(
      "Yara: Aurel's crest is four hands around one cup. The forest was its neighbor, not its quarry. The royal histories lied.",
      "ยารา: ตราออเรลคือสี่มือรอบถ้วยเดียว ป่าคือเพื่อนบ้าน ไม่ใช่แหล่งขุดทรัพยากร พงศาวดารราชสำนักโกหก",
    ),
    objectives: [
      visit(
        "desert-3-clock",
        w("Find the citadel's handless clock", "ค้นหานาฬิกาไร้เข็มของป้อม"),
        680,
        430,
      ),
      puzzle(
        "desert-3-mirrors",
        w(
          "Align dawn I, noon II, then dusk III",
          "เรียงอรุณ I เที่ยง II แล้วพลบ III",
        ),
      ),
      collect(
        "desert-3-crest",
        "desert-relic",
        w("Recover the four-handed crest", "เก็บตราสี่มือ"),
        [{ x: 1140, y: 470 }],
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-4",
    worldId: "desert",
    title: w("Sands of Trial", "ทะเลทรายแห่งบททดสอบ"),
    questTitle: w("Let the Record Speak", "ให้บันทึกได้กล่าว"),
    briefing: w(
      "Yara: The archive tablet is singing through the storm. I'll copy it before the sand takes it. The old sentries are waking; keep them off the scaffold.",
      "ยารา: แผ่นจารึกร้องผ่านพายุ ข้าจะคัดก่อนทรายกลบ ทหารเก่ากำลังตื่น กันพวกมันจากนั่งร้าน",
    ),
    returnDialogue: w(
      "Yara: The king diverted the shared well to his throne. When the forest protested, he called it corruption. His colossus still guards the valve.",
      "ยารา: กษัตริย์ผันบ่อร่วมไปบัลลังก์ เมื่อป่าคัดค้าน เขาเรียกมันว่ามลทิน มหายักษ์ยังเฝ้าวาล์วนั้นอยู่",
    ),
    objectives: [
      defense(
        "desert-4-yara",
        w("Protect Yara while she copies the tablet", "คุ้มกันยาราขณะคัดจารึก"),
        24,
      ),
      eliminate(
        "desert-4-archers",
        "caster",
        3,
        w(
          "Silence three awakened Ancient Archers",
          "หยุดพลธนูโบราณที่ตื่นขึ้นสามตัว",
        ),
      ),
      visit(
        "desert-4-valve",
        w(
          "Trace the stolen water toward the throne",
          "ตามทางน้ำที่ถูกขโมยสู่บัลลังก์",
        ),
        1200,
        420,
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-5",
    worldId: "desert",
    title: w("Throne of the Sun", "บัลลังก์แห่งสุริยัน"),
    questTitle: w("A Throne Cannot Drink", "บัลลังก์ดื่มน้ำไม่ได้"),
    briefing: w(
      "Nim: The Sand Colossus kept the king's water safe while children went thirsty. It has no king left to serve. Make it stand aside.",
      "นิม: มหายักษ์ทรายเฝ้าน้ำกษัตริย์ขณะเด็กอดน้ำ บัดนี้ไม่มีกษัตริย์ให้รับใช้แล้ว จงให้มันเปิดทาง",
    ),
    returnDialogue: w(
      "Yara: We found no king beneath the throne—only a northern seal key. The rulers hid their answer in another realm.",
      "ยารา: ใต้บัลลังก์ไม่มีกษัตริย์ มีเพียงกุญแจผนึกแดนเหนือ ผู้ปกครองซ่อนคำตอบไว้อีกดินแดน",
    ),
    objectives: [
      visit(
        "desert-5-throne",
        w("Enter the dry throne courtyard", "เข้าสู่ลานบัลลังก์แห้งแล้ง"),
        1050,
        450,
      ),
      champion(
        "desert-5-colossus",
        w("Defeat the Sand Colossus", "โค่นมหายักษ์ทราย"),
        true,
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-6",
    worldId: "desert",
    title: w("The Buried Archive", "หอจดหมายเหตุใต้ทราย"),
    questTitle: w("The Pages They Removed", "หน้าที่ถูกฉีกออก"),
    briefing: w(
      "Yara: The royal account skips a whole winter. An apprentice hid duplicate plates in the lower archive. Help me recover what a crown wanted forgotten.",
      "ยารา: บันทึกราชสำนักข้ามฤดูหนาวทั้งฤดู ศิษย์คนหนึ่งซ่อนแผ่นสำเนาในหอชั้นล่าง ช่วยนำสิ่งที่มงกุฎอยากให้ลืมกลับมา",
    ),
    returnDialogue: w(
      "Yara: Northern witnesses refused to bless the diversion. They were sealed away with their testimony. We know where the next road leads.",
      "ยารา: พยานแดนเหนือไม่ยอมรับรองการผันน้ำ พวกเขาถูกผนึกพร้อมคำให้การ เรารู้แล้วว่าทางต่อไปอยู่ไหน",
    ),
    objectives: [
      talk(
        "desert-6-yara",
        w(
          "Hear Yara's missing-page discovery",
          "ฟังเรื่องหน้าบันทึกที่หายไปจากยารา",
        ),
        w(
          "Yara: My teachers called the blank year a clerical error. I repeated them. I won't repeat them again.",
          "ยารา: อาจารย์เรียกปีว่างว่าข้อผิดพลาดเสมียน ข้าพูดตามพวกเขา และจะไม่ทำอีก",
        ),
      ),
      visit(
        "desert-6-shelf",
        w(
          "Locate the apprentice's hidden archive shelf",
          "ค้นหาชั้นลับของศิษย์ในหอจดหมายเหตุ",
        ),
        590,
        420,
      ),
      collect(
        "desert-6-plates",
        "ancient-shard",
        w("Retrieve two witness plates", "นำแผ่นคำให้การสองชิ้นกลับมา"),
        [
          { x: 590, y: 570 },
          { x: 770, y: 450 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-7",
    worldId: "desert",
    title: w("Sunforge Reservoir", "อ่างเก็บน้ำเตาสุริยัน"),
    questTitle: w("Open the People's Well", "เปิดบ่อน้ำของผู้คน"),
    briefing: w(
      "Nim: The royal pumps still send water into empty chambers. Break the locks, then cover Yara while she redirects the flow. This is the treasure we came for.",
      "นิม: ปั๊มหลวงยังส่งน้ำเข้าห้องว่าง ทำลายตัวล็อก แล้วคุ้มกันยาราขณะเปลี่ยนทางน้ำ นี่แหละสมบัติที่เราตามหา",
    ),
    returnDialogue: w(
      "Nim: Water reached the diggers before sunset. Someone painted four hands on the new well. No one asked a king's permission.",
      "นิม: น้ำถึงคนขุดก่อนตะวันตก มีคนวาดสี่มือบนบ่อใหม่ ไม่มีใครต้องขออนุญาตกษัตริย์",
    ),
    objectives: [
      sabotage(
        "desert-7-pump",
        w("Destroy three royal pump locks", "ทำลายตัวล็อกปั๊มหลวงสามตัว"),
        [
          { x: 590, y: 500 },
          { x: 900, y: 430 },
          { x: 1180, y: 540 },
        ],
      ),
      defense(
        "desert-7-yara",
        w(
          "Protect Yara while the public well refills",
          "คุ้มกันยาราขณะบ่อประชาชนเติมน้ำ",
        ),
        22,
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-8",
    worldId: "desert",
    title: w("Caravan of Names", "คาราวานแห่งนาม"),
    questTitle: w("Carry the Living Record", "พาบันทึกมีชีวิตกลับ"),
    briefing: w(
      "Yara: A memory keeper survived beneath the caravanserai. She knows the northern pass, but she cannot face another road alone. Bring her into the light.",
      "ยารา: ผู้รักษาความทรงจำรอดใต้ที่พักคาราวาน นางรู้ทางเหนือแต่ไม่อาจเดินลำพังอีก พานางออกสู่แสง",
    ),
    returnDialogue: w(
      "Keeper Amel: We were told the northerners chose silence. They chose to stay with those too weak to flee. Please write that part down.",
      "อาเมลผู้รักษา: เราถูกบอกว่าชาวเหนือเลือกเงียบ พวกเขาเลือกอยู่กับคนอ่อนแอที่หนีไม่ได้ ได้โปรดบันทึกข้อนั้นด้วย",
    ),
    objectives: [
      rescue(
        "desert-8-amel",
        w("Find Amel beneath the caravanserai", "พบอาเมลใต้ที่พักคาราวาน"),
        w(
          "Amel: I remember every name. Walking is harder. Stay where I can see you.",
          "อาเมล: ข้าจำได้ทุกชื่อ แต่เดินยากกว่า อยู่ให้ข้าเห็นเจ้าเถิด",
        ),
        610,
        470,
      ),
      escort(
        "desert-8-amel",
        w("Escort Amel to Nim's waiting caravan", "คุ้มกันอาเมลไปคาราวานนิม"),
        { x: 650, y: 520 },
        [
          { x: 900, y: 700 },
          { x: 1170, y: 840 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-9",
    worldId: "desert",
    title: w("The Gilded Sentinel", "ยามทองคำ"),
    questTitle: w("An Order Without a King", "คำสั่งไร้กษัตริย์"),
    briefing: w(
      "Yara: One sentinel still checks royal seals at the Meridian. Our witness plates bear the people's mark. Show it what a command is worth after its author is gone.",
      "ยารา: ยามสุดท้ายยังตรวจตราหลวงที่เมอริเดียน แผ่นคำให้การของเรามีตราประชาชน ให้มันรู้ค่าคำสั่งเมื่อผู้ออกคำสั่งจากไป",
    ),
    returnDialogue: w(
      "Yara: Its final order was not 'protect the city.' It was 'protect the story.' We have almost broken both locks.",
      "ยารา: คำสั่งสุดท้ายไม่ใช่ปกป้องเมือง แต่เป็นปกป้องเรื่องเล่า เราเกือบปลดได้ทั้งสองกลอนแล้ว",
    ),
    objectives: [
      visit(
        "desert-9-checkpoint",
        w("Reach the Meridian checkpoint", "ถึงด่านเมอริเดียน"),
        1160,
        430,
      ),
      champion(
        "desert-9-sentinel",
        w("Defeat the Gilded Sentinel", "โค่นยามทองคำ"),
      ),
      collect(
        "desert-9-key",
        "gold-ore",
        w("Recover the sun-forged passage key", "เก็บกุญแจทางผ่านหลอมสุริยัน"),
        [{ x: 1130, y: 520 }],
      ),
    ],
  },
  {
    schema: 1,
    id: "desert-10",
    worldId: "desert",
    title: w("The Last Meridian", "เมอริเดียนสุดท้าย"),
    questTitle: w("Share the Dawn", "แบ่งปันอรุณ"),
    briefing: w(
      "Yara: Set the mirrors toward the four realms. The Meridian Keeper will resist every change. Hold your ground until the old order has nothing left to command.",
      "ยารา: หันกระจกสู่สี่ดินแดน ผู้รักษาเมอริเดียนจะต่อต้านทุกการเปลี่ยนแปลง ยืนหยัดจนระเบียบเก่าไม่เหลือสิ่งให้บัญชา",
    ),
    returnDialogue: w(
      "Mara: Dawn touched the forest and desert together. The northern gate answered with a voice, not a roar: 'Bring the witnesses home.' We are finally being heard.",
      "มารา: อรุณแตะป่ากับทะเลทรายพร้อมกัน ประตูเหนือขานด้วยเสียงพูดแทนคำรามว่า พาพยานกลับบ้าน ในที่สุดมีผู้ฟังเราแล้ว",
    ),
    finale: { name: w("Meridian Keeper", "ผู้รักษาเมอริเดียน"), phases: 3 },
    objectives: [
      puzzle(
        "desert-10-light",
        w(
          "Align the shared dawn seals I → II → III",
          "เรียงผนึกอรุณร่วม I → II → III",
        ),
      ),
      champion(
        "desert-10-keeper",
        w(
          "Defeat the Meridian Keeper through all three phases",
          "โค่นผู้รักษาเมอริเดียนให้ครบสามช่วง",
        ),
        true,
      ),
      visit(
        "desert-10-dawn",
        w("Witness the northern gate awaken", "ดูประตูเหนือฟื้นตื่น"),
        1180,
        390,
      ),
    ],
  },
];
