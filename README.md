# NowRift — Phase III: RPG, Inventory and Economy

A playable, original pixel-art Bullet Heaven campaign built with **Next.js 15**, **React 19**, **TypeScript**, and **Phaser 4.2.1**. Choose one of four attack styles, explore four worlds with twenty stages, and grow stronger through real equipment, character progression and a local economy. The original eight-minute Forest Guardian practice encounter remains available. No account, database server, keys, or multiplayer services are required.

## Campaign

Enter as a guest, choose your weapon, then open **World Map**. Four worlds each contain five playable stages, with Normal, Hard and Nightmare difficulty and saved sequential unlocks. Stages 1–4 are survival encounters; Stage 5 culminates in the world boss. The original **Start New Run** button remains a Phase I practice route.

**Inventory & equipment** opens the sanctuary: a 60-slot inventory, six equipment slots, five rarities, character stats and permanent disciplines, +0–15 enhancement with pity, a trader, material crafting, confirmed dismantling, protected overflow loot and a transaction journal. Actual enemy, elite, boss and stage rewards fund the same wallet and inventory. Equipment, affixes and enhancement affect real campaign combat; the selected Hub attack style remains available.

Use the World Map to earn permanent rewards, then improve your gear and enter harder stages. Gear changes apply when a new campaign run starts. Pause a campaign to use healing or attack-speed tonics from your real inventory. See [Phase III rules, architecture, tests and limitations](docs/phase-3-validation.md), including all probability tables and random bounds. [Phase II validation](docs/phase-2-validation.md) records the preceding world implementation.

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

Use the guest gateway, choose your weapon in the Hub, and select **Start New Run**. The development server does not register a service worker. Production builds cache the app shell, async gameplay code, and local art for offline play after successful initial caching. Browser storage eviction or private browsing can remove/prevent caches and saves.

## Controls

| Action         | Desktop                                                      | Mobile                               |
| -------------- | ------------------------------------------------------------ | ------------------------------------ |
| Move           | WASD / arrow keys                                            | Touch and drag anywhere in the arena |
| Attack         | Automatic nearest-target attacks                             | Automatic                            |
| Level up       | Select one of three blessings                                | Tap one blessing                     |
| Pause / resume | Escape / Pause                                               | Pause / Resume                       |
| Focus mode     | Focus / Exit Focus                                           | Focus / Exit Focus                   |
| Settings       | Reduced effects and camera scale                             | Same; saved per browser              |
| Inventory      | Hub → Inventory & equipment; click an item or equipment slot | Tap; details scroll into view        |
| Tonics         | Pause a campaign, then select a tonic                        | Same; real inventory is consumed     |

Leaving the tab pauses the run. Touch cancellation clears movement. Resizing or rotating changes the camera viewport without resizing/resetting the simulation world. Trees and rocks have collision footprints at their bases; foliage is depth-sorted above characters.

## Combat and content

- **Characters:** Rift Wanderer (100 HP / 180 speed / 5% critical), Ash Sentinel (130 / 162 / 5%), Dusk Strider (80 / 207 / 10%). All use the original wanderer sprite with class tint.
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

| Location                                                | Responsibility                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/game/rpg/`                                         | Typed items, seeded loot, inventory, stat engine, enhancement, economy commands and migration                   |
| `src/components/RpgScreen.tsx`, `src/app/rpg.css`       | Responsive equipment, inventory, character, trader, blacksmith and journal                                      |
| `public/assets/items/`, `scripts/generate-items.py`     | Original CC0 item atlas and editable generator                                                                  |
| `src/game/audio/`, `src/components/Soundscape.tsx`      | One shared audio context, music, ambience, combat and enhancement cues                                          |
| `src/game/loadout.ts`, `src/components/Sanctuary.tsx`   | Three character archetypes and the retained practice character/relic loadout                                    |
| `src/game/feedback.ts`, `src/game/phaser/combat-vfx.ts` | Bounded semantic feedback and pooled visual effects                                                             |
| `src/game/campaign/`                                    | World/stage/difficulty definitions, seeded maps, hazards, unlocks, rewards and atomic campaign saves            |
| `src/components/WorldMap.tsx`                           | World atlas, stage selection, locks, boss preview and material wallet                                           |
| `src/game/content/forest.ts`                            | Enemy, weapon, blessing, obstacle, and stage definitions                                                        |
| `src/game/engine.ts`                                    | Framework-independent simulation, targeting, swept collisions, spatial buckets, object pools, XP and boss logic |
| `src/game/phaser/`                                      | Boot, Preload, MainMenu, Game, and Results scenes; rendering, camera and input                                  |
| `src/game/bridge.ts`                                    | Typed, per-instance React ↔ Phaser commands and events                                                         |
| `src/components/PhaserHost.tsx`                         | Browser-only dynamic import, instance ownership and teardown                                                    |
| `src/components/NowRiftGame.tsx`                        | HUD, blessings, pause, settings, results and exit confirmation                                                  |
| `src/components/NowRiftMainMenu.tsx`                    | Gateway, Hub, weapon selection and local records                                                                |
| `src/game/services/`                                    | Replaceable run repository backed by versioned IndexedDB; legacy score metadata                                 |
| `src/state/settings.ts`                                 | Zustand preference state with validated localStorage reads                                                      |
| `public/assets/forest/`                                 | Original local art and CC0 asset notice                                                                         |
| `scripts/generate-assets.py`                            | Editable procedural pixel-art source; requires Pillow only to regenerate                                        |

Phaser owns the frame loop, input, camera, scenes, and pooled visual objects. The simulation owns all combat state. React receives snapshots at approximately 10 Hz or on phase changes, never per-frame combat updates. Instances and listeners are scoped to a mount/run; no shared game singleton is created. Phaser uses its Canvas2D renderer for this sprite-only stage: it avoided costly software WebGL rendering in cloud Chromium while retaining the Phaser scene lifecycle.

## Local data

Completed run records are stored in IndexedDB (`nowrift-saves`, schema version 1). The Hub displays the latest 20. Stable run IDs make result writes idempotent. Invalid records are reported and preserved, not silently reset. Storage failure leaves the game playable and reports that saving failed.

Small preferences use `nowrift-preferences-v1`; the legacy best-kill key `nowrift-phase1-best-kills` is retained. Preference and metadata reads validate malformed values. Active runs and temporary blessings are in-memory and end on refresh/exit. Campaign unlocks, currency, materials, character XP and RPG state share one canonical profile in `nowrift-campaign` (database version 1; nested RPG schema 1). Existing Phase II profiles migrate without resetting balances or clears; prior boss candidates become owned relic equipment. Commands use atomic IndexedDB transactions, stable receipts and revision checks. This offline single-player economy is not tamper-proof. Active runs are not saved; cross-device saves and Phase IV features are outside this release.

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
```

`npm run build` also runs typechecking and unit tests. Playwright launches a production server on port 3100. The config uses an installed `/usr/bin/chromium` if available, or the browser installed by `npx playwright install --with-deps chromium`. Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when needed. Art is committed, so Python is not required for installation or play.

The full browser suite includes RPG economy and migration checks, plus explicit opt-in scenario fixtures for the eight-minute boss, campaign worlds, equipment/tonic combat integration, upgrades, defeat and a 150-enemy stress load. Build them only for testing:

```sh
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
# Restore the ordinary build after testing; test controls are absent by default.
npm run build
```

Without the flags, the ordinary guest/input/responsive/settings/PWA smoke tests run and the instrumented tests are explicitly skipped. The fixtures set up scenarios; damage, telegraphs, outcomes, and persistence still execute real game code. A separate deterministic movement-and-upgrade bot (`test:playthrough`) completes the full eight-minute survival and boss encounter using normal combat stats; it does not establish human difficulty balance.

Tests produce screenshots and traces in ignored `test-results/`. Stress measurements distinguish Node simulation time from rendered browser frame rates; neither is a physical mobile-device benchmark. See [Phase III validation](docs/phase-3-validation.md) for the current 196 unit tests and the expanded 42-case browser suite, ordinary production checks and measured performance; [Phase I validation](docs/phase-1-validation.md) records the original slice.

Production target: `https://nowrift-one.vercel.app/`. Deployment requires Vercel project access; see the Phase III release notes. Application deployment is separate from publishing this development environment.
