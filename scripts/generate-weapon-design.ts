/** Editable local design review; consumes the real quote, palettes, frames and rig anchors. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  enhancementQuote,
  enhancementOutcome,
} from "../src/game/rpg/enhancement";
import { seededEquipment } from "../src/game/rpg/items";
import { RARITIES } from "../src/game/rpg/content";
import {
  EVOLUTION_TIERS,
  WEAPON_FAMILIES,
} from "../src/game/presentation/weapon-visual";
import {
  bodyFrame,
  handPoint,
  CHARACTER_ART,
  weaponRestAngle,
} from "../src/game/presentation/character";
import { defaultAppearance } from "../src/game/presentation/appearance";
import { CHARACTERS, type CharacterId } from "../src/game/loadout";
const meta = JSON.parse(
  readFileSync("public/assets/characters/weapon-evolution.json", "utf8"),
);
const names = [
  "Riftwood Staff",
  "Sunsteel Blade",
  "Glacial Scepter",
  "Ember Glaive",
];
const finals = [
  "Ancient World Tree Staff",
  "Celestial Sunblade",
  "Frost Sovereign Scepter",
  "Infernal Reaper",
];
const sample = {
  ...seededEquipment("design-sample", "desert-weapon", "rare", 5),
  enhancement: 5,
};
const quote = enhancementQuote(sample);
const failure = enhancementOutcome(sample, () => 0.999);
let roll = 0;
const downgrade = enhancementOutcome({ ...sample, enhancement: 12 }, () =>
  roll++ === 0 ? 0.999 : 0,
);
const svg = (family: string, tier: number) =>
  readFileSync(`art/weapon-evolution/${family}-${tier}.svg`, "utf8");
const swatches = Object.entries(meta.palette as Record<string, string[]>)
  .map(
    ([family, colors]) =>
      `<article><h3>${family}</h3><div class="swatches">${colors.map((color) => `<div style="--swatch:${color}"><i></i><code>${color}</code></div>`).join("")}</div></article>`,
  )
  .join("");
const matrix = WEAPON_FAMILIES.map(
  (family, row) =>
    `<div class="matrix-row"><h3>${names[row]}<small>${finals[row]}</small></h3>${EVOLUTION_TIERS.map((name, tier) => `<figure><div class="pixel-cell">${svg(family, tier)}</div><figcaption>+${tier * 3} · ${name}</figcaption><div class="native">${svg(family, tier)}<span>32 × 32 · frame ${row * 6 + tier}</span></div></figure>`).join("")}</div>`,
).join("");
const actors = (Object.keys(CHARACTERS) as CharacterId[])
  .flatMap((character) =>
    WEAPON_FAMILIES.map(
      (family, row) =>
        `<figure><div class="actor" data-character="${character}" data-row="${row}">${defaultAppearance(
          character,
        )
          .layers.map(
            (layer) =>
              `<div class="body" data-slot="${layer.slot}" data-depth="${layer.z}" style="background-image:url(../../public${layer.path});z-index:${layer.z}"></div>`,
          )
          .join(
            "",
          )}<div class="held">${svg(family, 5)}</div></div><figcaption>${CHARACTERS[character].name}<small>${names[row]}</small></figcaption></figure>`,
    ),
  )
  .join("");
const rig = Object.fromEntries(
  (Object.keys(CHARACTERS) as CharacterId[]).map((character) => [
    character,
    Object.fromEntries(
      CHARACTER_ART.directions.map((facing) => [
        facing,
        Object.fromEntries(
          (["idle", "walk", "attack"] as const).map((pose) => [
            pose,
            Array.from({ length: 12 }, (_, i) => {
              const frame = bodyFrame(facing, pose, i * 120);
              return {
                frame,
                angle: weaponRestAngle(facing),
                hand: handPoint(
                  character,
                  facing,
                  pose === "attack",
                  frame % 12,
                ),
              };
            }),
          ]),
        ),
      ]),
    ),
  ]),
);
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NowRift — Weapon Evolution System</title>
<style>
:root{color-scheme:dark;--bg:#09171d;--panel:#10262a;--line:#415347;--ink:#e8ddba;--muted:#a6b5a7;--gold:#d6ab59;--space:16px}*{box-sizing:border-box}body{margin:0;padding:48px;background:var(--bg);color:var(--ink);font:14px/1.6 system-ui}h1,h2,h3{font-family:Georgia,serif;font-weight:400}h1{font-size:48px;margin:12px 0}h2{font-size:30px}h3{font-size:20px}small{display:block;color:var(--muted);font:12px/1.6 system-ui}p{max-width:900px;color:var(--muted)}header,section{max-width:1400px;margin:auto auto 64px}section{border-top:1px solid var(--line);padding-top:24px}.eyebrow{color:var(--gold);font-size:11px;letter-spacing:3px}.swatches{display:flex;gap:16px;flex-wrap:wrap}.swatches i{display:block;width:48px;height:32px;background:var(--swatch)}code{font-size:11px}.matrix-scroll{overflow:auto}.matrix-row{display:grid;grid-template-columns:180px repeat(6,minmax(140px,1fr));min-width:1100px;border-top:1px solid var(--line);align-items:center}figure{margin:16px 8px;text-align:center}.pixel-cell{height:144px;display:grid;place-items:center;background:repeating-conic-gradient(#122a2d 0% 25%,#10262a 0% 50%) 0/16px 16px}.pixel-cell svg{width:128px;height:128px;image-rendering:pixelated}.native{display:flex;align-items:center;justify-content:center;gap:8px;font-size:10px;color:var(--muted);margin-top:12px}.native svg{width:32px;height:32px}.spec-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.spec-card{background:var(--panel);border:1px solid var(--line);padding:var(--space)}.compare{display:grid;grid-template-columns:1fr 24px 1fr;align-items:center}.compare svg{width:96px;height:96px}.tag{display:inline-block;border:1px solid var(--gold);padding:4px 12px;font-size:11px}.inventory{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.inventory figure{margin:0;border:1px solid var(--line);border-bottom:2px solid ${RARITIES.rare.color};padding:12px}.inventory svg{width:64px;height:64px}.actors{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.actor{isolation:isolate;position:relative;margin:auto;width:96px;height:96px}.actor .body{position:absolute;inset:0;background-size:2496px 384px;image-rendering:pixelated}.held{transform-origin:50% 75%;position:absolute;width:64px;height:64px;transform:translate(-50%,-75%);image-rendering:pixelated}.held svg{width:64px;height:64px}button,select{background:var(--panel);color:var(--ink);padding:10px 16px;border:1px solid var(--line);margin:4px}label{display:inline-block;margin-right:16px}.mobile .actors{width:360px;max-width:100%;grid-template-columns:repeat(2,1fr);border:1px solid var(--line)}a{color:var(--gold)}@media(max-width:700px){body{padding:20px}.spec-columns{grid-template-columns:1fr}.inventory{grid-template-columns:repeat(3,1fr)}.actors{grid-template-columns:repeat(2,1fr)}h1{font-size:32px}}@media(prefers-reduced-motion:reduce){.body,.held{animation:none!important}}
</style>
<header><div class="eyebrow">NOWRIFT / EDITABLE DESIGN SPECIFICATION / 01</div><h1>Weapon Evolution System</h1><p>Four identities. Six authored forms. One persistent enhancement value. This local, editable HTML/SVG specification is the fallback for unavailable Figma native canvas tools. It is not a Figma file. Art is original CC0, with integer-grid editable source for every sprite.</p><nav><a href="#direction">01 Art direction</a> · <a href="#matrix">02 Matrix</a> · <a href="#upgrade">03 Upgrade interaction</a> · <a href="#inventory">04 Inventory</a> · <a href="#rigs">05 Character checks</a></nav></header>
<section id="direction"><span class="eyebrow">BOARD 01</span><h2>Material, silhouette & restraint</h2><div class="spec-columns"><article><h3>Pixel contract</h3><p>32 × 32 transparent cells; atlas 192 × 128. One clear pixel of transparent perimeter. Grip at (16,24); upright construction. Native 1× and review 4×; rig scale matches the existing 48px layered anatomy with 32px held art. No resampling, gradients, baked bloom or palette swaps in place of form changes.</p></article><article><h3>Family identity</h3><p>Forked heartwood and a suspended seed; split sunmetal and a luminous spine; faceted ice and a hovering crown; hooked volcanic metal and an open molten seam. Iron, wood, stone, leather and emissive highlights have distinct clusters.</p></article><article><h3>Light & VFX</h3><p>T0 plain. T1 material polish. T2 two-pixel glint. T3 controlled pulse. T4 two ambient pixels. T5 three ambient pixels and a brief attack arc. Low quality removes particles and trails. Reduced motion removes decorative animation.</p></article></div>${swatches}</section>
<section id="matrix"><span class="eyebrow">BOARD 02</span><h2>Evolution matrix</h2><p>Every frame changes physical structure. Rows retain their combat family. Rarity is a secondary trim and never changes the atlas frame. Both enlarged and native SVG versions remain individually editable.</p><div class="matrix-scroll">${matrix}</div></section>
<section id="upgrade"><span class="eyebrow">BOARD 03</span><h2>The next success has a shape</h2><div class="spec-columns"><article class="spec-card"><span class="eyebrow">SUNSTEEL BLADE +5 / RARE</span><h3>Awakened at +6</h3><div class="compare"><figure>${svg("sword", 1)}<figcaption>Current · Reinforced</figcaption></figure><span>→</span><figure>${svg("sword", 2)}<figcaption>Next · Awakened</figcaption></figure></div><p>1 successful enhancement remaining. Compare display: 96px art / 16px inset / 12px gap / 18px tier label.</p><span class="tag">${quote.effective * 100}% real success chance</span><p>${quote.gold} gold · ${Object.entries(
  quote.materials,
)
  .map(([id, n]) => n + " " + id)
  .join(
    " · ",
  )}</p><p>Generated from enhancementQuote() with the actual rare +5 item. Game UI always quotes the selected live item.</p></article><article class="spec-card"><h3>Committed success</h3><p>After the save commits: old silhouette → stepped forge pulse → new silhouette → tier label. 2.4 seconds total, Continue / Escape / close available immediately. Reduced motion reveals the new form without animation. Inventory and the held layer derive from the committed instance.</p><h3>Failure</h3><p>Real +5 outcome: +${failure.after}, pity ${failure.pity}. No evolution reveal. Costs and chance remain governed by existing rules.</p></article><article class="spec-card"><h3>Downgrade</h3><p>Real +12 failed outcome with a downgrade roll: +${downgrade.after}, returning Mythic → Ascendant. No success animation. The canonical appearance follows the saved enhancement.</p><h3>Reading order</h3><p>Name → rarity → rank → form → next milestone → live probability → gold/materials → risk → confirmation. On mobile, comparison figures share one row within the existing scrolling detail panel.</p></article></div></section>
<section id="inventory"><span class="eyebrow">BOARD 04</span><h2>The same item everywhere</h2><p>Rare accent is ${RARITIES.rare.color}, independent of the six enhancement forms. Future forms are explicitly labeled locked previews. These examples never create inventory instances or change progression.</p><div class="inventory">${EVOLUTION_TIERS.map((name, tier) => `<figure>${svg("sword", tier)}<figcaption>Sunsteel +${tier * 3}<small>Rare · ${name}</small><small>${tier < 5 ? "Next form +" + (tier + 1) * 3 : "Final evolution"}</small></figcaption></figure>`).join("")}</div></section>
<section id="rigs"><span class="eyebrow">BOARD 05</span><h2>One grip. Every wanderer.</h2><p>Directional hand anchors and pose frames below are generated from the production character helpers. These are review controls for original assets, not an alternate game implementation. Actual Phaser movement, attacks and checkpoint rendering are exercised by browser tests.</p><label>Direction <select id="facing">${CHARACTER_ART.directions.map((d) => "<option>" + d + "</option>").join("")}</select></label><label>Pose <select id="pose"><option>idle</option><option>walk</option><option>attack</option></select></label><button id="mobile">Toggle 360px preview</button><div class="actors">${actors}</div></section>
<footer><p>Source: scripts/generate-weapon-design.ts · Art source: scripts/generate-weapon-evolution.py and art/weapon-evolution/*.svg. No Figma URL exists for this fallback. Production CSS measurements are recorded above.</p></footer>
<script>const rigs=${JSON.stringify(rig)};const facing=document.querySelector('#facing'),pose=document.querySelector('#pose');let tick=0;function update(){document.querySelectorAll('.actor').forEach(actor=>{const f=facing.value,p=pose.value;const data=rigs[actor.dataset.character][f][p][tick%12],bodies=actor.querySelectorAll('.body'),held=actor.querySelector('.held');bodies.forEach(body=>{body.style.backgroundPosition=(-data.frame%26*96)+'px '+(-Math.floor(data.frame/26)*96)+'px';body.style.zIndex=body.dataset.slot==='back'&&f==='up'?6:body.dataset.depth;});held.style.left=((24+data.hand.x)*2)+'px';held.style.top=((36+data.hand.y)*2)+'px';held.style.zIndex=f==='up'?-2:13;held.style.transform='translate(-50%,-75%) rotate('+(p==='attack'?((tick%3-1)*25)+'deg':data.angle+'rad')+')';held.querySelector('svg').style.scale=f==='left'?'-1 1':'1';});tick++;}setInterval(()=>{if(!matchMedia('(prefers-reduced-motion:reduce)').matches)update()},120);facing.onchange=pose.onchange=update;document.querySelector('#mobile').onclick=()=>document.querySelector('#rigs').classList.toggle('mobile');update();</script></html>`;
mkdirSync("docs/design", { recursive: true });
writeFileSync("docs/design/weapon-evolution.html", html);
console.log(
  "Generated five editable HTML/SVG review boards from production contracts.",
);
