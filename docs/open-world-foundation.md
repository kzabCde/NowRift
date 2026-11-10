# Open-world foundation: assessment and implementation scope

Baseline: published `main` at `c752c7c`, including merged Phase IV. Phaser owns combat scenes; React owns menus through a per-instance typed bridge. A single canonical slot record and transactional repository own all inventory and currency. Runtime checkpoints already preserve deterministic combat and writer ownership. The existing twenty campaign stages, English/Thai dictionaries, original local art, audio engine and PWA are reusable.

The principal risks are duplicated character state during travel, settlement accidentally granting campaign clears to repeatable farming, stale writes from another tab, remounting Phaser when overlays or language change, and incompatible save extensions. The implementation keeps financial mutations inside the existing repository, gives hub movement a writer/sequence contract, distinguishes expedition rewards from campaign progression, and validates an additive versioned world-state extension. Existing backups without that extension migrate to a safe default.

This release prioritizes the first connected slice: enter an explorable Rift Haven with camera/movement/collision; interact with NPCs and real RPG stations; travel to a repeatable forest encounter using existing combat; gather, extract and return; craft with the same inventory; refresh and recover correctly. A small prologue quest connects an NPC to an actual extraction. Existing campaign challenges remain accessible. Larger story arcs and free-roaming biome maps are subsequent expansion work, not represented as completed.

Implementation order: (1) typed map/movement/save contracts and original town assets; (2) Phaser hub and localized interaction UI; (3) safe forest travel, extraction and return; (4) persistence/quest/station integration; (5) unit/browser/offline/mobile regression checks and release notes. No production merge, deployment or settings changes are part of this release.

## Implemented player journey

Continue as Guest, select a saved character in **Profile & Saves**, and choose **Enter Rift Haven** in the retained launcher. The original practice button, inventory, profile systems and twenty-stage World Map remain available. The new entry is explicit so existing players can continue using those routes.

Rift Haven is a 1,800 × 1,500 world with a following camera, original cobbled streets, a fountain, gardens, trees, a river/bridge, solid buildings, valid entrances and eleven interaction points. A nearby prompt and E/touch interaction are checked against current position. Character movement uses normalized eight-direction input with independent axis collision; pointer cancellation, blur and resizing clear movement. Hub movement is 180 units/second. Character identity, inventory, combat build and health persist in the same slot used by the existing game.

| Landmark           | Working interaction                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Central Plaza      | Safe starting point, orientation and first-entry tutorial                                |
| Mara, Rift Keeper  | Dialogue, accepting **A path home**, claiming its real reward                            |
| Ember & Anvil      | Existing blacksmith, quotes, confirmed enhancement and dismantling                       |
| Tinker’s Workshop  | Existing recipes, actual material/gold consumption and inventory output                  |
| Willow Market      | Existing trader, confirmed buying/selling and prices                                     |
| Moonthread Atelier | Three original cloak palettes; preview/revert/confirm/persistence                        |
| Wayfarer’s Rest    | Actual saved hub HP restoration and safe save                                            |
| Wanderer’s Vault   | The canonical inventory/equipment UI; no second storage inventory                        |
| Quest Board        | Prologue status, tracking, rewards and access to existing daily/profile systems          |
| Portal Sanctuary   | Repeatable forest expedition and access to all twenty campaign challenges                |
| Training Grounds   | Real shared-engine attacks against a temporary target; no currency, gear or quest credit |
| Forgotten Cache    | Discoverable, once-per-character 30 Gold + 2 Wood, through inventory/overflow rules      |

RPG screens open over a retained, input-locked Phaser instance. Closing a screen reloads canonical character data. Language changes do not recreate the scene. Map markers guide walking rather than teleporting. Undiscovered treasure stays off the map. Return from an adventure places the player safely beside the portal.

## Controls

| Action                      | Desktop                                          | Touch                                                   |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Move                        | WASD / arrows, respecting saved input preference | Drag in the permitted movement region; visible joystick |
| Interact / gather / extract | E while in range                                 | Contextual action button                                |
| Inventory                   | I or Inventory                                   | Inventory                                               |
| Town map                    | M or Map                                         | Map; select a landmark to mark its entrance             |
| Quest journal               | Q or Journal                                     | Journal                                                 |
| Pause                       | Escape or pause button                           | Pause button                                            |
| Return to launcher          | Menu                                             | Menu                                                    |

Existing combat attacks remain automatic. Campaign and farming use the existing blessing selection, pause, tonics and settings. Portrait and landscape layouts are supported; menus remain scrollable on narrow/short viewports. Fullscreen, audio and graphics settings retain the existing controls.

## Travel and expedition rules

The portal shows canonical world names, materials, recommended power and unlock feedback. The implemented farming destination is **Whispering Forest**, using the real `forest-1` map, enemy definitions, shared character build and seeded combat. Normal is available immediately. Hard/Nightmare use the existing forest difficulty unlock requirements and multipliers. Other biomes are playable through their existing campaign challenges; free exploration and dungeon activities are explicitly marked as later work.

Travel first commits the hub’s safe return position, then prepares the existing run owner and checkpoint. The same slot, gear and wallet stay authoritative. Repeated input is guarded. A transition interrupted before a run exists returns safely to the portal. An interrupted active run remains recoverable through **Profile & Saves**; another run cannot silently replace it.

Three original resource nodes are available per forest expedition: **3 Wood**, **2 Slime Cores**, and **2 Copper Ore**. Each node requires proximity, can be gathered once, and is stored in the runtime checkpoint. These resources remain in the expedition ledger until extraction. Enemy/elite/boss rewards use the existing seeded kill loot and rarity tables. Farming grants no campaign completion loot, first-clear bonus, stage clear, world unlock or stage-count objective credit. Actual kills, bosses and playtime still use existing metric checkpoints.

Extraction requires **20 simulation seconds and 5 kills**, then interaction with the return portal near the initial spawn. Only that action ends a successful expedition. The old campaign timer and boss-death victory condition cannot automatically bank farming loot. The result screen shows banked rewards; extraction settlement, its receipt, ledger clearing and the saved return position commit atomically.

- **Success:** bank eligible enemy loot and gathered resources; protect full bags through the existing overflow system; retain current HP for the hub, then return beside the portal.
- **Defeat:** lose all unbanked expedition currency, character XP, materials and equipment. Previously owned items remain safe. Return with 1 HP; the inn restores health.
- **Abandonment:** confirmation explains that all unbanked loot is lost. Permanent items/progression remain unchanged and the character returns to the hub.
- **Refresh/interruption:** recover the last committed deterministic checkpoint, paused, with its node ledger, starting appearance/build, random state and owner. Unsaved seconds may be lost. No rewards bank merely because the browser closes.
- **Save failure:** preserve the last committed checkpoint and permanent data; report failure and use the existing retry/recovery path. A partial snapshot without its farming ledger is rejected.

Resting changes saved hub health; the next portal adventure starts with that health. Campaign launches from the original launcher retain their original behavior. Expeditions are repeatable independently of campaign clears. Normal-stage first-clear rewards remain available after farming.

## Prologue and customization scope

**A path home** has stable per-character state: available → active → completed → claimed. Accept it through Mara or the journal, complete an actual extraction, then claim **100 Gold + 2 Enhancement Stones** exactly once. The tracker and journal display actual progress. Daily quests and achievements remain the existing systems, reached through Profile & Saves. This is one connecting prologue objective, not a complete Chapter 1–4 narrative engine.

Appearance uses a documented minimal sprite approach: Moss, Ember and Tide cloak palettes reuse all ten original player animation frames. A preview is temporary until confirmation. Appearance never changes class, gear, affixes or stats and follows the player into portal adventures and recovery. Hairstyles, accessories, layered armor and further outfit families are not implemented.

## Architecture and changed files

| Location                                                              | Responsibility                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/game/world/content.ts`                                           | Authored geometry, solid footprints, interaction definitions, nodes and pure movement/range functions |
| `save.ts`, `actions.ts`                                               | Versioned world state, validation, writer/sequence ownership and transactional world commands         |
| `farming.ts`                                                          | Proximity prompts, harvest validation and eligible extraction reward resolution                       |
| `bridge.ts`                                                           | Typed hub startup data, bounded HUD snapshots and commands                                            |
| `src/game/phaser/haven-scene.ts`                                      | Original town rendering, culling, camera, sprites, inputs, training and world events                  |
| `src/game/phaser/lifecycle.ts`                                        | Exactly-once cleanup on shutdown or direct game destruction                                           |
| `src/components/HavenGame.tsx`, `src/app/haven.css`                   | Responsive HUD, interactions, overlays, dialogue, journal, travel and wardrobe                        |
| `src/components/NowRiftMainMenu.tsx`                                  | New entry, bound character and return routing; retained original routes                               |
| `src/components/NowRiftGame.tsx`                                      | In-range gathering/extraction UI, explicit loss policy and actual result/recovery routing             |
| `src/components/RpgScreen.tsx`                                        | Reused station entry tab and recipe focus                                                             |
| `src/game/campaign/{loader,runtime,commands,rewards}.ts`, `engine.ts` | Farming mode boundaries around shared combat and canonical settlement                                 |
| `src/game/persistence/{model,validation,repository,checkpoint}.ts`    | Additive world extension, atomic travel/return and harvested checkpoint state                         |
| `src/game/phaser/{scenes,create-game}.ts`, `PhaserHost.tsx`           | Mode loading, original palette sheets, scene ownership and lifecycle                                  |
| `src/i18n/dictionaries/haven-th.ts`, `th.ts`                          | Typed English-source/Thai copy for all new content and interactions                                   |
| `public/assets/haven/`, `scripts/generate-haven.py`                   | Original CC0 town kit and deterministic editable Pillow generator                                     |
| `public/sw.js`                                                        | Same-origin offline cache v12 including the town kit                                                  |
| `src/game/world/{world,lifecycle}.test.ts`, `e2e/haven.spec.ts`       | Movement, migration, transactions, extraction, lifecycle and browser journey coverage                 |

The new art kit is approximately 224 KiB committed. It contains terrain, six distinct building sprites, station/portal/prop art, an NPC sheet and three animated cloak palettes. No pixels from the user’s reference image or third-party games were copied. Pillow is only required to regenerate the kit; installation/play needs no new dependency. Package versions and lockfile remain unchanged. Official branding, existing art, audio buses/VFX, inventory rules and probabilities are reused.

The hub uses a small authored map and culls off-camera decorations/labels. It reuses textures and a bounded projectile pool for training. React gets bounded snapshots about 5–6 times per second, not every rendered frame. Phaser receives a copied startup configuration and never mutates React-owned objects. Low/medium/high rendering limits and current zoom preferences apply; overlays reduce the scene rate and clear movement. Cleanup releases DOM, keyboard, resize, locale and bridge listeners on shutdown **and** destruction.

## Persistence migration and safety

The canonical IndexedDB database/store, root Player ID, three slot IDs, inventory, clears, receipts, enhancement history, achievements and daily data are retained. Record schema 2 gains optional `local.world` with its own **schema 1**. Missing world data in older records and version-one/two backups migrates to a safe plaza spawn, healthy character, default Moss palette and unaccepted prologue. Present but incompatible/corrupt world data is reported and preserved. No character is silently reset.

The extension stores position, palette, HP, location, writer/sequence, tutorial state, discoveries, cache claim, extraction count and prologue state. Movement saves every ten moving seconds, on interactions, travel, launcher return and safe lifecycle events. Active expedition checkpoints include the collected node IDs and mode/return/appearance fields. All new fields have runtime validation. Existing JSON exports include them; old backup formats still migrate through the same validator. Rebound quest receipt prefixes continue to prevent duplicate story rewards after importing into another slot.

Hub commands read the latest canonical record inside one transaction and mutate only their fields. A new hub entry takes the hub writer lease; stale tabs cannot overwrite position or issue world actions. Existing run ownership independently protects combat checkpoints and settlement. Financial services continue to validate revisions, stable receipts, ownership, quantities and capacity. Data safety is local-only, not server-grade anti-cheat; editable saves/clocks cannot be trusted in future competitive systems.

## Validation

Use Node 24 and the existing Chromium/Playwright configuration:

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:stress
npm run test:playthrough
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
npm run build
npm run test:browser
```

Validation used Node 24.22.1 and Chromium 156 in the Linux cloud environment.

- **264 unit tests passed** across thirteen files, including 33 new world/lifecycle tests. Coverage includes normalized movement, building/water collision, range checks, invalid/locked destinations, slot and writer isolation, appearance, treasure, travel interruption, actual extraction/crafting, duplicate settlement, quota rollback, checkpoint harvest validation, old backup migration and scene destruction.
- The **full 65-case instrumented browser suite passed**. After final travel/error-recovery refinements, **all ten focused hub scenarios passed again**. They exercise the complete newly created character → town → quest → portal → real combat → gather → extract → craft → reload journey, shared-engine training, appearance persistence, low-HP retry, abandonment/rest, stale tabs, genuine reload recovery, keyboard/collision, touch cancellation and orientation.
- The **ordinary production build passed**, with **36 browser cases passing** and **29 explicitly skipped fixture scenarios**. It includes the latest Thai portrait checks and an offline reload followed by walking through the actual streets and entering forest combat without test-only navigation. Test controls are absent from the final ordinary build.
- Type checking, ESLint, Prettier and `git diff --check` passed. The original normal-stat Fire Orb bot still wins at **527.85 simulation seconds**, **911 kills** and **175 HP**.
- At 150 enemies, the browser stress run observed **60.08 FPS** desktop (p95 **16.7 ms**) and **59.99 FPS** at a mobile viewport with 4× CPU throttling (p95 **16.8 ms**). Low quality observed **29.88 render FPS**, with **4.5166 simulation seconds** over **4.5188 wall seconds**. These are cloud Chromium observations, not physical-phone measurements.
- A separate 180-enemy Node simulation run over 3,600 frames measured mean **0.321 ms**, p95 **0.429 ms**, maximum **3.420 ms** per update. This excludes rendering and does not establish device performance.
- Desktop, 320-pixel portrait, 844×390 landscape, Thai navigation, crafting, wardrobe and town screenshots were reviewed. Browser tests found and fixed direct-destruction cleanup, queued-input test timing, menu-to-world movement timing, and recovery wait issues; failures were not hidden or tests disabled.

Scenario controls only exist in explicit test builds. Browser fixtures speed up setup and navigation; real movement/collisions are tested separately, and combat, loot, harvesting, transactions, crafting and persistence still execute actual game code. The primary workflow checks a newly created slot, original inventory preservation, real projectile kills, an unbanked resource checkpoint, one extraction receipt, actual crafting costs, prologue claiming and a full reload.

## Remaining expansion work

| Roadmap area                       | Actual status                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Expansion 4: open-world foundation | Implemented explorable safe hub, NPC/stations, navigation and lifecycle                                                                                      |
| Expansion 5: world travel          | Implemented forest farming/return and access to the existing four-world campaign; independent open regions/dungeons remain                                   |
| Expansion 6: story                 | One prologue quest is implemented; full multi-chapter narrative, side-quest graph and cutscenes remain                                                       |
| Expansion 7: farming               | First repeatable forest expedition, gathering, loss rules, extraction and recovery implemented; other biome expeditions and encounter variety remain         |
| Expansion 8: RPG interactions      | Existing services are reachable from buildings; three cosmetic palettes and real training are implemented; layered customization and expanded recipes remain |
| Expansion 9: world depth           | Town discovery, bridge and one hidden cache implemented; connected biome exploration, additional NPCs and regional side quests remain                        |
| Expansion 10: polish               | Automated/desktop/emulated-mobile review is included; physical hardware testing, long human sessions and broader balance/art refinement remain               |

There is one fully explorable safe town and one farming arena, not a seamless four-biome open world. NPCs do not have schedules. No new full biome maps, procedural dungeon system or full story arcs are claimed. The wardrobe changes cloak colors rather than generating different hairstyles or armor animation sets. The workshop reuses the existing trader/recipe UI and the vault is access to canonical inventory, not additional storage capacity. Combat and equipment still use the existing top-down sprites and automatic attacks.

Abrupt termination can lose the last uncommitted interval, and browser storage eviction can remove all local copies; keep external backups. Offline caching requires a successful initial online visit. There is no backend, networking, authentication or new deployment configuration. Safari/Firefox, physical mobile hardware, recorded audio quality and multi-hour human play remain unverified. These are explicit follow-up tasks, not hidden completed features.

## Release and rollback

Work is isolated on `feature/open-world-rpg-foundation`, based on `c752c7c`. The previous launcher/campaign remains available as a fallback. Roll back code through version control rather than deleting browser data; export a save first. Parent save and backup formats remain compatible, with the additive world extension documented above. Draft PR creation will be attempted after final verification. No main merge or production deployment is authorized by this expansion request.

Finish or explicitly abandon expansion expeditions before rolling back to an older runtime; older releases do not understand the new farming activity. Keep the exported backup and permanent character data rather than resetting IndexedDB.
