# NowRift

**NowRift** is a browser-based Roguelike / Bullet Heaven RPG. The current build contains a guest-only entry menu, main hub, and playable Phase 1 single-player demo.

> No Supabase, database, accounts, API keys, or hosted game server is required to play. The browser app can run locally or on Vercel.

## Run locally

Requires **Node.js 20.9+** and npm.

```bash
git clone https://github.com/kzabCde/NowRift.git
cd NowRift
npm install
npm run dev
```

Open **http://localhost:3000**. For the new guest hub PR, switch to `feat/guest-main-menu` before installing dependencies.

### Quality checks

```bash
npm run typecheck
npm test
npm run build
```

## Gameplay (Phase 1)

- Move with **WASD**, arrow keys or touch-and-drag.
- Your weapon **automatically targets the closest enemy** in range.
- Survive increasingly difficult waves of drones, stalkers and brutes.
- Kill enemies to earn credits and collect dropped XP.
- Choose **one of three upgrades** each time you level up.
- Pause/resume (button or Escape), restart, or retry after defeat.
- Your **best kill count** is stored only in the browser's `localStorage` under `nowrift-phase1-best-kills`.

This is a single-player prototype: credits, levels and upgrades reset with every run. Reloading the page ends the current run. Clearing browser site data resets the personal best.

## Architecture

| Area | Technology | Persistence |
| --- | --- | --- |
| App shell | Next.js App Router + React + TypeScript | None |
| Combat | Custom HTML5 Canvas 2D game loop | In-memory state |
| UI | Plain CSS; responsive layout | None |
| Best score | Browser `localStorage` | This device only |
| Database / auth / multiplayer | Not included in Phase 1 | None |

The combat engine lives in `src/game/engine.ts`, while `src/components/NowRiftGame.tsx` handles rendering, input and HUD state. No external images, fonts or API calls are needed during gameplay.

## Planned phases (not in demo)

1. **Foundation and combat loop** — playable local demo (this branch).
2. **Stages, bosses, inventory and deeper progression**.
3. **Optional accounts / guest profiles, persistence and daily rewards**.
4. **Trade, friends, PvP, anti-cheat and online services**.
5. **Balancing, testing and production beta**.

Future online features will be designed separately. They are not simulated as working multiplayer features here.

## Notes

- Run on `localhost` only for this phase; no production deployment is configured.
- Installation downloads npm dependencies once. The gameplay itself doesn't make requests to game services.
- Desktop and mobile browser input are supported, but actual cross-browser performance needs device testing.
- This is an early gameplay prototype, not a security-hardened or production-ready online game.

## Mobile PWA (Phase 1 responsive update)

The mobile-first improvements live on `feat/phase-1-mobile-pwa`. This branch adds:

- Full-screen-style **Focus mode** (CSS-based, works in browsers that do not support the Fullscreen API).
- Responsive HUD, safe-area padding for notched phones, landscape adjustments and larger touch targets.
- Installable PWA manifest, 192/512px app icons, maskable Android icon, iOS Apple touch icon.
- In-app Install/Add to Home instructions for iOS Safari and Chromium browsers.
- A same-origin service worker that caches the app shell and Next.js static assets. The game can run offline **after the first successful online load and caching**; this does not download on a device before that visit.
- New worker version update button, online/offline indicator and installation state.

**Important:** No database, accounts or synced progress are added. The best score stays in this browser's localStorage; active runs are memory-only and reset when the app is closed or refreshed.

For realistic PWA testing, run `npm run build && npm run start` on localhost or use an HTTPS Vercel deployment. `npm run dev` does not register the service worker to avoid stale development assets.

### Install

- **iPhone / iPad:** Open in Safari → Share → Add to Home Screen.
- **Android Chrome:** Use the INSTALL button if the browser provides it, or menu → Install app / Add to Home Screen.
- **Desktop Chrome / Edge:** Use the Install icon in the address bar or the in-app INSTALL action.

Offline behavior depends on browser storage/cache retention. First load must complete online; a private tab or cleared site data cannot guarantee cached assets. There is no background sync.


## Gameplay stability / regression suite

The `fix/gameplay-stability-mobile` branch contains engine-level fixes for arena resize (all world entities), low-FPS timekeeping, swept projectile collisions, improved pickup movement, contact hits, and touch interruptions. It introduces browser smoke tests for desktop, small mobile screens, landscape Focus mode, touch input and cached PWA offline launch.

Run:

```bash
npm install
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The Playwright tests launch `next start` locally on port 3100. They do not deploy or use a database.

## Pre-game main menu (Guest Only)

The app now opens to a cinematic **access-mode selection**, then a **Guest Main Hub**, before launching the gameplay screen:

1. Open the website or PWA → **CONTINUE AS GUEST** (the only usable access mode).
2. Explore the Main Hub → review guest-local best kills and the Phase 2–3 roadmap.
3. Select **START NEW RUN** to enter the existing playable solo demo.
4. Use **MAIN MENU** in the game to return to the Hub. During an active run you must confirm that you want to abandon it.
5. Use **CHANGE MODE** to return from the Hub to the Guest selection screen.

Sign in and account creation are deliberately marked **COMING SOON** and have no active auth flow. Character, Inventory, Upgrades and Social/PvP areas are roadmap previews, not fake functional systems.

**Guest session is UI-only**, not a persistent user profile. Individual runs stay in memory and are lost when you exit or refresh. The only persisted value is your local best kill count. There is no database, cloud save, trading, PvP, or real character inventory.

This page is part of the PWA shell; the service-worker cache version was bumped to `nowrift-pwa-v3` so installed app users can update to the new entry flow.
