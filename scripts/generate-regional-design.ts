import { mkdirSync, writeFileSync } from "node:fs";
import { REGIONS } from "../src/game/world/regions";
import { regionalCity, citySolids } from "../src/game/world/regional-city";
import { ASSETS } from "../src/game/presentation/assets";

const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="920" viewBox="0 0 2400 920"><title>NowRift regional city navigation plans</title><desc>Generated from production city geometry. Flat navigation plans, not screenshots or Figma output. Blue: blocked water; red outlines: physical collision; gold: actual service entrances; cyan: registered waypoint landings.</desc><rect width="2400" height="920" fill="#152b30"/><style>text{font-family:monospace;fill:#ead9ad}.title{font-size:22px}.note{font-size:13px}</style>`,
];
REGIONS.forEach((r, i) => {
  const city = regionalCity(r.id),
    scale = Math.min(520 / city.width, 650 / city.height),
    x = i * 600 + 40,
    y = 130;
  parts.push(
    `<text class="title" x="${x}" y="42">${escape(r.name)}</text><text class="note" x="${x}" y="68">${escape(r.capital)} · ${city.width} × ${city.height} units</text><g transform="translate(${x},${y}) scale(${scale})"><rect width="${city.width}" height="${city.height}" fill="${r.id === "northeast" ? "#a08b5b" : "#4e7459"}"/>`,
  );
  for (const road of city.roads)
    parts.push(
      `<polyline points="${road.points.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#baa984" stroke-width="${road.width}" stroke-linejoin="round"/>`,
    );
  for (const water of city.water)
    parts.push(
      `<rect x="${water.x}" y="${water.y}" width="${water.w}" height="${water.h}" fill="#3d8392"/>`,
    );
  for (const bridge of city.bridges)
    parts.push(
      `<rect x="${bridge.x}" y="${bridge.y}" width="${bridge.w}" height="${bridge.h}" fill="#a28a60"/>`,
    );
  for (const solid of citySolids(r.id))
    parts.push(
      `<rect x="${solid.x}" y="${solid.y}" width="${solid.w}" height="${solid.h}" fill="#604f43" fill-opacity=".45" stroke="#c27963" stroke-width="${1 / scale}"/>`,
    );
  for (const district of city.districts)
    parts.push(
      `<text x="${district.center.x}" y="${district.center.y - 160}" text-anchor="middle" font-size="${13 / scale}">${escape(district.name)}</text>`,
    );
  for (const l of city.landmarks.filter(
    (l) => !["lore", "treasure", "waypoint"].includes(l.kind),
  ))
    parts.push(
      `<circle cx="${l.entrance.x}" cy="${l.entrance.y}" r="${4 / scale}" fill="#f3cb76"><title>${escape(l.id + " · " + l.name)}</title></circle>`,
    );
  for (const w of city.waypoints)
    parts.push(
      `<path d="M${w.spawn.x},${w.spawn.y - 5 / scale}l${5 / scale},${5 / scale} -${5 / scale},${5 / scale} -${5 / scale},-${5 / scale}z" fill="#a7dfcc"><title>${escape(w.id)}</title></path>`,
    );
  parts.push(
    `</g><text class="note" x="${x}" y="834">Gold: services · Cyan: fast travel</text><text class="note" x="${x}" y="856">Red: collision · Blue: blocked water</text>`,
  );
});
parts.push(
  `<text class="note" x="40" y="900">Original production geometry · 16px native tiles at 2× · Local city scenes connected through validated Rift Gate travel</text></svg>`,
);
mkdirSync("docs/design", { recursive: true });
mkdirSync("docs/regions", { recursive: true });
writeFileSync(
  "docs/design/thailand-regional-layout.svg",
  parts.join("\n") + "\n",
);
const regional = ASSETS.filter((a) => a.bundle.startsWith("region-"));
writeFileSync(
  "docs/regions/assets.json",
  JSON.stringify(
    {
      source: "scripts/generate-regions.py",
      license: "CC0 original project pixels; no supplied concept-board pixels",
      count: regional.length,
      nativeTileSize: 16,
      environmentalScale: 2,
      assets: regional.map((a) => ({
        key: a.key,
        path: a.path,
        bundle: a.bundle,
        width: a.width,
        height: a.height,
        bytes: a.bytes,
        frameCount: a.frameCount,
        sha256: a.sha256,
        kind: a.kind,
        category: a.category,
        frameWidth: a.frameWidth,
        frameHeight: a.frameHeight,
        scale: a.scale,
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Generated four city plans and ${regional.length} regional asset records from production registries.`,
);
