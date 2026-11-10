# Phase II implementation and validation

## Scope

Four original worlds with five playable stages each. Each stage supplies its environment seed, spawn composition, pressure and health modifiers, duration, survival/boss clear condition, recommended power, rewards, and predecessor. Durations range from 8 minutes to 13.2 minutes across Normal, Hard and Nightmare. World maps share reusable tiles and props within a biome; stage seeds and encounter schedules vary.

The original eight-minute Phase I forest slice remains available through the Hub's **Start New Run** practice route. **World Map** / **Open World Map** enters the campaign. Practice does not unlock campaign stages or bank campaign materials.

## New systems

- `src/game/campaign/content.ts`: world, stage, enemy, boss, difficulty, hazard and loot definitions.
- `maps.ts`: deterministic terrain grids, safe central clearing, open traversable corridors, props and hazard anchors. Forest has winding paths; desert has a sandstone courtyard grid; frozen terrain has lakes and a winding crossing; infernal terrain has lava channels and crossing routes.
- `loader.ts`: validates unlocks before constructing the simulation. UI disabling is not the entry guard.
- `runtime.ts`: environmental warnings, status timers, boss attack cycles, summons and charges. Shared engine retains targeting, pooled entities, swept collision, XP and upgrades.
- `progression.ts`: sequential difficulty/stage/world unlocks, separate from UI.
- `rewards.ts`: deterministic enemy, elite, boss, completion and first-clear tables.
- `persistence.ts`: a replaceable repository and versioned IndexedDB campaign profile. One read/write transaction settles rewards and unlocks. Run receipts make repeated writes idempotent; concurrent clears cannot both grant first-clear bonuses. Invalid data is preserved and reported.
- `WorldMap.tsx`: discoverable locked worlds and stages, reasons, difficulty selection, completion, power, boss/enemy/loot previews and wallet.
- `scripts/generate-worlds.py`, `public/assets/worlds/`: original local terrain, architecture, animated creatures/bosses, projectiles and artwork. CC0 asset notice included. Reference screenshots were not copied.

## Mechanics

Forest thorns hinder movement. Sandstorm strikes slow and damage, while archers fire directional volleys. Frozen lakes activate slow after a short exposure window and ice projectiles chill. Infernal lava activates damage/burning after an exposure warning; leaving the tile avoids initial damage, and crossings remain safe. Circular warnings precede major environmental and boss strikes. Each boss cycles three patterns and accelerates below half HP. Nightmare adds projectile counts, elite frequency, hazard count and pressure rather than only health.

All five stages use actual combat. Stages 1–4 clear at their survival deadline; Stage 5 requires survival followed by killing the world boss. Defeat can bank earned enemy rewards but never unlocks or grants completion bonuses. Replays always remain available. Materials, gold and profile XP are banked; equipment candidates are future integration records, not a fake inventory or equipping system. Phase III has not begun.

## Verification

Commands:

```sh
npm run lint
npm run typecheck
npm test
npm run test:playthrough
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
npm run build
npm run test:browser
```

- 125 unit tests cover existing Phase I regressions and campaign behavior. All 60 stage/difficulty combinations instantiate, fight, activate hazards and satisfy their actual clear conditions. Additional assertions cover entry guards, complete unlock chains, deterministic rewards, valid item references, seeded geometry, safe spawn/prop spacing, lava/ice escape windows and atomic persistence.
- The combined instrumented browser suite has 18 cases. It enters all 20 stages, clears them, checks all four bosses on Normal/Hard/Nightmare, verifies first-clear persistence after reload, and retains Phase I keyboard/touch, pause, settings, resize, PWA/offline, fallback, save-failure and stress cases.
- The non-instrumented build runs eight smoke cases and explicitly skips ten scenario/performance fixture cases. Scenario controls are absent from ordinary builds.
- A deterministic practice bot using Fire Orb and seed 1 completed the original survival/boss slice at 527.85 simulated seconds, with 911 kills and 175 HP. It uses movement and normal upgrade selection, without health or damage overrides. The former seed 3289 loses; the bot is a reproducible example, not proof of human difficulty balance or a guarantee that arbitrary seeds win.
- Headless Chromium 156, Node 24.22.1. In one combined run, 150-enemy practice stress measured about 60 FPS both at desktop size and in a mobile-size viewport with 4× CPU throttling. These are cloud measurements; physical mobile hardware, Safari and Firefox remain untested.

Browser fixtures explicitly advance scenario time and may protect the player while inspecting attacks. They verify actual engine clear logic, projectile damage, scene transitions and reward writes; they do not represent 28 manually played eight-minute browser runs. Original art is procedural and balance remains preliminary.

## Production release

Target supplied by the user: `https://nowrift-one.vercel.app/`. Production deployment and a GitHub PR require working outbound access to `api.github.com`, `api.vercel.com`, and the production host, plus Vercel project credentials supplied securely through environment settings. Cloud proxy checks returned 403 even after command-level elevation; configuration draft saving also failed. Never put credential values in source or PRs. Environment publication is separate from application deployment.
