# Landing environment sources

`forest-source.png` and `foreground-source.png` are original image-generated pixel-fantasy artwork created specifically for NowRift's cinematic gateway. They contain no text, logo, copied reference pixels, or third-party game sprites. Original full-resolution masters are retained here; optimized local WebP derivatives are in `public/assets/landing/`.

The foreground master preserves transparency. The official NowRift logo is a separate, unchanged existing branding asset and is never part of these generated images.

The served forest uses a maximum 256-color palette without dithering before WebP encoding. This retains the authored pixel edges and reduces its transfer size; the full-color original master is preserved.

The Haven, Story and progression images are crops of real previously captured browser gameplay/Inventory renders in `docs/images/pixel-art/`. The exploration image reuses the existing Lost Desert world-preview artwork; it is presented as world artwork, not as a screenshot of a fabricated expedition. All existing game-art licenses remain applicable.

Regenerate optimized derivatives using the Sharp version already pinned through Next.js in the lockfile:

```sh
node scripts/prepare-landing-assets.mjs
```

`manifest.json` records source paths, dimensions, byte sizes and output hashes. The generated forest is title-screen artwork; it does not advertise a new playable area.
