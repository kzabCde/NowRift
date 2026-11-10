# Phase III: RPG, inventory and economy

## Playing the progression loop

Open **Inventory & equipment** in the Hub. Six starter items are already equipped, with three Crimson Tonics in the bag. No currency is granted by migration. Choose an attack style in the Hub, enter the **World Map**, defeat enemies, and finish or lose a run to bank earned gold, character XP, materials and equipment. Victory additionally grants completion rewards; first-clear bonuses are awarded once. Leaving or refreshing an unfinished run forfeits its unbanked rewards.

Equipment bonuses apply to the chosen Arcane Bolt, Twin Daggers, Fire Orb or Frost Pulse style when a campaign run begins. Equipment does not replace that style. Retry waits for result settlement and reloads the latest character build, so newly earned levels apply immediately. All three existing archetypes feed the shared campaign stat engine. The original **Start New Run** practice route keeps the selected character’s base stats, legacy boss-relic effects (capped at the original +3), and practice score; practice does not fund the RPG economy. Campaign results and Hub records show the actual banked currency rather than the practice scoring formula.

The sanctuary includes:

- **Inventory:** 60 bag slots, category/favorite filters, rarity/type/power/name sorting, quantities, tooltips, a six-slot character preview, item protection and comparison using the actual campaign build. Equipped gear occupies character slots rather than bag slots. One material or tonic type occupies one bag slot regardless of quantity.
- **Character:** permanent level, XP, all ten equipment attributes, derived attack interval, power and four purchasable permanent disciplines.
- **Blacksmith:** +0–15 enhancement, current/predicted attributes, exact costs, base/pity/effective probabilities, failure consequences, confirmation, visual/audio feedback and per-item attempt history. Dismantling requires confirmation.
- **Trader:** eight fixed wares, including consumables, materials and uniquely owned equipment; purchases and sales show their prices and require confirmation. Two recipes consume materials and gold.
- **Journal:** persisted gold deltas, items received/consumed and enhancement outcomes.

Select a bag item or character slot to inspect it; on small screens this scrolls to the details, with a return-to-inventory button. Favorited, locked or equipped items cannot be sold or dismantled. Locked gear must be unlocked before enhancement. Full bags reject purchases and unequipping; existing stacks can still grow. Earned loot that requires a new slot becomes a protected parcel, claimable once room is made. Crafting and dismantling reject atomically if new output stacks cannot fit; no input items or resources are lost on rejection.

Pause a campaign to use **Crimson Tonic** (+35 HP up to the current maximum) or **Azure Tonic** (30% faster attacks for 20 simulation seconds). The inventory deduction commits before the live effect. A run-scoped receipt prevents applying an effect twice, and the scene remains paused while the deduction is pending. Effects and temporary blessings end with the run.

## Source organization

| File or directory                                   | Responsibility                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/game/rpg/model.ts`, `content.ts`               | Serializable types, item registry, rarity, affix bounds, economy and enhancement configuration      |
| `items.ts`, `loot.ts`                               | Seeded equipment creation and campaign kill/completion reward rolls                                 |
| `stats.ts`                                          | Permanent/gear/affix/enhancement/temporary stat calculation, caps, power and armor damage reduction |
| `inventory.ts`, `profile.ts`                        | Ownership, capacity, parcels, validation and existing-profile migration                             |
| `economy.ts`, `actions.ts`, `enhancement.ts`        | Validated gold/material mutations and atomic RPG commands                                           |
| `settlement.ts`, `src/game/campaign/persistence.ts` | Same-profile reward settlement, command receipts and IndexedDB transactions                         |
| `src/components/RpgScreen.tsx`, `src/app/rpg.css`   | Responsive sanctuary, paper doll, comparison, confirmations, shop and journal                       |
| `src/game/engine.ts`, `src/game/phaser/scenes.ts`   | Applying the shared build to real movement, combat, armor, regeneration, gear appearance and tonics |
| `src/components/NowRiftGame.tsx`, `WorldMap.tsx`    | Campaign build selection, real settlement totals and paused consumables                             |
| `public/assets/items/`, `scripts/generate-items.py` | Original local 48-frame pixel-art atlas, CC0 notice and editable generator                          |
| `src/game/rpg/rpg.test.ts`, `e2e/rpg.spec.ts`       | Economy, migration, races, combat integration and browser workflows                                 |

No new dependency was required. Existing pinned versions and the committed lockfile are retained. The existing transparent branding, language selection, quality controls and single shared Web Audio engine are preserved. The new item art is generated locally with Pillow and is committed; Pillow is unnecessary for installation or play. User reference sheets were not copied. Weapons show their equipped icon and rarity aura during campaign play; armor does not have individual character animation sets.

## Balance configuration and random bounds

The registry contains 24 world/category equipment definitions, four named world-boss relic necklaces, the existing 16 material definitions and two tonics. Each instance has a stable ID, definition ID, rarity, item level, enhancement, item-specific pity, unique affixes and protection flags.

| Rarity    | Base-stat multiplier | Unique affixes | Normal weight | Enhancement per rank | Cost factor | Salvage factor |
| --------- | -------------------: | -------------: | ------------: | -------------------: | ----------: | -------------: |
| Common    |                  1.0 |              0 |            62 |                   4% |         1.0 |              1 |
| Uncommon  |                  1.2 |              1 |            25 |                   5% |        1.35 |              2 |
| Rare      |                  1.5 |              2 |            10 |                   6% |         1.8 |              4 |
| Epic      |                  1.9 |              3 |           2.7 |                   7% |         2.6 |              7 |
| Legendary |                  2.5 |              4 |           0.3 |                   8% |         4.0 |             12 |

Normal weights sum to 100. Hard and Nightmare multiply non-Common weights by 1.6 and 2.4 before normalization. A source with a minimum rarity promotes a lower roll to that minimum. Equipment chances are 2.5% per ordinary enemy, 18% per elite, 100% per boss, 40% per victorious completion and 100% for a first clear. Difficulty multiplies the non-boss chances, capped at 100%. Elite/completion/first-clear gear is at least Uncommon; boss relics are at least Rare. Each world boss grants its named necklace rather than an unequippable candidate record.

Loot item level is `stage number + 4 × world index`, giving levels 1–17 for the existing worlds. Definitions accept levels 1–50 for future content. Loot uses the existing uint32 seeded generator and separate reward/equipment streams. IDs use the settled run ID and item index, making repeat generation reproducible and repeat settlement harmless.

Boss necklaces retain the existing Heartwood Sigil, Sunken Sun, Warden’s Tear and Cinder Crown names and their regeneration, damage, HP and critical-chance identities. The former +0–3 relic enhancement ranks and selected relic migrate to the actual new instances. Standard gear’s primary attribute is damage (weapon), HP (armor), armor (helmet), speed (boots), critical chance (ring), or regeneration (necklace). Its value is `primary value × (1 + item level × 0.16) × rarity multiplier × (1 + enhancement × rarity enhancement rate)`. Primary values, in that order, are 2, 12, 3, 4, 0.015 and 0.25. Body armor also grants `item level × rarity multiplier × enhancement scale` armor.

Affix keys are sampled without replacement. The raw roll is uniformly between the following bounds, then multiplied by `1 + item level × 0.035` and rounded to three decimals. Projectile count remains exactly +1 per affix and does not receive the item-level factor. Enhancement multiplies affix values by the same enhancement scale as primary attributes.

| Attribute             | Raw minimum | Raw maximum |
| --------------------- | ----------: | ----------: |
| Max HP                |           5 |          16 |
| Damage                |           1 |           3 |
| Attack speed          |          2% |          6% |
| Critical chance       |          1% |        2.5% |
| Critical damage       |          4% |         12% |
| Armor                 |           2 |           6 |
| Movement speed        |           2 |           6 |
| Regeneration / second |         0.1 |         0.3 |
| Projectile count      |           1 |           1 |
| Area of effect        |          3% |          8% |

Character level starts at 1 and caps at 60. Reaching the next level consumes `100 + (current level − 1) × 50` of cumulative character XP. Each permanent level adds 8 HP and 1.25 damage. Each discipline has ten ranks: Training adds 1.5 damage/rank, Oakheart adds 8 HP/rank, Stoneward adds 2 armor/rank, and Wayfarer adds 3 movement speed/rank. Buying rank `r + 1` costs `100 × (r + 1)²` gold plus `r + 1` copper ore. Temporary in-run levels still start at 1 and produce the existing blessings.

Final caps are 5,000 HP, 10,000 damage, +200% equipment attack speed, 75% critical chance, 4× critical damage, 300 armor, 360 movement speed, 20 regeneration/second, 8 projectiles and 4× area. Attack interval is at least 0.12 seconds. Incoming damage is `max(1, round(raw × 100 / (100 + armor)))`. Temporary blessings and tonic effects run through the same stat service and interval floor. Power is an indicative build rating from the shared stat service, not a separate combat multiplier.

## Enhancement and economy rules

| Current enhancement | Base success | On failed attempt                          |
| ------------------- | -----------: | ------------------------------------------ |
| +0                  |         100% | Preserve rank                              |
| +1–3                |          90% | Preserve rank                              |
| +4–6                |          70% | Preserve rank                              |
| +7–9                |          45% | Preserve rank                              |
| +10–12              |          25% | 50% downgrade one rank; otherwise preserve |
| +13–14              |          10% | 50% downgrade one rank; otherwise preserve |
| +15                 |   No attempt | No charge                                  |

Every valid attempt consumes its quoted resources on success or failure. Equipment is never destroyed. Gold cost is `ceil(18 × (current rank + 1)² × rarity cost factor × category factor)`, where weapons use 1.15 and other categories use 1. Material cost is `1 + floor(rank / 3)`: copper ore for weapons, wood for armor/helmet/boots, slime core for ring/necklace. At rank 7 and above, also consume `1 + floor((rank − 7) / 3)` enhancement stones.

Pity is enabled by default and can be disabled in configuration. Each failure adds 2 percentage points on that item, capped at a 20-point bonus; success resets its failure count. Effective chance is capped at 100%. The quote and transaction use the same configuration, including failure downgrade chance. Outcome, pity, currency, materials, receipt and history are committed together.

Purchased equipment uses the fixed offer's visible attributes with a new unique instance ID per purchase. Equipment sale value is `floor((4 + level × 2) × salvage factor × (1 + enhancement × 0.1))`; starter gear sells for zero. Dismantling yields `salvage factor + floor(level / 5)` copper ore plus `floor(enhancement / 5)` enhancement stones. Shop resale and dismantle-resale values are below purchase costs. Recipes consume 20 gold + 3 wood + 2 slime cores per enhancement stone, or 10 gold + 2 wood + 1 slime core per Crimson Tonic.

## Save compatibility and atomic actions

The existing `nowrift-campaign` / `progress` / `profile` record remains the canonical wallet, material inventory, character XP, clears and receipts. RPG data adds its own `schema: 1` and revision without deleting or replacing the Phase II fields. First write persists migration: existing boss candidates become named Rare relic instances once, with the previously selected relic and paid enhancement ranks preserved; clears, balances, material quantities and receipts are preserved. Corrupt data is reported and preserved rather than replaced with a starter profile.

React submits serializable commands to a replaceable repository. A read/write IndexedDB transaction reads the current profile, checks the quoted revision, validates ownership/protection/quantities/balances, mutates a clone and saves it once. Repeated command IDs return the original outcome without a second deduction; different commands with stale revisions fail without charges. A synchronous UI guard prevents reentrant confirmations while awaiting storage. Reward settlement shares the same record and transaction store, so concurrent clears cannot grant the first-clear reward twice.

This is an offline single-player economy, not tamper-proof currency. Active runs remain in memory; closing the page during a tonic effect can consume the item without preserving the run. Cross-device/cloud saves, export/import, backend synchronization, recovery tooling and Phase IV features are outside this phase. Browser storage eviction can remove local saves. Receipts and history currently grow with usage.

## Verification

Environment: Node 24.22.1, Chromium 156, Linux cloud desktop. Commands:

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:playthrough
NEXT_PUBLIC_E2E=1 npm run build
NOWRIFT_E2E=1 npm run test:browser
npm run build
npm run test:browser
```

- 196 passing unit tests, including 56 RPG cases: all enhancement ranks/outcomes, pity caps/reset, invalid/stale/duplicate requests, protection, inventory capacity/overflow, migration, deterministic item bounds, purchase/craft/resale costs, actual firing/collision/armor/crit/projectile/AoE behavior and concurrent IndexedDB transactions.
- 42 instrumented browser cases: all existing campaign/combat, branding, audio and language checks plus eleven RPG workflows. They verify actual saved balances and unique IDs, equip/unequip, comparisons, filters/sorts/protection, enhancement success/failure, double confirmation, shop/sale/crafting, confirmed dismantling, overflow claiming, permanent upgrades, corrupt-save preservation and real Phaser build/tonic integration.
- Ordinary production smoke suite: 25 passing cases; 17 instrumented scenario cases are explicitly skipped. Scenario controls are absent from the ordinary build. Narrow inventory/shop controls are exercised at 320 pixels; existing landscape, touch, resizing, offline and fallback checks remain.
- The original deterministic Fire Orb practice bot still wins at 527.85 simulation seconds, with 911 kills and 175 HP. This checks regression in normal combat, not human balance across every possible build.
- A 150-enemy browser stress run observed 60.09 FPS desktop, and 59.71 FPS in a mobile-sized viewport with 4× CPU throttling; p95 frame intervals were 16.8 ms and 16.7 ms respectively. These are cloud Chromium observations, not measurements on a physical phone. Safari/Firefox, physical touch/audio hardware and extended human economy/boss balancing remain unverified.

The integrated full browser run passed 40 cases and identified a missing quote space plus a resume-button test locator mismatch. All eleven RPG cases passed after the fixes, followed by all 25 ordinary production smoke cases. Stat-cap offer filtering is additionally verified in the unit suite. Browser fixtures seed isolated test-browser storage and advance scenarios; they do not add inventory cheats to production builds. Enhancement audio uses the existing Web Audio engine and obeys its global buses and mute setting; browser automation verifies the shared audio signal and mute behavior but does not establish audible quality on physical speakers.

## Release

This work lives in `codex/phase-3-rpg` and incorporates the current published `main` through `7d6d880`, including audio/combat polish, three characters, English/Thai and official transparent branding. Production target supplied by the user: `https://nowrift-one.vercel.app/`. No production deployment is implied by a successful local build or environment publication. GitHub PR creation and Vercel deployment require outbound API access and securely configured project credentials. The current managed environment has no Vercel credential binding and blocks those API hosts. No backend or Phase IV work was introduced.
