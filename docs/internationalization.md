# NowRift — localization architecture

NowRift supports English (`en`, fallback) and Thai (`th`) offline. The locale is stored in `nowrift-locale-v1` in localStorage, separate from existing gameplay, IndexedDB and `nowrift-preferences-v1` saves. No database or translation API is used.

## Architecture

- `src/i18n/config.ts`: allowed locales, browser language detection and fallback.
- `src/state/locale.ts`: independent Zustand locale store and persistence; rehydration happens on the client after initial English SSR markup to avoid hydration mismatches.
- `src/i18n/dictionaries/th.ts`: curated, feature-grouped Thai translations keyed by canonical English copy. English is the key and always the fallback.
- `src/i18n/translator.ts`: type-constrained namespace/key lookup, placeholders (`{name}`), locale-aware numeric/date formatting and dynamic legacy-content lookup.
- `src/i18n/useI18n.ts`: reactive hooks for React components. Use `t("main", "Settings")` for static copy and `text(world.name)` to localize legacy game definitions without changing their stable IDs.
- `src/components/LanguageSwitcher.tsx`: EN/TH selector on guest, map, and in-game headers and in Settings; applies document language, title, description and PWA manifest without routing changes or Phaser remounts.
- `public/manifest.th.webmanifest`: localized install metadata, precached by the service worker.

## Adding another language (e.g. Japanese)

1. Copy the exact namespace/key shape from the Thai catalog into `src/i18n/dictionaries/ja.ts`. Translate only the values. Do not change English source keys.
2. Add `ja` to `locales` in `config.ts` and extend `isLocale`.
3. Add the locale dictionary to the selection logic in `translator.ts`, leaving English as the fallback.
4. Expose `JA` in the language selector and define the corresponding localized metadata/manifest if desired.
5. Extend dictionary parity tests and Playwright browser/during-game/offline checks.

## Content and saved-game safety

Weapons, worlds, stages, enemy kinds, relics, materials and upgrades keep their canonical English IDs. Only display strings change. Never translate these identifiers in gameplay data, IndexedDB records or simulation logic. Language selection is unaffected by a restart and active Phaser instances remain mounted.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `NOWRIFT_E2E=1 npm run test:browser` with a test build (`NEXT_PUBLIC_E2E=1`). Cover locale changes during gameplay, Thai browser defaults, persistent preference, PWA offline launch, and fallbacks. The app intentionally leaves the NowRift brand and standard shortcuts/units (HP, XP, ESC) unchanged.
