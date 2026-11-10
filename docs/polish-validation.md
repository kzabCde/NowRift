# NowRift polish — implementation and validation

Tested 2026-11-10 in the managed Linux environment. Base: `3ca7188`; work branch: `codex/indie-polish`. No merge, remote push or deployment was performed.

## Delivered

- Preserved the existing simulation, weapons, four worlds, twenty stages, difficulty/unlock rules, campaign rewards, local records, mobile controls and PWA.
- Added semantic, bounded/recycled feedback, pooled damage texts, batched VFX primitives, directional dagger knockback, critical impact holds, enemy flashes, projectile trails, status/healing feedback and boss lifecycle effects.
- Danger rings have contrast backing and constant outlines; the Sand Colossus warns along its full charge corridor. Effects settings never remove these warnings.
- Added one app-owned Web Audio engine, procedural event palette, original adaptive motifs and world noise profiles, bus mixing, mute, cooldowns, priorities, source limits, crossfades and tab lifecycle handling.
- Added validated/migrated local preferences for audio and graphics, Low/Medium/High presets, 30/60 FPS limits, and 15 FPS paused/results views. Combat stepping uses monotonic elapsed time independently of Phaser’s smoothed rendering delta.
- Added three functional character profiles using the original shared sprite with class tint, plus real inventory, one relic slot, +0–+3 enhancements, resource spending and atomic IndexedDB updates.
- Added animated menu atmosphere, world-specific motes, class idle previews, keyboard dialog focus containment, and responsive phone navigation.

## Evidence and checks

The verification flow is guest gateway → character/weapon/relic selection → real simulation → combat/upgrade/boss → result → local reward transaction → reload. There is no API or remote database boundary.

| Check                  | Evidence                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline               | Typecheck and all 125 existing tests passed before implementation                                                                                                                                                               |
| Unit/regression checks | 133 passing tests, including queue saturation/recycling, character stats, local enhancement overspending/concurrency, preference migration and voice cooldown policies                                                          |
| Static checks          | TypeScript, ESLint and repository Prettier checks                                                                                                                                                                               |
| Production builds      | Explicit instrumented build for fixture tests, followed by ordinary release build without fixture controls                                                                                                                      |
| Browser suite          | See final run results below                                                                                                                                                                                                     |
| Audio                  | Real browser context/state, generated signal RMS, accepted sound events, mute/silence, all volume buses after reload, one context/scheduler across navigation, source budget, priority/cooldown flood and visibility suspension |
| Persistence            | Real UI equip/enhance → actual run health/speed/regen → reload; existing campaign settlement, first-clear and storage-failure regressions                                                                                       |
| Mobile/PWA             | 320px portrait, tablet and landscape layouts, CDP touch movement/cancellation, rotation/focus, blur pause, manifest/icons and actual cached offline launch                                                                      |
| Gameplay               | All twenty campaign stages, all four bosses across difficulty variants, keyboard movement, upgrades, real projectile victory and defeat/retry                                                                                   |

Browser fixtures are enabled only with `NEXT_PUBLIC_E2E=1`. They may advance the scenario clock and protect the player while inspecting a boss. They exercise real collision, attack, result and persistence code; they are not twenty manual full-length playthroughs. The ordinary build is restored afterward.

## Regression fixes found during verification

1. Unrestricted new knockback changed the existing deterministic Fire Orb playthrough. Restricted knockback to Twin Daggers, then reran the unchanged bot. It again won at **527.85 simulated seconds**, **911 kills**, **175 HP**, with its original seed and combat values.
2. Six navigation items expanded a 390px mobile layout viewport to 486px, breaking touch targeting. A three-column wrapping phone navigation keeps the viewport at 390px; the unchanged touch regression passes.
3. The new volume outputs introduced multiple accessible status elements. Scoped the existing corrupted-preferences assertion to its warning; the real fallback behavior is unchanged.
4. The new Low-quality test detected drift when using Phaser’s smoothed delta under an FPS cap. Combat now uses monotonic elapsed wall time with the existing bounded engine substeps; rendering remains capped separately.

## Performance scope

- Node-only stress: 3,600 simulation frames, 180 enemies; mean **1.07ms**, p95 **2.39ms**, maximum **42.57ms** in the first measurement while browser tests were also running. This is simulation timing, not rendered FPS.
- Headless Chromium 156, desktop 150-enemy requestAnimationFrame sample: approximately **60.0 FPS**, p95 **16.8ms** in the final full run.
- Phone-sized viewport, 150 enemies, 4× CPU throttle: approximately **39.0 FPS**, p95 **33.4ms** in the final full run. Prior runs measured 38.2–43.5 FPS; cloud timing varies. These samples measure browser frame delivery; the dedicated Low test separately counts actual scene updates.
- Dedicated Low preset, 4× CPU throttle, actual scene updates: **29.52 FPS**; **4.6052s** simulation versus **4.6072s** wall time. The same test measured 6 active semantic effects, 1 particle, 0 queued feedback and 1 pooled text object at the sample endpoint.
- Hard bounds: feedback queue 128, semantic effects at most 96 (Low 32 / reduced 20), damage texts 60, total audio sources 24. SFX preset budgets are 8/14/18. Existing engine entity/projectile/drop/particle limits remain.
- Audio source retirement, tab suspension and repeated navigation are checked programmatically. Bounded object counts do not establish a multi-hour heap-leak or battery benchmark.

## Known limitations / manual QA

- Audio is original procedural synthesis. Tests establish events, playback state, signal and settings; **subjective listening quality has not been verified**. Test headphones/speakers, loudness, long combat fatigue, world transitions and mobile audio interruption before release.
- Physical Android/iOS hardware, Safari, Firefox, Bluetooth routing, mobile thermal/battery behavior and installed-device PWA prompts need manual QA. Browser emulation is not a device benchmark.
- Characters have distinct real stats and tints but share the existing original sprite sheet. Bespoke character animation sets are future art work.
- Poison and chain-lightning are reusable VFX/sound primitives; corresponding weapon/status mechanics were not added. Shield feedback represents the existing damage-grace window, not a new persistent shield stat.
- World ambiences are filtered procedural textures, not finished recordings of leaves, sand, ice or fire. Music is an original adaptive motif system rather than a mastered long-form soundtrack.
- New character/relic combinations and dagger knockback need human difficulty/balance testing. Existing scripted campaign checks establish mechanics and persistence, not human difficulty calibration.

## Changed-file summary

| Files                                                                                              | Purpose                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/game/audio/engine.ts`, `palette.ts`; `components/Soundscape.tsx`                              | One context/scheduler, event sounds, adaptive music/ambience and app lifecycle                          |
| `src/game/feedback.ts`, `engine.ts`, `phaser/combat-vfx.ts`, `phaser/scenes.ts`                    | Bounded events, text recycling, semantic VFX, danger rendering, feedback and real-time stepping         |
| `src/game/loadout.ts`, `campaign/progression.ts`, `campaign/persistence.ts`, `bridge.ts`           | Character stats, optional backward-compatible equipment data, atomic relic transactions and run loadout |
| `components/Sanctuary.tsx`, `GameUi.tsx`, `NowRiftMainMenu.tsx`, `NowRiftGame.tsx`, `WorldMap.tsx` | Character/inventory/equipment/settings UI, focus, actual loadout/result integration                     |
| `components/Atmosphere.tsx`, `app/globals.css`                                                     | Design tokens, bounded atmosphere, responsive screens and reduced motion                                |
| `phaser/create-game.ts`, `components/PhaserHost.tsx`, `app/page.tsx`                               | Selected-world loading, single audio ownership, Phaser audio disabled                                   |
| `src/state/settings.ts`, `public/sw.js`                                                            | Validated preference migration and cache version update                                                 |
| `src/game/polish.test.ts`, `e2e/polish.spec.ts`, `e2e/gameplay.spec.ts`                            | New behavior/regression coverage and scoped existing assertion                                          |
| `.gitignore`, `eslint.config.mjs`, `README.md`, `docs/polish-*.md`, `docs/presentation-design.md`  | Scratch isolation, current docs, audit, design and evidence                                             |

## Next implementation phase

1. Listen and mix on real phones and headphones; refine the procedural palette or replace selected textures with newly commissioned/licensed recordings.
2. Profile physical iOS/Android devices and run a long-duration combat/rotation/backgrounding soak; tune automatic quality recommendations from those measurements.
3. Draw bespoke idle/run/attack/hit/death sets for the three character profiles within the existing pixel-art style.
4. Playtest campaign balance across classes, relic ranks and difficulty; keep the deterministic regression seed as a guard, not as a balance target.
5. Use the existing semantic primitives when adding future poison/lightning/shield mechanics; label content only when gameplay is implemented.

## Final run results

- Final instrumented production suite: **25 passed**, **0 failed**, **0 skipped**, **0 flaky**, approximately 3.5 minutes. Includes 20-stage campaign coverage, boss difficulty variants, audio integration, equipment, mobile/PWA and stress checks.
- Targeted timing regression after the fix: **1 passed**, measured **29.60 FPS**, **4.6099s** simulated versus **4.5949s** wall time before the final full run.
- Ordinary production build: **passed**; its prebuild typecheck and all **133 unit tests** passed. First-load JavaScript reported by Next.js: **133 kB**, with Phaser imported separately.
- Ordinary production browser suite: **9 passed**, **0 failed**, **16 explicitly skipped** because scenario/audio diagnostics are test-build-only. Includes actual touch, settings, responsive sanctuary, player-art fallback and cached offline launch.
- ESLint, repository Prettier check and `git diff --check`: **passed**.
- The ordinary production build is the final build in the workspace. No release/deployment was performed.
