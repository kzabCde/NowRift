/** Editable local boards generated from production offers, stat previews and layered art. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { emptyProgress, type Progress } from "../src/game/campaign/progression";
import { STAGES } from "../src/game/campaign/content";
import { initializeRpg } from "../src/game/rpg/profile";
import {
  ITEMS,
  OUTFITTER_OFFERS,
  RARITIES,
  statNames,
  WEARABLE_SLOTS,
} from "../src/game/rpg/content";
import { SLOTS, type StatKey } from "../src/game/rpg/model";
import { seededEquipment } from "../src/game/rpg/items";
import { shopEquipment } from "../src/game/rpg/actions";
import { previewEquipment, formatEquipmentStat } from "../src/game/rpg/preview";
import { purchaseEligibility } from "../src/game/rpg/shop";
import {
  calculateStats,
  itemStats,
  resolveEquippedWeapon,
} from "../src/game/rpg/stats";
import { resolveAppearance } from "../src/game/presentation/appearance";
import { resolveWeaponVisual } from "../src/game/presentation/weapon-visual";
import { handPoint, weaponRestAngle } from "../src/game/presentation/character";
import { usedSlots } from "../src/game/rpg/inventory";

const profile = initializeRpg(emptyProgress());
profile.gold = 850;
profile.clears = STAGES.map((stage) => `${stage.id}:normal`);
const offer = OUTFITTER_OFFERS.find(
  (entry) => entry.item === "desert-pants" && entry.rarity === "rare",
)!;
const item = shopEquipment(offer.id, "design-candidate")!;
const preview = previewEquipment(profile, item);
const svg = (id: string) => readFileSync(`art/outfitters/${id}.svg`, "utf8");
const icon = (id: string) => {
  if (id.endsWith("-weapon")) {
    const families: Record<string, string> = {
      forest: "staff",
      desert: "sword",
      frozen: "scepter",
      infernal: "glaive",
    };
    return readFileSync(
      `art/weapon-evolution/${families[id.split("-")[0]]}-0.svg`,
      "utf8",
    );
  }
  if (WEARABLE_SLOTS.some((slot) => id.endsWith("-" + slot))) return svg(id);
  const frame = ITEMS[id].icon;
  return `<span class="legacy-icon" style="background-position:-${(frame % 8) * 40}px -${Math.floor(frame / 8) * 40}px"></span>`;
};
function actor(p: Progress) {
  const appearance = resolveAppearance(p),
    weapon = resolveEquippedWeapon(p)!,
    visual = resolveWeaponVisual(weapon)!,
    hand = handPoint("wanderer", "down", false, 0);
  return `<div class="actor">${appearance.layers.map((layer) => `<span style="background-image:url(../../public${layer.path});z-index:${layer.z}" title="${layer.slot}: ${layer.definitionId ?? "customization"}"></span>`).join("")}<i style="background-position:-${visual.frame * 96}px 0;left:${(24 + hand.x) * 3}px;top:${(36 + hand.y) * 3}px;rotate:${weaponRestAngle("down")}rad"></i></div>`;
}
function compareRows(from: Progress, to: Progress) {
  const before = calculateStats(from),
    after = calculateStats(to);
  return (Object.keys(statNames) as StatKey[])
    .map((key) => {
      const delta =
        Math.abs(after[key] - before[key]) < 1e-9
          ? 0
          : after[key] - before[key];
      return `<tr><th>${statNames[key]}</th><td>${formatEquipmentStat(key, before[key])}</td><td>${formatEquipmentStat(key, after[key])}</td><td class="${delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral"}">${delta === 0 ? "—" : (delta > 0 ? "+" : "") + formatEquipmentStat(key, delta)}</td></tr>`;
    })
    .join("");
}
const comparisons = compareRows(profile, preview);
const currentPants = seededEquipment(
  "design-current-pants",
  "frozen-pants",
  "legendary",
  10,
);
currentPants.enhancement = 6;
const comparisonProfile = previewEquipment(profile, currentPants);
const comparisonPreview = previewEquipment(comparisonProfile, item);
const bonuses = Object.entries(itemStats(item))
  .map(
    ([key, value]) =>
      `<div>${statNames[key as StatKey]} <b>+${formatEquipmentStat(key as StatKey, value)}</b></div>`,
  )
  .join("");
const paperdoll = `<div class="paperdoll">${actor(preview)}${[
  "helmet",
  "weapon",
  "armor",
  "ring",
  "pants",
  "necklace",
  "boots",
]
  .map((slot) => {
    const equipment = preview.rpg!.equipment.find(
      (owned) =>
        owned.id === preview.rpg!.equipped[slot as (typeof SLOTS)[number]],
    );
    return `<div class="slot ${slot === "pants" ? "selected" : ""}"><small>${slot}</small>${equipment ? icon(equipment.definitionId) : "<b>—</b>"}<small>${equipment ? "+" + equipment.enhancement : "Empty"}</small></div>`;
  })
  .join("")}</div>`;
const catalog = OUTFITTER_OFFERS.filter(
  (entry) => entry.item.endsWith("-pants") && entry.rarity === "rare",
)
  .map(
    (entry) =>
      `<article class="gear ${entry.id === offer.id ? "selected" : ""}" style="--rarity:${RARITIES[entry.rarity!].color}">${icon(entry.item)}<h3>${ITEMS[entry.item].name}</h3><small>${RARITIES[entry.rarity!].name} · Item level ${entry.level}</small><b>${entry.price} Gold</b></article>`,
  )
  .join("");
const emptyWallet = { ...profile, gold: 0 },
  fullBag = structuredClone(profile);
while (usedSlots(fullBag) < fullBag.rpg!.capacity)
  fullBag.rpg!.equipment.push(
    seededEquipment(
      "design-bag-" + fullBag.rpg!.equipment.length,
      "forest-pants",
      "common",
      1,
    ),
  );
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NowRift — Rift Outfitters & Equipment</title>
<style>
:root{color-scheme:dark;--bg:#0d1919;--panel:#152522;--line:#56614b;--ink:#e6dcc0;--gold:#d6ba7a;--muted:#b2bca9;--good:#93caa4;--bad:#e49d88;--space:16px}*{box-sizing:border-box}body{background:var(--bg);color:var(--ink);font:14px/1.7 system-ui;margin:0;padding:40px}header,section,footer{max-width:1400px;margin:0 auto 64px}section{border-top:1px solid var(--line);padding-top:32px}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.2}h1{font-size:48px}h2{font-size:32px}h3{font-size:22px}p{max-width:900px;color:var(--muted)}a{color:var(--gold)}nav{display:flex;gap:24px;flex-wrap:wrap}.eyebrow{color:var(--gold);letter-spacing:3px;font-size:10px}small{font-size:11px;color:var(--muted)}.panel,.gear,.state{padding:var(--space);border:1px solid var(--line);background:var(--panel)}.shop-header{display:flex;justify-content:space-between;gap:24px;align-items:center}.wallet{display:flex;gap:24px}.wallet b{display:block;font:28px Georgia;color:var(--gold)}.dialogue{border-block:1px solid var(--line);padding:16px}.shop{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;align-items:start}.catalog{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gear{text-align:center;border-color:var(--rarity)}.gear svg{display:block;width:64px;height:64px;margin:auto;image-rendering:pixelated}.gear h3{font-size:18px}.gear b{display:block;color:var(--gold);font-size:12px}.selected{outline:1px solid var(--gold);background:#344337}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}.tab{border:1px solid var(--line);padding:12px;text-align:center;font-size:12px}.paperdoll{position:relative;display:grid;grid-template-columns:64px 64px;justify-content:space-between;gap:12px;min-height:376px;margin-top:20px}.paperdoll .actor{position:absolute;top:96px;left:50%;transform:translateX(-50%)}.slot{min-height:80px;display:flex;flex-direction:column;align-items:center;border:1px solid var(--line);padding:4px;background:#10201ecc;z-index:20}.slot svg{width:40px;height:40px;image-rendering:pixelated}.slot small{text-transform:uppercase;font-size:8px}.actor{position:relative;width:144px;height:144px;isolation:isolate}.actor>span{position:absolute;inset:0;background-size:3744px 576px;image-rendering:pixelated}.actor i{position:absolute;width:96px;height:96px;transform:translate(-50%,-75%);background:url(../../public/assets/characters/weapon-evolution.png);background-size:576px 384px;image-rendering:pixelated;z-index:13}.legacy-icon{display:block;width:40px;height:40px;background-image:url(../../public/assets/items/atlas.png);background-size:320px 240px;image-rendering:pixelated}.candidate{text-align:center}.candidate>svg{width:64px;height:64px;image-rendering:pixelated}.candidate h3{margin:12px 0}.bonuses>div{display:flex;justify-content:space-between;font-size:12px}.bonuses b{color:var(--gold)}table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}th,td{padding:10px 4px;border-bottom:1px solid #56614b66;text-align:right;font-weight:400}th:first-child{text-align:left}.positive{color:var(--good)}.negative{color:var(--bad)}.neutral{color:var(--muted)}.primary{display:block;text-align:center;padding:16px;background:var(--gold);color:#152522;font-weight:700;margin-top:20px;min-height:48px}.columns{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.states{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.state h3{font-size:20px}.state p{font-size:12px}.matrix{display:grid;grid-template-columns:140px repeat(4,1fr);gap:16px;align-items:center}.matrix figure{margin:0;border:1px solid var(--line);padding:16px;text-align:center}.matrix svg{display:block;width:96px;height:96px;margin:auto;image-rendering:pixelated}.matrix .native svg{width:32px;height:32px}.matrix h3{font-size:20px}.matrix figcaption{font-size:11px}.tokens{display:flex;gap:24px;flex-wrap:wrap}.tokens i{display:block;width:48px;height:32px;background:var(--swatch)}button{background:var(--panel);color:var(--ink);min-height:44px;padding:12px 20px;border:1px solid var(--gold);cursor:pointer}.mobile .shop{max-width:390px;grid-template-columns:1fr;margin:auto}.mobile .shop-header{flex-direction:column;align-items:flex-start}.mobile .preview-panel,.mobile .detail-panel{border-color:var(--gold)}.mobile .primary{position:sticky;bottom:0}.mobile .shop-header,.mobile .dialogue{max-width:390px;margin-inline:auto}@media(max-width:900px){body{padding:20px}h1{font-size:32px}.shop,.columns{grid-template-columns:1fr}.states{grid-template-columns:1fr 1fr}.matrix{grid-template-columns:100px repeat(4,140px);width:760px}.matrix-scroll{overflow:auto}.shop-header{flex-wrap:wrap}}@media(max-width:460px){.states{grid-template-columns:1fr}}
</style>
<header><span class="eyebrow">NOWRIFT / EDITABLE DESIGN SPECIFICATION</span><h1>Rift Outfitters & Equipment</h1><p>Five editable HTML/SVG boards using original pixel art, production shop offers, authoritative stat calculations and the same modular appearance resolver as the game. Figma MCP canvas tools are unavailable in this session; this is a local design specification, and no Figma file or URL was created.</p><nav><a href="#a">A Merchant shop</a><a href="#b">B Equipment</a><a href="#c">C Compare</a><a href="#d">D Interaction</a><a href="#e">E Art catalog</a></nav></header>
<section id="a"><span class="eyebrow">BOARD A / MERCHANT SHOP</span><h2>Made for the road ahead.</h2><p>Desktop: catalog → layered try-on → bonuses and purchase. Mobile: scrolling catalog → accessible full-screen detail sheet with a close control, trapped focus, scroll and a purchase action of at least 44px. The live game opens that sheet when a card is selected.</p><button id="mobile" aria-pressed="false">Toggle 390px mobile board</button><div class="shop-header"><div><span class="eyebrow">ARMOR & CLOTHING</span><h2>RIFT OUTFITTERS</h2></div><div class="wallet"><span>Gold balance<b>${profile.gold}</b></span><span>Bag capacity<b>${usedSlots(profile)} / ${profile.rpg!.capacity}</b></span></div></div><p class="dialogue"><b>Talia · Outfitter</b> — Try a new fit. Your gold stays yours until you confirm a purchase.</p><div class="shop"><div class="panel"><div class="tabs"><div class="tab selected">Shop stock</div><div class="tab">Owned gear</div></div><div class="tabs">${["Chest armor", "Headwear", "Legwear", "Footwear"].map((name) => `<div class="tab ${name === "Legwear" ? "selected" : ""}">${name}</div>`).join("")}</div><p>All collections / Rare</p><div class="catalog">${catalog}</div></div><div class="panel preview-panel"><span class="eyebrow">TRY-ON PREVIEW</span>${paperdoll}<p>Preview only. Equip an owned item to change your saved build.</p></div><div class="panel detail-panel"><div class="candidate">${icon(item.definitionId)}<small>Rare · Item level ${item.level}</small><h3>${ITEMS[item.definitionId].name} +0</h3></div><p>Currently equipped: Empty</p><h3>Item bonuses</h3><div class="bonuses">${bonuses}</div><h3>Build comparison</h3><table><thead><tr><th>Stat</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${comparisons}</tbody></table><div class="primary">Buy for ${offer.price} gold</div><small>${purchaseEligibility(profile, offer) ?? "Eligible: actual guardian clear recorded, bag has space and gold is sufficient."}</small></div></div></section>
<section id="b"><span class="eyebrow">BOARD B / CHARACTER EQUIPMENT</span><h2>Seven slots. One shared inventory.</h2><div class="columns"><div class="panel">${paperdoll}</div><article><h3>Independent layers</h3><p>The candidate changes only legwear. Chest armor, headwear, footwear, weapon, jewelry, skin, face and hair retain their own definitions. The preview carries a display-only copy of the item; confirming an equip writes the real owned instance through the existing command.</p><p>48px source frames. Pivot (24,36). All 104 animation frames and all three archetypes use synchronized modular atlases.</p></article><article><h3>Interaction variants</h3><p>Selected: gold inset edge. Empty: em dash and “Empty.” Equipped: icon, enhancement and protected sale action. Owned: equip, forge and eligible sell. Rarity color is secondary to collection silhouette.</p><p>Paperdoll slot buttons select the four merchant categories. Weapon, ring and necklace tiles retain their existing inventory behavior and ownership.</p></article></div></section>
<section id="c"><span class="eyebrow">BOARD C / GEAR COMPARISON</span><h2>Read the whole build.</h2><div class="columns"><article class="panel"><h3>Current · Frostguard Legplates +6</h3>${actor(comparisonProfile)}<p>Legendary · level 10 · +6. This owned item is removed from the candidate build before its replacement is applied.</p></article><article class="panel"><h3>Candidate · ${ITEMS[item.definitionId].name}</h3>${actor(comparisonPreview)}<p>Rare · level ${item.level} · +0. Fixed shop affixes are the same rolls the player receives.</p></article><article class="panel"><h3>Real numeric comparison</h3><table><thead><tr><th>Stat</th><th>Before</th><th>After</th><th>Change</th></tr></thead><tbody>${compareRows(comparisonProfile, comparisonPreview)}</tbody></table></article></div><p><span class="positive">Green: improvement +</span> · <span class="negative">Red: reduction −</span> · <span class="neutral">Neutral: no change —</span>. The sign and value accompany color. Totals include existing class, equipment, permanent upgrades and stat caps.</p></section>
<section id="d"><span class="eyebrow">BOARD D / MERCHANT INTERACTION</span><h2>Every action follows ownership.</h2><div class="states">${[
  [
    "01 Dialogue",
    "Talia offers four categories. Map, sign and contextual interaction reuse the existing market landmark.",
  ],
  [
    "02 Select",
    `${ITEMS[item.definitionId].name} · Rare · level ${item.level}. Only the preview changes.`,
  ],
  [
    "03 Confirm purchase",
    `${offer.price} Gold · Confirm / Cancel. The quoted offer, expected revision and unique receipt go through the existing transaction.`,
  ],
  [
    "04 Purchase success",
    `Purchase complete. Wallet ${profile.gold - offer.price} Gold. “Inspect owned copy” opens the new instance, then “Equip this item” applies it.`,
  ],
  [
    "05 Not enough gold",
    purchaseEligibility(emptyWallet, offer)! +
      " The buy action is disabled; command validation also rejects it.",
  ],
  [
    "06 Full inventory",
    purchaseEligibility(fullBag, offer)! +
      " Selling or freeing a bag slot restores eligibility.",
  ],
  [
    "07 Equip action",
    "Equip recalculates saved stats and the live layered rig. Unequip removes bonuses. Forge opens the existing selected-item blacksmith.",
  ],
  [
    "08 Confirm sale",
    "Eligible owned item → real sale quote → confirmation → committed inventory and gold. Equipped, favorite and locked items remain protected.",
  ],
]
  .map(
    ([title, body]) =>
      `<article class="state"><h3>${title}</h3><p>${body}</p></article>`,
  )
  .join("")}</div></section>
<section id="e"><span class="eyebrow">BOARD E / ORIGINAL PIXEL ART CATALOG</span><h2>Four material identities.</h2><p>Original editable SVG pixels at 32px. Enlarged 3× and native 1× views. Existing equipment IDs remain stable. Legwear and footwear use independently authored silhouettes for each biome; source generation emits synchronized 48px modular animation layers.</p><div class="matrix-scroll"><div class="matrix"><small>Collection</small>${WEARABLE_SLOTS.map((slot) => `<h3>${slot}</h3>`).join("")}${["forest", "desert", "frozen", "infernal"].map((world) => `<h3>${world}</h3>${WEARABLE_SLOTS.map((slot) => `<figure>${svg(`${world}-${slot}`)}<figcaption>${ITEMS[`${world}-${slot}`].name}</figcaption><div class="native">${svg(`${world}-${slot}`)}</div></figure>`).join("")}`).join("")}</div></div><div class="columns"><p>Forest: stitched leather, bark panels and green cloth.<br>Desert: bronze plates, wrapped woven fabric and gold edging.</p><p>Frozen: cold steel, pale fabric and cyan facets.<br>Infernal: volcanic plates, crimson cloth and ember seams.</p><p>Light from upper left. Controlled palette, transparent gutters and binary alpha. Nearest-neighbor rendering. Rarity shapes follow existing common/uncommon, rare, epic/legendary tiers.</p></div><h3>Reusable design tokens</h3><div class="tokens">${[
  ["Canvas", "#0d1919"],
  ["Panel", "#152522"],
  ["Ink", "#e6dcc0"],
  ["Selected / action", "#d6ba7a"],
  ["Improvement", "#93caa4"],
  ["Reduction", "#e49d88"],
]
  .map(
    ([name, color]) =>
      `<span><i style="--swatch:${color}"></i><small>${name}<br>${color}</small></span>`,
  )
  .join(
    "",
  )}</div><p>Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32px. Actions ≥44px. Serif item names, system UI supporting text, tabular stat numbers. English and Thai production dictionaries share the same semantic controls.</p></section>
<footer><p>Source: scripts/generate-outfitters-design.ts · Art: scripts/generate-outfitters.py and art/outfitters/*.svg · Original CC0. These are editable local HTML/SVG boards, not native Figma components. The live React and Phaser feature is covered separately by unit and browser tests.</p></footer><script>document.querySelector('#mobile').onclick=event=>{const board=document.querySelector('#a');const active=board.classList.toggle('mobile');event.currentTarget.setAttribute('aria-pressed',String(active));};</script></html>`;
mkdirSync("docs/design", { recursive: true });
writeFileSync("docs/design/outfitters.html", html);
console.log(
  "Generated five editable Rift Outfitters boards from production data.",
);
