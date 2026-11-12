# NowRift visual and audio specification

This document records the earlier presentation release. Its composite character and Graphics-only effect descriptions are superseded by the [modular pixel-art specification](pixel-art-specification.md) and [current migration/validation report](pixel-art-validation.md); the established audio, accessibility and authoritative simulation contracts remain in use.

## Direction

A weathered sanctuary at the edge of a broken world. Retain the repository’s original pixel art, readable silhouettes, restrained gold, moss and bone. UI uses modern spacing around serif titles and concise monospaced labels. No external fonts, sampled music or copied game assets were introduced.

## Tokens

| Token                    | Value / behavior                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Ink / panel / border     | `#0e1818` / `#172322` / `#3c473c`                                                    |
| Bone / muted / gold      | `#e6e6d6` / `#93a197` / `#d5b47a`                                                    |
| Danger / healing / frost | `#f1aa95` / `#b5dfbd` / `#b4dce8`                                                    |
| Titles                   | System Georgia serif, responsive 28–76px; italic for emphasis                        |
| Body / metadata          | System Arial 12–14px / Courier New 8–12px; tiny text is decorative metadata only     |
| Spacing                  | 4, 8, 12, 20, 24, 36, 40px                                                           |
| Panels                   | One-pixel weathered border, flat corners, low-opacity shadow, minimal glow           |
| Sprites                  | Original 32px sprites at 2× world scale, 64px bosses at 2×; nearest-neighbor scaling |
| Motion                   | 140ms controls, 220–320ms screens, 850ms logo, 9–24s ambient motion                  |
| Input                    | 44px minimum actionable touch targets; visible keyboard focus, pointer press state   |

Existing responsive safe-area and focus-mode layouts are retained. Settings become a single column on phones. Character and relic panels wrap at small widths. Character idle previews share the original wanderer sheet and use class tint; these are not three bespoke character sprite sets.

## Implemented screens

- Guest gateway / sanctuary, weapon loadout, character selection (Rift Wanderer, Ash Sentinel, Dusk Strider).
- Four-world atlas, difficulty selection and five stages per world; locks remain inspectable with explicit requirements.
- Gameplay HUD, boss health/phase, danger zones and dash corridor, pause, settings, blessing selection, victory and defeat.
- Inventory exposes actual campaign gold/materials and guardian relics. One relic slot; enhance from +0 to +3 using displayed gold/material costs. Empty pouch, unavailable storage, busy saves, locked relics and maximum rank have explicit states.
- Keyboard focus is contained in settings, character/inventory dialogs, pause, blessings and results.

## Presentation architecture

The existing pure simulation remains authoritative. Combat uses monotonic elapsed time with bounded engine substeps, independently of Phaser’s smoothed rendering clock. `feedback.ts` carries semantic events to Phaser through a queue capped at 128, reserving room for important events by displacing low-priority feedback. Events and combat texts recycle. Existing entity/spark/sprite/text pools remain intact.

`CombatVfx` batches recycled effects into one graphics object. Caps: 32 Low, 64 Medium, 96 High; reduced effects uses 20. Existing particles are capped by the simulation and drawn according to particle density. Background motes use a fixed upper bound of 28 in gameplay and 16 CSS elements per menu preview. No per-frame React state is used; the HUD remains 10 Hz.

Hazards and the entire Sand Colossus charge corridor render above decorative feedback and vignette. Their outlines, countdown circles, center marks and contrast backing never depend on particle/glow settings. Reduced motion stops menu animations and disables screen shake; visual alerts remain active.

| Reusable VFX                           | Current gameplay trigger                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Slash arc / trail                      | Twin Daggers release                                                          |
| Projectile trails                      | Player and hostile projectiles                                                |
| Collision sparks / magic bursts        | Confirmed damage and Arcane Bolt release                                      |
| Shockwaves / explosions                | Hazard detonation / Fire Orb area hit                                         |
| Burning                                | Fire release and infernal player burn ring                                    |
| Freeze / slow                          | Frost Pulse and chilled enemies/player                                        |
| Poison / lightning chain               | Callable semantic effect primitives; no poison or chain-damage mechanic added |
| Shield impact                          | Player damage-grace ward feedback; no new shield stat introduced              |
| Healing / level up                     | Heal pickup and level/blessing events                                         |
| Rare reward glow                       | Guaranteed campaign clear/relic reward presentation                           |
| Boss spawn / telegraph / phase / death | Real boss encounter lifecycle                                                 |

Important impacts briefly hold the attack animation and apply configurable shake; the simulation does not stop. Critical numbers have a larger golden hierarchy, player damage is warm red, healing is green. Damage numbers can be sparse or hidden.

## Original procedural audio

`RiftAudio` owns one lazily created Web Audio context, one scheduler and deduplicated app listeners. Phaser audio is disabled. Browser gestures initialize/resume audio; visibility loss stops voices, clears the scheduler and suspends the context. Returning to a tab keeps gameplay paused and resumes audio on a fresh gesture.

Signal graph: SFX/music/ambient gain buses → master → compressor → analyser → output. Settings persist in the existing versioned local preference key with backward-compatible migration. Mute and volume changes use smoothed gain automation. Sliders never recreate the context. The analyser is diagnostic evidence of a generated signal, not evidence of subjective sound quality.

| State / profile      | Treatment                                                           |
| -------------------- | ------------------------------------------------------------------- |
| Menu / character     | Slow minor motif / lighter selection arpeggio                       |
| Exploration / combat | Sparse sustained notes / quicker note pulse and low accents         |
| Boss                 | Faster pulse, lower weight, high-priority introduction and warnings |
| Victory / defeat     | Major resolution / descending sparse motif                          |
| Forest               | D-root motif; soft filtered wind texture                            |
| Desert               | C-root motif; broader dry noise                                     |
| Frozen               | E-root motif; brighter crystalline frequencies and wind             |
| Infernal             | Low G-root motif; dark filtered rumble                              |

Music layers crossfade over roughly 1.2 seconds, retired layers disconnect after 2 seconds, and old ambience sources stop. Global cap: 24 sources. SFX caps: 8 Gentle / 14 Balanced / 18 Full, plus per-event cooldowns and pitch variation. Important alerts may displace lower-priority voices. Dense collision and pickup sounds are throttled. The palette includes all requested UI/player/combat/boss categories; unsupported mechanics do not emit fake events.

These are functional original procedural sound effects, music and ambient textures. They are not finished recorded ambience or a mastered soundtrack. Natural leaves, sand, fire texture and long-form musical development require listening-driven refinement.

## Quality and accessibility

Low limits gameplay rendering to 30 FPS and reduces effects; Medium/High target 60. Pause, blessings and results use 15 FPS. The selected world’s combat sheets load at run entry; the service worker retains its separate same-origin offline cache. Existing page interruption, touch cancellation, resize and installation logic remains.

Graphics quality, particle density, glow, shake, damage-number density, camera zoom, reduced effects, four audio buses, mute and intensity all persist locally. Essential combat outcomes never depend on sound.
