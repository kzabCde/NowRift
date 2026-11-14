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

Further input, simulation, calendar, migration and final validation details are recorded
below as implementation proceeds; no pending check is represented as passed.
