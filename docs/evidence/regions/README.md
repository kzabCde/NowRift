# Regional exploration evidence

These are unedited Chromium screenshots from the actual Phaser Canvas game at the
tested application tree (`9b57500`). Native screenshot dimensions and SHA-256 values
are recorded in [manifest.json](manifest.json). City fixtures seed existing progression
to permit regional access; travel, shops, combat, resource gathering and extraction
still use production commands and transactions. Fixtures are excluded from ordinary
production builds.

## City views

| City / district | Desktop | Mobile |
| --------------- | ------- | ------ |
| Central Plaza | [view](central-desktop-plaza.png) | [view](central-mobile-plaza.png) |
| Emberforge | [view](central-desktop-emberforge.png) | [view](central-mobile-emberforge.png) |
| Wanderer's Market | [view](central-desktop-market.png) | [view](central-mobile-market.png) |
| Sanctuary Grove | [view](central-desktop-grove.png) | [view](central-mobile-grove.png) |
| Adventurer's Guild | [view](central-desktop-guild.png) | [view](central-mobile-guild.png) |
| Moonbloom Garden | [view](central-desktop-garden.png) | [view](central-mobile-garden.png) |
| Rift Gate | [view](central-desktop-gate.png) | [view](central-mobile-gate.png) |
| Vanguard Training Grounds | [view](central-desktop-training.png) | [view](central-mobile-training.png) |
| Hearthside Quarter | [view](central-desktop-hearthside.png) | [view](central-mobile-hearthside.png) |
| Wiang Mekha / North | [view](north-desktop.png) | [view](north-mobile.png) |
| Nakhon Hinsai / Northeast | [view](northeast-desktop.png) | [view](northeast-mobile.png) |
| Samut Khram / South | [view](south-desktop.png) | [view](south-mobile.png) |

Map views: [English world overview](thailand-world-overview.png),
[Thai mobile world overview](thai-mobile-world-map.png),
[regional expedition minimap](highland-expedition-minimap.png) and
[expanded expedition atlas](highland-expedition-atlas.png).

## Validation

<!-- VALIDATION_START -->
The final instrumented build passed TypeScript, **659 unit/integration tests in 34
files**, and all **532 PNG** asset validations. Formatting, lint, the generator check,
editable-design regeneration and the seeded survival/boss playthrough passed.

The **complete corrected browser run passed 146 checks in 19.3 minutes**, with one
production-only check intentionally skipped. The **ordinary production build and its
separate Town Map travel/reload smoke passed (1/1, 18.3 seconds)**. A scan of 18 production
browser chunks found zero fixture globals or mission-driver signatures.

The initial broad run found three regressions: a missing offline starter foliage asset
and two loading tests targeting the retired overview terrain. The cache and test inputs
were corrected; all three passed their focused recheck and the complete rerun. The map
pan test now scrolls the canvas into view before using pointer coordinates, preserving
its actual movement assertion. These are corrected failures, not accepted snapshot changes.

Raw reports: [full browser run](full-browser.txt), [production smoke](production-browser.txt),
[production signature scan](production-bundle-scan.json), [validation and source hashes](validation.json).
PR #27's GitHub validation also completed successfully ([run 43570572628](https://github.com/kzabCde/NowRift/actions/runs/43570572628)).

Only review documentation and screenshots were added after the tested local application
commit. The production build is left installed locally; no production deployment was made.
<!-- VALIDATION_END -->

Commands:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:playthrough
python3 scripts/generate-regions.py --check
npm run assets:check
npm run measure:regions
npm run design:regions
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
# Then rebuild without NEXT_PUBLIC_E2E for the production-only Town Map check.
npm run build
npx playwright test e2e/city.spec.ts --grep 'production Town Map'
```

## Performance

The city benchmark samples browser animation frames for four seconds at 1440×1000,
then 390×844 with Chrome's 4× CPU throttle. The regional benchmark samples three
seconds in each viewport per city, and verifies that only the destination's regional
art bundle is requested on arrival. Frame rates below are browser frame counts rather
than Phaser's smoothed loop estimate. Heap is a sampled JS heap value; decoded texture
bytes are an RGBA source-image estimate, not a GPU allocation measurement.

<!-- PERFORMANCE_START -->
| City | Viewport / CPU | FPS | p95 frame ms | JS heap MiB | Decoded textures MiB | Visible / total sprites |
| ---- | -------------- | --: | -----------: | ----------: | -------------------: | ----------------------: |
| Central | 1440×1000 / 1× | 56.7 | 16.8 | 26.7 | 20.1 | 62 / 335 |
| Central | 390×844 / 4× | 25.4 | 50.1 | 33.4 | 20.1 | 47 / 335 |
| North | 1440×1000 / 1× | 57.3 | 16.8 | 20.5 | 18.8 | 77 / 86 |
| North | 390×844 / 4× | 33.3 | 50.1 | 20.5 | 18.8 | 32 / 86 |
| Northeast | 1440×1000 / 1× | 59.0 | 16.7 | 21.9 | 18.7 | 77 / 85 |
| Northeast | 390×844 / 4× | 31.2 | 50.1 | 24.3 | 18.7 | 41 / 85 |
| South | 1440×1000 / 1× | 57.5 | 16.8 | 23.4 | 18.7 | 78 / 86 |
| South | 390×844 / 4× | 24.0 | 50.1 | 22.7 | 18.7 | 41 / 86 |

Raw measurements: [Central](city-performance.json), [three regional cities](regional-performance.json).

Environment: Node 24.22.1, Chromium 156.0.8078.79, Linux; one Playwright worker.
<!-- PERFORMANCE_END -->

These short headless-browser samples establish regression bounds, not physical-phone
performance guarantees. Human playtesting, naturally earned loadout balance and further
bespoke environment art remain follow-ups listed in the [implementation report](../../thailand-open-world.md).
