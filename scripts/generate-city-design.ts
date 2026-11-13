/** Editable city boards, generated from the exact production geometry and asset registry. */
import { mkdirSync, writeFileSync } from "node:fs";
import { CITY, DISTRICTS, LANDMARKS, SOLIDS } from "../src/game/world/city";
import { WAYPOINTS } from "../src/game/world/waypoints";
import { ASSETS } from "../src/game/presentation/assets";
import palette from "../art/haven-city/palette.json";

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const colors = [
  "#d8ce9d",
  "#e4a164",
  "#dcc281",
  "#8dbb94",
  "#a3b8cc",
  "#c5a2d2",
  "#8dd6d0",
  "#d1ad76",
  "#d29e87",
];
const used = new Set([
  ...LANDMARKS.map((l) => "haven-" + l.art),
  ...CITY.structures.map((s) => "haven-" + s.art),
  ...CITY.arcades.map((s) => "haven-" + s.art),
  ...["tiles", "props", "trees", "fx", "residents"].map(
    (s) => "haven-city-" + s,
  ),
  "haven-terrain",
]);
const inventory = ASSETS.filter((a) => a.bundle === "haven").map((a) => ({
  path: a.path,
  key: a.key,
  width: a.width,
  height: a.height,
  frame: [a.frameWidth, a.frameHeight],
  frames: a.frameCount,
  bytes: a.bytes,
  use: used.has(a.key)
    ? a.key === "haven-terrain"
      ? "Town Map overview only"
      : "Live city"
    : "Retained legacy / other presentation",
  source:
    a.key.startsWith("haven-city-") || a.key === "haven-terrain"
      ? "scripts/generate-haven-city.py"
      : "scripts/generate-pixel-art.py",
}));
mkdirSync("docs/design", { recursive: true });
writeFileSync(
  "docs/haven-city-assets.json",
  JSON.stringify(
    {
      schema: 1,
      layoutRevision: CITY.schema,
      dimensions: [CITY.width, CITY.height],
      nativeTile: [16, 16],
      worldScale: 2,
      authoredSource: [
        "src/game/world/city-layout.json",
        "scripts/generate-haven-city.py",
        "art/haven-city/palette.json",
      ],
      assets: inventory,
      remaining: [
        "Private houses and annex doors are scenic, without interiors.",
        "Training is a real weapon test; the reserved duel ring has no PvP implementation.",
        "NPC schedules and lighting are local cosmetic presentation, not a shared multiplayer simulation.",
        "Figma tools were unavailable; these editable HTML/SVG boards are the design deliverable.",
      ],
    },
    null,
    2,
  ) + "\n",
);
const geometry = `<svg viewBox="0 0 ${CITY.width} ${CITY.height}" role="img" aria-label="Expanded Rift Haven production layout">
<image href="../../public/assets/haven/terrain.png" width="${CITY.width}" height="${CITY.height}" style="image-rendering:pixelated"/>
<g id="districts">${DISTRICTS.map((d, i) => `<polygon points="${d.polygon.map((p) => p.x + "," + p.y).join(" ")}" fill="${colors[i]}22" stroke="${colors[i]}" stroke-width="8"/>`).join("")}</g>
<g id="roads" hidden>${CITY.roads.map((r) => `<polyline points="${r.points.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#e8dda8" stroke-width="${r.width}" stroke-linecap="round" opacity=".65"/>`).join("")}</g>
<g id="solids" hidden>${SOLIDS.map((s) => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#f4917499" stroke="#f9b395" stroke-width="3"/>`).join("")}</g>
${WAYPOINTS.map((w, i) => `<g class="waypoint" tabindex="0" role="button" aria-label="${escape(w.name)}" data-district="${w.district}" transform="translate(${w.spawn.x} ${w.spawn.y})"><circle r="57" fill="#183936" stroke="${colors[DISTRICTS.findIndex((d) => d.id === w.district)]}" stroke-width="8"/><text text-anchor="middle" y="19" font-size="54" fill="#f0dfad">${i + 1}</text></g>`).join("")}
<circle cx="${CITY.spawn.x}" cy="${CITY.spawn.y}" r="18" fill="#fff3c8"/><path d="M${CITY.return.x - 18} ${CITY.return.y}h36m-18-18v36" stroke="#f4dba2" stroke-width="8"/>
</svg>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NowRift — Expanded Rift Haven</title>
<style>
:root{color-scheme:dark;--bg:#0e1c1b;--panel:#172d29;--ink:#e5ddc0;--muted:#b3c2ac;--gold:#d5bb83;--line:#647361}*{box-sizing:border-box}body{margin:0;padding:32px;background:var(--bg);color:var(--ink);font:14px/1.7 system-ui}header,section,footer{max-width:1400px;margin:0 auto 48px}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.2}h1{font-size:46px}h2{font-size:32px}h3{font-size:23px}p{color:var(--muted);max-width:900px}a{color:var(--gold)}nav,.controls{display:flex;gap:18px;flex-wrap:wrap}section{padding-top:24px;border-top:1px solid var(--line)}.eyebrow{font-size:10px;letter-spacing:3px;color:var(--gold)}.layout{display:grid;grid-template-columns:2fr 1fr;gap:24px;align-items:start}svg{display:block;width:100%;border:1px solid var(--line)}[hidden]{display:none}button{min-height:44px;background:var(--panel);border:1px solid var(--line);padding:12px;color:var(--ink);cursor:pointer}.waypoint{cursor:pointer}.waypoint:focus{outline:3px solid var(--gold)}.panel,article{padding:20px;background:var(--panel);border:1px solid var(--line)}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.architecture{display:flex;gap:8px;align-items:end;min-height:190px;overflow:auto}.architecture img{image-rendering:pixelated;object-fit:contain;max-width:62%;height:auto;max-height:300px}.cards article>p{font-size:12px}.palette{display:flex;gap:16px;flex-wrap:wrap}.swatch{display:flex}.swatch i{display:block;width:32px;height:32px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid var(--line);padding:10px;text-align:left;font-weight:400}code{color:#b6d7ce}small{color:var(--muted)}.flow{display:flex;gap:12px;flex-wrap:wrap}.flow article{flex:1;min-width:175px}.scroll{overflow:auto}@media(max-width:900px){body{padding:18px}h1{font-size:34px}.layout,.cards{grid-template-columns:1fr}.architecture{min-height:150px}}
</style>
<header><span class="eyebrow">NOWRIFT / EDITABLE ART AND NAVIGATION BOARDS</span><h1>A city between journeys.</h1><p>${CITY.width} × ${CITY.height} world units. Nine neighborhoods, connected walking loops and one persistent character. Original native pixel art; references inform composition and daily occupations. Figma MCP had no callable tools, so no Figma file was created.</p><nav><a href="#layout">A Layout</a><a href="#architecture">B Architecture</a><a href="#travel">C Town travel</a><a href="#art">D Art contract</a><a href="../haven-city.md">Implementation report</a></nav></header>
<section id="layout"><span class="eyebrow">BOARD A / SHARED PRODUCTION GEOMETRY</span><h2>Nine districts, with room to breathe.</h2><p>Numbered circles are exact landing points. White dot: initial spawn. Cross: expedition return. Toggle the same road and solid geometry used by the game; roofs and canopies may overhang physical feet.</p><div class="controls"><button data-toggle="districts">Toggle district boundaries</button><button data-toggle="roads">Toggle connected roads</button><button data-toggle="solids">Toggle physical collision</button></div><div class="layout">${geometry}<article id="district-detail" aria-live="polite"><h3>Central Plaza</h3><p>Select any numbered district on the map to inspect its production metadata.</p></article></div></section>
<section id="architecture"><span class="eyebrow">BOARD B / NATIVE ARCHITECTURAL COMPOUNDS</span><h2>Different work. Different silhouettes.</h2><div class="cards">${DISTRICTS.map(
  (d, i) => {
    const buildings = [
      ...LANDMARKS.filter(
        (l) =>
          l.district === d.id &&
          !["lore", "waypoint", "npc", "treasure"].includes(l.kind),
      ).map((l) => l.art),
      ...CITY.structures
        .filter((s) =>
          s.id.startsWith(
            (
              {
                plaza: "fountain",
                emberforge: "forge",
                market: "market",
                grove: "grove",
                guild: "guild",
                garden: "garden",
                gate: "portal",
                training: "training",
                hearthside: "hearth",
              } as Record<string, string>
            )[d.id],
          ),
        )
        .map((s) => s.art),
    ];
    return `<article style="border-color:${colors[i]}"><small>${i + 1} / ${escape(d.material)}</small><h3>${escape(d.name)}</h3><div class="architecture">${[
      ...new Set(buildings),
    ]
      .slice(0, 3)
      .map(
        (art) =>
          `<img src="../../public/assets/haven/${art}.png" alt="${escape(art)}" loading="lazy">`,
      )
      .join(
        "",
      )}</div><p>${d.motifs.map(escape).join(" · ")}</p><h4>${escape(d.loreTitle)}</h4><p>${escape(d.lore)}</p></article>`;
  },
).join(
  "",
)}</div><p>Public stations connect to real blacksmith, crafting, wardrobe, merchant, sanctuary, journal, training, inventory and travel systems. Private residences and compound annex doors are scenery. Lore plaques and beacon crystals are explicit interactions.</p></section>
<section id="travel"><span class="eyebrow">BOARD C / AUTHORITATIVE TOWN TRAVEL</span><h2>Choose, commit, arrive.</h2><div class="flow">${[
  [
    "01 Open Town Map",
    "M or touch Map. Full overview, player position, district states and selectable details.",
  ],
  [
    "02 Validate",
    "Writer session, hub location, unlocked waypoint ID, expected position epoch, district and collision-safe landing.",
  ],
  [
    "03 Persist",
    "One existing repository transaction writes the new position and increments the epoch. Inventory, equipment, XP and quests remain intact.",
  ],
  [
    "04 Present",
    "Committed arrival drives a short transition, actor and camera reposition. Delayed saves carrying an older epoch are ignored.",
  ],
]
  .map(([title, body]) => `<article><h3>${title}</h3><p>${body}</p></article>`)
  .join(
    "",
  )}</div><div class="scroll"><table><thead><tr><th>ID / District</th><th>Safe landing</th><th>Initial state</th><th>Unlock through exploration</th></tr></thead><tbody>${WAYPOINTS.map((w) => `<tr><th><code>${w.id}</code><br>${escape(w.name)}</th><td>${w.spawn.x}, ${w.spawn.y} · ${w.facing}</td><td>${w.initial ? "Available" : "Undiscovered"}</td><td>${[w.landmarkId, ...w.unlocksFrom].map(escape).join(", ")}</td></tr>`).join("")}</tbody></table></div><p>The existing <code>haven-locate</code> command marks a walking destination. Only <code>fast-travel</code> can persist a town teleport. Campaign World Selection remains a separate expedition flow.</p></section>
<section id="art"><span class="eyebrow">BOARD D / ART AND PERFORMANCE CONTRACT</span><h2>One native grid. Reusable sources.</h2><p>16px terrain at 2×. Bottom-center 32×48 prop cells; individually authored compound buildings at 2×. Characters keep the existing 48px modular anatomy at 1.6×. Five culled tile layers, depth-sorted building feet, separate station FX, four-frame foliage, 18 residents and capped local particles. The overview is a 896×752 map image, never the playable world backdrop.</p><div class="palette">${Object.entries(
  palette.materials,
)
  .map(
    ([name, colors]) =>
      `<div><small>${name}</small><div class="swatch">${colors.map((color) => `<i style="background:${color}" title="${color}"></i>`).join("")}</div></div>`,
  )
  .join(
    "",
  )}</div><p><a href="../haven-city-assets.json">Complete asset inventory</a> · <a href="../../art/haven-city/README.md">Art bible and editable source rules</a> · <a href="../images/haven-city/">Desktop and mobile evidence</a></p><p>Regenerate: <code>npm run assets:city</code> and <code>npm run design:city</code>. Layout and collision source: <code>src/game/world/city-layout.json</code>. Sprite source: <code>scripts/generate-haven-city.py</code>. Native assets are original CC0.</p></section>
<footer><small>This board documents the implemented city. It is not an additional game screen or a Figma export.</small></footer>
<script>const districts=${JSON.stringify(DISTRICTS).replaceAll("<", "\\u003c")},waypoints=${JSON.stringify(WAYPOINTS).replaceAll("<", "\\u003c")};const detail=document.querySelector('#district-detail');function select(id){const d=districts.find(d=>d.id===id),w=waypoints.find(w=>w.district===id);detail.replaceChildren();for(const [tag,value]of[['h3',d.name],['p',d.motifs.join(' · ')],['p','Landing '+w.spawn.x+', '+w.spawn.y+' · '+(w.initial?'Initially available':'Exploration unlock')],['h4',d.loreTitle],['p',d.lore]]){const el=document.createElement(tag);el.textContent=value;detail.append(el)}}document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const layer=document.getElementById(b.dataset.toggle);layer.toggleAttribute('hidden')}));document.querySelectorAll('[data-district]').forEach(b=>{b.addEventListener('click',()=>select(b.dataset.district));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(b.dataset.district)}})});select('plaza');</script></html>`;
writeFileSync("docs/design/haven-city.html", html + "\n");
console.log(
  `Wrote production layout board and ${inventory.length}-asset inventory.`,
);
