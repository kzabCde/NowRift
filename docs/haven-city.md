# NowRift — Rift Haven World Redesign

## Continuation audit and gap analysis

Work continues on `codex/nine-district-haven` from main `8dc0fb0` (merged Outfitters
PR #22). The existing nine-district redesign was uncommitted when the expansion
request arrived; it is preserved as the first implementation phase, not replaced.

Implemented and retained: a 1856 × 1536 connected city; five tile layers; shared
authored collision and navigation data; 27 bounded interactions; original district
architecture, stalls, props and residents; day/night lighting; local effects;
occupation schedules; district audio; live progression decorations; vendor category
integration; guild records; lore visits; all old destination IDs and equipment.
The first phase passed 467 unit/integration tests, typecheck, lint and an
instrumented production build. Browser and visual review had not yet been run.

Remaining work at that point:

- Expand toward 3600 × 3000 without scaling characters, buildings or props to fill
  space; compose courtyards, modular wings, terraces and secondary routes.
- Upgrade the Town Map from a route-marker overview to district selection and
  real fast travel, keeping campaign World Selection separate.
- Add stable waypoint metadata, exploration unlocks, safe landing validation and a
  deliberate world-save migration for the changed geometry.
- Protect committed arrivals from delayed autosaves with a persisted position
  epoch; keep the existing per-character writer/session and transaction guards.
- Add spatial collision indexing and large-world culling, then test walking,
  teleports, reload, all existing modes, mobile behavior and performance.
- Complete editable design documentation, asset audit and district screenshots.

Figma capability discovery found no callable Figma tools. No Figma context, frames
or files were created. The deliverable uses a local editable layout/art board and
the shared JSON/Python asset sources.

## Implemented city

The playable hub is **3584 × 3008 world units**, a continuous **112 × 94** grid of
16px native tiles rendered at 2×. This fits the requested approximate size while
keeping integer tile boundaries. The expansion preserves the earlier city kit
and composes new native architectural wings and courtyards around it. It does not
scale up existing sprites or replace campaign, economy or character systems.

| District | Architecture, landscape and landmarks | Actual activity |
| --- | --- | --- |
| Central Plaza | Limestone medallion, Rift Crystal, octagonal fountain, benches | Mara's arrival quest, quest journal, Plaza waypoint |
| Emberforge District | Copper chimney, foundry wing, cooling shed, hot ingots and quench vats | Existing equipment enhancement and weapon evolution |
| Wanderer's Market | Covered arcade, six individual awnings, wearable displays, baskets | Rift Outfitters armor/helmet/pants/boots categories and existing supplies/resources shop |
| Sanctuary Grove | Timber shelter, oak shrine, stream, bridges, moonflowers and campfire | Rest, inventory and retained H / Sanctuary shortcut |
| Adventurer's Guild | Slate hall, tall watchtower, map room, banners, expedition packs | Existing quest journal, real campaign and guardian records |
| Moonbloom Garden | Glasshouse, tall conservatory, herbs, cauldron, potting work | Existing crafting and wardrobe/customization stations |
| Rift Gate Sanctuary | Monumental broken-stone portal, floating runes, guardian seal plinths | Existing Story/Free Mode World Selection and expedition return |
| Vanguard Training Grounds | Fenced practice court with open gates, target butts, racks, straw and benches | Real equipped-weapon test; the duel ring is reserved scenery |
| Hearthside Quarter | Dormer, asymmetric and rounded roofs, balcony/corner/laundry houses, narrow clay lanes and household well | Existing storage/inventory access and hidden lore |

Every district has at least three authored motifs, a distinct material palette, a
persistent lore visit and a waypoint. The center ring connects to radial roads
and secondary perimeter lanes; bridges cross the visible water with matching
bank collision. Structural feet, props, portal plinths, rails and boundaries share
one solid registry. Overhanging roofs and tree canopies depth-sort at their feet.
Private household and annex doors are explicitly scenery; public stations and
beacons have contextual rings, labels and bounded interactions.

Initial spawn is **1800,1664**; expedition return is **2548,2758**. All 36 public
interaction entrances and all nine district locations pass walking reachability
and collision checks. The old eleven discovery IDs remain recognized.

## Preserved and newly implemented

| Preserved | Extended or new |
| --- | --- |
| One shared character, seven equipment slots, wallet, materials, XP, quests and campaign clears | World navigation schema 2 with layout revision 3, waypoint unlocks and position epoch |
| Existing blacksmith, crafting, merchant transactions and wardrobe | District-specific shop entry categories and expanded physical station surroundings |
| Weapon evolution at every three enhancement levels | The same held weapon and modular character remain visible across town travel |
| Story progression, repeatable Free Mode gathering, loot settlement and frozen run recovery | Safe expanded hub spawn, return and camera behavior |
| H Sanctuary, I inventory, Q journal, Activity Directory and `haven-locate` route marker | M / touch Town Map overview, player marker, discovery states, destination details and real Fast Travel |
| Existing per-character writer, repository transactions, revision guards and backups | Arrival epochs prevent pre-teleport autosaves from replacing the committed landing |
| First redesign's tiles, original architecture, district ambience, lore and living-city systems | Native compound annexes, 18 residents, larger roads/gardens/lanes, indexed collision and jump-aware culling |

## Fast Travel and save compatibility

`src/game/world/waypoints.ts` exposes the authoritative registry stored in the
shared layout JSON. Every destination has a stable ID, district, exact spawn,
facing, initial state, beacon ID and qualifying station visits. Plaza and Grove
start unlocked. A successful range-validated `visit` to another district's beacon
or station adds that district to the persisted waypoint set. Merely marking a
route does not discover it or move the player.

| ID | Safe coordinates | Initial availability |
| --- | --- | --- |
| `plaza` | 1800,1664 | Available |
| `grove` | 1000,1568 | Available |
| `emberforge` | 800,1040 | Explore |
| `market` | 2864,1904 | Explore |
| `guild` | 1840,896 | Explore |
| `garden` | 2848,1024 | Explore |
| `gate` | 2848,2912 | Explore |
| `training` | 832,2816 | Explore |
| `hearthside` | 1808,2544 | Explore |

The separate `fast-travel` command accepts a waypoint ID and expected position
epoch, never arbitrary client coordinates. It checks the active writer, hub
location, discovery state and current epoch. Landing resolution checks the player
radius, world bounds and canonical solids, and can search nearby within the same
district. No valid landing means no teleport.

The existing repository transaction commits only the new position, position epoch
and sequence. React then sends the committed arrival to the retained Phaser
scene, resets held movement, moves the actor and camera, plays a short transition
and releases input. Old-epoch autosaves are ignored even if their sequence is
higher. The persisted epoch survives reload and writer/session changes. Reduced
motion uses a minimal transition. Mouse, keyboard focus/Enter and 44px touch
controls use the same command. All new map labels, states and errors support
English and Thai.

Schema-1 hub saves migrate to world schema 2 without changing the outer save or
backup schema. Positions map from the published 1800 × 1500 hub to the new city,
then validate against collision; a stranded position recovers to safe ground.
Historical station discoveries infer their district unlocks. Invalid current
positions recover to the Plaza; unknown schemas or invalid other metadata remain
rejected. Customization, HP, quest state, extraction counts, wallet, equipment and
XP remain intact. Existing expedition checkpoints stay frozen and unmodified.
Migration is idempotent and backup checksums are verified before migration.

## Rendering, atmosphere and performance

The playable scene uses **ground, terrain, structures, foreground and collision**
tile layers plus separate depth-sorted building, prop, NPC and FX sprites. The
896 × 752 `terrain.png` is only the Town Map overview. Building wings use their
own native silhouettes, roof heights, windows, chimneys, balconies and trade
props; the expansion does not stretch a single world-sized texture.

Phaser culls tile layers. Sprite visibility updates every 220ms during walking
and immediately when the camera jumps or resizes. Static collision uses 192-unit
spatial buckets. Local particles reuse Graphics and cap at 72, or 18 on low
quality; reduced effects disables them and freezes cosmetic station/foliage
animation. Station frames update at 100ms intervals. Eighteen residents share one
atlas and deterministic, collision-checked occupational loops with nighttime
home poses. Residents are cosmetic and non-solid.

Forge fire/smoke, water, cauldron bubbles, wind plants/flags and portal energy use
bounded atlas loops with explicit parent-relative draw depths. A cosmetic
20-minute day changes darkness, lanterns and window lights. Real guardian clears,
extractions and quest/cache state control the seal plinths, garden growth and
arrival banner. These visuals never award progress or drive economic clocks.

The existing single Web Audio engine handles district ambience with smooth
crossfades, at most two ambient loops, one scheduler and a 24-voice cap. District
motifs use original synthesis, without downloaded samples. Existing volume,
visibility, reduced-effect, pause and gentle-intensity preferences remain active.
The Canvas2D renderer and pixel-art configuration are retained. Camera bounds
include a small presentation margin behind the HUD so southern-edge arrivals
remain above mobile controls; physical navigation still uses exact city bounds.

## Original assets and editable design

- [Layout, architecture, travel and palette boards](design/haven-city.html) are
  editable HTML/SVG generated with `npm run design:city` from production data.
- [Art bible](../art/haven-city/README.md) defines native scale, material vocabulary,
  animation and entrance conventions. [Palette](../art/haven-city/palette.json)
  and [layout JSON](../src/game/world/city-layout.json) are source editable.
- [Inventory](haven-city-assets.json) lists all 54 Haven assets, dimensions,
  frame geometry, use and generator source, distinguishing retained legacy art.
- `npm run assets:city` regenerates 39 original city outputs and refreshes the
  asset manifest. `python3 scripts/generate-haven-city.py --check` verifies exact
  deterministic output. The current city kit is CC0; no reference-image pixels,
  copyrighted sprites, third-party map or sampled audio are included.
- Figma capability search returned no callable Figma tools. These are local
  boards; no Figma file or Figma link is claimed.

## Validation and evidence

The test suite includes BFS walking reachability, actual collision/bridge checks,
thousands of indexed-versus-brute-force collision comparisons, every resident
route, all nine safe arrivals, locked/unknown/stale commands, writer isolation,
legacy migration, frozen checkpoints, reload and stale autosaves. Browser flows
exercise real purchases/equipment, crafting, lore, guild records, weapon tests,
Thai touch navigation, audio bounds, progression preservation and unchanged
canvas identity.

| Executed check | Result |
| --- | --- |
| Formatting, ESLint and TypeScript | Passed |
| City asset regeneration `--check` and asset registry validation | Passed; 39 deterministic city outputs, 465 registered PNGs |
| Unit/integration tests | **476 passed**, 25 files |
| Instrumented production build | Passed |
| Full instrumented Playwright run | **131 passed**, 1 production-only case skipped, 1 obsolete route failure |
| Corrected offline route + mobile night/touch + performance rerun | **3 passed**; the old timed route was replaced with validated walking segments through the expanded city |
| Actual RAF-rate performance threshold rerun | **1 passed** |
| Ordinary production build, without `NEXT_PUBLIC_E2E` | Passed, including all 476 unit/integration tests |
| Ordinary production Town Map travel/reload and offline walking/expedition | **2 passed**; test hooks confirmed absent |
| Editable design board in Chromium | Passed: all architecture images, nine markers, keyboard district selection and collision toggle; no page errors |

The lone full-run failure was the offline test's old small-town walking script;
offline loading, character persistence and the Town Map had already succeeded.
The corrected test walks the real southern lane and eastern portal approach
without test-only placement or Fast Travel, then starts the real expedition.
All **132 applicable instrumented browser scenarios** have passed across the full
run and focused correction/coverage reruns. The final night test checks actual
canvas brightness at all four corners at mobile zoom, in addition to checking
the HUD and preserving the updated night screenshot.

The [recorded performance sample](haven-city-performance.json) uses Headless
Chromium 156 and the retained Canvas2D renderer, after visiting every waypoint.
Four-second actual animation-frame samples measured **59.0 FPS** at 1440 × 1000
and **27.3 FPS** at 390 × 844 with 4× CPU throttling (p95 frame gaps **16.8ms** and
**50.1ms**). Heap use was **26.2 / 31.7 MiB**; uncompressed texture-source footprint
was **22.8 MiB**. Culling kept **62 / 47 of 335** city sprites visible. These are
local browser/emulation measurements, not physical-phone or GPU-allocation
measurements. Phaser's separate loop diagnostic is retained in the raw report;
the performance assertion uses actual browser animation-frame cadence.

### CI follow-up

GitHub's pull-request and push checks for `e7f30b5` exposed three timing/fixture
issues after the initial local validation above:

- A 450ms walk can leave the player 81 units from the new Plaza beacon, inside
  the legitimate 85-unit interaction range. The range test now uses its own
  validated empty-street fixture before asserting that E opens no dialog. Its
  original movement, collision and retained-canvas assertions remain intact.
- The night HUD can update before the throttled canvas paint. The visual test
  now polls actual pixel brightness at each corner, retaining the same 5%
  darkening requirement instead of sampling immediately after the HUD changes.
- The mobile stress check failed before measuring combat because a visible SSR
  landing button could be clicked before its JavaScript handler was attached.
  Landing buttons now stay disabled until mounted, with an accessible busy state.
  A new regression holds JavaScript responses during 4× CPU startup, then verifies
  that the first enabled Practice click reaches the launcher and starts a run.

The deferred-JavaScript regression failed on the previous implementation. The
existing 150-enemy / 4× CPU stress setup and performance requirements are unchanged.
After the correction, each of the three CI-failing scenarios passed twice (six
checks), and the new delayed-JavaScript startup regression passed twice. The
instrumented production build, all 476 unit/integration tests, lint, formatting
and TypeScript checks passed locally. GitHub checks run again on the updated head.

| District | Desktop | Mobile |
| --- | --- | --- |
| Plaza | [View](images/haven-city/desktop-plaza.png) | [View](images/haven-city/mobile-plaza.png) |
| Emberforge | [View](images/haven-city/desktop-emberforge.png) | [View](images/haven-city/mobile-emberforge.png) |
| Market | [View](images/haven-city/desktop-market.png) | [View](images/haven-city/mobile-market.png) |
| Grove | [View](images/haven-city/desktop-grove.png) | [View](images/haven-city/mobile-grove.png) |
| Guild | [View](images/haven-city/desktop-guild.png) | [View](images/haven-city/mobile-guild.png) |
| Garden | [View](images/haven-city/desktop-garden.png) | [View](images/haven-city/mobile-garden.png) |
| Rift Gate | [View](images/haven-city/desktop-gate.png) | [View](images/haven-city/mobile-gate.png) |
| Training | [View](images/haven-city/desktop-training.png) | [View](images/haven-city/mobile-training.png) |
| Hearthside | [View](images/haven-city/desktop-hearthside.png) | [View](images/haven-city/mobile-hearthside.png) |

[Desktop Town Map](images/haven-city/town-map-desktop.png) ·
[Mobile overview](images/haven-city/town-map-mobile-overview.png) ·
[Thai destination controls](images/haven-city/town-map-mobile-th.png) ·
[Lantern hours](images/haven-city/city-night-mobile.png).
Screenshots use a seeded local test character and contain no personal save data.

## Changed-file guide and remaining scope

- `src/game/world/`: canonical layout, district helpers, waypoint registry,
  spatial collision, navigation migration/commands and unit regression coverage.
- `src/game/phaser/haven-city.ts`, `haven-scene.ts`, bridge types: world rendering,
  camera, animations, culling, committed arrivals and epoch-bearing saves.
- `src/components/HavenGame.tsx`, `TownMap.tsx`, `RpgScreen.tsx`,
  `RiftOutfitters.tsx`, Haven CSS and Thai dictionaries: functional district
  stations, map, destination details and accessible travel controls.
- Audio engine/menu integration: the retained audio lifecycle with district
  transitions. Persistence validation invokes the narrow world migration.
- `scripts/generate-haven-city.py`, art bible/palette, asset registry/manifests,
  `public/assets/haven/city-*`, overview and PWA cache version: original source
  assets and the expanded map. Design generator and this report document them.
- `e2e/city.spec.ts`, helper and existing coordinate-dependent regressions:
  desktop/mobile visual evidence, real gameplay integration and travel safety.

Homes and annexes have no interiors. The future duel court has no PvP. Residents,
day/night and discovery are local; this change preserves the existing separation
of authoritative commands and presentation, but adds no multiplayer service.
Audio remains procedural rather than a mastered recorded soundtrack. The kit is
fully regenerable original native art; further bespoke interior/character art is
future production scope, not a missing dependency disguised as a live activity.
No production deployment or merge is part of this change.
