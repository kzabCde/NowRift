import { CITY, type Landmark, type Point, type Solid } from "./city";
import { regionById, type RegionId } from "./regions";

export type CityLayout = Omit<typeof CITY, "props" | "landmarks"> & {
  props: (Point & { frame: number; solid?: Solid; light?: string })[];
  landmarks: Landmark[];
};
const cities = new Map<RegionId, CityLayout>([["central", CITY as CityLayout]]);
const names: Record<Exclude<RegionId, "central">, readonly string[]> = {
  north: [
    "Highland Market",
    "Mountain Forge",
    "Cloudleaf Workshop",
    "Lantern Temple",
    "Adventurer's Lodge",
    "Highland Rift Gate",
  ],
  northeast: [
    "Sandstone Bazaar",
    "Ancient Forge",
    "Artisan Pavilion",
    "The Keeper's Rest",
    "Ruins Research Guild",
    "Sandstone Rift Gate",
  ],
  south: [
    "Coastal Market",
    "Harbor Forge",
    "Tropical Alchemy Shop",
    "Seafarer's Rest",
    "Expedition Guild",
    "Mangrove Rift Gate",
  ],
};
const districtIds = [
  "market",
  "emberforge",
  "garden",
  "grove",
  "guild",
  "gate",
];
const kinds: Landmark["kind"][] = [
  "merchant",
  "blacksmith",
  "crafting",
  "rest",
  "guild",
  "portal",
];
const arts = [
  "city-market",
  "city-forge",
  "city-workshop",
  "city-inn",
  "city-guild",
  "portal",
];
const lore: Record<
  Exclude<RegionId, "central">,
  readonly [string, string][]
> = {
  north: [
    [
      "A bell for every arrival",
      "Each trader rings the smallest bell before opening a stall. Its quiet note travels farther in the morning mist than a shouted price.",
    ],
    [
      "The mountain's patient fire",
      "The smith keeps two hearths: one for hardening steel, another for warming travelers. Neither is allowed to go cold during a mountain storm.",
    ],
    [
      "Leaves above the snowline",
      "Herbalists hang bundles by the slope where they were gathered. The highest hooks are empty this season; the unnatural frost has climbed too far.",
    ],
    [
      "Lanterns for the absent",
      "Temple lanterns bear the names of travelers still on the mountain. Their families tend the wicks until each traveler comes home.",
    ],
    [
      "The lodge's unfinished map",
      "Red thread marks bridges inspected by the guild. One thread ends at a frozen sanctuary, where the mountain's guardian still keeps a broken promise.",
    ],
    [
      "Beyond the cold gate",
      "The gate's stone is warm on the village side and rimed with ice beyond. The wardens ask for witnesses before they ask for weapons.",
    ],
  ],
  northeast: [
    [
      "Shade belongs to everyone",
      "The bazaar's longest awning is held up by mismatched posts. Every village donated one after the old stone arch fell in the drought.",
    ],
    [
      "A tool before a sword",
      "The oldest mold in the forge makes irrigation fittings. The smith still casts one for every blade sold to the guild.",
    ],
    [
      "Clay that remembers hands",
      "Each artisan leaves a thumbprint inside their work. Fragments from the buried city carry the same small mark beneath the sand.",
    ],
    [
      "Water for the next traveler",
      "A covered jar stands by every guest stair. Taking its last cup means filling it before leaving, even when no one is watching.",
    ],
    [
      "The missing stone line",
      "Researchers copied the inscriptions before restoring the gateway. The line about sharing water was removed long before the kingdom fell.",
    ],
    [
      "The waking road",
      "Fresh dust trickles from the gate despite the still air. Somewhere beneath the sanctuary, the Colossus has begun to move again.",
    ],
  ],
  south: [
    [
      "The tide's market hours",
      "Stall awnings fold high when the fishing boats return. No bell is needed: the whole street can read the water against the pier.",
    ],
    [
      "Salt and steel",
      "The harbor smith stores unfinished blades above the high-water mark. A row of repaired anchors waits outside for boats that share the rescue watch.",
    ],
    [
      "A garden between tides",
      "The alchemist grows salt-tolerant herbs in old canoe hulls. One planter has turned black since the mangrove's roots began to whisper.",
    ],
    [
      "A light kept seaward",
      "The inn's upper window is never shuttered at night. It once guided one lost crew home; now every crew contributes oil to its lamp.",
    ],
    [
      "The shared sounding rope",
      "Every guild boat adds its depth marks to one harbor chart. The newest soundings show a channel opening toward the corrupted grove.",
    ],
    [
      "Where fresh water meets salt",
      "Living mangrove roots hold the gate's foundations. The wardens ask travelers to bring back a healthy seed, not another trophy.",
    ],
  ],
};
function polygon(x: number, y: number, w: number, h: number) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** Authored service courts with two secondary loops, narrow side lanes and physical waterways. */
export function regionalCity(region: RegionId): CityLayout {
  const cached = cities.get(region);
  if (cached) return cached;
  if (region === "central") return CITY as CityLayout;
  const r = regionById(region),
    width = r.width,
    height = r.height,
    cx = width / 2;
  const spawn = { x: cx, y: Math.round(height * 0.52) };
  const districtCenters = names[region].map((_, i) => ({
    x: Math.round(width * (i % 2 ? 0.75 : 0.25)),
    y: Math.round(height * [0.23, 0.51, 0.79][Math.floor(i / 2)]),
  }));
  const districts: CityLayout["districts"] = [
    {
      id: "plaza",
      name: `${r.capital} Crossing`,
      center: spawn,
      polygon: polygon(cx - 86, 120, 172, height - 216),
      material: "limestone",
      motifs: ["arrival beacon", "shared well", "regional direction posts"],
      ambience: { kind: "water", cutoff: 1080, gain: 0.13 },
      loreTitle: "The road between homes",
      lore: "The four roads meet at the same crystal mark. Travelers leave news here so the next person need not cross an unknown world alone.",
    },
    ...districtCenters.map((p, i) => ({
      id: districtIds[i],
      name: r.districts[i],
      center: { x: p.x, y: p.y + 50 },
      polygon: polygon(
        i % 2 ? cx + 90 : 40,
        Math.max(40, p.y - height * 0.14),
        cx - 130,
        height * 0.28,
      ),
      material:
        i === 1
          ? "charcoal"
          : i === 2
            ? "garden"
            : region === "northeast"
              ? "sandstone"
              : "wood",
      motifs: [
        r.architecture.split(", ")[0],
        names[region][i],
        lore[region][i][0],
      ],
      ambience: {
        kind:
          i === 1 ? "forge" : i === 0 ? "market" : i === 5 ? "rift" : "water",
        cutoff: i === 1 ? 250 : 900,
        gain: 0.15,
      },
      loreTitle: lore[region][i][0],
      lore: lore[region][i][1],
    })),
  ];
  const landmarks: Landmark[] = districtCenters.map((p, i) => ({
    id: `${region}-${["market", "forge", "workshop", "inn", "guild", "portal"][i]}`,
    name: names[region][i],
    kind: kinds[i],
    art: arts[i],
    district: districtIds[i],
    x: p.x,
    y: p.y - 32,
    entrance: { x: p.x, y: p.y + 30 },
    ...(i === 5 ? {} : { solid: { x: p.x - 96, y: p.y - 100, w: 192, h: 46 } }),
    ...(i === 0 ? { stock: "armor" as const } : {}),
  }));
  const extra = [
    {
      id: "wardrobe",
      name: "Travelers' Tailor",
      kind: "wardrobe",
      art: "city-wardrobe",
      index: 0,
      dx: 154,
      dy: 156,
    },
    {
      id: "outfitters",
      name: "Regional Outfitters",
      kind: "merchant",
      art: "city-stall",
      index: 0,
      dx: -138,
      dy: 156,
      stock: "boots",
    },
    {
      id: "alchemist",
      name: "Herbs & Tonics",
      kind: "merchant",
      art: "city-stall",
      index: 2,
      dx: -138,
      dy: 146,
      stock: "supplies",
    },
    {
      id: "resources",
      name: "Traveling Supplies",
      kind: "merchant",
      art: "city-stall",
      index: 5,
      dx: 140,
      dy: 122,
      stock: "resources",
    },
    {
      id: "store",
      name: "Shared Backpack & Equipment",
      kind: "storage",
      art: "city-store",
      index: 3,
      dx: 146,
      dy: 146,
    },
    {
      id: "board",
      name: "Regional Quest Board",
      kind: "quest-board",
      art: "board",
      index: 4,
      dx: 132,
      dy: 100,
    },
  ] as const;
  for (const e of extra) {
    const p = districtCenters[e.index];
    const dy = region === "south" && e.index >= 4 ? Math.min(e.dy, 76) : e.dy;
    landmarks.push({
      id: `${region}-${e.id}`,
      name: e.name,
      kind: e.kind,
      art: e.art,
      district: districtIds[e.index],
      x: p.x + e.dx,
      y: p.y + dy - 36,
      entrance: { x: p.x + e.dx, y: p.y + dy },
      ...("stock" in e ? { stock: e.stock } : {}),
      ...(e.kind === "wardrobe" || e.kind === "storage"
        ? { solid: { x: p.x + e.dx - 55, y: p.y + dy - 108, w: 110, h: 48 } }
        : e.art === "city-stall"
          ? { solid: { x: p.x + e.dx - 50, y: p.y + dy - 76, w: 100, h: 30 } }
          : {}),
    });
  }
  const roads: CityLayout["roads"] = [
    {
      points: [
        [cx, 96],
        [cx, height - 80],
      ],
      width: 100,
      material: "limestone",
    },
    {
      points: [
        [width * 0.12, districtCenters[0].y + 50],
        [width * 0.12, districtCenters[4].y + 100],
        [width * 0.88, districtCenters[5].y + 100],
        [width * 0.88, districtCenters[1].y + 50],
        [width * 0.12, districtCenters[0].y + 50],
      ],
      width: 58,
      material: region === "northeast" ? "sandstone" : "wood",
    },
    ...districtCenters
      .filter((_, i) => i % 2 === 0)
      .map((p) => ({
        points: [
          [width * 0.12, p.y + 50],
          [width * 0.9, p.y + 50],
        ],
        width: 76,
        material: "cobble",
      })),
  ];
  const water: Solid[] = [],
    bridges: CityLayout["bridges"] = [];
  if (region === "south") {
    const y = height - 176,
      pier = Math.round(width * 0.74);
    water.push(
      { x: 32, y, w: pier - 80, h: 144 },
      { x: pier + 48, y, w: width - pier - 80, h: 144 },
    );
    bridges.push({ x: pier - 48, y: y - 20, w: 96, h: 164 });
    roads.push({
      points: [
        [pier, districtCenters[5].y + 50],
        [pier, height - 38],
      ],
      width: 96,
      material: "wood",
    });
  } else {
    const x = region === "north" ? 80 : width - 144,
      by = Math.round(height * 0.53);
    water.push(
      { x, y: 32, w: 64, h: by - 80 },
      { x, y: by + 64, w: 64, h: height - by - 96 },
    );
    bridges.push({ x: x - 24, y: by - 48, w: 112, h: 112 });
    roads.push({
      points: [
        [x + 32, by + 8],
        [cx, by + 8],
      ],
      width: 96,
      material: "wood",
    });
  }
  const waypoints: CityLayout["waypoints"] = [
    {
      id: `${region}-plaza`,
      district: "plaza",
      name: `${r.capital} Crossing`,
      spawn,
      facing: "down",
      initial: false,
      landmarkId: `${region}-waypoint-plaza`,
      unlocksFrom: [],
    },
    ...districtCenters.map((p, i) => ({
      id: `${region}-${districtIds[i]}`,
      district: districtIds[i],
      name: r.districts[i],
      spawn: { x: p.x + (i % 2 ? -70 : 70), y: p.y + 60 },
      facing: "down",
      initial: false,
      landmarkId: `${region}-waypoint-${districtIds[i]}`,
      unlocksFrom: [landmarks[i].id, `${region}-lore-${districtIds[i]}`],
    })),
  ];
  for (const w of waypoints)
    landmarks.push({
      id: w.landmarkId,
      kind: "waypoint",
      name: w.name,
      art: "city-waypoint",
      district: w.district,
      waypointId: w.id,
      ...w.spawn,
      entrance: w.spawn,
    });
  for (const [i, p] of districtCenters.entries())
    landmarks.push({
      id: `${region}-lore-${districtIds[i]}`,
      name: lore[region][i][0],
      kind: "lore",
      art: "city-lore",
      district: districtIds[i],
      x: p.x - 64,
      y: p.y + 78,
      entrance: {
        x: p.x - 64,
        y: p.y + (region === "south" && i >= 4 ? 76 : 108),
      },
    });
  const cachePoint = {
    x: region === "south" ? Math.round(width * 0.74) : cx + 75,
    y: height - 60,
  };
  landmarks.push({
    id: `${region}-cache`,
    name: "A Traveler's Gift",
    kind: "treasure",
    art: "cache",
    district: "plaza",
    x: cachePoint.x,
    y: cachePoint.y - 36,
    entrance: cachePoint,
  });
  const props: CityLayout["props"] = [];
  for (const [i, p] of districtCenters.entries()) {
    for (const [dx, dy, frame] of [
      [-130, -52, 1],
      [130, -54, 1],
      [-130, 72, [12, 10, 26, 0, 7, 3][i]],
      [110, 126, i === 1 ? 8 : i === 2 ? 30 : 3],
    ])
      props.push({
        x: p.x + dx,
        y: p.y + (region === "south" && i >= 4 ? Math.min(dy, 64) : dy),
        frame,
        ...(frame === 1 ? { light: "warm" } : {}),
      });
    props.push({
      x: p.x - 154,
      y: p.y - 130,
      frame: 56 + (i % 3),
      solid: { x: p.x - 164, y: p.y - 144, w: 20, h: 14 },
    });
  }
  const npcs: CityLayout["npcs"] = districtCenters.flatMap((p, i) =>
    [0, 1].map((j) => ({
      id: `${region}-resident-${i}-${j}`,
      name: `${r.capital} resident`,
      role: i === 1 ? "smith" : i === 0 ? "merchant" : "traveler",
      variant: (i * 2 + j) % 18,
      home: {
        x: p.x + (j ? 60 : -40),
        y: p.y + (region === "south" && i >= 4 ? 42 : 76),
      },
      work: {
        x: p.x + (j ? 104 : -68),
        y: p.y + (region === "south" && i >= 4 ? 70 : 110),
      },
      route: [
        {
          x: p.x + (j ? 60 : -40),
          y: p.y + (region === "south" && i >= 4 ? 42 : 76),
        },
        {
          x: p.x + (j ? 104 : -68),
          y: p.y + (region === "south" && i >= 4 ? 70 : 110),
        },
      ],
    })),
  );
  const portal = landmarks.find((l) => l.kind === "portal")!;
  const result = {
    ...CITY,
    width,
    height,
    columns: width / 32,
    rows: height / 32,
    districts,
    landmarks,
    roads,
    water,
    bridges,
    props,
    npcs,
    waypoints,
    spawn,
    return: { x: portal.entrance.x, y: portal.entrance.y + 54 },
    structures: [
      {
        id: `${region}-well`,
        art: "city-fountain",
        x: cx,
        y: Math.round(height * 0.37),
        solid: { x: cx - 42, y: Math.round(height * 0.37) - 34, w: 84, h: 28 },
      },
    ],
    rails: [],
    arcades: [],
    portalFeet: [],
    boundaries: [
      { x: 0, y: 0, w: width, h: 24 },
      { x: 0, y: height - 24, w: width, h: 24 },
      { x: 0, y: 0, w: 24, h: height },
      { x: width - 24, y: 0, w: 24, h: height },
    ],
    spawns: [
      { id: "plaza", ...spawn },
      ...waypoints.slice(1).map((w) => ({ id: w.district, ...w.spawn })),
    ],
    effects: [
      {
        kind: 0,
        x: districtCenters[1].x + 70,
        y: districtCenters[1].y - 66,
        scale: 2,
        depth: districtCenters[1].y,
      },
      {
        kind: 1,
        x: districtCenters[1].x - 100,
        y: districtCenters[1].y - 220,
        scale: 2,
        depth: districtCenters[1].y,
      },
      { kind: 3, x: portal.x, y: portal.y - 70, scale: 2, depth: portal.y },
    ],
    yards: districtCenters.map((p, i) => ({
      shape: "rect",
      x: p.x - 150,
      y: p.y - 105,
      w: 300,
      h: 245,
      material:
        i === 1
          ? "charcoal"
          : i === 2
            ? "garden"
            : region === "northeast"
              ? "sandstone"
              : "limestone",
    })),
    guardianSeals: Array.from({ length: 4 }, (_, i) => ({
      x: cx - 54 + i * 36,
      y: height - 240,
    })),
    gardenBlooms: Array.from({ length: 4 }, (_, i) => ({
      x: districtCenters[2].x - 60 + i * 40,
      y: districtCenters[2].y + 154,
    })),
    questBanner: {
      x: districtCenters[4].x + 72,
      y: districtCenters[4].y - 120,
    },
    windowLights: districtCenters.map((p) => ({
      x: p.x - 40,
      y: p.y - 76,
      color: "warm",
    })),
  } as CityLayout;
  cities.set(region, result);
  return result;
}

export function citySolids(region: RegionId): Solid[] {
  const city = regionalCity(region);
  return [
    ...(city.landmarks as Landmark[]).flatMap((l) =>
      l.solid ? [l.solid] : [],
    ),
    ...city.structures.map((s) => s.solid),
    ...city.props.flatMap((p) => (p.solid ? [p.solid] : [])),
    ...city.water,
    ...city.rails,
    ...city.boundaries,
    ...city.portalFeet,
    ...city.arcades.flatMap((a) => a.feet),
  ];
}
export function cityBounds(region: RegionId) {
  const city = regionalCity(region);
  return {
    width: city.width,
    height: city.height,
    spawn: city.spawn as Point,
    return: city.return as Point,
    speed: 180,
    radius: 12,
    range: 85,
  };
}
