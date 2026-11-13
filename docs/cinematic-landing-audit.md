# Cinematic landing page audit

Starting point: current `main` at `aadb50a`, including the verified PR #18 fix (`6a5aed7`) and the subsequently merged PR #19 official-logo loading screen. Both GitHub Actions validations for PR #18 passed, including their browser jobs. Landing work uses the separate `feature/cinematic-landing` branch; no production merge or deployment is authorized by this redesign.

## Existing entry and presentation

- `src/app/page.tsx` mounts `Soundscape` and `NowRiftMainMenu`.
- `NowRiftMainMenu.tsx` owns the navigation reducer. Gateway Play sets the return target and navigates to character selection; creation/selection then enters Haven through the existing readiness-gated `RiftTransition`.
- The current gateway is inline JSX and shared global CSS, with a single forest key-art background. Its Play action, Settings, language switch, installation controls and legacy launcher already work.
- `public/branding/nowrift-logo-transparent.png` is the exact official transparent 384px artwork. Reuse it unchanged; do not redraw, crop or generate a replacement.
- Original forest/world props, the Haven portal, an eight-frame portal effect, particles, modular characters and item atlases are available locally. `docs/images/pixel-art/` contains real, previously inspected game renders suitable for feature imagery.
- Zustand owns the existing graphics/audio preferences. `Soundscape` owns audio lifecycle and reduced-motion/quality document attributes. English/Thai use typed dictionaries. Existing modal focus handling, safe areas and PWA cache must stay intact.

## Scoped implementation

1. Extract a cinematic gateway component and isolated styles; keep the canonical Play/legacy/settings callbacks in the menu controller.
2. Retain the official logo and add an original local forest/ruin environment where the current key art lacks depth. Reuse actual portal/forest/particle art for restrained foreground and energy layers. No reference pixels, logos or screenshots will be fabricated.
3. Make Play Now the strongest control, preserve immediate character navigation, and use a real in-page Explore the World anchor.
4. Present four real capabilities below the hero: Haven, Story, supply expeditions in Free Mode, and persistent equipment/progression. Use actual gameplay captures and current item/character art.
5. Use bounded CSS motion, event-scheduled pointer transforms, visibility/intersection pausing, reduced-motion and graphics settings. Avoid animation libraries and per-frame React updates.
6. Localize new copy, cache only critical hero assets eagerly, lazy-load feature visuals, update relevant selectors/tests, and inspect desktop/portrait/landscape captures.

Gameplay, persistence, progression, scene loading and their data models remain outside this landing-page change. The prior PR's source and fixes are preserved. Any remaining GitHub API restriction will be reported truthfully; a draft PR must not be claimed to exist until created.
