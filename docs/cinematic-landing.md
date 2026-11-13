# Cinematic NowRift gateway

The gateway opens on an original pixel-fantasy forest and ancient Rift, with the existing official logo above a prominent **Play Now** action. Play immediately invokes the menu controller's existing character-selection callback. Character creation, the official-logo `RiftTransition`, world readiness, Haven, combat and persistence continue through their existing implementations.

## Implementation and review map

| Files                                                                          | Purpose                                                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/CinematicLanding.tsx`, `.module.css`                           | Full-viewport title composition, six decorative depth planes, pixel-framed actions, actual feature panels, responsive layouts and accessible keyboard entry. |
| `src/components/NowRiftMainMenu.tsx`                                           | Delegates gateway presentation and retains the authoritative Play, practice, settings and manual callbacks.                                                  |
| `src/i18n/dictionaries/landing-th.ts`, `th.ts`                                 | Live Thai hero, feature, audio and navigation copy through the existing dictionary system.                                                                   |
| `art/landing/`, `public/assets/landing/`, `scripts/prepare-landing-assets.mjs` | Original masters, provenance, reproducible optimized images, dimensions and SHA-256 manifest.                                                                |
| `public/sw.js`                                                                 | Versioned offline caching for the critical hero artwork and reused portal/ruin assets.                                                                       |
| `package.json`                                                                 | Asset reproduction command and formatting coverage; no dependency changes.                                                                                   |
| `e2e/landing.spec.ts`, `journey.spec.ts`, `visual-overhaul.spec.ts`            | Landing behavior/layout regressions and updated Play labels in the existing character/game journey.                                                          |

The official logo is the exact existing `/branding/nowrift-logo-transparent.png`, with SHA-256 `f72e76a6087a935b7529231aaf16a416799d2850e19437bd99f665a02052a3c0` before and after this change. No logo, loading component, gameplay implementation, save model or progression calculation was replaced.

## Artwork and motion

- New original image-generated forest and transparent foreground masters are retained in `art/landing/`. Reference images supplied style direction only. The cinematic forest is title-screen artwork, not an advertised new playable area.
- Existing forest trees, desert ruins and the eight-frame local portal sprite provide separate depth/effect layers. Mist and light overlays supplement real environmental artwork.
- Haven, Story and equipment panels use real existing browser captures. Free Exploration uses the real Lost Desert preview artwork, identified as world art. The copy describes the implemented repeatable supply expeditions and extraction behavior.
- All public derivatives have local paths and CC0 provenance in `public/assets/landing/LICENSE.md`. The original game-art licenses remain in their original directories.

| Image              | Dimensions |   Bytes |
| ------------------ | ---------- | ------: |
| `forest.webp`      | 960 × 540  | 303,220 |
| `foreground.webp`  | 960 × 540  | 138,596 |
| `haven.webp`       | 900 × 478  |  59,748 |
| `story.webp`       | 900 × 480  | 181,770 |
| `exploration.webp` | 720 × 405  |   6,204 |
| `progression.webp` | 900 × 486  | 183,296 |

The two hero images total 441,816 bytes (about 431 KiB). The forest uses an undithered 256-color palette; full-color masters are retained. Only the main environment and official logo request priority loading; feature images use native lazy loading with intrinsic dimensions. `npm run assets:landing` reproduces the derivatives with the Sharp version already pinned through Next.js in the lockfile.

Pointer parallax is bounded to ten horizontal and seven vertical pixels. Input schedules one animation frame; there is no perpetual JavaScript animation loop or per-frame React state. CSS animates the portal, restrained light, mist, button rune and at most eighteen particles. Existing particle density and graphics quality apply. OS reduced motion, the game's Reduced Effects preference and Low quality disable motion; the hero pauses when hidden or outside the viewport. Observers, events and any scheduled frame are cleaned up on unmount.

Cover sizing and the portrait focal point are calculated in CSS using the environment's container dimensions, before first paint. A cold mobile measurement exposed a layout shift when these values were initially set after hydration; that JavaScript sizing was removed. Browsers without container-unit support retain a static cover fallback and working navigation.

## Controls and responsive behavior

- **Play Now** and the final **Begin Your Journey** button use the same immediate character-entry callback.
- **Explore the World** scrolls to and focuses the actual four-feature section. **Skip to Play** supports keyboard entry.
- Language, sound and Settings use the existing preferences. Field manual, practice tools, installation and save status remain available in the footer.
- The logo retains its square proportions. Desktop balances the menu against the portal; narrow portrait screens center the menu; short landscape screens place logo and actions side by side. A 568 × 320 viewport receives a compact version without the secondary description.

## Validation

Verified on 2026-11-13 with Node 24.22.1 and Chromium 156:

| Check                                | Result                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                  | Passed.                                                                                                         |
| `npm run lint`                       | Passed.                                                                                                         |
| `npm run format:check`               | Passed.                                                                                                         |
| `npm test`                           | 327 passed across 20 files, also executed by the build's preflight.                                             |
| `npm run assets:check`               | 354 public PNGs, animation/frame definitions and 46 item references validated.                                  |
| `npm run assets:landing`             | Reproduced the six optimized images and manifest.                                                               |
| `npm run test:playthrough`           | Seeded survival reached victory after 527.85 simulated seconds, with 911 kills.                                 |
| `NEXT_PUBLIC_E2E=1 npm run build`    | Passed.                                                                                                         |
| `NOWRIFT_E2E=1 npm run test:browser` | **107 passed**, no skipped tests or retries, in 7.2 minutes.                                                    |
| `npm run build`                      | Ordinary production build passed; this is the final build left in the workspace.                                |
| Ordinary production browser subset   | **28 passed** in 58.1 seconds, including all fifteen landing checks, branding and the public character journey. |

The full browser run covers Story and supply expeditions, equipment, saves/recovery, offline launch, real gameplay, boss combat, settings, touch, localization and the three formerly failing PR #18 cases. The ordinary entry checks confirm that the game's test fixture globals are absent from production. No timeouts were increased and no retries were introduced.

The nine layout checks cover 1920 × 1080, 1366 × 768, 768 × 1024, 1024 × 600, 390 × 844, 320 × 568, 844 × 390, 667 × 375 and 568 × 320. Play and the undistorted logo remain within the viewport, with no horizontal overflow. The cold mobile regression uses four-times CPU throttling, a 4 Mb/s download constraint, 40 ms latency and disabled browser/service-worker caches to verify initial layout stability.

Reproduce the ordinary production subset after `npm run build`:

```sh
npx playwright test e2e/landing.spec.ts e2e/branding.spec.ts \
  e2e/journey.spec.ts --grep-invert 'instrumented journey boundaries'
```

## Screenshots and observations

The final ordinary-production captures were reviewed on desktop, portrait and landscape. They retain the real official logo, local environmental art, visible primary actions and four implemented feature panels.

- [1920 × 1080 desktop](images/cinematic-landing/desktop.webp)
- [1366 × 768 laptop](images/cinematic-landing/laptop.webp)
- [768 × 1024 tablet](images/cinematic-landing/tablet.webp)
- [390 × 844 portrait](images/cinematic-landing/portrait.webp)
- [844 × 390 landscape](images/cinematic-landing/landscape.webp)
- [568 × 320 compact landscape](images/cinematic-landing/very-short-landscape.webp)
- [Full page](images/cinematic-landing/full-page.webp)

The [layout observations](images/cinematic-landing/observations.json) include all nine viewport sizes and zero runtime errors. Separate [offline and safe-area checks](images/cinematic-landing/offline-and-safe-area.json) confirm that the six critical/reused hero assets are cached, the artwork survives an offline reload, Play still enters character creation, and 59px left/right plus 21px bottom safe-area overrides keep header controls and Play accessible. The actual installed-device experience remains outside these emulated checks.

Local production measurements, with browser and service-worker caches disabled:

| Observation                                   |    Desktop 1366 × 768 |            Simulated mobile 390 × 844 |
| --------------------------------------------- | --------------------: | ------------------------------------: |
| CPU/network                                   | Unthrottled localhost | 4× CPU, 4 Mb/s download, 40ms latency |
| Forest response complete                      |                25.6ms |                             2,461.3ms |
| Cumulative layout shift during capture        |                     0 |                                     0 |
| Largest recorded startup main-thread task     |                  69ms |                                 231ms |
| Four-second steady frame sample, median / p95 |         16.7 / 16.8ms |                         16.7 / 16.8ms |
| Frames longer than 33.4ms in that sample      |                     0 |                                     0 |

The steady sample begins after initial network activity; startup tasks are reported separately. These are single-run local observations of animation-frame cadence, not measurements of physical mobile GPU performance or production/CDN loading. Raw readings are in [performance.json](images/cinematic-landing/performance.json).

The existing rendered 150-enemy gameplay stress checks also passed in the complete regression run: 60.08 average FPS on the desktop viewport and 57.99 with the mobile viewport and four-times CPU throttling; both recorded a 16.8ms p95 frame time. Landing animation elements are removed when character/game screens mount.

## Limits

Browser checks use Chromium in this Linux environment, including viewport/touch emulation and simulated CPU/network constraints. Physical iOS/Android devices, Safari/Firefox, actual installed standalone mode and production/CDN timings were not measured. Local frame cadence is a diagnostic observation, not a hardware performance guarantee.

No production merge or deployment is part of this change. GitHub's API is blocked by the environment network policy; the requested manual draft-PR form is the fallback for opening the review.
