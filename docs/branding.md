# Official NowRift branding

NowRift uses only the **transparent pixel-art logo** supplied by the project owner. The legacy black-background logo has been removed from the guest gateway, source generator, PWA precache and output assets.

The transparent logo is displayed across the guest gateway, desktop and mobile headers, World Map, and Web App. Pixel-art assets retain the supplied lettering, crescent, stars, floating islands and castle silhouette.

`scripts/branding-data.mjs` holds the palette-indexed transparent artwork; `scripts/generate-branding.mjs` deterministically creates the PNG assets. `npm run dev`, `npm test`, and `npm run build` generate all assets locally with no external network, database or translation services. On rebuild, the generator removes the obsolete black-background PNG if it remains from a previous build.

| Output | Dimensions | Usage |
|---|---|---|
| `branding/nowrift-logo-transparent.png` | 384×384 | Guest gateway and desktop/mobile headers |
| `icons/favicon-48.png` | 48×48 | Browser favicon |
| `icons/icon-192.png` | 192×192 | PWA |
| `icons/icon-512.png` | 512×512 | PWA |
| `icons/icon-maskable-512.png` | 512×512 | Android maskable icon with safe margins |
| `icons/apple-touch-icon.png` | 180×180 | iOS home screen |

English and Thai PWA manifests reference the same icon assets. The service worker uses an incremented cache version to remove obsolete caches when installed PWA instances update.
