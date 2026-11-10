# NowRift polish audit

Audited 2026-11-10 against `3ca7188` (latest main), using GitHub MCP and the local checkout. The initially selected work branch was older; implementation branches from latest main to preserve Phase 2.

## Existing systems to retain

- Next.js 15 App Router (`/`), React 19, TypeScript, Phaser 4 Canvas renderer, Zustand preferences; no backend, auth, or external game service.
- Pure simulation (`src/game/engine.ts`), fixed bounded substeps, swept projectile collision, spatial grid, obstacle collision, seeded campaign runs.
- Four weapons, eleven stackable blessings, five enemy archetypes, bosses, four worlds, twenty stages, three difficulties and unlock rules.
- Phaser scenes with image/text recycling, React HUD published at 10 Hz, safe-area/focus layouts, touch drag, visibility pause, original generated pixel art.
- IndexedDB run records and campaign rewards; localStorage preferences/best score; service worker and installable manifest.

## Gaps / findings

1. No audio engine, sound events, music, ambience or audio settings. Existing visual effects cannot communicate audible feedback.
2. Settings only expose reduced effects and zoom. Need explicit quality, particles, glow, shake, damage-number density and audio buses.
3. All four world combat sheets load before every run. Load only the selected world plus shared assets; keep offline precaching separate.
4. Combat feedback mostly uses generic colored sparks; player damage numbers use the critical-hit palette. Add semantic effects and distinguish player damage/heal.
5. Damage text simulation objects are allocated while sprites are recycled. Add text pooling and bounded semantic event queues.
6. Menu has original forest art and restrained typography, but lacks ambient motion, interaction sound and animated character/world previews.
7. Character and equipment screens are absent. Campaign materials and boss relic candidates already exist; expose real local inventory/equipment without adding accounts or cloud storage.
8. UI contains stale Phase I copy despite the working campaign. Update descriptions to match implemented systems.
9. Existing pause/upgrade overlays need keyboard focus containment; settings modal already has a focus trap.

## Baseline evidence

- `npm run typecheck`: passed.
- `npm test`: 125 tests passed across 7 files.
- GitHub MCP inspected repository metadata and package manifest. Playwright MCP is not callable in this session; repository Playwright runner with system Chromium is the fallback. Figma is not connected; use original assets and an in-repository design specification.

## Implementation order

1. Validated backward-compatible preferences, app-owned Web Audio engine and lifecycle bindings.
2. Semantic combat event queue, pooled feedback, renderer effects, readable hazards and selected-world preload.
3. Ambient menu/world identity, functional character selection and local relic equipment/enhancement UI.
4. Automated engine/audio/settings tests, desktop/touch/layout/offline browser tests, bounded-effects and stress measurements.

No merge, remote push, deployment or external messaging is part of this work.
