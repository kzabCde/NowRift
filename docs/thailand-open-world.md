# Thailand-inspired open world

## Architecture audit

This continuation starts at merged `main` commit `80a2fcb` (the forty-mission / 120-quest
campaign), preserving inventory expansion and the nine-district city. The baseline build,
lint, formatting, TypeScript and 638 unit/integration tests passed before implementation.

- Rift Haven is **3584×3008 world units**. Native 16px city tiles render at 2×, so one
  terrain cell occupies 32 world units. The Canvas renderer uses pixelArt, roundPixels and
  nearest-neighbor sampling. Existing camera zoom and touch movement remain in use.
- Campaign instances use **1800×1400** bounds and 32px tiles. Their seeds/difficulties and
  stage variants are not multiplied into the playable-area total.
- World schema 2 / city layout 3, checkpoint schema 1, arrival epochs, writer leases,
  overflow parcels, equipment evolution and the shared IndexedDB character remain intact.
- The previous map was a static city image with nine waypoint buttons. `haven-locate`
  placed a direction marker; it did not compute an obstacle-aware walking path.
- Assets already had a checked manifest, lazy scene loading, occupation schedules,
  viewport culling, bounded particles, day/night lighting and procedural ambient audio.
  The new regions reuse these systems rather than introduce a second renderer or economy.

## Regional identity and compatibility

| Region                 | City                | Legacy campaign / guardian                     | City bounds |
| ---------------------- | ------------------- | ---------------------------------------------- | ----------- |
| North / เวียงเมฆา      | Wiang Mekha         | `frozen` / Frost Warden (`frozen-5`)           | 1280×1472   |
| Northeast / นครหินทราย | Nakhon Hinsai       | `desert` / Sand Colossus (`desert-5`)          | 1472×1280   |
| Central / กรุงสายน้ำ   | Existing Rift Haven | `infernal` / Infernal Sovereign (`infernal-5`) | 3584×3008   |
| South / เมืองสมุทรคราม | Samut Khram         | `forest` / Forest Guardian (`forest-5`)        | 1408×1344   |

The geography does not change campaign order: Forest → Desert → Frozen → Infernal.
The capital remains the initial safe hub. City access to South, Northeast and North uses
the corresponding existing campaign access rules, including grandfathered access. Central
city access does not unlock the Infernal missions or its boss.

## Shared city implementation

`regional-city.ts` extends the existing authored city layout contract. Rift Haven retains
every district, collision footprint, waypoint ID and functional entrance. The three new
cities have service courts, a public crossing, secondary loops, physical waterways,
bridges, regional beacons and scheduled residents. The shared Phaser city scene renders
only the selected city and loads only its needed regional/fallback assets.

All cities connect to the existing blacksmith, outfitters, supplies, alchemy/crafting,
wardrobe, inventory, quest journal, guild records, rest and expedition systems. Regional
quests use the same authoritative quest engine: local record → real material delivery →
verified original guardian Story mission → transactional one-time reward.

## Navigation and persistence

The existing Town Map now contains Local and Thailand World views. A live minimap opens
the same interface. Player facing, service markers, live residents, quest markers, beacons,
region exits and selected destinations use world coordinates, independent of camera zoom.
The expanded map supports M/Escape, wheel zoom, pointer pan, keyboard zoom/pan, center/fit,
and mobile pinch/drag. Destination guidance is explicitly directional rather than a verified
obstacle-aware path. Selecting a marker never advances a quest or clears a stage.

The optional versioned `world.atlas` extension stores region identity, compact per-region
hex discovery grids, destination and regional cache receipts. Existing valid coordinates
are retained. Invalid landings use the current region's safe spawn. Migration is idempotent
and awards no rewards. City fog uses 128-unit cells; visible state is derived from current
position while explored state is persisted and merged monotonically.

The same authoritative `fast-travel` command handles all journeys. New regional routes
require the actual current city's Rift Gate, a permitted campaign region and its registered
capital landing. Subsequent travel requires a discovered beacon. Local beacons still unlock
through real station/beacon visits. Arrival epochs reject delayed position/fog saves from a
previous scene, and pending checkpoints prevent changing the expedition's return city.

## Area accounting

Run `npm run measure:regions` to regenerate [dimensions.json](regions/dimensions.json).
The calculation flood-fills collision-free **whole 16-unit cells** from the real spawn.
It excludes walls, water, prop footprints, scene margins and disconnected islands. It counts
one canonical Free expedition layout per biome, not every seed, stage or difficulty. Boss
instances reuse that biome footprint and contribute zero duplicate additional area.
The current result is **20,939,520 reachable units² (100.67% of the 20.8M planning target)**.
Preserving the large existing capital is why city sizes differ from the illustrative equal
allocation. Wilderness uses the existing functional combat/gathering/extraction architecture.

## Art pipeline

The supplied ZIP is reference material, not a spritesheet or collision source. No concept
board or reference-image pixels are shipped. `scripts/generate-regions.py` creates original
native-resolution PNGs: Lanna-inspired timber roofs, sandstone tiers, river-capital roof
finials and coastal plaster/arcades, regional residents and foliage. Regeneration uses Pillow;
production/CI uses committed PNGs and the existing checked asset index.

Build commands: `npm run assets:regions`, `python3 scripts/generate-regions.py --check`,
`npm run assets:check`. Figma capability discovery found no callable tools; no Figma output
is claimed. The original equipment, NPC, prop, effect and guardian artwork remains in use
where it already provides the intended function.

## Validation record

The initial regional slice passed 652 unit/integration tests, production compilation,
asset validation for 518 PNGs, and four browser checks covering all city scenes/reload,
mouse map controls, actual purchases and Thai mobile pinch/drag. Further expedition,
performance and full regression results are recorded here after execution.
