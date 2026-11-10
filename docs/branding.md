# Official NowRift branding

Both source logos are derived from the two files supplied by the project owner:
- Opaque black-background artwork: the guest gateway emblem, emitted as `public/branding/nowrift-logo-black.png`.
- Transparent artwork: header and Web App brand logo, plus PWA icons.

To keep pixel-art edges crisp and avoid committing redundant binary assets, `scripts/branding-data.mjs` contains the palette-indexed artwork and `scripts/generate-branding.mjs` deterministically generates all seven PNGs. `npm run dev`, `npm test` and `npm run build` all run the generator first. The generated files do not depend on any network service and have no database dependency.

| Output | Dimensions | Usage |
|---|---|---|
| `branding/nowrift-logo-black.png` | 384×384 | Guest gateway |
| `branding/nowrift-logo-transparent.png` | 384×384 | Desktop/mobile header |
| `icons/favicon-48.png` | 48×48 | Browser favicon |
| `icons/icon-192.png` | 192×192 | PWA |
| `icons/icon-512.png` | 512×512 | PWA |
| `icons/icon-maskable-512.png` | 512×512 | Android maskable PWA icon with safe margins |
| `icons/apple-touch-icon.png` | 180×180 | iOS home-screen icon |

The app manifest retains English and Thai variants. The service worker cache version was incremented to refresh installed assets and precaches the new logos/icons. The legacy `src/app/icon.svg` is removed so it cannot override the updated PNG favicon.

Design assets use eight sampled grayscale shades from the originals (pixel-art optimization), keeping the supplied lettering, castle silhouette, crescent, stars and floating islands.
