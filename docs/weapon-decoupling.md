# Independent characters and inventory weapons

This refactor starts from `main` at `b9ad213`, after the character-first journey. The audit found two sources of weapon selection: `local.weapon` supplied a freely selected attack style, while the actual equipped instance supplied stat bonuses and a floating icon. The player and town sheets contained a staff. Changing real weapons therefore did not consistently change combat or the held visual.

Implementation order: introduce typed item metadata and one owned-item resolver; add independent character/weapon art and shared presentation; connect Inventory, Haven, stage entry and checkpoints; exercise the matrix of characters, weapons and worlds. Existing equipment actions, economy, progression, persistence and scene lifecycle remain in place. There are no dependency or lockfile changes.

## Equipment contract

`profile.rpg.equipped.weapon` → unique owned instance → item definition → `resolveEquippedWeapon` → `WeaponSnapshot` → simulation and presentation. The resolver rejects missing, duplicate, corrupt and wrong-slot references. It copies the instance, attack configuration and final character build; no parallel ordinary-weapon store exists.

| Inventory definition | Held visual | Actual attack |
| --- | --- | --- |
| `forest-weapon` — Riftwood Staff | Staff, frame 0 | Arcane Bolt projectiles |
| `desert-weapon` — Sunsteel Blade | Sword, frame 1 | Directional melee cone |
| `frozen-weapon` — Glacial Scepter | Scepter, frame 2 | Frost Pulse with enemy slow |
| `infernal-weapon` — Ember Glaive | Glaive, frame 3 | Wider fire-lit melee sweep |

All three bodies accept every weapon. Characters supply HP, movement and critical chance independently. Attack configuration, rarity, item level, affixes, enhancement, permanent progression and temporary blessings feed the existing shared stat calculation. `attackRange` accounts for area bonuses in both equipment cards and the HUD. Melee velocity blessings add reach; extra projectile blessings increase melee/pulse strike damage by 15% per extra projectile. Slash effects use the actual attack arc. Glaive fire is direct sweep damage and visual feedback, not a new damage-over-time system.

Campaign and farming runs require an owned equipped weapon. Empty slots show an Equip Weapon action and block entry; the repository checks this again inside the fresh-run transaction. `NowRiftGame` builds from that transaction's canonical save. Inventory actions remain the existing validated equip/unequip/enhance commands.

The four original attack styles remain explicitly temporary skills in **Practice & legacy tools**. `local.weapon` is retained as that backward-compatible practice preference. Sanctuary and town training use the actual inventory weapon. Deprecated town style commands are rejected.

## Shared original art

`scripts/character-art.py` generates nine transparent, weapon-free 384×128 atlases: three archetypes × Moss/Ember/Tide. Rift Wanderer wears travel clothes and a bag, Ash Sentinel has broad plate and a helmet, Dusk Strider has a narrow hood and scarf. These are different shapes, not class tints.

Each atlas has four 32px direction rows (down, right, up, left) and twelve frames per row: idle 0–1, walk 2–5, attack 6–7, hit 8, death 9–11. The left row mirrors the right. `weapons.png` is a separate six-frame 32px atlas containing four real weapon visuals and the dagger/orb practice visuals. All pixels are original procedural art, released under CC0; the local license is in `public/assets/characters/LICENSE.md`.

`game/presentation/character.ts` supplies keys, frames, facing and class hand anchors. Phaser's `CharacterRig` composes shadow, body, held weapon, rarity/enhancement effects and hit feedback in both town and combat. Back-facing equipment draws behind the body; movement bob and attack rotation follow its hand. React's `CharacterPreview` uses the same source atlases and anchors. The old weapon-free sheets remain compatible fallbacks. The PWA cache is v14 and includes the new assets.

Regenerate from the repository root with Python and Pillow:

```sh
python3 scripts/character-art.py
python3 scripts/generate-assets.py
python3 scripts/generate-items.py
python3 scripts/generate-haven.py
```

## Local saves and recovery

The save schema remains 2, RPG schema 1 and checkpoint schema 1. The new weapon snapshot and facing/attack-pose fields are optional additive fields validated on load. Existing inventories, IDs, affixes, enhancements, three slots, wallets, daily systems and progression are retained; no migration overwrites a valid equipped weapon.

Fresh runs freeze the weapon instance, full attack configuration and base stats. Checkpoints also retain current cooldowns, range, speed, upgrades, pose and RNG state. Recovery uses the saved state even if the current inventory has changed or the weapon is now unequipped. Validation checks snapshot/instance identity and matching saved builds without depending on JSON property order.

Older checkpoints never recorded which unique inventory weapon supplied their bonuses. They retain their exact saved attack style and combat stats, display a **Legacy attack snapshot** label and a temporary skill visual. Their original historical instance cannot be reconstructed reliably. The next fresh run uses actual current inventory equipment. Corrupted saves remain preserved by the existing recovery flow.

## Main files changed

- `rpg/model.ts`, `rpg/content.ts`, `rpg/stats.ts`, `rpg/weapon-validation.ts`: typed metadata, owned-instance resolution and shared combat statistics.
- `engine.ts`, `campaign/loader.ts`, `persistence/checkpoint.ts`, `persistence/repository.ts`, `world/actions.ts`, `world/bridge.ts`: real melee, frozen attacks, recovery and atomic entry checks.
- `presentation/character.ts`, `phaser/character-rig.ts`, both scenes, feedback/VFX: shared layered bodies, weapon attachment and actual attack effects.
- Character creation/selection, Hub, Haven, Inventory, WorldMap, Profile and HUD components; `CharacterPreview`, `EquippedWeapon`, extracted `ItemIcon`, CSS and Thai copy.
- Procedural art generators and local atlases; PWA v14 cache; unit/browser coverage, CI branch trigger and README.

## Validation and limits

Validation used Node 24.22.1 and cloud Chromium 156. Both browser modes were exercised. `weapons.test.ts` covers all twelve character/weapon combinations, directional reach, meaningful upgrades and enhancement damage, preservation across character changes and slots, old saves, invalid references, atomic empty-slot rejection, exact snapshot/RNG recovery and all twenty stages. `equipment.spec.ts` checks actual equipped instances, live Phaser body/weapon frames, actual automatic damage/slow, consistent Hub/Inventory/HUD display, empty equipment, mobile resizing, town swaps with the retained canvas and checkpoint recovery after a live inventory change.

Executed checks:

- `npm run typecheck`, `npm run lint`, `npm run format:check` and `git diff --check` passed.
- `npm test`: **298 tests passed in 15 files**, including 22 equipment-refactor cases.
- Both instrumented and ordinary `npm run build` succeeded; the final ordinary bundle is built without `NEXT_PUBLIC_E2E`.
- The full instrumented browser run passed **86 scenarios**. One existing training test had an ambiguous `strong` locator after the equipment card was added; that locator was narrowed to the actual damage counter and its targeted recheck passed. All **87 scenarios** have passed across the full run and corrected recheck.
- The ordinary production browser run passed **52 scenarios**, with **35 fixture-only scenarios explicitly skipped**. Both test APIs were confirmed absent, and cached/offline play, mobile layouts, live locale changes and save preservation passed.
- The seeded normal-stat Fire Orb practice bot still wins at **527.85 simulation seconds**, **911 kills**, **175 HP**, level **23**.
- Node simulation stress: **180 enemies / 3,600 frames**, **0.334 ms** mean, **0.406 ms** p95, **34.158 ms** maximum update time. This excludes rendering.
- Browser stress: **150 enemies**, **60.10 FPS** desktop and **58.60 FPS** at a mobile viewport with 4× CPU throttling; both measured **16.8 ms** p95 frame time. Low graphics measured **29.74 render FPS**, **4.563 simulated seconds** over **4.540 wall seconds**, with bounded effects.

Browser fixture APIs are compiled only with `NEXT_PUBLIC_E2E=1`. Ordinary production builds have neither API. Mobile browser emulation and CPU throttling do not constitute physical-phone benchmarks. Safari, Firefox and physical Android/iOS devices remain unverified. Extended human balance testing of the two new melee attacks remains outstanding; automated coverage verifies damage, range, upgrades and all stage loaders. Hair and individual armor layers are outside this refactor; the requested independent body and weapon layers are implemented.

No merge, production deployment or production settings changes are part of this request. A feature branch and Draft PR are prepared for review; remote access limitations are reported separately.
