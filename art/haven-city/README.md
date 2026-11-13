# Rift Haven city art bible

This is an original, native-grid town kit. The attached references guide composition,
occupation and material contrasts; no reference pixels, third-party maps or sprites
are copied. The existing modular player, equipment and weapon evolution are reused.

- Native terrain tile: **16 × 16px**, displayed at **2×** (32 world units).
- City: **112 × 94 tiles**, **3584 × 3008 world units**. Discovery IDs stay stable;
  entrances move with the authored city. Schema-1 positions migrate independently
  of character progression and frozen expedition checkpoints.
- Props: **32 × 48px** cells, anchored at bottom center and displayed at 2×.
- Buildings use individually authored silhouettes and integer-grid shapes. They
  share upper-left highlights, dark cool outlines and warm reflected light.
- Expansion uses native foundry/cooling wings, a guild watchtower and map room,
  a tall conservatory, oak shrine, market arcade and three household annex forms.
  The original homes now also have separate dormer, asymmetric and rounded roofs.
  Footprints remain small enough for player scale; sprites are never enlarged to
  fill the increased city area.
- Native materials: limestone ivory `#c8bc96`, slate blue `#526c78`, forge charcoal
  `#383840`, oxidized copper `#9f684b`, market ochre `#c0a36e`, garden moss
  `#405c48`, ember `#f3a05d`, rift cyan `#83d5cf`, moonbloom violet `#b392c9`.
- Architecture: stepped plaza masonry; exposed forge machinery; irregular market
  awnings; timber shelter; slate guildhall; glazed greenhouse; suspended runestones;
  roped practice enclosure; clay, blue-slate and thatch homes around narrow lanes.
- Animations: bounded 8-frame station loops, four-frame resident walking rows,
  slow plant motion, stepped water and smoke; reduced effects freezes decorative
  animation. Day/night is a cosmetic 20-minute cycle, independent of reward clocks.
- FX use explicit building-relative draw depths so forge fire, chimney smoke,
  fountain water, guild flags and portal energy remain visible above their parent.
- Five terrain layers use Phaser tile culling. Individual sprites use viewport
  culling, refreshed immediately after a large camera jump; ambient motes cap at
  72 (18 on low quality, zero with reduced effects). Eighteen residents share one
  48px atlas and the existing character anatomy.
- Navigation geometry is authored in `src/game/world/city-layout.json`, shared by
  the renderer, original-art generator, design board and collision tests.
- Physical feet have explicit collision; canopy/roof overhangs do not. Lit public
  stations have a contextual interaction ring; private household doors are scenery.
  Lore plaques are real read/visit interactions and do not grant fake rewards.

The 896 × 752 `terrain.png` is a nearest-neighbor Town Map overview. The actual
world uses 16px tiles and depth-sorted sprites rather than that overview image.
The atlas contract is in `public/assets/haven/city-atlas.json`; the complete
inventory and uses are in `docs/haven-city-assets.json`.

Regenerate with `npm run assets:city`, then `npm run design:city` for the editable
HTML/SVG layout, architecture, waypoint and palette boards. Run
`python3 scripts/generate-haven-city.py --check` to compare all generated PNG/JSON
outputs. Assets in this kit are original CC0; the layout JSON, palette and Python
generator are editable sources. No external art service is needed to regenerate.
