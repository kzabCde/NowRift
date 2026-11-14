/** Source-editable review board and inventory, generated from the actual playable content. */
import { mkdirSync, writeFileSync } from "node:fs";
import { STAGES, WORLDS } from "../src/game/campaign/content";
import { MISSIONS } from "../src/game/story/content";
import { QUEST_CATALOG } from "../src/game/quests/catalog";
import { ASSETS } from "../src/game/presentation/assets";
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const label = (x: number, y: number, s: string, size = 12, color = "#d9d7bb") =>
  `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" fill="${color}">${escape(s)}</text>`;
const colors = ["#9fb68a", "#d8b875", "#91c9d0", "#df9d75"];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="980" viewBox="0 0 1600 980"><title>The Shattered Rift — implemented mission architecture</title><rect width="1600" height="980" fill="#102721"/>`;
svg +=
  label(40, 50, "THE SHATTERED RIFT", 28, "#eed59d") +
  label(
    40,
    82,
    "40 objective missions / 40 main + 40 side + 24 guild + 16 NPC entries / English + Thai",
    14,
  );
for (const [row, world] of WORLDS.entries()) {
  const y = 125 + row * 195;
  svg += label(40, y, world.name.toUpperCase(), 18, colors[row]);
  for (const stage of STAGES.filter((s) => s.worldId === world.id)) {
    const x = 40 + (stage.number - 1) * 153,
      m = MISSIONS.find((m) => m.id === stage.id)!;
    svg += `<rect x="${x}" y="${y + 16}" width="143" height="142" fill="#19382e" stroke="${colors[row]}"/>`;
    svg += label(
      x + 9,
      y + 36,
      String(stage.number).padStart(2, "0") +
        (stage.number === 5
          ? " / GUARDIAN"
          : stage.number === 10
            ? " / FINALE"
            : ""),
      10,
      colors[row],
    );
    const words = stage.name.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      if ((line + " " + word).trim().length > 22) {
        lines.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    lines.push(line);
    lines.forEach((s, i) => {
      svg += label(x + 9, y + 56 + i * 13, s, 10);
    });
    m.objectives.forEach((o, i) => {
      svg += label(x + 9, y + 91 + i * 14, `${i + 1}. ${o.type}`, 9);
    });
  }
}
svg += label(
  40,
  935,
  "Design board generated from production definitions. Geometry remains in each mission's authored objects; this is not a town map.",
  12,
);
svg +=
  label(
    40,
    958,
    "Original in-game assets are reused; new finale portraits/sprite sets and voiced scenes remain art extensions, not claimed deliverables.",
    11,
    "#adbc9d",
  ) + "</svg>";
mkdirSync("docs/design", { recursive: true });
writeFileSync("docs/design/shattered-rift-missions.svg", svg + "\n");
writeFileSync(
  "docs/shattered-rift-content.json",
  JSON.stringify(
    {
      schema: 1,
      counts: Object.fromEntries(
        ["main", "side", "guild", "npc"].map((c) => [
          c,
          QUEST_CATALOG.filter((q) => q.category === c).length,
        ]),
      ),
      missions: MISSIONS.map((m) => ({
        id: m.id,
        title: m.title.en,
        questTitle: m.questTitle.en,
        objectives: m.objectives.map((o) => ({
          type: o.type,
          target: o.target,
          count: o.count,
        })),
        finale: m.finale?.name.en,
      })),
      quests: QUEST_CATALOG.map((q) => ({
        id: q.id,
        category: q.category,
        giver: q.giver,
        prerequisites: q.prerequisites,
        requiredClear: q.requiredClear,
        modes: q.allowedModes,
        reward: q.reward,
      })),
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  "docs/shattered-rift-assets.json",
  JSON.stringify(
    {
      schema: 1,
      notes:
        "Existing original asset registry entries, reused by Story. Runtime quest glyphs are editable 12×18 canvas definitions in haven-city.ts; no generated illustration or Figma output is claimed.",
      assets: ASSETS.filter(
        (a) =>
          ["haven-city-residents", "haven-city-props", "items"].includes(
            a.key,
          ) ||
          (["forest", "desert", "frozen", "infernal"].includes(a.bundle) &&
            ["terrain", "prop", "boss", "enemy"].includes(a.category)),
      ).map((a) => ({
        key: a.key,
        path: a.path,
        frame: [a.frameWidth, a.frameHeight],
        frames: a.frameCount,
        bytes: a.bytes,
        sha256: a.sha256,
      })),
      remaining: [
        "Distinct sprite/portrait sets for the four new chapter finales (current realm guardian art is reused)",
        "Dedicated cast portraits and occupational sprites (current original resident atlas is reused)",
        "Voiced dialogue and cinematic audio (text/dialogue fallback is implemented)",
      ],
    },
    null,
    2,
  ) + "\n",
);
