# Character-first Rift Heaven journey

Baseline: `39ac711`, merged open-world foundation (PR #12). The approved gateway, official transparent logo, twenty campaign stages, combat, transactional RPG services, slot schema 2, nested world schema 1, deterministic checkpoints, English/Thai dictionaries and offline cache were already working. This change evolves that implementation on `feature/character-first-rift-heaven`; it does not introduce a second world, inventory or database.

## Player flow and controls

**Play → Create/select character → actual world loading and rift transition → Rift Heaven.** The former launcher is available only through the explicit **Practice & legacy tools** action. The main-menu artwork, typography, responsive layout, language/settings/PWA controls and official branding remain in use.

New identities accept trimmed, NFC-normalized English/Thai names under the existing 24 UTF-16-unit save limit. Control/format characters and unpaired surrogates are rejected. Class details and all six starting items derive from the existing RPG initializer and stat calculator. Moss/Ember/Tide are real animated cloak sheets and never alter combat stats. Confirmation commits character ID, name, class, appearance, starting HP, root membership and active selection in one IndexedDB transaction. The same confirmation ID is idempotent; the three-slot maximum is enforced inside the transaction.

Returning characters appear with their saved name, class, palette, level and pending journey. Continue loads the canonical slot again. An interrupted checkpoint takes precedence and resumes paused through the existing run owner/recovery path. Character management, backups and damaged-save recovery remain accessible. No existing character is repurposed by creation.

| Action                  | Control                                                       |
| ----------------------- | ------------------------------------------------------------- |
| Move                    | WASD/arrows or the existing touch drag joystick               |
| Interact/gather/extract | E or contextual touch action                                  |
| Sanctuary               | H, or the visible Sanctuary button                            |
| Inventory/map/journal   | I / M / Q                                                     |
| Close overlay           | Escape closes the topmost panel                               |
| Find a building         | Activity Directory or town map marks its entrance; walk there |

Sanctuary shows canonical identity/stats, all six equipped items, normal-stage progress in all four worlds and actual save status. Inventory, journal, settings, daily activities/achievements and the directory open from it. The town stays mounted and movement is locked. Closing a nested panel returns to Sanctuary; H toggles only Sanctuary itself, ignores repeats/IME/modifiers/editable fields, and never provides combat escape or teleportation. Pressing H during an adventure explains the return restriction.

The directory describes eleven existing activities and marks real station entrances. Existing Mara/prologue, crafting, blacksmith, merchant, wardrobe, training, inn and quest-board interactions remain authoritative. Daily/profile activities can open as a safe overlay over the same town. Training grants no permanent rewards. No upcoming system is represented as finished gameplay.

## Loading, travel and cleanup

`RiftTransition` uses a small original CSS portal, floating silhouettes, orbiting pixel fragments and a restrained crossing flash in the game's muted fantasy palette. The finite visual sequence waits for actual Phaser file progress, scene readiness and (for combat) committed run preparation. The simulated clock/input are held until reveal. Cached files still use real loader events. Reduced motion shortens the transition and disables decorative motion; low quality reduces decoration. Errors keep the world gated and expose Retry without changing the character. Paused, upgrade and results controls wait for reveal as well. Nested confirmations own Escape before the activity beneath them.

Town/campaign/farming use the same transition component. Asset Retry remounts only the failed renderer; repository/bootstrap errors retain the existing reload/recovery path. Returning after defeat, extraction or campaign results enters the same city with the same slot and safe return state. The existing checkpoint/atomic settlement/loss rules remain unchanged: no rewards for closing/travel, no farming campaign clears, and no duplicate extraction payments.

`flowReducer` is a typed application transition controller with operation tokens: only one prepared navigation can commit, stale completions are ignored and failures retain the known source screen. Render-loading state and town overlay stacks stay separate from canonical character/combat data. React receives bounded world snapshots; language and safe overlays do not remount Phaser. Existing browser-only dynamic imports, scene cleanup and per-instance bridges remain in use.

## Save compatibility

Database, root profile, slot IDs, internal `haven` world ID, `local.world` fields, checkpoint formats, equipment IDs, progression, receipts and backup formats are retained. “Rift Heaven” is a display-name change. Entry inspection does not create a default slot on a fresh install. Creating a character beside legacy data migrates/preserves that data first and uses a separate slot.

The only repair is a blocked/out-of-bounds/missing city coordinate in an otherwise valid world schema 1: a cloned record gets Central Plaza as position. All other fields are validated normally. Unknown schemas, damaged profiles and orphan slots are reported and preserved. No destructive migration or browser-storage reset is used. Existing writer leases and atomic financial transactions still protect multiple tabs.

## Changed file groups

- `CharacterEntry.tsx`, `identity.ts`, repository entry/creation methods: persistent onboarding and selection.
- `navigation/flow.ts`: typed navigation and shared shortcut guard; `journey.test.ts`: identity, capacity, preservation, coordinate repair and transition tests.
- `RiftTransition.tsx`, `journey.css`, Phaser start/hold bridge: actual readiness, animation and input/simulation gating.
- `HavenGame.tsx`, `SanctuaryPanel.tsx`, `world/activities.ts`: retained town, personal management, nested panels, directory and daily/profile access.
- `NowRiftMainMenu.tsx`, `NowRiftGame.tsx`, `ProfileScreen.tsx`: primary routing, recovery, city return and reused systems.
- `haven-scene.ts`: bounded fountain/portal/NPC ambience and updated canvas accessibility copy.
- `journey-th.ts`, existing haven dictionary: typed English-source/Thai copy; no new translation architecture.
- `public/sw.js`: cache v13; current original assets and new compiled chunks remain same-origin/offline.
- Playwright journey coverage and retained regression scenarios now explicitly choose the legacy launcher when they test legacy behavior. CI includes formatting and the feature branch.

No dependencies, lockfile changes, external artwork, backend, authentication or production configuration are introduced. Development requires the existing Node 24 setup.

## Verification and limits

Validation used Node 24.22.1 and Chromium 156 in the cloud environment:

- **276 unit tests passed** across fourteen files. New cases cover fresh entry without implicit creation, normalized/invalid names, idempotent confirmations, root selection after retry, concurrent three-slot capacity, old score/progression preservation, orphan slots, coordinate repair, writer-bound weapon selection, active-run restrictions and typed transition tokens.
- The **full 79-case instrumented regression suite passed**. The subsequently added recovered-level-up scenario also passed on the final instrumented build: its upgrade UI waits for scene reveal, keeps the same run ID and applies exactly one real blessing.
- Both instrumented and ordinary production builds passed, including TypeScript checks. The ordinary production browser run passed **47 scenarios**, with **33 fixture-only scenarios explicitly skipped**, including checks that the two fixture APIs are absent. ESLint, Prettier and `git diff --check` passed.
- The seeded normal-stat Fire Orb playthrough still wins at **527.85 simulation seconds**, **911 kills**, **175 HP** and **level 23**. A 180-enemy, 3,600-frame Node simulation measured **0.368 ms** mean, **0.512 ms** p95 and **4.825 ms** maximum update time; this excludes rendering.
- The 150-enemy browser stress test measured **59.98 FPS** desktop and **58.82 FPS** at a mobile viewport with 4× CPU throttling; both had **16.8 ms** p95 frame time. Low quality measured **30.01 render FPS**, with **4.5994 simulation seconds** over **4.5656 wall seconds**. These are cloud Chromium observations, not physical-phone benchmarks.

The fifteen new journey scenarios cover creation, returning/full rosters, invalid names, real Sanctuary weapon changes, nested financial cancellation, typing/held-key guards, unchanged scene/position, map guidance, daily/profile overlays, cold/cached/delayed/failed loading, reduced motion, Thai, maximum-length names at 320-pixel portrait width, 844×390 landscape, storage denial, older saves, offline relaunch, campaign return, farming recovery/extraction and level-up recovery. The previous suite continues to check all twenty stages, bosses, combat, inventory, economy, achievements, backups, touch, audio and PWA behavior. Screenshots are reviewed for creation, the portal, town and Thai portrait/landscape management.

Browser fixtures remain restricted to explicit `NEXT_PUBLIC_E2E=1` builds. The ordinary build verifies both fixture APIs are absent; accelerated setup/combat scenarios are explicitly skipped there. Physical Android/iOS hardware, Safari/Firefox and multi-hour human play remain unverified.

This release connects existing activities into the requested character-first journey. It does not add the larger roadmap's unimplemented story arcs, additional open biome maps, dungeons or layered hair/armor assets. The three existing cloak palettes are the available appearance choices.

No merge, production deployment or production-settings changes are authorized by this request. A Draft PR is attempted only after implementation and checks; any network/remote CI limitation is reported separately.
