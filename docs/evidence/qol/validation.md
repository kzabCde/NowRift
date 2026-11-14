# Executed validation

Validated on 14 November 2026, against application/test source `b600a0b` and main
baseline `25f7746`. Later commits add documentation and evidence only. Node 24.22.1,
Phaser 4.2.1, Next.js 15.5.29, Playwright 1.65.0 and headless Chromium 156 on Linux.
No deployment or merge was performed.

| Executed command | Result | Output |
| --- | --- | --- |
| `npm run typecheck` | Passed | [TypeScript](typecheck.log) |
| `npm run lint` | Passed | [Lint](lint.log) |
| `npm run format:check` | Passed, including all new modules/styles/components | [Formatting](format.log) |
| `npm test` (also executed by both build prechecks) | **690 passed**, 37 files | [Prebuild test output](instrumented-build.log) |
| `NEXT_PUBLIC_E2E=1 npm run build` | Passed, including asset validation, typecheck and all 690 tests | [Instrumented build](instrumented-build.log) |
| `env -u NEXT_PUBLIC_E2E npm run build` | Passed on an isolated checkout of the same source | [Ordinary production build](production-build.log) |
| `NOWRIFT_E2E=1 npm run test:browser` | **160 passed**, 1 bundle-conditional exclusion, 23.4 minutes | [Complete browser run](browser.log) |
| Ordinary production browser smoke run, without `NOWRIFT_E2E` | **6 passed**, 59.6 seconds | [Production browser run](production-browser.log) |
| `npm run test:playthrough` | Seeded full survival and guardian victory; 911 kills, level 23 | [Playthrough](playthrough.log) |

The single excluded case in the instrumented suite specifically asserts that test
hooks do not exist in an ordinary production bundle. It was executed successfully in
the separate production smoke run. No gameplay assertion was disabled or weakened.
That ordinary bundle also passes calendar layout, midnight rollover/history, competing
real-tab claims, Escape-repeat cancellation and wide touch-only keyboard detection.
Its tests ran on port 3101, separate from the instrumented suite on 3100.

The initial full pass found two actual failures: waypoint/service marker ID ambiguity
and an obsolete-scene auto-start after abandonment. Both implementations were fixed.
Their original destination/persistence assertions pass in the complete final rerun;
the new abandonment test additionally requires a null active run and checkpoint before
starting Story again. The previously reported mobile stress and Haven collision/range
checks also pass. No unresolved baseline failures remain in the executed checks.

## Coverage

- All nine city beacons and four regional cities, locked/story-gated first arrivals,
  later discovered-destination travel, safe collision-free landings, route markers,
  arrival epochs, reload and unchanged character build/progression.
- HUD zones at 360, 390, 768, 1280, 1440 px and 844×390; Story and Free expedition
  overlays separately; actual native mobile touch movement and cancellation while
  hidden; keyboard/touch restoration and map access with rebound keys.
- All control actions, explicit conflicts/swaps, capture/cancel, individual/default
  reset, emergency Back, preset migration, preference backups, persistence and held-key
  cleanup. A wide touch-only screen does not expose keyboard controls until a physical
  key is used.
- 1×/2×/4× deterministic fixed steps across 30/60/120 FPS; boss enrage/projectiles,
  cooldowns/statuses, pause/stall caps, modal boundaries, checkpoint speed reset and
  unscaled playtime/reward uniqueness. Browser tests exercise both real simulation
  rates and an accelerated 150-enemy CPU-throttled encounter.
- All four month lengths, leap centuries/years, actual final-day overlap, Bangkok
  midnight/year rollover, no shifted rewards/backclaims, duplicate/concurrent tabs,
  multiple slots, legacy receipts/history, exports/imports, rollback and atomic
  failure preservation. Existing daily quests and achievements retain their rules.
- Existing equipment, weapon evolution, shops, crafting, tonics, regional quests,
  responsive UI, Thai/English, PWA/offline loading and progression regression suites.

## Observed performance

The original 150-enemy mobile viewport stress test passed under 4× CPU throttling at
**36.6 FPS**, with a **50 ms** p95 frame time. These are emulation measurements on this
Linux host, not measurements of physical phone hardware.

The new 4× combat/150-enemy throttled sample advanced **15.55 simulation seconds** over
**4.07 active real seconds** (4.34 wall seconds), rendering 103 frames, about **23.7 FPS**,
with **15.4 MiB** of JavaScript heap. Work caps deliberately allow safe slowdown under
sustained overload; exact 1×/2×/4× ratios are verified separately at controlled schedules.
See [the raw accelerated sample](combat-4x-performance.json).

Six regional desktop/throttled mobile samples recorded a minimum **25.5 FPS**, maximum
**23.5 MiB** JS heap and **18.8 MiB** texture estimate. All culling/effect bounds and
existing performance assertions passed. See [regional samples](regional-performance.json).

## Remaining limits

The offline device clock remains editable; Bangkok-date rollback defense is not
server-grade anti-cheat. Combat deliberately discards stalled frames and excessive
catch-up work on slow devices. No new asset files are needed for this scope; existing
original game assets and their fallback paths are preserved. CI and human review are
still required before any merge or production deployment.
