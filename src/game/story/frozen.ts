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

/** Chapter III: the wardens sealed witnesses to keep them alive, not to silence them. */
export const FROZEN_MISSIONS: MissionDefinition[] = [
  {
    schema: 1,
    id: "frozen-1",
    worldId: "frozen",
    title: w("Snowfall Reach", "แดนหิมะโปรย"),
    questTitle: w("The Voice Inside the Ice", "เสียงในน้ำแข็ง"),
    briefing: w(
      "Mara: Amel recognized the voice at the gate. Her sister Edda kept the northern watch. Follow the blue lamps; someone has been tending them through the long winter.",
      "มารา: อาเมลจำเสียงที่ประตูได้ เอ็ดดาน้องสาวนางเฝ้าแดนเหนือ ตามโคมฟ้าไป มีคนดูแลมันตลอดฤดูหนาวยาวนาน",
    ),
    returnDialogue: w(
      "Edda: Amel is alive? Then I have been counting the wrong years. Help me wake the others before I lose another one.",
      "เอ็ดดา: อาเมลยังมีชีวิตหรือ เช่นนั้นข้านับปีผิดมาตลอด ช่วยปลุกคนอื่นก่อนข้าเสียไปอีกปี",
    ),
    objectives: [
      visit(
        "frozen-1-lamps",
        w("Follow the blue watch lamps", "ตามโคมยามสีฟ้า"),
        600,
        440,
      ),
      rescue(
        "frozen-1-edda",
        w("Release Edda from her frozen watch", "ปลดเอ็ดดาจากเวรวิญญาณผลึก"),
        w(
          "Edda: Do not shatter the witness ice. Those lights are heartbeats, not traps.",
          "เอ็ดดา: อย่าทุบน้ำแข็งพยาน แสงเหล่านั้นคือชีพจร ไม่ใช่กับดัก",
        ),
        680,
        500,
      ),
      collect(
        "frozen-1-crystals",
        "frost-crystal",
        w(
          "Gather two warm-hearted frost crystals",
          "เก็บผลึกน้ำแข็งแกนอุ่นสองชิ้น",
        ),
        [
          { x: 790, y: 420 },
          { x: 1100, y: 540 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-2",
    worldId: "frozen",
    title: w("Fractured Lake", "ทะเลสาบแตกร้าว"),
    questTitle: w("Across the Years Between Us", "ข้ามปีที่พรากจาก"),
    briefing: w(
      "Edda: The lake remembers every thaw. I know the safe way, but my legs do not remember walking. Stay with me until we reach the witness hall.",
      "เอ็ดดา: ทะเลสาบจำการละลายทุกครั้ง ข้ารู้ทางปลอดภัย แต่ขาจำการเดินไม่ได้ อยู่ด้วยกันจนถึงหอพยาน",
    ),
    returnDialogue: w(
      "Edda: I used to cross this lake to hear my sister sing. I thought I would never tell anyone that again.",
      "เอ็ดดา: ข้าเคยข้ามทะเลสาบไปฟังพี่ร้องเพลง นึกว่าจะไม่ได้เล่าเรื่องนี้ให้ใครฟังอีก",
    ),
    objectives: [
      eliminate(
        "frozen-2-wraiths",
        "slime",
        4,
        w(
          "Clear four Frost Slimes from the lakeshore",
          "กำจัดสไลม์น้ำแข็งสี่ตัวที่ริมทะเลสาบ",
        ),
      ),
      escort(
        "frozen-2-edda",
        w(
          "Escort Edda across the fractured lake",
          "คุ้มกันเอ็ดดาข้ามทะเลสาบแตกร้าว",
        ),
        { x: 620, y: 500 },
        [
          { x: 900, y: 700 },
          { x: 1170, y: 850 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-3",
    worldId: "frozen",
    title: w("Icebound Hall", "โถงผนึกน้ำแข็ง"),
    questTitle: w("Consent of the Sleeping", "ความยินยอมของผู้หลับใหล"),
    briefing: w(
      "Edda: The wardens left three questions: name, memory, consent. Answer them in order. These seals were made to open from kindness, not heat.",
      "เอ็ดดา: ผู้พิทักษ์ทิ้งคำถามสามข้อ นาม ความทรงจำ และความยินยอม ตอบตามลำดับ ผนึกเปิดด้วยความเมตตา ไม่ใช่ไฟ",
    ),
    returnDialogue: w(
      "Witness Teth: We asked to sleep until the engine could be shared safely. The wardens kept their word. Others called our waiting a curse.",
      "เทธพยาน: เราขอหลับจนแบ่งปันแกนจักรได้อย่างปลอดภัย ผู้พิทักษ์รักษาคำพูด แต่คนอื่นเรียกการรอของเราว่าคำสาป",
    ),
    objectives: [
      puzzle(
        "frozen-3-questions",
        w(
          "Answer name I, memory II, then consent III",
          "ตอบนาม I ความทรงจำ II และยินยอม III",
        ),
      ),
      rescue(
        "frozen-3-teth",
        w("Wake the consenting witness Teth", "ปลุกเทธผู้ยินยอมตื่น"),
        w(
          "Teth: I remember agreeing to wait. I did not agree to be forgotten.",
          "เทธ: ข้าจำได้ว่ายอมรอ แต่ไม่ได้ยอมให้ถูกลืม",
        ),
        1140,
        500,
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-4",
    worldId: "frozen",
    title: w("Blizzard Pass", "ช่องเขาพายุหิมะ"),
    questTitle: w("A Signal Through the White", "สัญญาณฝ่าความขาวโพลน"),
    briefing: w(
      "Teth: The northern relay can tell Haven we're alive. Edda must retune it by hand. The storm draws hungry shapes; do not let them reach her.",
      "เทธ: หอส่งเหนือบอกเฮเวนได้ว่าเรายังอยู่ เอ็ดดาต้องจูนด้วยมือ พายุดึงเงาหิวโหยมา อย่าให้ถึงตัวนาง",
    ),
    returnDialogue: w(
      "Mara: I heard Edda's voice before the relay faded. For the first time the gate sounded like a doorway, not a warning.",
      "มารา: ข้าได้ยินเสียงเอ็ดดาก่อนสัญญาณจาง ครั้งแรกที่ประตูฟังเหมือนทางเข้า ไม่ใช่คำเตือน",
    ),
    objectives: [
      defense(
        "frozen-4-edda",
        w(
          "Protect Edda while she tunes the northern relay",
          "คุ้มกันเอ็ดดาระหว่างจูนหอส่งเหนือ",
        ),
        24,
      ),
      eliminate(
        "frozen-4-hunters",
        "wolf",
        4,
        w(
          "Drive four Frozen Knights away from the relay",
          "ขับไล่อัศวินเยือกแข็งสี่ตัวจากหอส่ง",
        ),
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-5",
    worldId: "frozen",
    title: w("The Silent Warden", "ผู้พิทักษ์เงียบงัน"),
    questTitle: w("The Oath Beneath the Frost", "คำสัตย์ใต้น้ำค้างแข็ง"),
    briefing: w(
      "Edda: The Frost Warden recognizes no faces after so long. It will challenge anyone approaching the witnesses. Survive its test, and I will remind it why it stood watch.",
      "เอ็ดดา: ผู้พิทักษ์น้ำแข็งจำหน้าใครไม่ได้แล้ว มันจะทดสอบผู้เข้าหาพยาน จงผ่านบททดสอบ ข้าจะย้ำเหตุผลที่มันเฝ้ายาม",
    ),
    returnDialogue: w(
      "Teth: The warden's last memory is an engineer closing the infernal gate from within. He did not destroy the Rift. He trapped himself beside its wound.",
      "เทธ: ความจำสุดท้ายของผู้พิทักษ์คือวิศวกรปิดประตูเพลิงจากข้างใน เขาไม่ได้ทำลายรอยแยก เขาขังตนอยู่ข้างบาดแผลของมัน",
    ),
    objectives: [
      visit(
        "frozen-5-watch",
        w("Enter the warden's silent watch", "เข้าสู่เวรยามเงียบของผู้พิทักษ์"),
        1060,
        450,
      ),
      champion(
        "frozen-5-warden",
        w("Overcome the Frost Warden", "ผ่านผู้พิทักษ์น้ำแข็ง"),
        true,
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-6",
    worldId: "frozen",
    title: w("Hall of Witnesses", "หอพยาน"),
    questTitle: w("Who Held the Door", "ผู้พยุงประตู"),
    briefing: w(
      "Teth: We left our testimony in memory lanterns. Take them where the city can hear us. A truth kept safely in a frozen room is still a truth no one knows.",
      "เทธ: เราฝากคำให้การไว้ในโคมความจำ นำไปให้เมืองได้ยิน ความจริงที่เก็บปลอดภัยในห้องเย็นก็ยังไม่มีใครรู้",
    ),
    returnDialogue: w(
      "Mara: The first engineer was my teacher's teacher. Our own gate carries the same wound. I have been guarding a door without asking who held it shut.",
      "มารา: วิศวกรคนแรกคืออาจารย์ของอาจารย์ข้า ประตูเรามีแผลเดียวกัน ข้าเฝ้าประตูโดยไม่ถามว่าใครพยุงมันให้ปิดอยู่",
    ),
    objectives: [
      talk(
        "frozen-6-teth",
        w(
          "Hear Teth's account of the first sealing",
          "ฟังเทธเล่าการผนึกครั้งแรก",
        ),
        w(
          "Teth: No realm could bear the engine alone. The kings insisted one must. That was the first fracture.",
          "เทธ: ไม่มีดินแดนใดแบกแกนจักรลำพังได้ แต่กษัตริย์ยืนยันว่าต้องมีสักแห่ง นั่นคือรอยร้าวแรก",
        ),
      ),
      visit(
        "frozen-6-lanterns",
        w("Find the witness memory alcove", "ค้นหาซุ้มความจำพยาน"),
        600,
        420,
      ),
      collect(
        "frozen-6-memories",
        "frozen-essence",
        w("Recover two witness memory lanterns", "เก็บโคมความจำพยานสองดวง"),
        [
          { x: 620, y: 560 },
          { x: 800, y: 430 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-7",
    worldId: "frozen",
    title: w("The Broken Lens", "เลนส์แตกสลาย"),
    questTitle: w("Stop the False Winter", "หยุดเหมันต์ลวง"),
    briefing: w(
      "Edda: The lens should preserve the sleepers. Now it freezes anyone who comes to help. Cut its corrupted prisms free, then silence the ice mages feeding them.",
      "เอ็ดดา: เลนส์ควรรักษาผู้หลับ บัดนี้มันแช่แข็งทุกคนที่มาช่วย ตัดผลึกติดมลทิน แล้วหยุดจอมเวทน้ำแข็งที่เลี้ยงมัน",
    ),
    returnDialogue: w(
      "Edda: For a moment I heard running water. I'd forgotten how ordinary hope can sound.",
      "เอ็ดดา: ชั่วครู่ข้าได้ยินน้ำไหล ลืมไปแล้วว่าความหวังฟังธรรมดาได้เพียงใด",
    ),
    objectives: [
      sabotage(
        "frozen-7-prism",
        w(
          "Break the three corrupted preservation prisms",
          "ทำลายผลึกรักษาที่ติดมลทินสามชิ้น",
        ),
        [
          { x: 590, y: 490 },
          { x: 900, y: 410 },
          { x: 1180, y: 540 },
        ],
      ),
      eliminate(
        "frozen-7-mages",
        "caster",
        3,
        w(
          "Defeat three Frost Mages feeding the lens",
          "กำจัดจอมเวทน้ำแข็งสามตัวที่เลี้ยงเลนส์",
        ),
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-8",
    worldId: "frozen",
    title: w("Pilgrim's Thaw", "การละลายของผู้แสวง"),
    questTitle: w("The Slow Road Home", "หนทางกลับบ้านอันเชื่องช้า"),
    briefing: w(
      "Teth: Our youngest pilgrim woke before her legs did. I promised her the gate would still be there. Help us keep that promise, one step at a time.",
      "เทธ: ผู้แสวงที่อายุน้อยที่สุดตื่นก่อนขาจะตื่น ข้าสัญญาว่าประตูยังอยู่ ช่วยรักษาสัญญานั้นทีละก้าว",
    ),
    returnDialogue: w(
      "Pilgrim Renn: Is there still a market in Haven? I want to buy something nobody needs. That's how I'll know the winter ended.",
      "เรนน์ผู้แสวง: เฮเวนยังมีตลาดไหม ข้าอยากซื้อของที่ไม่จำเป็น จะได้รู้ว่าฤดูหนาวจบแล้ว",
    ),
    objectives: [
      rescue(
        "frozen-8-renn",
        w(
          "Help Renn out of the thawing shelter",
          "ช่วยเรนน์ออกจากที่พักที่กำลังละลาย",
        ),
        w(
          "Renn: I can move my hands. Will you wait until my feet catch up?",
          "เรนน์: มือข้าขยับแล้ว จะรอจนเท้าข้าตามทันได้ไหม",
        ),
        620,
        470,
      ),
      escort(
        "frozen-8-teth",
        w(
          "Escort Teth and Renn to the gate shelter",
          "คุ้มกันเทธกับเรนน์ไปที่พักข้างประตู",
        ),
        { x: 650, y: 520 },
        [
          { x: 900, y: 700 },
          { x: 1170, y: 850 },
        ],
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-9",
    worldId: "frozen",
    title: w("The White Marshal", "จอมพลขาว"),
    questTitle: w("An Oath Turned Inward", "คำสัตย์ที่ย้อนทำร้าย"),
    briefing: w(
      "Edda: The White Marshal swore no witness would leave unprotected. Corruption changed 'unprotected' into 'alive.' Break that order before it breaks anyone else.",
      "เอ็ดดา: จอมพลขาวสาบานว่าไม่มีพยานจากไปโดยไร้การคุ้มครอง มลทินเปลี่ยนถ้อยคำเป็นไม่มีใครจากไปมีชีวิต ทำลายคำสั่งก่อนมันทำร้ายใครอีก",
    ),
    returnDialogue: w(
      "Teth: Behind its armor was our own oath, rewritten a word at a time. The engine does not hate us. It has forgotten how to listen.",
      "เทธ: ใต้เกราะคือคำสัตย์ของเรา ถูกเขียนใหม่ทีละคำ แกนจักรไม่ได้เกลียดเรา มันลืมวิธีรับฟัง",
    ),
    objectives: [
      champion(
        "frozen-9-marshal",
        w("Defeat the White Marshal", "โค่นจอมพลขาว"),
      ),
      visit(
        "frozen-9-oath",
        w("Read the original witness oath", "อ่านคำสัตย์พยานฉบับเดิม"),
        1190,
        400,
      ),
      collect(
        "frozen-9-seal",
        "frost-crystal",
        w("Take the unaltered oath seal", "เก็บตราคำสัตย์ที่ยังไม่ถูกแก้"),
        [{ x: 1180, y: 510 }],
      ),
    ],
  },
  {
    schema: 1,
    id: "frozen-10",
    worldId: "frozen",
    title: w("The Unsealed Truth", "ความจริงพ้นผนึก"),
    questTitle: w("Let the Witnesses Walk", "ให้พยานได้เดินต่อ"),
    briefing: w(
      "Edda: I will hold the thaw relay. Face the Witness of Winter, then open the seals in order. We choose to leave the ice together; let the engine hear us.",
      "เอ็ดดา: ข้าจะพยุงหอส่งละลาย เผชิญพยานแห่งเหมันต์แล้วเปิดผนึกตามลำดับ เราเลือกออกจากน้ำแข็งด้วยกัน ให้แกนจักรได้ยิน",
    ),
    returnDialogue: w(
      "Mara: Amel and Edda met beneath our lanterns. Neither spoke for a long time. The final gate is open now. We go below for the one who still holds it shut.",
      "มารา: อาเมลกับเอ็ดดาพบกันใต้โคมของเรา ทั้งคู่เงียบอยู่นาน ประตูสุดท้ายเปิดแล้ว เราจะลงไปหาผู้ที่ยังพยุงมันอยู่",
    ),
    finale: { name: w("Witness of Winter", "พยานแห่งเหมันต์"), phases: 3 },
    objectives: [
      defense(
        "frozen-10-edda",
        w(
          "Protect Edda's final thaw relay",
          "คุ้มกันหอส่งละลายสุดท้ายของเอ็ดดา",
        ),
        18,
      ),
      champion(
        "frozen-10-witness",
        w(
          "Face all three phases of the Witness of Winter",
          "เผชิญพยานแห่งเหมันต์ครบสามช่วง",
        ),
        true,
      ),
      puzzle(
        "frozen-10-release",
        w("Release the witness seals I → II → III", "ปลดผนึกพยาน I → II → III"),
      ),
    ],
  },
];
