# PR #18 browser input synchronization

The failed run `43266489424` tested `9f3000a`. The reported failures were the town keyboard/collision check, Sanctuary's nested inventory check, and the town-to-combat equipped-layer check. Repetition locally reproduced two failures in twelve executions: the first Sanctuary shortcut was ignored, and the portal interaction timed out with Inventory still open.

A visible canvas or a finished loading transition does not guarantee that tutorial persistence has finished and Phaser has received its unlock command. The equipped-layer test also sent `I` and `Escape` consecutively without waiting for the asynchronous inventory screen to open.

`e2e/helpers/haven.ts` now waits for the free-exploration UI and, in instrumented builds, the actual scene unlock. The ordinary build uses its public UI readiness signal and does not depend on test-only globals. The three suites share this helper. The equipment test additionally waits for the rendered facing direction, a loaded inventory grid, the closed overlay, and restored town input before interacting with the portal. It still exercises real keyboard input, appearance rendering, checkpoint recovery and canvas identity.

No checks were skipped or weakened, and timeouts/retries were not increased. All three reported cases passed five consecutive repetitions after the correction. The combined source passed type checking, lint, formatting, a production build and 327 logic tests across twenty files.

Current `main` (`702b49e`) was integrated to resolve the PR's two merge conflicts while retaining its Free Mode supply expeditions and shared progression alongside modular character art. Gather acknowledgments and visibility now use the selected biome's node layout. An additional browser regression gathers desert gold ore, confirms the saved harvest and actual mining feedback, and verifies that unextracted materials and owned equipment remain unchanged; it passed. The existing workflow runs the complete browser suite, including this regression, on the updated branch.

Focused verification:

```sh
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 CI=true npm run test:browser -- \
  e2e/haven.spec.ts e2e/journey.spec.ts e2e/visual-overhaul.spec.ts \
  --grep 'keyboard moves and collides|Sanctuary, nested inventory|equipped body layers agree' \
  --repeat-each=5
```

Result: 15 passed. The separate Free Mode gathering regression passed as well. The ordinary production build must remain usable without the fixture APIs.
