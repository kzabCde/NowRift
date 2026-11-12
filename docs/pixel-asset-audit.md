# Pixel visual architecture — Phase 0 audit

Baseline: commit `94b20eb`, inspected before this implementation (subsequently merged into `8969177`). Active renderer: browser-only Phaser 4.2.1 Canvas2D; React/Next 15 App Router owns menus, Zustand owns preferences, IndexedDB owns equipment/progression. No gameplay rewrite or additional rendering framework is needed. This baseline inventory stays separate from the [implemented migration and validation](pixel-art-validation.md).

## Findings and migration plan

- READY architecture: four 32px tiled biomes, existing map collision/navigation, 20 data-driven stages, separate held weapon layer, local guest slots/checkpoints, event-driven feedback and renderer pools. Retain these systems and all item/character/enemy/boss definitions.
- REFINE art: original town terrain/buildings/stations, terrain/props/items, enemy motions, boss windups and portal ambience. Preserve every live public path and existing collision pivots.
- REPLACE: flattened 32px clothing/helmet/boots body sheets; the forest boss repeats an enlarged elite; desert/frozen/infernal prop images duplicate tree/rock; frozen/infernal wolf repeats the goblin silhouette. Replace actual pixels and retain frame APIs for mobs/world props.
- MISSING: independently replaceable skin/hair/face/armor/clothing/gloves/pants/boots/back/offhand layers; shared prioritized action animation clock; typed asset registry and bounds checker; pixel sprite VFX metadata/lifecycle; transaction-confirmed interaction poses.
- UNUSED: no live content definitions will be removed. Legacy player/outfit sheets remain explicit fallback assets. Future story arcs/dungeons and unsupported skills are not implemented gameplay and will not receive fake buttons or effect triggers.
- Existing skill VFX use pooled Graphics geometry; replace artistic effects with original pixel sprite families while retaining essential radius/telegraph readability. Damage remains simulation-authoritative.

## Delivery order

A: typed registry, frame validation, pixel specification and shared animation state. B: 48px modular actors, synchronized equipped appearance and frozen run snapshots. C: pixel sprite effects keyed to existing combat events. D: individualized items/species/materials and functional interaction feedback. E: HUD/ambience/PWA/mobile polish and full regression. Each stage receives focused validation before broader integration.

Reference images guide silhouette, material and timing only. Their pixels (including the visibly copyrighted ORYX sheet) are not copied. New assets are original procedural pixel art with local CC0 source and licenses. Unsupported dash/run/summoning/chain-lightning mechanics will not be introduced to justify animations.

## Complete current PNG inventory

This lists every committed/public PNG at audit time, including branding and installation assets. MISSING categories above have no files yet. Exact duplicate paths are called out rather than inferred from names.

| Path                                            | Dimensions | State   | Action                                                                                            |
| ----------------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------- |
| `public/assets/characters/sentinel-ember.png`   | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/sentinel-moss.png`    | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/sentinel-tide.png`    | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/strider-ember.png`    | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/strider-moss.png`     | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/strider-tide.png`     | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/wanderer-ember.png`   | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/wanderer-moss.png`    | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/wanderer-tide.png`    | 384x128    | REPLACE | Flattened outfit and body; replace with independent synchronized layers                           |
| `public/assets/characters/weapons.png`          | 192x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/boss.png`                 | 640x64     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/caster.png`               | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/elite.png`                | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/goblin.png`               | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/ground.png`               | 256x256    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/icons.png`                | 128x16     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/key-art.png`              | 1440x810   | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/particles.png`            | 32x4       | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/player.png`               | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/projectiles.png`          | 80x16      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/rock.png`                 | 32x24      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/slime.png`                | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/tree.png`                 | 64x80      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/forest/wolf.png`                 | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/board.png`                 | 42x54      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/chest.png`                 | 42x54      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/dummy.png`                 | 42x54      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/forge.png`                 | 150x160    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/fountain.png`              | 100x100    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/inn.png`                   | 150x160    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/market.png`                | 150x160    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/npc.png`                   | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/player-ember.png`          | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/player-moss.png`           | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/player-tide.png`           | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/portal.png`                | 90x105     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/store.png`                 | 150x160    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/terrain.png`               | 900x750    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/tree.png`                  | 80x104     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/wardrobe.png`              | 150x160    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/haven/workshop.png`              | 150x160    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/items/atlas.png`                 | 256x192    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/boss.png`          | 640x64     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/caster.png`        | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/elite.png`         | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/goblin.png`        | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/preview.png`       | 960x540    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/projectiles.png`   | 80x16      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/rock.png`          | 64x80      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/slime.png`         | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/tiles.png`         | 96x32      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/tree.png`          | 64x80      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/desert/wolf.png`          | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/forest/boss.png`          | 640x64     | REPLACE | Exact duplicate of public/assets/forest/boss.png; distinguish actual species/materials            |
| `public/assets/worlds/forest/caster.png`        | 320x32     | REPLACE | Exact duplicate of public/assets/forest/caster.png; distinguish actual species/materials          |
| `public/assets/worlds/forest/elite.png`         | 320x32     | REPLACE | Exact duplicate of public/assets/forest/elite.png; distinguish actual species/materials           |
| `public/assets/worlds/forest/goblin.png`        | 320x32     | REPLACE | Exact duplicate of public/assets/forest/goblin.png; distinguish actual species/materials          |
| `public/assets/worlds/forest/preview.png`       | 960x540    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/forest/projectiles.png`   | 80x16      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/forest/rock.png`          | 32x24      | REPLACE | Exact duplicate of public/assets/forest/rock.png; distinguish actual species/materials            |
| `public/assets/worlds/forest/slime.png`         | 320x32     | REPLACE | Exact duplicate of public/assets/forest/slime.png; distinguish actual species/materials           |
| `public/assets/worlds/forest/tiles.png`         | 96x32      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/forest/tree.png`          | 64x80      | REPLACE | Exact duplicate of public/assets/forest/tree.png; distinguish actual species/materials            |
| `public/assets/worlds/forest/wolf.png`          | 320x32     | REPLACE | Exact duplicate of public/assets/forest/wolf.png; distinguish actual species/materials            |
| `public/assets/worlds/frozen/boss.png`          | 640x64     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/caster.png`        | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/elite.png`         | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/goblin.png`        | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/preview.png`       | 960x540    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/projectiles.png`   | 80x16      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/rock.png`          | 64x80      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/slime.png`         | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/tiles.png`         | 96x32      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/frozen/tree.png`          | 64x80      | REPLACE | Exact duplicate of public/assets/worlds/frozen/rock.png; distinguish actual species/materials     |
| `public/assets/worlds/frozen/wolf.png`          | 320x32     | REPLACE | Exact duplicate of public/assets/worlds/frozen/goblin.png; distinguish actual species/materials   |
| `public/assets/worlds/infernal/boss.png`        | 640x64     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/caster.png`      | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/elite.png`       | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/goblin.png`      | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/preview.png`     | 960x540    | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/projectiles.png` | 80x16      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/rock.png`        | 64x80      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/slime.png`       | 320x32     | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/tiles.png`       | 96x32      | REFINE  | Retain path and improve authored pixels/material detail                                           |
| `public/assets/worlds/infernal/tree.png`        | 64x80      | REPLACE | Exact duplicate of public/assets/worlds/infernal/rock.png; distinguish actual species/materials   |
| `public/assets/worlds/infernal/wolf.png`        | 320x32     | REPLACE | Exact duplicate of public/assets/worlds/infernal/goblin.png; distinguish actual species/materials |
| `public/branding/nowrift-logo-transparent.png`  | 384x384    | READY   | Retain approved branding or installation icon                                                     |
| `public/icons/apple-touch-icon.png`             | 180x180    | READY   | Retain approved branding or installation icon                                                     |
| `public/icons/favicon-48.png`                   | 48x48      | READY   | Retain approved branding or installation icon                                                     |
| `public/icons/icon-192.png`                     | 192x192    | READY   | Retain approved branding or installation icon                                                     |
| `public/icons/icon-512.png`                     | 512x512    | READY   | Retain approved branding or installation icon                                                     |
| `public/icons/icon-maskable-512.png`            | 512x512    | READY   | Retain approved branding or installation icon                                                     |
