import { REGIONS } from "../../game/world/regions";

export const regionsTh: Record<string, string> = {
  ...Object.fromEntries(
    REGIONS.flatMap((r) => [
      [r.name, r.thaiName],
      [r.capital, r.id === "central" ? "ริฟต์เฮเวน" : r.thaiName],
      [`${r.capital} Crossing`, `${r.thaiName} · ลานทางร่วม`],
      [`${r.capital} resident`, `ชาว${r.thaiName}`],
    ]),
  ),
  "FOUR REGIONS · ONE CHARACTER": "สี่ภูมิภาค · ตัวละครเดียว",
  "Explore the city, discover its beacons and follow the roads between four regions.":
    "สำรวจเมือง ค้นพบจุดเดินทาง และออกเดินทางเชื่อมสี่ภูมิภาค",
  "Regional minimap": "แผนที่ย่อประจำภูมิภาค",
  "Open map": "เปิดแผนที่",
  "Local map": "แผนที่พื้นที่",
  "Thailand world map": "แผนที่โลกสี่ภูมิภาค",
  "Map view": "มุมมองแผนที่",
  "Interactive map canvas": "พื้นที่แผนที่แบบโต้ตอบ",
  "Map controls": "ตัวควบคุมแผนที่",
  "Map zoom": "ระดับการขยายแผนที่",
  "Zoom in": "ขยาย",
  "Zoom out": "ย่อ",
  "Center on player": "กึ่งกลางที่ตัวละคร",
  "Fit map": "ดูแผนที่ทั้งหมด",
  "Drag to pan · wheel or pinch to zoom · + / − and arrow keys":
    "ลากเพื่อเลื่อน · หมุนล้อหรือจีบนิ้วเพื่อย่อขยาย · ใช้ + / − และปุ่มลูกศรได้",
  "Map legend": "สัญลักษณ์แผนที่",
  Shops: "ร้านค้า",
  Quests: "ภารกิจ",
  Waypoints: "จุดเดินทาง",
  "Region exits": "ทางออกภูมิภาค",
  "Currently visible": "มองเห็นขณะนี้",
  Explored: "สำรวจแล้ว",
  "Select location": "เลือกสถานที่",
  "Set destination": "ปักหมุดปลายทาง",
  Destination: "ปลายทาง",
  "Clear destination": "ล้างหมุดปลายทาง",
  "CITY DESTINATION": "ปลายทางในเมือง",
  "City resident": "ชาวเมือง",
  "A living city resident. Their marker follows their current position.":
    "ชาวเมืองที่กำลังใช้ชีวิต หมุดจะแสดงตำแหน่งปัจจุบันของพวกเขา",
  "Direction markers indicate a destination, not a verified path through obstacles.":
    "หมุดบอกทิศทางไปยังปลายทาง ยังไม่ได้คำนวณเส้นทางอ้อมสิ่งกีดขวาง",
  "Direction only · follow walkable ground":
    "บอกทิศทาง · เลือกทางเดินที่ผ่านได้",
  "CURRENT REGION": "ภูมิภาคปัจจุบัน",
  "New regional route": "เส้นทางภูมิภาคใหม่",
  "Story route locked": "เส้นทางเนื้อเรื่องยังไม่ปลดล็อก",
  "Regional story": "เรื่องราวประจำภูมิภาค",
  "Original guardian": "ผู้พิทักษ์ประจำถิ่น",
  Defeated: "ปราบแล้ว",
  "Travel via Rift Gate": "เดินทางผ่านประตูริฟต์",
  "Mark nearest Rift Gate": "ปักหมุดประตูริฟต์ในเมือง",
  "First arrival requires a Rift Gate. Later journeys use your discovered beacon.":
    "การเดินทางครั้งแรกต้องเริ่มที่ประตูริฟต์ ครั้งถัดไปใช้จุดเดินทางที่ค้นพบแล้วได้",
  "Regional geography preserves the original Story unlock order. City travel never clears a stage.":
    "ภูมิภาคยังใช้ลำดับปลดล็อกเนื้อเรื่องเดิม การเดินทางระหว่างเมืองไม่ถือว่าผ่านด่าน",
  "Walk to a regional Rift Gate to open a new route.":
    "เดินไปที่ประตูริฟต์ของเมืองเพื่อเปิดเส้นทางใหม่",
  "Unknown map destination.": "ไม่พบปลายทางบนแผนที่",
  "Invalid exploration data.": "ข้อมูลการสำรวจไม่ถูกต้อง",
  "The Frozen Mountain Curse": "คำสาปภูเขาเยือกแข็ง",
  "The Awakening of Sandstone": "การตื่นขึ้นของหินทราย",
  "The Rift Beneath the Capital": "รอยแยกใต้เมืองหลวง",
  "The Corrupted Mangrove": "ป่าชายเลนต้องมลทิน",
  "Layered Lanna roofs, timber galleries, mountain streams and lantern courts":
    "หลังคาซ้อนชั้นกลิ่นอายล้านนา ระเบียงไม้ ลำธารภูเขา และลานโคมไฟ",
  "Sandstone gateways, elevated houses, red-earth lanes and artisan pavilions":
    "ซุ้มประตูหินทราย เรือนยกพื้น ทางดินแดง และศาลาช่างฝีมือ",
  "Riverfront roof tiers, canal bridges, floating trade and lantern plazas":
    "หลังคาริมน้ำซ้อนชั้น สะพานคลอง ตลาดริมน้ำ และลานโคมไฟ",
  "Arcaded coastal shophouses, fishing piers, limestone and mangrove shade":
    "ตึกแถวชายฝั่งมีระเบียง ท่าเรือประมง หินปูน และร่มเงาป่าชายเลน",
  "Layered Lanna roofs": "หลังคาซ้อนชั้นกลิ่นอายล้านนา",
  "Sandstone gateways": "ซุ้มประตูหินทราย",
  "Arcaded coastal shophouses": "ตึกแถวชายฝั่งมีระเบียง",
  "Riverfront roof tiers": "หลังคาริมน้ำซ้อนชั้น",
  "Highland Market": "กาดชาวเขา",
  "Mountain Forge": "โรงตีเหล็กขุนเขา",
  "Herbalist Quarter": "ย่านสมุนไพร",
  "Temple District": "ย่านวิหาร",
  "Adventurer's Lodge": "เรือนนักผจญภัย",
  "Wilderness Expedition Gate": "ประตูสู่ป่าเขา",
  "Cloudleaf Workshop": "โรงงานใบเมฆ",
  "Lantern Temple": "วิหารแสงโคม",
  "Highland Rift Gate": "ประตูริฟต์ขุนเขา",
  "Sandstone Bazaar": "ตลาดหินทราย",
  "Ancient Forge": "โรงตีเหล็กโบราณ",
  "Artisan Village": "หมู่บ้านช่างฝีมือ",
  "Ruins Research Camp": "ค่ายสำรวจโบราณสถาน",
  "Adventurer's Guild Outpost": "กิลด์นักผจญภัยสาขาชายแดน",
  "Expedition Gate": "ประตูคณะสำรวจ",
  "Artisan Pavilion": "ศาลาช่างฝีมือ",
  "The Keeper's Rest": "เรือนพักผู้ดูแล",
  "Ruins Research Guild": "กิลด์สำรวจโบราณสถาน",
  "Sandstone Rift Gate": "ประตูริฟต์หินทราย",
  "Royal Market": "ตลาดหลวง",
  "Grand Blacksmith": "โรงตีเหล็กหลวง",
  "Riverside Trading Port": "ท่าค้าขายริมน้ำ",
  "Crafting Quarter": "ย่านงานช่าง",
  "Adventurer's Guild": "กิลด์นักผจญภัย",
  "Sanctuary District": "ย่านพักพิง",
  "Central Portal Plaza": "ลานประตูเมืองหลวง",
  "Coastal Market": "ตลาดชายฝั่ง",
  "Harbor Forge": "โรงตีเหล็กท่าเรือ",
  "Sailor's Trading Post": "ตลาดชาวเรือ",
  "Tropical Alchemy Shop": "ร้านปรุงยาแดนใต้",
  "Expedition Guild": "กิลด์คณะสำรวจ",
  "Mangrove Wilderness Gate": "ประตูป่าชายเลน",
  "Seafarer's Rest": "เรือนพักชาวเรือ",
  "Mangrove Rift Gate": "ประตูริฟต์ป่าชายเลน",
  "Travelers' Tailor": "ร้านตัดเสื้อนักเดินทาง",
  "Regional Outfitters": "ร้านอุปกรณ์ประจำภูมิภาค",
  "Herbs & Tonics": "สมุนไพรและยาบำรุง",
  "Traveling Supplies": "เสบียงนักเดินทาง",
  "Shared Backpack & Equipment": "กระเป๋าและอุปกรณ์ร่วม",
  "Regional Quest Board": "กระดานภารกิจภูมิภาค",
  "A Traveler's Gift": "ของฝากจากนักเดินทาง",
  "Collected once per character.": "เก็บได้ครั้งเดียวต่อตัวละคร",
  "arrival beacon": "จุดเดินทางขาเข้า",
  "shared well": "บ่อน้ำส่วนรวม",
  "regional direction posts": "ป้ายบอกทางภูมิภาค",
  "The road between homes": "ถนนเชื่อมบ้าน",
  "The four roads meet at the same crystal mark. Travelers leave news here so the next person need not cross an unknown world alone.":
    "ถนนทั้งสี่มาบรรจบที่สัญลักษณ์คริสตัลเดียวกัน นักเดินทางฝากข่าวไว้ เพื่อให้ผู้ตามมาไม่ต้องเผชิญโลกที่ไม่รู้จักเพียงลำพัง",
  "A bell for every arrival": "กระดิ่งรับผู้มาเยือน",
  "Each trader rings the smallest bell before opening a stall. Its quiet note travels farther in the morning mist than a shouted price.":
    "พ่อค้าแต่ละคนสั่นกระดิ่งเล็กก่อนเปิดร้าน เสียงเบานั้นเดินทางผ่านหมอกเช้าได้ไกลกว่าเสียงตะโกนบอกราคา",
  "The mountain's patient fire": "ไฟที่อดทนของขุนเขา",
  "The smith keeps two hearths: one for hardening steel, another for warming travelers. Neither is allowed to go cold during a mountain storm.":
    "ช่างเหล็กรักษาเตาสองเตา เตาหนึ่งชุบเหล็ก อีกเตาให้ความอบอุ่นแก่ผู้เดินทาง ระหว่างพายุภูเขาจะไม่ยอมให้เตาใดดับ",
  "Leaves above the snowline": "ใบไม้เหนือแนวหิมะ",
  "Herbalists hang bundles by the slope where they were gathered. The highest hooks are empty this season; the unnatural frost has climbed too far.":
    "หมอยาแขวนสมุนไพรตามระดับไหล่เขาที่เก็บมา ฤดูนี้ตะขอแถวบนสุดว่างเปล่า เพราะน้ำค้างแข็งผิดธรรมชาติลามขึ้นสูงเกินไป",
  "Lanterns for the absent": "โคมของผู้ยังไม่กลับ",
  "Temple lanterns bear the names of travelers still on the mountain. Their families tend the wicks until each traveler comes home.":
    "โคมวิหารเขียนชื่อผู้เดินทางที่ยังอยู่บนเขา ครอบครัวจะดูแลไส้ตะเกียงจนกว่าพวกเขาจะกลับบ้าน",
  "The lodge's unfinished map": "แผนที่ที่ยังไม่เสร็จ",
  "Red thread marks bridges inspected by the guild. One thread ends at a frozen sanctuary, where the mountain's guardian still keeps a broken promise.":
    "ด้ายแดงทำเครื่องหมายสะพานที่กิลด์ตรวจแล้ว ด้ายเส้นหนึ่งสิ้นสุดที่วิหารเยือกแข็ง ซึ่งผู้พิทักษ์ขุนเขายังเฝ้าคำสัญญาที่แตกสลาย",
  "Beyond the cold gate": "อีกฟากของประตูเย็น",
  "The gate's stone is warm on the village side and rimed with ice beyond. The wardens ask for witnesses before they ask for weapons.":
    "หินประตูฝั่งหมู่บ้านยังอุ่น แต่อีกฝั่งจับน้ำแข็ง ผู้ดูแลขอพยานก่อนจะขออาวุธ",
  "Shade belongs to everyone": "ร่มเงาเป็นของทุกคน",
  "The bazaar's longest awning is held up by mismatched posts. Every village donated one after the old stone arch fell in the drought.":
    "เสาคละแบบค้ำผ้าใบร้านที่ยาวที่สุด ทุกหมู่บ้านบริจาคเสาหนึ่งต้น หลังซุ้มหินเก่าพังในหน้าแล้ง",
  "A tool before a sword": "เครื่องมือก่อนคมดาบ",
  "The oldest mold in the forge makes irrigation fittings. The smith still casts one for every blade sold to the guild.":
    "แม่พิมพ์เก่าที่สุดในโรงเหล็กใช้ทำข้อต่อชลประทาน ทุกครั้งที่ขายดาบให้กิลด์ ช่างยังหล่อข้อต่อเพิ่มอีกชิ้น",
  "Clay that remembers hands": "ดินที่จำมือคนปั้น",
  "Each artisan leaves a thumbprint inside their work. Fragments from the buried city carry the same small mark beneath the sand.":
    "ช่างแต่ละคนทิ้งรอยนิ้วหัวแม่มือไว้ในผลงาน เศษภาชนะจากเมืองใต้ทรายก็มีรอยเล็กแบบเดียวกัน",
  "Water for the next traveler": "น้ำสำหรับคนถัดไป",
  "A covered jar stands by every guest stair. Taking its last cup means filling it before leaving, even when no one is watching.":
    "โอ่งมีฝาปิดตั้งข้างบันไดเรือนรับแขกทุกหลัง ใครดื่มถ้วยสุดท้ายต้องเติมก่อนออกเดินทาง แม้ไม่มีใครมองอยู่",
  "The missing stone line": "บรรทัดหินที่หายไป",
  "Researchers copied the inscriptions before restoring the gateway. The line about sharing water was removed long before the kingdom fell.":
    "นักสำรวจคัดจารึกก่อนซ่อมประตู บรรทัดว่าด้วยการแบ่งน้ำถูกลบทิ้งนานก่อนอาณาจักรล่มสลาย",
  "The waking road": "ถนนที่เริ่มตื่น",
  "Fresh dust trickles from the gate despite the still air. Somewhere beneath the sanctuary, the Colossus has begun to move again.":
    "ฝุ่นใหม่ร่วงจากประตูทั้งที่ลมสงบ ที่ไหนสักแห่งใต้วิหาร ยักษ์หินเริ่มขยับตัวอีกครั้ง",
  "The tide's market hours": "เวลาตลาดของกระแสน้ำ",
  "Stall awnings fold high when the fishing boats return. No bell is needed: the whole street can read the water against the pier.":
    "เมื่อเรือประมงกลับมา ผ้าใบตลาดจะพับสูงขึ้น ไม่ต้องใช้ระฆัง เพราะคนทั้งถนนอ่านระดับน้ำข้างท่าเรือเป็น",
  "Salt and steel": "เกลือกับเหล็ก",
  "The harbor smith stores unfinished blades above the high-water mark. A row of repaired anchors waits outside for boats that share the rescue watch.":
    "ช่างท่าเรือเก็บดาบที่ยังทำไม่เสร็จเหนือรอยน้ำขึ้น สมอที่ซ่อมแล้วเรียงรอเรือซึ่งผลัดเวรกู้ภัยร่วมกัน",
  "A garden between tides": "สวนระหว่างน้ำขึ้นลง",
  "The alchemist grows salt-tolerant herbs in old canoe hulls. One planter has turned black since the mangrove's roots began to whisper.":
    "นักปรุงยาปลูกสมุนไพรทนเค็มในซากเรือเก่า กระบะหนึ่งเปลี่ยนเป็นสีดำตั้งแต่รากโกงกางเริ่มกระซิบ",
  "A light kept seaward": "แสงที่หันหาทะเล",
  "The inn's upper window is never shuttered at night. It once guided one lost crew home; now every crew contributes oil to its lamp.":
    "หน้าต่างชั้นบนของโรงเตี๊ยมไม่เคยปิดตอนกลางคืน มันเคยนำลูกเรือหลงทางกลับบ้าน บัดนี้ลูกเรือทุกลำช่วยกันเติมน้ำมันตะเกียง",
  "The shared sounding rope": "เชือกหยั่งน้ำส่วนรวม",
  "Every guild boat adds its depth marks to one harbor chart. The newest soundings show a channel opening toward the corrupted grove.":
    "เรือกิลด์ทุกลำเพิ่มระดับน้ำที่วัดได้ในแผนที่ท่าเรือฉบับเดียว ข้อมูลล่าสุดเผยร่องน้ำที่เปิดสู่ป่าอันแปดเปื้อน",
  "Where fresh water meets salt": "ที่ซึ่งน้ำจืดพบทะเล",
  "Living mangrove roots hold the gate's foundations. The wardens ask travelers to bring back a healthy seed, not another trophy.":
    "รากโกงกางที่ยังมีชีวิตยึดฐานประตู ผู้ดูแลขอให้นักเดินทางนำเมล็ดสมบูรณ์กลับมา แทนถ้วยรางวัลอีกใบ",
};
