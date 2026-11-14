# Gameplay and quality-of-life upgrade

## Main-branch audit and reproduced defects

Work starts from `25f7746` (merged regional expansion), on the dedicated
`feat/gameplay-qol-monthly-teleport` branch. TypeScript and all 659 baseline
unit/integration tests pass. Character/profile schema 2, checkpoint schema 1,
IndexedDB transactions, receipts, region registry and existing travel commands remain
the authoritative owners; no server or additional database is introduced.

A detached, instrumented build of the exact main snapshot reproduces two new browser
regressions: selecting a service removes the Fast Travel action, and a tracked quest
overlaps the minimap (10,461.75 CSS px² at 360px). The original travel command itself
still works. The local action is also below the long waypoint directory; the World view
omits its travel action for the current region. Overview service markers can share hit
areas with nearby beacons, making the keyboard/list alternatives important.

The first implementation keeps a compact selected-destination/action panel ahead of
both map views. A service resolves to its district's actual registered landing, with
that destination named explicitly. World view exposes each region's registered
destinations, including current-region travel. Existing discovery/story/Gate checks,
safe landing, transactions and arrival epochs remain in place. A synchronous in-flight
guard and input lock prevent duplicate submissions before React updates.

The minimap and tracked quest now share a normal-flow HUD rail. Haven's status and
rail occupy separate columns below the actual header; combat uses separate objective,
boss and navigation columns. Widgets no longer choose competing independent top offsets.
The two focused browser checks pass after the fixes, including 360, 390, 768, 1280,
1440 and 844×390 short-height layouts. Screenshots are captured by `e2e/qol.spec.ts`.

The sections below document the input, simulation, calendar and migration implementation.
Executed validation results and screenshot evidence are recorded separately at delivery.

## Input and immersive exploration

`game/input/bindings.ts` is the authoritative registry of physical `KeyboardEvent.code`
bindings. The existing both/WASD/arrows presets remain supported; custom mode stores
one validated, unique physical key per action. Assigning an occupied key proposes an
explicit swap. Escape always remains an emergency dialog Back key; during capture it
cancels capture. Tab, modifier-only keys and browser-critical keys are reserved.

The controls editor detects a fine pointer or actual physical keyboard events, rather
than inferring keyboard ownership from screen width. It supports capture/cancel,
individual reset, restoring defaults, preset confirmation and layout-specific display
labels (the physical code remains authoritative). Mobile touch handlers remain intact.
No gamepad implementation existed in this baseline.

React owns navigation shortcuts through one stable listener per mounted game; each
Phaser scene owns movement/interact through a disposable input source. Scene locks,
modals, capture, blur, hidden tabs and preference changes clear held movement. Modal
Back delegates to the existing innermost dialog owner. Listener cleanup is explicit.
Field-manual, canvas, map, Sanctuary and gameplay hints all read the same registry.

`hideHud` is a device preference, default false. V or its rebound key toggles optional
exploration UI; the mobile reveal handle and Pause remain accessible. Important real
interaction prompts remain usable. A mandatory modal temporarily exposes essential
controls without changing the stored preference. In Free exploration, health and other
combat-critical UI stay visible. Story combat is never concealed by this preference.
Short-height combat uses viewport-sized flex geometry, keeping navigation inside the
playable viewport rather than pushing it below the page.

## Fixed-step combat and accounting

`CombatClock` receives monotonic elapsed frame time and supplies 1/60-second steps to
the existing `advanceGame`. Selected speed scales its budget only. It performs at most
16 steps per rendered frame, keeps a fractional remainder, and drops overload backlog.
A frame over 250 ms is treated as a stall and discarded. Slow devices therefore slow
simulation safely instead of catching up with a large jump. New encounters and restored
checkpoints start at 1×. Speed is an encounter setting, not a character statistic.

Paused, hidden, I/O-blocked, transition-locked and upgrade states discard the budget;
entering an upgrade/outcome in a frame stops further steps. Phaser FPS, city movement,
CSS/menu animation, audio rate/pitch, Date, storage and asynchronous work are unchanged.

`time`/result `seconds` remain simulation time for mission timers, extraction, boss
patterns, cooldowns, quest evidence and clear-condition validation. `realTime` and
result `realSeconds` carry unscaled active playtime for profile metrics. Checkpoint
milestones and settlement count only increments of that real clock, so resuming and
settling never bank the same time or rewards twice. Stalls and paused time are excluded.
Legacy 1× checkpoints/results that lack the new field fall back to their existing time.

## Monthly calendar and save compatibility

Game days remain Asia/Bangkok Gregorian ISO dates. A version-1 reward schedule is
frozen in `persistence/calendar.ts`; day-of-month determines the grant regardless of
how many days the player logged in. Normal dates alternate modest Gold and existing
materials, days 7/14/21/28 give weekly milestones, day 21 adds a rare-material parcel,
and the actual final date adds Gold plus one Epic forest weapon using `grantGift`.
When February 28 is both weekly and final, its components form one Gift and one receipt.

The UI aligns seven weekday columns with real leading blanks, shows claimed/today/
missed/future dates, displays exact reward details, offers previous-month history and
locked future previews, and supports date selection with keyboard arrows or touch.
Thai and English headings explicitly use Gregorian years. A calendar wall-clock hook
refreshes at Bangkok midnight, on focus/visibility return and at least once a minute;
it never uses the combat clock.

Compatibility is additive: root/save schema 2 and checkpoint schema 1 remain. Legacy
`{day, cycle, slotId, at}` check-ins are never rewritten or re-granted. New entries use
`{day, calendarVersion:1, slotId, at}`. Validation accepts both and rejects malformed
or unknown versions. The first successful calendar claim on a legacy-history profile
creates a complete recovery backup in the same transaction before adding its new entry.
Imports/exports retain both formats and merge by actual day; old receipt IDs keep the
same `checkin:<local-player-id>:<ISO-date>` form, preserving an already-claimed today.

The repository's existing single IndexedDB read/write transaction owns the active
character reward, receipt, inventory/history, root claim entry and migration backup.
An abort rolls them all back. Concurrent tabs serialize on that store; competing claims
cannot pay twice. Explicit old/future date requests are rejected. The legacy empty
command ID still means today for existing callers. Existing daily quest resets and
achievement definitions are unchanged. Check-in gifts still feed only explicitly
eligible inventory quests, never the earned-Gold daily quest.

Device preferences keep the existing storage key and migrate missing fields to defaults
without resetting sound, graphics, fullscreen or touch choices. The original preference
bytes are backed up before their first write. Invalid/unsupported or conflicting new
key mappings recover the mapping alone while retaining other valid preferences and
preserving original bytes. Transient capture state is never stored.

### Limits retained deliberately

- This remains a single-player, browser-local game. A device clock can be changed;
  rollback checks are useful safeguards, not server-grade anti-cheat.
- The calendar has no historical backclaim. Old seven-day rewards display from their
  original cycle; no retroactive grants are made.
- First-time inter-region travel still requires a story-unlocked route and proximity
  to the existing Rift Gate. Later discovered waypoints are available from anywhere
  in a city. Expedition travel uses its separate existing campaign interface.
- Combat 4× may slow under sustained overload because work and catch-up are bounded.
- No new art files or new inventory/economy systems are needed. All city assets,
  quests, equipment/evolution, crafting, shops, slots, PWA/offline behavior and regional
  architecture are preserved. The app-shell cache version advances to the QoL build.

## Changed-file guide

| Area | Main implementation and coverage |
| --- | --- |
| Travel and reserved HUD zones | `TownMap`, `HavenGame`, `HudRail`, `RegionalMinimap`, `ExpeditionAtlas`, `QuestJournal`, `atlas.css`, `haven.css`, `story.css`, `qol.css` |
| Shared controls and immersive HUD | `game/input/{bindings,keyboard}`, `useGameplayShortcuts`, `KeybindEditor`, `HudToggle`, both Phaser scenes, `GameUi`, `NowRiftMainMenu`, `SanctuaryPanel`, `state/settings` |
| Combat speed and real playtime | `simulation-clock`, `CombatSpeedControl`, `engine`, `bridge`, campaign result validation, checkpoint capture/restore and repository metrics |
| Calendar rewards and migration | `persistence/calendar`, `daily`, `model`, `validation`, `repository`, `MonthlyCheckinCalendar`, `useGameDay`, `ProfileScreen`, `profile.css` |
| Localization and delivery | `i18n/dictionaries/qol-th`, `translator`, app CSS import order, `public/sw.js`, formatting coverage |
| Regression coverage | `input/bindings.test`, `simulation-clock.test`, `calendar.test`, persistence and quest-integration tests, `e2e/{qol,calendar,persistence}.spec` |

The existing engine, world/waypoint registry, safe-landing validator, progression,
RPG inventory/economy, profile repository, receipt handling and PWA architecture are
extended in place. City geometry, original assets, stations, quests, mode transitions,
shared character ownership and existing migrations are retained.

A final modal review adds an Escape-repeat guard: holding Escape after cancelling key
capture cannot cascade into closing the owning Settings dialog. A fixture-free browser
regression checks this on the ordinary production bundle, along with physical-keyboard
detection on a wide touch-only screen.

### Full-suite findings fixed in the implementation

The first complete browser pass found a waypoint/service ID collision: selecting the
Guild waypoint then setting a route could mark the Guild service instead. Town Map
selection now consistently uses map-marker/landmark IDs; the authoritative waypoint
ID remains the separate travel command ID. The existing regional test still requires
the exact `waypoint-guild` destination and its original Adventurer's waypoint label.

The same pass exposed an exit race: Phaser's menu emits `ready` while a retired combat
component can still be mounted. Its auto-start listener could create a fresh run after
abandonment, blocking the next trip. A synchronous leaving guard suppresses that start,
checks asynchronous preparation boundaries, and cleans up a cancelled new preparation
without discarding a recovered checkpoint. The regression now asserts no active run or
checkpoint remains after abandonment before starting Story again. Neither failure was
handled by changing its expected gameplay behavior.
