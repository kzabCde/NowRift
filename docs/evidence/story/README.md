# Story campaign evidence

These are captures of the playable Phaser world and actual application UI, saved from the
complete instrumented Chromium 156 run at local commit `738e57a` on 14 November 2026.
No image-generation or Figma output is represented here.

| Capture                                                                                     | Exercised behavior                                                                        |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Forest desktop](forest-mission-desktop.png) / [mobile](forest-mission-mobile.png)          | Live ordered objectives, real combat and physical interaction prompts                     |
| [Journal desktop](quest-journal-desktop.png) / [Thai mobile](quest-journal-thai-mobile.png) | Persistent tracked quests, eligible modes, actual rewards and bilingual responsive layout |
| [Forest finale](forest-10-boss.png)                                                         | Heartwood Echo, third attack phase                                                        |
| [Desert finale](desert-10-boss.png)                                                         | Meridian Keeper, third attack phase                                                       |
| [Frozen finale](frozen-10-boss.png)                                                         | Witness of Winter, third attack phase                                                     |
| [Infernal finale](infernal-10-boss.png)                                                     | The Fractured Heart, third attack phase                                                   |
| [City measurements](city-performance.json)                                                  | Preserved city culling, texture allocation and desktop / throttled mobile frame timings   |

The automated fixtures accelerate travel and inject actors or projectiles into production
simulation. They use the production objective triggers and result settlement; they do not
directly mark quests or missions complete. Separate primitive tests exercise companion
damage/failure, puzzle order, destructible health, and boss phase thresholds.

## Executed validation

| Command / check                                                                                                                          | Result                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                                                                                           | Passed; final modified source files also passed a focused ESLint run                                                                                                  |
| `npm run format:check`                                                                                                                   | Passed; final modified source files and `next.config.ts` also passed Prettier                                                                                         |
| `npm run build` with no E2E flags                                                                                                        | Passed at final source commit `c833dc5`; includes TypeScript, all 465 PNG asset entries, 638 unit/integration tests in 32 files, and optimized production compilation |
| `NEXT_PUBLIC_E2E=1 npm run build`                                                                                                        | Passed, including the same 638 tests and checks                                                                                                                       |
| `NOWRIFT_E2E=1 npx playwright test`                                                                                                      | 140 passed, 1 production-only check skipped, 16.8 minutes at `738e57a`                                                                                                |
| Focused quest / localization unit follow-up                                                                                              | 30 passed after history-label localization                                                                                                                            |
| `NOWRIFT_E2E=1 npx playwright test e2e/story.spec.ts e2e/story-persistence.spec.ts --grep 'Forest briefing\|completed Story objectives'` | 2 passed in 22.0 seconds at final source commit `c833dc5`                                                                                                             |
| `npx playwright test e2e/city.spec.ts --grep 'production Town Map'` with no E2E flags                                                    | 1 passed in 12.9 seconds against the final uninstrumented build                                                                                                       |
| Production chunk signature scan                                                                                                          | 18 browser chunks; zero fixture-global or mission-driver signatures                                                                                                   |
| `npm run test:playthrough`                                                                                                               | Seeded survival victory, 527.85 simulated seconds, level 23, 911 kills                                                                                                |
| `git diff --check`                                                                                                                       | Passed                                                                                                                                                                |

The complete browser suite covers all 40 Normal missions, Stage 5/10 bosses on Hard and
Nightmare, persistence, mode gates, real item deliveries, NPC markers, mobile input,
existing equipment/economy, purchased backpack capacity and the nine-district city.

The 150-enemy stress checks measured 59.1 FPS desktop and 48.8 FPS at a mobile viewport
with 4× CPU throttling. The separate city benchmark measured 57.2 / 21.6 FPS respectively,
23,948,452 texture bytes, and 62 / 47 visible sprites from 335. Host measurements are not
physical-device performance guarantees; the throttled city remains an optimization target.

## Remaining art and playtest work

Finales currently reuse original realm guardian art. Named cast use the original resident
atlas; mechanisms and sabotage targets reuse original props. Dedicated finale sprites,
cast portraits, distinct mechanism / siphon / prism / anchor skins, and voiced sequences
remain art extensions. Text dialogue is functional. Long-form balance playtests with
naturally earned loadouts remain a follow-up.

See the [implementation specification](../../shattered-rift.md),
[content inventory](../../shattered-rift-content.json) and
[asset inventory](../../shattered-rift-assets.json). No merge or deployment was performed.
