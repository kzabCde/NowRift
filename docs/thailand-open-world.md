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
bridges, regional beacons, private residences and scheduled residents. North adds an
animated stream waterfall and irrigated nursery; Northeast has an open masonry gateway
with two physical feet; South has a fishing pier, boat and offshore limestone stack.
The shared Phaser city scene renders
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

Story and Free expeditions also use the live minimap and the same pan/zoom and Thailand
overview components. Their local layer comes from the actual seeded terrain, obstacles,
gathering nodes, extraction portal and current mission objects. Opening the expanded map
pauses the simulation and locks movement; closing it restores the previous play/pause state.
Marking a resource persists guidance in the existing checkpoint without granting loot or
advancing objectives. Expedition fast travel requires returning to the city first.

Each capital's direct Free departure selects that region's existing first-stage biome
with its canonical environment seed; the existing advanced campaign selector still allows
other unlocked stages and seeds. Central retains its original Forest supply-route prologue.
City fog is persistent per city. Canonical Free wilderness fog is persistent per region;
other seeded missions retain their own checkpoint fog, avoiding discoveries from unrelated
terrain. Accepted checkpoints and settlement merge exploration after the existing run-owner
and sequence checks. Departure increments the city arrival epoch, so even an old city save
delivered after extraction cannot replace the safe return position.

The world overview resolves a tracked quest to its next physical objective or reward giver,
including a Frozen chapter reward that must be claimed back in Central. Return/extraction
labels name the actual origin city. Geography does not silently move legacy quest givers.

## Area accounting

Run `npm run measure:regions` to regenerate [dimensions.json](regions/dimensions.json).
The calculation flood-fills collision-free **whole 16-unit cells** from the real spawn.
It excludes walls, water, prop footprints, scene margins and disconnected islands. It counts
one canonical Free expedition layout per biome, not every seed, stage or difficulty. Boss
instances reuse that biome footprint and contribute zero duplicate additional area.
The current result is **20,793,856 reachable units² (99.970% of the 20.8M planning target)**.
Preserving the large existing capital is why city sizes differ from the illustrative equal
allocation. Wilderness uses the existing functional combat/gathering/extraction architecture.

| Region | City reachable units² | Wilderness bounds | Wilderness reachable units² | Additional boss area | Total units² |
| ------ | --------------------: | ----------------- | --------------------------: | -------------------: | -----------: |
| North | 1,292,288 | 1800×1400 | 2,098,176 | 0 | 3,390,464 |
| Northeast | 1,300,736 | 1800×1400 | 2,139,136 | 0 | 3,439,872 |
| Central | 8,598,272 | 1800×1400 | 2,081,792 | 0 | 10,680,064 |
| South | 1,226,240 | 1800×1400 | 2,057,216 | 0 | 3,283,456 |

These are conservative collision-clear surface measurements, not estimates from texture
size or map screenshots. Zero additional boss area means reused biome geometry is counted
once; it does not mean the guardians were removed. No artificial multiplier was applied.

The editable [regional navigation plans](design/thailand-regional-layout.svg) are generated
from the same roads, solids, service entrances and beacons used by the game. Regenerate
them with `npm run design:regions`. This is a local SVG design artifact, not a Figma file.

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

The final expansion adds **67 original regional PNGs** to a checked inventory of **532**.
The machine-readable [asset inventory](regions/assets.json) records native dimensions,
frame sizes/counts, SHA-256 values, bundle and intended scale. Regional residents use
48px frames with four directions and four walk/idle poses for 18 variants; trees use
96×128px frames; the waterfall has four 32×96px frames. Scenery and roof silhouettes
retain their native proportions. Shared pixel props, stations, portal art, equipment,
combat effects and the four original guardian sprites remain reusable fallbacks.

Only the current city's regional bundle and necessary fallback/common/appearance textures
are queued. Expeditions load only their biome and one matching foliage atlas. The existing
service worker warms visited assets; it does not prefetch all four cities. The one South
foliage atlas used by the original starter Forest expedition is included with its existing
offline starter assets, keeping the cached city → expedition flow playable. Scene lifecycle
cleanup releases update listeners and tilemaps. Viewport culling, fixed effect pools and
reduced-effects settings are preserved.

## Art and level specification

- **North:** cool pine greens, dark timber galleries, carved double roof tiers, warm
  hanging lanterns, stream bridge, waterfall and irrigated nursery. The market, forge,
  workshop, temple/rest, lodge and Gate connect through a central stone road and two loops.
- **Northeast:** warm sandstone/red-earth courts, stepped masonry rooflines, research
  banners, artisan stalls, water channel and open ruin gateway. The gateway's central road
  remains walkable; only its visible feet block movement.
- **Central:** the existing nine districts, roads, bridges, stations, bounds, collision and
  waypoint IDs remain intact. Eighteen building sprites now use river-capital roof tiers,
  finials, contrasting workshop roofs and warm windows; regional residents and trees share
  the original city scale. No save-coordinate remap or artificial bounds enlargement.
- **South:** pastel plaster shopfronts with arcades and balconies, palms/mangrove roots,
  harbor forge, tropical workshop, seafarer's inn, guild, pier and coastal rock silhouette.
  The boat and limestone stack are scenery in blocked water, with no fake interaction.

Native city terrain is 16px at 2×; native resident frames render at the existing 1.6×
character scale. Roofs use dark outlines, stepped material ramps and upper-left highlights.
Shadows stay at the foundation; walls/roofs use foot-Y depth ordering so the player can
walk behind a building. Water/ground decoration lies below actors. Animation uses bounded
four/eight-frame loops, with static frames under reduced effects; the renderer remains
Canvas/pixelArt. Regional palette and building definitions are editable Python source.

Homes, rice rows, boats and ruins are environmental storytelling. Small loose goods and tool
props use depth sorting without extra collision, keeping service lanes open; they are not
additional gathering stations. Usable services retain
the existing nearby-interaction prompt and actual transaction/quest panels. New guild
investigations require a real local record, three owned regional materials and a verified
Story guardian victory, then grant the existing currency/XP/material transaction once.
The original 120 quests remain; four optional regional investigations bring the total to 124.

## Remaining scope and limitations

This is a playable regional expansion built on the existing city/campaign architecture.
The regional wilderness still uses the existing 1800×1400 seeded biome layouts and combat,
with regional foliage and an actual terrain/POI map. Bespoke mountain ridgelines, cave
networks, connected overworld borders and new handcrafted boss-room geometry are not
implemented. The four Stage 5 guardians and Stage 10 finales retain their existing art and
mechanics; no extra arena area is claimed.

The code-generated building assets are original reusable production pixels, not a promise
of concept-board-level hand-painted detail. Additional roof modules, unique named cast,
interiors, occupation-specific work animations, boats in motion and more district-specific
props remain art extensions. Private homes are decorative. NPCs use short authored
home/work lanes rather than a new citywide pathfinding/scheduling engine. Direction guidance
does not calculate an obstacle-aware route. Physical-device performance and naturally
earned-loadout balance still need human playtesting.

## Validation record

The initial regional slice passed 652 unit/integration tests, production compilation,
asset validation for 518 PNGs, and four browser checks covering all city scenes/reload,
mouse map controls, actual purchases and Thai mobile pinch/drag. The expedition map slice
then passed two focused browser checks using real gathering, combat, extraction and Story
objectives. Final source passes 659 unit/integration tests in 34 files, compilation,
TypeScript, all 532 PNG validations, formatting, lint and the seeded survival/boss playthrough.
The complete corrected instrumented browser run passed **146 checks, with one
production-only test skipped (19.3 minutes)**. The separate **uninstrumented production
Town Map smoke passed (1/1)**, including real travel, reload, retained inventory/XP and
absent fixture globals. Eighteen production browser chunks contain no fixture/global or
mission-driver signatures. Both optimized builds ran all 659 tests through prebuild.

The first full browser run found one missing offline starter foliage atlas and two
loading fixtures targeting the retired terrain overview. The cache and fixture targets
were corrected; all three passed a focused recheck and then the complete rerun. The pan
fixture scrolls its actual canvas into view before dragging, with the pan assertion intact.
The shoreline fix aligns physical water/bridges to the native terrain grid and is checked
by three additional per-region tests.

Browser frame samples measured roughly **57–59 FPS desktop** and **24–33 FPS at 390×844
with 4× CPU throttling**, across all four cities. Decoded current-scene texture estimates
remain below 21 MiB, with mobile viewport culling and bounded effects verified. These are
short headless Chromium samples, not measurements from physical phones.

See [28 native screenshots, exact commands, raw reports and performance samples](evidence/regions/README.md),
[structured validation/source hashes](evidence/regions/validation.json), and the
[complete changed-file list](regions/changed-files.txt). Full browser verification ran at
local `9b57500`; later changes are review documentation and evidence only. The API-published
Git tree is checked against the final local tree before opening the follow-up draft.

## GitHub review slices

[Draft PR #27](https://github.com/kzabCde/NowRift/pull/27) contains the city/region architecture,
city atlas, travel and four regional quests. Its GitHub `validate` workflow passed. The
`codex/thailand-open-world` follow-up contains expedition mapping, final collision/offline
fixes, scenery and all final evidence; the final response links its draft PR. Both target
`main` for the existing CI workflow, and the follow-up includes the foundation commit.
No merge or production deployment was performed.
