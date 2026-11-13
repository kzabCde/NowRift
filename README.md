# NowRift — Modular Pixel Fantasy RPG

A playable, original pixel-art Bullet Heaven campaign built with **Next.js 15**, **React 19**, **TypeScript**, and **Phaser 4.2.1**. Three distinct wanderers can wield any owned weapon: staff projectiles, sword slashes, slowing frost pulses or a fire-lit glaive sweep. Explore four worlds with twenty stages and grow stronger through real equipment, character progression and a local economy. Three local characters, recoverable runs, daily rewards, quests, achievements and JSON backups keep progression on your device. The original eight-minute Forest Guardian practice encounter remains available. No account, database server, keys, or multiplayer services are required.

**Play → Create/select a character → Cross the Rift → Rift Heaven.** Your named character lives in the original pixel-art town: meet Mara, visit working RPG stations, change your cloak palette, train, and take a forest expedition through the portal. Gather, extract, return, craft with the same inventory, and continue after a refresh. **H** opens Sanctuary over the retained world; the Activity Directory marks real building entrances. The approved main-menu design, previous launcher and all twenty campaign challenges remain available. See [journey, controls, architecture, save safety and validation](docs/character-first-journey.md) and the [preceding open-world foundation](docs/open-world-foundation.md).

Open **Sanctuary → Daily activities & achievements** in the city, or **Manage saves & backups** during character selection, to manage characters, claim rewards, inspect actual statistics, and export or restore a save. Check-in rewards are shared across the local player’s three slots and reset at midnight in **Asia/Bangkok**. Daily quests and achievements use actual combat and inventory actions. See [Phase IV persistence rules, validation and limitations](docs/phase-4-validation.md).

## Campaign

Press **Play** to create or continue a character. Move with WASD/arrows or touch drag; press **E** near a building, NPC or portal. **I** opens inventory, **M** opens the town map, **Q** opens the journal, and **H** toggles Sanctuary. The portal’s forest expedition requires 20 seconds and 5 kills before returning to its extraction point. Successful extraction banks enemy loot and gathered supplies; defeat/abandonment loses unbanked expedition loot while existing equipment remains safe. The inn restores health for the next trip. The first prologue rewards one actual extraction.

Equip an owned weapon through **Sanctuary → Open Inventory**, then walk to **Portal Sanctuary → Campaign challenges**. Four worlds each contain five playable stages, with Normal, Hard and Nightmare difficulty and saved sequential unlocks. Stages 1–4 are survival encounters; Stage 5 culminates in the world boss. City adventures return to Rift Heaven. **Practice & legacy tools** explicitly opens the retained launcher and original **Start New Run** practice route.

**Inventory & equipment** opens the sanctuary: a 60-slot inventory, six equipment slots, five rarities, character stats and permanent disciplines, +0–15 enhancement with pity, a trader, material crafting, confirmed dismantling, protected overflow loot and a transaction journal. Actual enemy, elite, boss and stage rewards fund the same wallet and inventory. Your equipped weapon controls campaign attacks, held art and statistics; character choice remains independent. Empty weapon slots block stage entry. The four original temporary skills remain available only in the explicit practice route.

Use the World Map to earn permanent rewards, then improve your gear and enter harder stages. Gear changes apply when a new campaign run starts. Recovery preserves that run’s original weapon instance, attack configuration and stats. Pause a campaign to use healing or attack-speed tonics from your real inventory. See [Phase III rules, architecture, tests and limitations](docs/phase-3-validation.md), including all probability tables and random bounds. [Phase II validation](docs/phase-2-validation.md) records the preceding world implementation.

See [equipment contracts, original layered art, save compatibility and validation](docs/weapon-decoupling.md) for the character/weapon refactor.

Characters now use synchronized, independently replaceable 48px body, skin, face, hair, clothing and owned equipment layers. The wardrobe saves skin/hair/face choices alongside cloak palettes. Inventory, town and combat share the same appearance resolver; run recovery preserves the original equipped look. Original pixel sprite effects accompany actual attacks, impacts, status effects and committed gathering/crafting receipts. All four biomes have distinct enemy, boss and prop silhouettes. See the [asset audit](docs/pixel-asset-audit.md), [pixel-art specification](docs/pixel-art-specification.md), and [visual migration, validation and production backlog](docs/pixel-art-validation.md).

## Run locally

Use Node **22.12+ or 24 LTS** (Node 24 was used for development) and npm. Versions are pinned in `package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
```

Production/PWA validation:

```sh
npm run build
npm run start
```

Use **Play** for the persistent-world journey, or **Practice & legacy tools → Start New Run** for the retained survival mode. The development server does not register a service worker. Production builds cache the app shell, starting Forest/Haven art and async gameplay code, and warm visited world/appearance art. Visit additional worlds and appearance variants online before expecting them to work offline; the full wardrobe and later biomes are intentionally loaded on demand. Browser storage eviction or private browsing can remove/prevent caches and saves.

## Controls

| Action          | Desktop                                                      | Mobile                                              |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Move            | WASD / arrow keys; choose either set in Settings             | Touch and drag; optional left/right starting region |
| Attack          | Automatic nearest-target attacks                             | Automatic                                           |
| Level up        | Select one of three blessings                                | Tap one blessing                                    |
| Pause / resume  | Escape / Pause                                               | Pause / Resume                                      |
| Focus mode      | Focus / Exit Focus                                           | Focus / Exit Focus                                  |
| Settings        | Audio, effects, quality, input, language and fullscreen      | Same; fullscreen where supported                    |
| Sanctuary       | H opens/closes personal management over the city             | Sanctuary button                                    |
| Interact        | E near a station, NPC or resource                            | Contextual action button                            |
| Find activities | Activity Directory marks real station entrances              | Same; walk to the marked entrance                   |
| Inventory       | Hub → Inventory & equipment; click an item or equipment slot | Tap; details scroll into view                       |
| Tonics          | Pause a campaign, then select a tonic                        | Same; real inventory is consumed                    |

Leaving the tab pauses the run. Touch cancellation clears movement. Resizing or rotating changes the camera viewport without resizing/resetting the simulation world. Trees and rocks have collision footprints at their bases; foliage is depth-sorted above characters.

## Combat and content

- **Characters:** Rift Wanderer (100 HP / 180 speed / 5% critical), Ash Sentinel (130 / 162 / 5%), Dusk Strider (80 / 207 / 10%). Each has a distinct body and clothing silhouette, four facing directions and interchangeable appearance/equipment layers.
- **Relics:** Heartwood Sigil grants regeneration, Sunken Sun grants damage, Warden’s Tear grants health, Cinder Crown grants critical chance. Earn them from campaign world guardians; enhance with the displayed resources in Inventory.
- **Default weapon:** Arcane Bolt starts at 10 damage / 0.8 seconds.
- **Arcane Bolt:** precise targeted magic projectiles.
- **Twin Daggers:** paired fast projectiles, shorter range.
- **Fire Orb:** slower projectile with splash damage on impact.
- **Frost Pulse:** radial damage and a movement slow; projectile-count and velocity blessings have explicit pulse-specific effects.
- **Enemies:** Moss Slime, Briar Goblin, bursting Forest Wolf, ranged Thorn Caster, and durable Armored Guardian.
- **Blessings:** damage, attack speed, movement, maximum health, critical chance, critical damage, projectile count, projectile speed, area, regeneration, and pickup radius. Stacks are bounded; capped blessings are removed from offers.
- **Survival:** basic enemies first; faster enemies from two minutes; casters and elites after four; mixed pressure after six. Spawn rates use simulation time, not frame count.
- **Boss:** Forest Guardian spawns at 08:00, even if normal enemies fill the population cap. Root strikes lock positions and telegraph for 1.3 seconds; spreading projectile rings have dodgeable gaps. At 50% HP, strikes multiply and attacks accelerate. Normal spawns stop during the encounter.
- **Victory:** kill the Guardian for its 100 gold plus 150 victory gold. Phase I gold is a run score, not a permanent currency. Defeat, victory, retry, and return-to-Hub are functional.

## Architecture

| Location                                                | Responsibility                                                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/game/rpg/`                                         | Typed items, seeded loot, inventory, stat engine, enhancement, economy commands and migration                         |
| `src/components/RpgScreen.tsx`, `src/app/rpg.css`       | Responsive equipment, inventory, character, trader, blacksmith and journal                                            |
| `public/assets/items/`, `scripts/generate-items.py`     | Original CC0 item atlas and editable generator                                                                        |
| `src/game/audio/`, `src/components/Soundscape.tsx`      | One shared audio context, music, ambience, combat and enhancement cues                                                |
| `src/game/loadout.ts`, `src/components/Sanctuary.tsx`   | Three character archetypes and the retained practice character/relic loadout                                          |
| `src/game/feedback.ts`, `src/game/phaser/combat-vfx.ts` | Bounded semantic feedback and pooled visual effects                                                                   |
| `src/game/campaign/`                                    | World/stage/difficulty definitions, seeded maps, hazards, unlocks, rewards and atomic campaign saves                  |
| `src/components/WorldMap.tsx`                           | World atlas, stage selection, locks, boss preview and material wallet                                                 |
| `src/game/content/forest.ts`                            | Enemy, weapon, blessing, obstacle, and stage definitions                                                              |
| `src/game/engine.ts`                                    | Framework-independent simulation, targeting, swept collisions, spatial buckets, object pools, XP and boss logic       |
| `src/game/phaser/`                                      | Boot, Preload, MainMenu, Game, and Results scenes; rendering, camera and input                                        |
| `src/game/bridge.ts`                                    | Typed, per-instance React ↔ Phaser commands and events                                                               |
| `src/components/PhaserHost.tsx`                         | Browser-only dynamic import, instance ownership and teardown                                                          |
| `src/components/NowRiftGame.tsx`                        | HUD, blessings, pause, settings, results and exit confirmation                                                        |
| `src/components/NowRiftMainMenu.tsx`                    | Gateway, Hub, weapon selection and local records                                                                      |
| `src/game/services/`                                    | Replaceable run repository backed by versioned IndexedDB; legacy score metadata                                       |
| `src/game/persistence/`                                 | Profile/slot repository, atomic IndexedDB adapter, schema migration, daily systems, checkpoints and validated backups |
| `src/components/ProfileScreen.tsx`, `SaveIndicator.tsx` | Guest dashboard, save slots, rewards, recovery, import/export and confirmed storage status                            |
| `src/state/settings.ts`                                 | Zustand preference state with validated localStorage reads                                                            |
| `public/assets/forest/`                                 | Original local art and CC0 asset notice                                                                               |
| `scripts/generate-assets.py`                            | Editable procedural pixel-art source; requires Pillow only to regenerate                                              |

Phaser owns the frame loop, input, camera, scenes, and pooled visual objects. The simulation owns all combat state. React receives snapshots at approximately 10 Hz or on phase changes, never per-frame combat updates. Instances and listeners are scoped to a mount/run; no shared game singleton is created. Phaser uses its Canvas2D renderer for this sprite-only stage: it avoided costly software WebGL rendering in cloud Chromium while retaining the Phaser scene lifecycle.

## Local data

IndexedDB `nowrift-campaign` holds the schema-2 local player, three independent character records and automatic recovery backups. Each character keeps one canonical wallet, inventory, equipment, progression, enhancement journal, statistics, daily objectives, achievements and run history. Original Phase II/III data migrates in place into the first character; the original `nowrift-saves` history is imported once and preserved. The Hub displays the active character’s latest 20 records.

Runs checkpoint every ten seconds and on pause, upgrades and safe lifecycle events. After a reload, use **Recover Run → Resume checkpoint**; recovery starts paused with the saved combat state and random stream. Stable receipts, run ownership and atomic settlement prevent duplicate rewards. Another tab must explicitly take over a checkpoint; its old writer is blocked. Storage failures keep the latest committed checkpoint. Denied storage permits clearly labeled temporary practice, while permanent campaign progression requires working storage.

Small preferences and active-slot metadata use the shared localStorage abstraction, with debounced writes and lifecycle flushing. JSON exports include the selected character, profile metadata, shared check-in history and SHA-256 integrity checksum. Imports validate and preview the file, require confirmation, and create a recovery copy before replacement. Other slots are preserved. Keep external backups: browser eviction or clearing site data can remove every local copy. Local files and device time are editable; checksums and local Player IDs provide no server verification or competitive anti-cheat.

## Sound and accessibility

Audio starts on the first keyboard or pointer interaction. Master, Music, Sound effects and Ambient buses, mute, and Gentle/Balanced/Full intensity persist locally. One Web Audio engine handles procedural sound events, adaptive music and world ambience; it pauses on hidden tabs and resumes on a fresh gesture. This is functional original synthesis, not a finished recorded or mastered soundtrack.

Low quality targets 30 FPS; Medium and High target 60 where the device permits. Paused/upgrade/result views use 15 FPS. Effects and damage numbers are bounded and configurable. Reduced effects and OS reduced motion suppress decorative motion and shake. Boss warnings remain visible. Poison and chain-lightning VFX primitives are available for future mechanics; these damage types are not part of the current weapons.

## Language and branding

English and Thai work offline and can be switched during combat without remounting Phaser. The new inventory, item catalog, enhancement and trader interfaces use the same locale store. See [localization architecture](docs/internationalization.md). Canonical IDs and save records remain unchanged by translation.

The official transparent NowRift artwork and install icons are generated locally from committed source before development, tests and builds. See [branding](docs/branding.md).

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
npm run test:stress
npm run test:playthrough
npm run assets:check
```

`npm run build` also runs typechecking and unit tests. Playwright launches a production server on port 3100. The config uses an installed `/usr/bin/chromium` if available, or the browser installed by `npx playwright install --with-deps chromium`. Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when needed. Art is committed, so Python is not required for installation or play.

To regenerate the original game art, install the optional pinned Pillow dependency (`python3 -m pip install -r scripts/requirements-art.txt`), then run `npm run assets:generate`. The consolidated generator preserves ordering between character layers, environment/item refinements and effects, then regenerates the hashed manifest. Production builds validate the committed manifest without needing Python.

The full browser suite includes RPG economy and migration checks, plus explicit opt-in scenario fixtures for the eight-minute boss, campaign worlds, equipment/tonic combat integration, upgrades, defeat and a 150-enemy stress load. Build them only for testing:

```sh
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
# Restore the ordinary build after testing; test controls are absent by default.
npm run build
```

Without the flags, the ordinary guest/input/responsive/settings/PWA smoke tests run and the instrumented tests are explicitly skipped. The fixtures set up scenarios; damage, telegraphs, outcomes, and persistence still execute real game code. A separate deterministic movement-and-upgrade bot (`test:playthrough`) completes the full eight-minute survival and boss encounter using normal combat stats; it does not establish human difficulty balance.

Tests produce screenshots and traces in ignored `test-results/`. Stress measurements distinguish Node simulation time from rendered browser frame rates; neither is a physical mobile-device benchmark. See [Rift Haven validation](docs/open-world-foundation.md) for current tests and browser results, and [Phase IV validation](docs/phase-4-validation.md) for the preceding persistence release; [Phase III validation](docs/phase-3-validation.md) records the preceding RPG implementation, and [Phase I validation](docs/phase-1-validation.md) records the original slice.

Production target: `https://nowrift-one.vercel.app/`. Deployment requires Vercel project access; see the Phase III release notes. Application deployment is separate from publishing this development environment.

Weapons physically evolve at +3, +6, +9, +12 and +15. See [weapon evolution, editable design boards, generation and validation](docs/weapon-evolution.md).
