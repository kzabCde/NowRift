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

/** Chapter I: the grove's sickness is a damaged conduit, not a hostile forest. */
export const FOREST_MISSIONS: MissionDefinition[] = [
  {
    schema: 1,
    id: "forest-2",
    worldId: "forest",
    title: w("Ruined Crossing", "ทางข้ามพังทลาย"),
    questTitle: w("A Voice Beneath the Bridge", "เสียงใต้สะพาน"),
    briefing: w(
      "Sera: The crossing collapsed after a green flash. Ferryman Tovin was still below it. Follow his bell; don't mistake his calls for the creatures' cries.",
      "เซรา: ทางข้ามถล่มหลังแสงสีเขียววาบ โทวินคนแจวยังอยู่ข้างล่าง ตามเสียงระฆังเขาไป อย่าสับสนกับเสียงสัตว์ร้าย",
    ),
    returnDialogue: w(
      "Tovin: I saw roots holding the bridge up, not pulling it down. Someone taught us to fear the wrong thing.",
      "โทวิน: ข้าเห็นรากไม้พยุงสะพาน ไม่ได้ดึงมันลงมา มีคนสอนให้เรากลัวผิดสิ่ง",
    ),
    objectives: [
      visit(
        "forest-2-bell",
        w(
          "Follow the ferryman's bell to the crossing",
          "ตามเสียงระฆังคนแจวไปยังทางข้าม",
        ),
        1210,
        480,
      ),
      eliminate(
        "forest-2-pack",
        "wolf",
        3,
        w(
          "Drive off three wolves at the fallen span",
          "ขับไล่หมาป่าสามตัวที่ช่วงสะพานพัง",
        ),
      ),
      rescue(
        "forest-2-tovin",
        w("Free Tovin from the wreckage", "ช่วยโทวินจากซากสะพาน"),
        w(
          "Tovin: Leave my boat. Take this route north. The roots are keeping Thornwatch standing.",
          "โทวิน: ทิ้งเรือข้าไว้ ใช้ทางเหนือ รากไม้กำลังพยุงหอหนามอยู่",
        ),
        1180,
        600,
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-3",
    worldId: "forest",
    title: w("Thornwatch", "หอหนาม"),
    questTitle: w("Keep the Signal Alive", "รักษาสัญญาณ"),
    briefing: w(
      "Sera: Thornwatch can warn every ranger in the grove. I need both hands to mend its beacon. Keep the briar raiders away from me.",
      "เซรา: หอหนามเตือนพรานทุกคนในป่าได้ ข้าต้องใช้สองมือซ่อมสัญญาณ ช่วยกันผู้บุกรุกหนามออกไป",
    ),
    returnDialogue: w(
      "Mara: Three lanterns answered Sera's beacon. People are still alive out there. The last light came from the Deepwood.",
      "มารา: มีตะเกียงสามดวงตอบสัญญาณเซรา ยังมีคนรอดอยู่ แสงสุดท้ายมาจากไพรลึก",
    ),
    objectives: [
      talk(
        "forest-3-sera",
        w("Meet Sera at Thornwatch", "พบเซราที่หอหนาม"),
        w(
          "Sera: Stay close enough to cover me. If I fall, the warning dies with me.",
          "เซรา: อยู่ใกล้พอจะคุ้มกันข้า หากข้าล้ม สัญญาณก็จะดับไปด้วย",
        ),
      ),
      defense(
        "forest-3-beacon",
        w(
          "Protect Sera while she repairs the beacon",
          "คุ้มกันเซราระหว่างซ่อมสัญญาณ",
        ),
        22,
      ),
      visit(
        "forest-3-answer",
        w(
          "Read the answering signal from the Deepwood",
          "อ่านสัญญาณตอบจากไพรลึก",
        ),
        1130,
        390,
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-4",
    worldId: "forest",
    title: w("The Deepwood", "ไพรลึก"),
    questTitle: w("The Language of Roots", "ภาษาของรากไม้"),
    briefing: w(
      "Sera: These stones were here before our paths. Their carvings say seed, branch, crown. Touch them in that order and let the forest answer.",
      "เซรา: หินเหล่านี้เก่าแก่กว่าเส้นทางของเรา จารึกกล่าวถึงเมล็ด กิ่ง และยอด แตะตามลำดับแล้วฟังคำตอบของป่า",
    ),
    returnDialogue: w(
      "Mara: That mark is a Rift conduit. The grove isn't spreading corruption; it is trying to seal a wound beneath its guardian.",
      "มารา: เครื่องหมายนั้นคือท่อรอยแยก ป่าไม่ได้แพร่มลทิน มันพยายามปิดบาดแผลใต้ผู้พิทักษ์",
    ),
    objectives: [
      visit(
        "forest-4-stones",
        w("Find the three root stones", "ค้นหาหินรากไม้ทั้งสาม"),
        690,
        520,
      ),
      puzzle(
        "forest-4-root",
        w(
          "Awaken seed I, branch II, then crown III",
          "ปลุกเมล็ด I กิ่ง II แล้วยอด III",
        ),
      ),
      collect(
        "forest-4-memory",
        "slime-core",
        w(
          "Recover the living memory released by the stones",
          "เก็บความทรงจำมีชีวิตจากหิน",
        ),
        [{ x: 1150, y: 520 }],
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-5",
    worldId: "forest",
    title: w("Heart of the Grove", "หัวใจแห่งพงไพร"),
    questTitle: w("The Guardian's Burden", "ภาระของผู้พิทักษ์"),
    briefing: w(
      "Mara: The Forest Guardian carries the wound in its own heart. Break the thorns binding it. We are here to free a guardian, not conquer a forest.",
      "มารา: ผู้พิทักษ์ป่าแบกรอยแผลไว้ในหัวใจ จงทำลายหนามที่พันธนาการ เรามาเพื่อปลดปล่อยผู้พิทักษ์ มิใช่ยึดครองป่า",
    ),
    returnDialogue: w(
      "Sera: It spoke as the thorns fell: 'The well drinks from another sky.' This was never the source. The old aqueduct leads east.",
      "เซรา: ยามหนามร่วง มันกล่าวว่า บ่อนี้ดื่มน้ำจากฟ้าอีกแห่ง ที่นี่ไม่ใช่ต้นตอ ท่อส่งน้ำเก่ามุ่งไปตะวันออก",
    ),
    objectives: [
      visit(
        "forest-5-heart",
        w("Approach the wounded Heartwood", "เข้าหาแก่นพฤกษาที่บาดเจ็บ"),
        1030,
        480,
      ),
      champion(
        "forest-5-guardian",
        w(
          "Release the Forest Guardian from the corruption",
          "ปลดปล่อยผู้พิทักษ์ป่าจากมลทิน",
        ),
        true,
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-6",
    worldId: "forest",
    title: w("Rootglass Aqueduct", "รางน้ำรากแก้ว"),
    questTitle: w("Water from Another Sky", "น้ำจากฟ้าอีกแห่ง"),
    briefing: w(
      "Mara: The guardian remembers water flowing through glass roots. Find its sluice and bring back an unclouded sample. The blacksmith may recognize the fittings.",
      "มารา: ผู้พิทักษ์จำน้ำที่ไหลผ่านรากแก้วได้ ค้นหาประตูน้ำแล้วนำตัวอย่างใสกลับมา ช่างเหล็กอาจรู้จักข้อต่อเหล่านี้",
    ),
    returnDialogue: w(
      "Blacksmith Orin: This copper isn't ours. Sun-forged, folded against heat. Whoever built that sluice came from the desert.",
      "โอรินช่างเหล็ก: ทองแดงนี้ไม่ใช่ของเรา หลอมด้วยดวงอาทิตย์และตีพับทนความร้อน ผู้สร้างประตูน้ำมาจากทะเลทราย",
    ),
    objectives: [
      talk(
        "forest-6-tovin",
        w("Ask Tovin about the old waterway", "ถามโทวินเรื่องทางน้ำเก่า"),
        w(
          "Tovin: My grandfather called it the road for water. He never said where the road began.",
          "โทวิน: ปู่เรียกมันว่าถนนของสายน้ำ แต่ไม่เคยบอกว่าถนนเริ่มที่ไหน",
        ),
      ),
      visit(
        "forest-6-sluice",
        w(
          "Trace the copper sluice beneath the roots",
          "ตามประตูน้ำทองแดงใต้รากไม้",
        ),
        580,
        410,
      ),
      collect(
        "forest-6-fittings",
        "copper-ore",
        w(
          "Recover two sun-forged sluice fittings",
          "เก็บข้อต่อประตูน้ำหลอมสุริยันสองชิ้น",
        ),
        [
          { x: 570, y: 560 },
          { x: 740, y: 420 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-7",
    worldId: "forest",
    title: w("The Black Sap Works", "โรงยางไม้ดำ"),
    questTitle: w("Cut the Poison's Supply", "ตัดทางเลี้ยงพิษ"),
    briefing: w(
      "Sera: Three siphons are bleeding the grove into the conduit. The raiders guard them as if they're precious. Break the machines, not the roots around them.",
      "เซรา: ท่อดูดสามตัวรีดพลังป่าเข้าสู่ท่อรอยแยก ผู้บุกรุกเฝ้าราวกับของล้ำค่า ทำลายเครื่องจักร อย่าทำร้ายรากไม้",
    ),
    returnDialogue: w(
      "Sera: The sap is running clear. Yet the siphons bear the same maker's mark as Haven's gate. Mara needs to see this.",
      "เซรา: ยางไม้ใสแล้ว แต่ท่อดูดมีตราช่างเดียวกับประตูเฮเวน มาราต้องเห็นสิ่งนี้",
    ),
    objectives: [
      eliminate(
        "forest-7-raiders",
        "goblin",
        5,
        w("Defeat the five siphon guards", "กำจัดผู้เฝ้าท่อดูดห้าตัว"),
      ),
      sabotage(
        "forest-7-siphon",
        w(
          "Break the three corruption siphons with your weapon",
          "ใช้อาวุธทำลายท่อดูดมลทินสามตัว",
        ),
        [
          { x: 610, y: 470 },
          { x: 900, y: 420 },
          { x: 1160, y: 550 },
        ],
      ),
      visit(
        "forest-7-stream",
        w("Check the recovering stream", "ตรวจลำธารที่ฟื้นคืน"),
        760,
        860,
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-8",
    worldId: "forest",
    title: w("Lantern Refuge", "ที่พักพิงตะเกียง"),
    questTitle: w("No One Left in the Dark", "ไม่ทิ้งใครในความมืด"),
    briefing: w(
      "Tovin: A young keeper hid beyond the broken road. I'll lead her back if you cover us. Walk beside me; I won't leave anyone behind again.",
      "โทวิน: ผู้ดูแลหนุ่มสาวหลบอยู่เลยทางขาด ข้าจะพากลับถ้าเจ้าคุ้มกัน เดินข้างข้า ครั้งนี้ข้าจะไม่ทิ้งใครอีก",
    ),
    returnDialogue: w(
      "Keeper Ilen: My teacher said the forest was one of four locks. If it opens alone, everything behind the other three pours through.",
      "อิเลนผู้ดูแล: อาจารย์บอกว่าป่าคือหนึ่งในสี่กลอน หากเปิดเพียงแห่งเดียว ทุกสิ่งหลังอีกสามกลอนจะทะลักออกมา",
    ),
    objectives: [
      rescue(
        "forest-8-ilen",
        w("Find Ilen at the lantern refuge", "ค้นหาอิเลนที่ที่พักตะเกียง"),
        w(
          "Ilen: I kept one lantern burning. I thought the others had forgotten us.",
          "อิเลน: ข้ารักษาตะเกียงไว้หนึ่งดวง นึกว่าคนอื่นลืมเราแล้ว",
        ),
        620,
        470,
      ),
      escort(
        "forest-8-tovin",
        w(
          "Escort Tovin and Ilen to the southern refuge",
          "คุ้มกันโทวินกับอิเลนไปที่พักใต้",
        ),
        { x: 650, y: 520 },
        [
          { x: 900, y: 700 },
          { x: 1140, y: 850 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-9",
    worldId: "forest",
    title: w("Briar Captain's Hollow", "โพรงกัปตันหนาม"),
    questTitle: w("The Keeper of Stolen Names", "ผู้เก็บนามที่ถูกขโมย"),
    briefing: w(
      "Ilen: The Briar Captain stole the keeper ledger. It holds the names of those still missing. Bring it back so we can search for people, not ghosts.",
      "อิเลน: กัปตันหนามขโมยสมุดผู้ดูแล มันมีชื่อคนที่ยังหายไป นำกลับมาเพื่อให้เราตามหาผู้คน ไม่ใช่เงาผี",
    ),
    returnDialogue: w(
      "Mara: Every name is crossed out except one: the first Rift engineer. The ink is fresh. Someone is still answering to that name.",
      "มารา: ทุกชื่อถูกขีดทิ้ง เหลือเพียงวิศวกรรอยแยกคนแรก หมึกยังสด มีคนกำลังใช้ชื่อนั้นอยู่",
    ),
    objectives: [
      visit(
        "forest-9-hollow",
        w("Find the captain's hidden hollow", "ค้นหาโพรงลับของกัปตัน"),
        1180,
        430,
      ),
      champion(
        "forest-9-captain",
        w("Defeat the Briar Captain", "โค่นกัปตันหนาม"),
      ),
      collect(
        "forest-9-ledger",
        "wood",
        w("Recover the bark-bound keeper ledger", "เก็บสมุดผู้ดูแลปกเปลือกไม้"),
        [{ x: 1130, y: 520 }],
      ),
    ],
  },
  {
    schema: 1,
    id: "forest-10",
    worldId: "forest",
    title: w("The Heartwood Conduit", "ท่อแก่นพฤกษา"),
    questTitle: w("A Heart That Can Let Go", "หัวใจที่ยอมปล่อยวาง"),
    briefing: w(
      "Mara: The Heartwood Echo is guarding a broken promise. Open the root seals, then face it. We cannot mend the Rift by forcing the forest to carry it alone.",
      "มารา: เงาแก่นพฤกษากำลังเฝ้าคำสัญญาที่แตกสลาย เปิดผนึกรากแล้วเผชิญหน้ามัน เราซ่อมรอยแยกไม่ได้ด้วยการบังคับให้ป่าแบกรับลำพัง",
    ),
    returnDialogue: w(
      "Mara: The forest breathes freely again. Its last memory points to a city buried beneath the Lost Desert. Four realms made the promise; now we must ask what they promised.",
      "มารา: ป่าหายใจได้อย่างอิสระอีกครั้ง ความทรงจำสุดท้ายชี้ไปยังเมืองใต้ทะเลทรายสาบสูญ สี่ดินแดนให้คำสัญญา เราต้องค้นหาว่าพวกเขาสัญญาสิ่งใด",
    ),
    finale: { name: w("Heartwood Echo", "เงาแก่นพฤกษา"), phases: 3 },
    objectives: [
      puzzle(
        "forest-10-seals",
        w("Open the root seals I → II → III", "เปิดผนึกราก I → II → III"),
      ),
      champion(
        "forest-10-echo",
        w(
          "Calm the Heartwood Echo through all three phases",
          "สงบเงาแก่นพฤกษาให้ครบสามช่วง",
        ),
        true,
      ),
      visit(
        "forest-10-memory",
        w("Witness the road to the sunken city", "เห็นเส้นทางสู่เมืองจมทราย"),
        1180,
        390,
      ),
    ],
  },
];
