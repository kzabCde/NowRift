# Phase IV: local profiles, persistence and daily systems

## Playing and preserving progress

The existing **Continue as Guest** entry creates a local guest player and first character, preserving the working gateway and lobby. **Profile & Saves** opens the profile dashboard, three character slots, check-in, daily quests, achievements, and backup/recovery screens. A local `NR-XXXXXXXX` ID uses browser cryptographic randomness. It identifies this installation; it is neither globally guaranteed nor verified by a server.

Each character has its own name, class, attack style, wallet, inventory, equipment, permanent XP, world/stage clears, enhancement journal, statistics and run history. Create/select/continue/rename are functional. Deletion requires confirmation and saves a recovery copy; at least one character must remain. Selecting a character in another tab cannot redirect a pending action from this tab to that character.

The dashboard displays stored playtime, kills, bosses, Normal worlds cleared, highest enhancement, equipment, achievement progress and last-played date. Power and permanent level use the existing shared RPG stat service. New statistics start from actual available legacy records, clears, owned equipment and enhancement history; historical totals absent from old saves cannot be reconstructed.

## Persistence and source organization

| Location                                                      | Responsibility                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/game/persistence/model.ts`                               | Serializable player, character, metrics, run-owner and backup contracts            |
| `storage.ts`                                                  | Native IndexedDB adapter and single-transaction updates                            |
| `repository.ts`                                               | Slot binding, profile operations, RPG commands, rewards, ownership and recovery    |
| `validation.ts`                                               | Runtime schemas, item/balance/capacity checks, migration and untrusted JSON bounds |
| `daily.ts`                                                    | Bangkok date keys, seven-day check-in, seven quests and ten achievements           |
| `checkpoint.ts`                                               | Full simulation capture/validation and deterministic paused restoration            |
| `backup.ts`                                                   | Canonical SHA-256 exports, bounded imports and download helper                     |
| `preferences.ts`, `status.ts`, `display.ts`                   | Debounced small preferences, confirmed save status and fullscreen preference       |
| `src/game/campaign/commands.ts`                               | Pure campaign mutations shared by the repository and existing callers              |
| `src/game/services/legacy-runs.ts`                            | Preserved original run store and one-time history reader                           |
| `src/components/ProfileScreen.tsx`, `SaveIndicator.tsx`       | Profile/reward/recovery UI and storage status                                      |
| `src/app/profile.css`, `src/i18n/dictionaries/profile-th.ts`  | Responsive styling, reduced motion and Thai profile strings                        |
| `src/game/phaser/scenes.ts`, `src/components/NowRiftGame.tsx` | Lifecycle checkpoints, run ownership and paused save-error recovery                |

No new dependencies were needed. Existing pinned packages and `package-lock.json` remain unchanged. Original locally licensed art, audio, transparent branding, combat and world content remain in use. No backend, authentication, external database or multiplayer code is introduced.

The original IndexedDB database remains `nowrift-campaign`, physical database version 1, store `progress`. Record schemas are versioned independently: root key `player` has schema 2; original first-character key `profile` gains `local.schema: 2`; further characters use `slot:<stable ID>`. Original campaign `version: 1` and RPG `schema: 1` fields are preserved. Backups use `backup:<timestamp>:<UUID>`, while damaged originals use `quarantine:<UUID>`. Ordinary gameplay reads exclude backup/quarantine payloads. Original `nowrift-saves` records are imported once into the first character and retained in their original database.

RPG actions, stage settlement, daily claims, achievement claims and slot mutations read current data, validate revisions/ownership, and commit in one read/write transaction. Callback work is synchronous within that transaction; promises resolve only after `oncomplete`. Failure aborts the entire mutation. A single canonical character record owns balances and inventory. IDs and receipts make repeated commands/results idempotent. A tab’s selected slot is bound independently from another tab’s current selection. BroadcastChannel announces changes; stale quotes and profile revisions require refresh.

The save indicator reports **Saving**, **Saved** and **Save Failed** from confirmed storage operations. Preference and IndexedDB failures are tracked independently, so a successful character save cannot hide failed preference persistence. Ordinary preference changes debounce for 250 ms and flush on visibility/pagehide. Critical economy updates commit immediately. UI and combat have no direct localStorage calls.

## Recovering runs

Practice and campaign scenes use a recoverable uint32 random generator. Checkpoints capture stage/difficulty/map seed, generator state, player position/HP, temporary level/XP/upgrades and pending upgrade offers, weapon/cooldowns, focus effects, enemies and AI timers, projectiles, drops, telegraphs, spawn state, campaign counters/hazards, starting build and tonic receipts. Maps/obstacles regenerate from the same seed; current dynamic state and RNG are then restored. Cosmetic particles, floating text and old feedback are cleared. A recovered active run opens paused; an interrupted upgrade still requires its pending choice.

Checkpoints occur at scene creation, every ten playing seconds, pause/resume, upgrade selection, tonic use, and hidden/pagehide events. Returning to the Hub explicitly discards that unfinished run after recording its latest metrics. After a reload, choose **Recover Run**, then **Resume checkpoint**. Discarding a checkpoint requires confirmation and retains permanent progression. A run marker without a first committed checkpoint can be released explicitly. A damaged checkpoint can be discarded independently while the original record is quarantined.

Run IDs remain stable across recovery. A writer lease and increasing checkpoint sequence reject replaced writers and late snapshots. Explicit recovery in a second tab takes over that run; the old tab pauses on its next attempted write and may return to the Hub without deleting the new owner’s checkpoint. Metric high-water marks prevent repeated checkpoint kills/playtime credit. Stage reward settlement, its receipt and checkpoint clearing share one transaction. Recorded results cannot bank rewards twice.

Storage failures pause persistent gameplay and offer checkpoint retry. The previous committed checkpoint remains available. Asynchronous lifecycle writes are best-effort: abrupt termination can lose the last interval of activity, and a tonic committed immediately before a crash may be consumed before its effect checkpoint commits. External JSON backups are needed against site-data deletion or browser eviction. Denied IndexedDB permits explicitly labeled temporary practice; campaign saves and recovery require working storage.

## Daily balance and time rules

Game days reset at midnight **Asia/Bangkok**, independent of the browser’s displayed timezone. Check-in is once per local player per day across all three characters, with the reward granted to the active character. Missed days do not reset the seven-claim cycle. The next cycle starts after claim seven. Claim history and currency commit together; reloads, double clicks, concurrent tabs and switching slots cannot pay twice.

| Claim | Reward                                                              |
| ----- | ------------------------------------------------------------------- |
| 1     | 500 Gold                                                            |
| 2     | 1,000 Gold                                                          |
| 3     | 5 Enhancement Stones                                                |
| 4     | 1,500 Gold                                                          |
| 5     | Rare Material Chest: 5 Ancient Shards, 5 Frost Crystals, 5 Gold Ore |
| 6     | 2,500 Gold                                                          |
| 7     | Epic Reward Chest: 500 Gold and one actual Epic forest weapon       |

Chest rewards open immediately through the existing inventory/overflow system. The Epic weapon level uses the character’s permanent level, capped at 17. Claimed cards animate, respecting reduced-motion preferences. A date earlier than the last check-in is rejected. Offline clock manipulation cannot be securely prevented; advancing the clock can block subsequent claims until the date catches up.

| Daily quest       | Target                                      | Reward               |
| ----------------- | ------------------------------------------- | -------------------- |
| Thin the horde    | 100 actual enemy kills                      | 150 Gold             |
| Walk the rifts    | 3 victorious campaign stages                | 350 Gold             |
| Face the guardian | 1 defeated boss                             | 250 Gold             |
| Gathering grounds | 20 banked campaign materials                | 100 Gold             |
| An honest fortune | 2,000 Gold earned from combat or item sales | 3 Enhancement Stones |
| A brighter edge   | 1 successful enhancement                    | 100 Gold             |
| Nothing wasted    | 3 dismantled equipment items                | 150 Gold             |

Kills, bosses and playtime update at committed checkpoints and result settlement. Loot/clear objectives update when campaign rewards are banked. Practice kills/bosses count toward those objectives, while practice score grants no permanent gold/materials. Gifts, purchases, imports and transfers do not count as earned gold. New-day objectives reset; stable per-day receipts preserve already-paid claims even if the device clock moves away and back. Importing into another slot rebinds quest/achievement receipt scopes.

Ten persistent achievements cover first kill, 1,000 kills, five Normal forest clears, all four worlds unlocked, 100 campaign victories, permanent level 10, filling six equipment slots, highest enhancement +10, obtaining Legendary gear, and obtaining 25 equipment items. Definitions include category, icon, target, progress, unlock date, reward and claim state. Unlock/claim use real saved state and the same atomic economy. Progress is retained after gear is sold or downgraded.

## Backup, migration and recovery safety

**Export selected save** downloads a JSON envelope containing schema version 2, selected character data, local player metadata, shared check-in history and a SHA-256 checksum of canonical JSON. The checksum detects accidental corruption; it is not a signature or an anti-tamper mechanism. The import limit is 5 MiB, also enforced during export so exported files remain importable.

Imports reject malformed/deep/oversized JSON, dangerous property names, checksum mismatches, future versions, invalid dates/balances/materials, missing item definitions, duplicate owned IDs, invalid affixes, oversized inventories and invalid checkpoints. Compatible version-one campaign envelopes migrate through the same validators. Parsing only creates a preview; the user must confirm the exact target. A changed target revision invalidates the preview. Replacement and its pre-overwrite recovery copy commit together. The target keeps its stable slot ID, active writer is invalidated, run scopes are rebound, RPG revision advances, and existing shared check-in history merges with the imported history. Other characters remain intact.

A damaged slot or player root is reported without silently generating over it. Valid external backups can recover either; unreadable originals are retained. Root recovery restores the backup’s local identity, whereas an ordinary import keeps the existing local identity. Automatic backup cards also require preview and confirmation before restoring. Automatic backups live in the same browser storage and cannot replace an external download.

## Settings and controls

Existing volume buses/mute, shake, particle intensity, damage numbers, camera scale, graphics presets, reduced motion and English/Thai are preserved. Keyboard preference selects WASD, arrows or both; touch preference restricts the drag’s starting region to either half or the entire arena. Settings do not remount Phaser. Fullscreen is requested only from supported user gestures, and its saved preference applies on Start/Resume. Browsers may deny fullscreen or exit it themselves. Core new profile controls and reward names have Thai strings; some long-form help/error messages use the existing English fallback.

## Verification

Environment: Node 24.22.1, Chromium 156, Linux cloud desktop. Browser fixtures use isolated storage, real game logic and explicit test builds; fixture controls are absent from ordinary production builds.

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:playthrough
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
npm run build
npm run test:browser
```

- **231 unit tests passed** across eleven files, including 35 new persistence cases: local IDs, migration, slot isolation, rewards/clock boundaries, actual gameplay metrics, inventory/history round trips, full checkpoint/RNG restoration, stale writers/sequences, duplicate settlement, damaged-record recovery, failed preferences, quota and interrupted transaction rollback, import previews, checksums and conflicting item IDs.
- The **full 54-case instrumented browser suite passed** after fixing the missing-art warning, denied-storage practice fallback and old selectors/reload expectations. Subsequent persistence hardening and mobile layout fixes passed **all 13 focused persistence browser cases**, including an additional quota → pause → retry → successful-checkpoint scenario. There are now 55 defined browser cases.
- The **ordinary production build passed**, with **33 browser cases passing and 22 explicitly skipped instrumented scenarios**. Ordinary builds omit fixture controls. Type checking, ESLint, Prettier and `git diff --check` passed.
- The complete stage → actual loot → equip → successful enhancement → reload → export → confirmed import workflow verifies stored currency, item IDs, enhancement and unlocks. Other browser cases cover three slots/deletion, shared check-in, actual enhancement quests, one-time achievement rewards, offline claims/download/reload, Thai navigation, actual input preferences, exact paused recovery, cross-tab ownership and no duplicate payout.
- Profile/daily/backup screens were reviewed at 320-pixel portrait and 844×390 landscape sizes; desktop slot cards and the import confirmation preview were inspected. Existing touch, resize, audio, world bosses and corrupted-art fallback tests remain green.
- The original normal-stat Fire Orb playthrough bot still wins after **527.85 simulation seconds**, with **911 kills** and **175 HP**. This is a combat regression check, not a human difficulty study.
- At 150 active enemies, cloud Chromium measured **60.12 FPS** desktop (p95 **16.7 ms**) and **59.72 FPS** in a mobile-sized viewport with 4× CPU throttling (p95 **16.8 ms**). Low graphics measured **29.84 render FPS**, with **4.599 simulation seconds** over **4.591 wall seconds**. These observations do not establish performance on physical phones.

Browser test artifacts are generated under ignored `test-results/`. The final production build is created without `NEXT_PUBLIC_E2E`. Earlier regression failures were fixed before these passing checks; no tests were disabled to hide failures.

## Limitations and future infrastructure

This is one local player per browser origin, with up to three characters. There is no cross-device synchronization, account verification or server clock. Character/runtime state survives only through committed IndexedDB checkpoints; visual effects and unsaved seconds cannot be reconstructed. Receipts, journal history and automatic backups grow with usage. Upgrade from earlier app versions should be followed by reloading older open tabs.

Physical mobile hardware, Safari and Firefox have not been tested here. Chromium mobile viewports, touch input, orientation changes and throttled CPU measurements are useful regression checks but do not establish hardware-specific performance or audio quality. Human difficulty/economy balancing remains ongoing.

Local saves and clocks are editable. A future cloud/trading/PvP implementation must validate or restrict imported resources and introduce server authority; local IDs, checksums and balances cannot be trusted competitively. Replace the repository adapter rather than putting networking inside combat or UI components.

The release branch is `codex/phase-4-local`, based on published `main` commit `b726c94` (merged Phase III). Production target supplied by the user: `https://nowrift-one.vercel.app/`. Managed-network requests to `api.github.com`, `api.vercel.com` and the production site return CONNECT HTTP 403; the environment has no Vercel credential binding. Native Git transport remains available. These restrictions block API-based PR creation, production deployment and live-site verification. A local build or development-environment publication is not a production deployment.
