import type { Progress } from "../campaign/progression";
import { CHARACTERS, type CharacterId } from "../loadout";
import { ITEMS, RARITIES } from "../rpg/content";
import {
  SLOTS,
  LEGACY_SLOTS,
  type Rarity,
  type Slot,
  type WeaponSnapshot,
} from "../rpg/model";
import { validEquipmentInstance } from "../rpg/profile";
import { resolveWeaponVisual } from "./weapon-visual";
import { OUTFITS, type Outfit } from "../world/save";
import {
  DEFAULT_CUSTOMIZATION,
  validCustomization,
  type AppearanceCustomization,
} from "./customization";
export type VisualSlot =
  | "body"
  | "skin"
  | "face"
  | "hair"
  | "headwear"
  | "inner"
  | "armor"
  | "gloves"
  | "pants"
  | "boots"
  | "back"
  | "ring"
  | "necklace"
  | "offhand";
export type AppearanceLayer = {
  slot: VisualSlot;
  key: string;
  path: string;
  z: number;
  instanceId?: string;
  definitionId?: string;
};
export type AppearanceEquipment = {
  slot: Slot;
  instanceId: string;
  definitionId: string;
  rarity: Rarity;
  enhancement: number;
};
export type CharacterAppearance = {
  schema: 1 | 2;
  character: CharacterId;
  outfit: Outfit;
  customization: AppearanceCustomization;
  equipment: AppearanceEquipment[];
  layers: AppearanceLayer[];
  appearanceKey: string;
};
export const rarityShape = (rarity: Rarity) =>
  rarity === "epic" || rarity === "legendary" ? 2 : rarity === "rare" ? 1 : 0;
/** Compatibility accessor; renderers also consume the canonical texture key. */
export function weaponVisualFrame(weapon: WeaponSnapshot) {
  return resolveWeaponVisual(weapon)?.frame ?? weapon.frame;
}
const worldOf = (id?: string) =>
  ["forest", "desert", "frozen", "infernal"].find((world) =>
    id?.split("-").includes(world),
  ) ?? "forest";
export function layerDepth(slot: VisualSlot, facing: string, z: number) {
  return slot === "back" ? (facing === "up" ? 6 : -4) : z;
}
function buildAppearance(
  character: CharacterId,
  outfit: Outfit,
  customization: AppearanceCustomization,
  equipment: AppearanceEquipment[],
  schema: 1 | 2 = 2,
): CharacterAppearance {
  const owned = (slot: Slot) => equipment.find((entry) => entry.slot === slot);
  const armor = owned("armor"),
    pants = owned("pants"),
    helmet = owned("helmet"),
    boots = owned("boots"),
    ring = owned("ring"),
    necklace = owned("necklace");
  const layers: AppearanceLayer[] = [];
  const add = (
    slot: VisualSlot,
    name: string,
    z: number,
    item?: AppearanceEquipment,
  ) =>
    layers.push({
      slot,
      key: `character-layer-${character}-${name}`,
      path: `/assets/characters/layers/${character}/${name}.png`,
      z,
      ...(item
        ? { instanceId: item.instanceId, definitionId: item.definitionId }
        : {}),
    });
  add("body", "body", 0);
  add("skin", `skin-${customization.skin}`, 1);
  if (schema === 1)
    add("pants", `pants-${worldOf(armor?.definitionId)}`, 2, armor);
  else
    add(
      "pants",
      pants
        ? `legwear-${worldOf(pants.definitionId)}-${rarityShape(pants.rarity)}`
        : "pants-base",
      2,
      pants,
    );
  add("inner", `inner-${outfit}`, 3);
  add("back", `back-${outfit}`, -4);
  add("face", `face-${customization.face}`, 7);
  add("hair", `hair-${customization.hair}`, 8);
  if (armor) {
    add(
      "armor",
      `armor-${worldOf(armor.definitionId)}-${rarityShape(armor.rarity)}`,
      5,
      armor,
    );
    add("gloves", `gloves-${worldOf(armor.definitionId)}`, 9, armor);
  }
  if (helmet)
    add(
      "headwear",
      `head-${worldOf(helmet.definitionId)}-${rarityShape(helmet.rarity)}`,
      10,
      helmet,
    );
  if (boots)
    add(
      "boots",
      `${schema === 1 ? "boots" : "outfit-boots"}-${worldOf(boots.definitionId)}-${rarityShape(boots.rarity)}`,
      4,
      boots,
    );
  if (ring)
    add(
      "ring",
      `ring-${worldOf(ring.definitionId)}-${rarityShape(ring.rarity)}`,
      11,
      ring,
    );
  if (necklace)
    add(
      "necklace",
      `neck-${worldOf(necklace.definitionId)}-${rarityShape(necklace.rarity)}`,
      12,
      necklace,
    );
  return {
    schema,
    character,
    outfit,
    customization: { ...customization },
    equipment: equipment.map((entry) => ({ ...entry })),
    layers,
    appearanceKey: [
      ...(schema === 2 ? ["v2"] : []),
      character,
      outfit,
      customization.skin,
      customization.hair,
      customization.face,
      ...equipment.map(
        (item) =>
          `${item.slot}:${item.instanceId}:${item.definitionId}:${item.rarity}:${item.enhancement}`,
      ),
    ].join("|"),
  };
}
export function defaultAppearance(
  character: CharacterId = "wanderer",
  outfit: Outfit = "moss",
  customization: AppearanceCustomization = DEFAULT_CUSTOMIZATION,
) {
  return buildAppearance(character, outfit, customization, []);
}
export function resolveAppearance(
  profile: Progress,
  character: CharacterId = profile.local?.character ?? "wanderer",
  outfit: Outfit = profile.local?.world?.outfit ?? "moss",
  customization: AppearanceCustomization = profile.local?.world
    ?.customization ?? DEFAULT_CUSTOMIZATION,
): CharacterAppearance {
  const equipment: AppearanceEquipment[] = [];
  for (const slot of SLOTS) {
    const id = profile.rpg?.equipped[slot];
    if (!id) continue;
    const matches = profile.rpg!.equipment.filter((item) => item.id === id),
      item = matches[0];
    if (
      matches.length !== 1 ||
      !validEquipmentInstance(item) ||
      ITEMS[item.definitionId].slot !== slot
    )
      continue;
    equipment.push({
      slot,
      instanceId: item.id,
      definitionId: item.definitionId,
      rarity: item.rarity,
      enhancement: item.enhancement,
    });
  }
  return buildAppearance(character, outfit, customization, equipment);
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
/** Recompute the complete canonical layer set from the saved equipment; never trust saved URLs. */
export function validAppearance(value: unknown): value is CharacterAppearance {
  if (!object(value)) return false;
  const v = value as unknown as CharacterAppearance;
  if (
    (v.schema !== 1 && v.schema !== 2) ||
    !Object.hasOwn(CHARACTERS, v.character) ||
    !OUTFITS.includes(v.outfit) ||
    !validCustomization(v.customization) ||
    !Array.isArray(v.equipment) ||
    v.equipment.length >
      (v.schema === 1 ? LEGACY_SLOTS.length : SLOTS.length) ||
    !Array.isArray(v.layers)
  )
    return false;
  const seen = new Set<string>(),
    ids = new Set<string>();
  for (const item of v.equipment) {
    if (
      !object(item) ||
      !((v.schema === 1 ? LEGACY_SLOTS : SLOTS) as readonly string[]).includes(
        item.slot,
      ) ||
      seen.has(item.slot) ||
      typeof item.instanceId !== "string" ||
      !item.instanceId ||
      item.instanceId.length > 2048 ||
      ids.has(item.instanceId) ||
      ITEMS[item.definitionId]?.slot !== item.slot ||
      !Object.hasOwn(RARITIES, item.rarity) ||
      !Number.isInteger(item.enhancement) ||
      item.enhancement < 0 ||
      item.enhancement > 15
    )
      return false;
    seen.add(item.slot);
    ids.add(item.instanceId);
  }
  const expected = buildAppearance(
    v.character,
    v.outfit,
    v.customization,
    (v.schema === 1 ? LEGACY_SLOTS : SLOTS).flatMap((slot) =>
      v.equipment.filter((e) => e.slot === slot),
    ),
    v.schema,
  );
  if (
    v.appearanceKey !== expected.appearanceKey ||
    v.layers.length !== expected.layers.length
  )
    return false;
  return expected.layers.every((layer, index) => {
    const supplied = v.layers[index];
    return (
      object(supplied) &&
      Object.keys(supplied).length === Object.keys(layer).length &&
      Object.entries(layer).every(
        ([key, val]) => supplied[key as keyof AppearanceLayer] === val,
      )
    );
  });
}
export function appearanceAssets(look: CharacterAppearance) {
  return look.layers.map((layer) => ({
    key: layer.key,
    path: layer.path,
    frameWidth: 48,
    frameHeight: 48,
    width: 1248,
    height: 192,
    frames: 104,
    version: 2,
  }));
}
