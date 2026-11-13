"use client";
import type { CSSProperties } from "react";
import { CHARACTERS, type CharacterId } from "@/game/loadout";
import type { Outfit } from "@/game/world/save";
import type { WeaponSnapshot } from "@/game/rpg/model";
import type { Progress } from "@/game/campaign/progression";
import {
  ANIMATIONS,
  animationDuration,
  type AnimationPose,
} from "@/game/presentation/animation";
import {
  defaultAppearance,
  resolveAppearance,
  type CharacterAppearance,
} from "@/game/presentation/appearance";
import {
  CHARACTER_ART,
  WEAPON_ART,
  handPoint,
  weaponRestAngle,
} from "@/game/presentation/character";
import { RARITIES } from "@/game/rpg/content";
import { useI18n } from "@/i18n/useI18n";
import { resolveWeaponVisual } from "@/game/presentation/weapon-visual";
import { useSettings } from "@/state/settings";
import WeaponSprite from "./WeaponSprite";
/** Uses the same modular atlases, source frame tracks and hand anchors as Phaser. */
export default function CharacterPreview({
  character,
  outfit = "moss",
  weapon,
  profile,
  appearance,
  pose = "idle",
  actionKey,
  size = 96,
  decorative = false,
  className = "",
}: {
  character: CharacterId;
  outfit?: Outfit;
  weapon: WeaponSnapshot | null;
  profile?: Progress;
  appearance?: CharacterAppearance;
  pose?: AnimationPose;
  actionKey?: string;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const { text, t } = useI18n();
  const look =
    appearance ??
    (profile
      ? resolveAppearance(profile, character, outfit)
      : defaultAppearance(character, outfit));
  const track = ANIMATIONS[pose],
    first = track.frames[0],
    last = track.frames.at(-1)!;
  const hand = handPoint(character, "down", false, first),
    pixel = size / CHARACTER_ART.size,
    weaponSize = WEAPON_ART.size * pixel;
  const visual = resolveWeaponVisual(weapon),
    frame = visual?.frame ?? null;
  const reduced = useSettings((s) => s.reducedEffects || s.quality === "low");
  const tool =
    pose === "mine"
      ? 15
      : pose === "craft"
        ? 16
        : pose === "gather"
          ? 17
          : null;
  const animation = {
    "--actor-size": `${size}px`,
    "--actor-pixel": `${pixel}px`,
    "--held-angle": `${weaponRestAngle("down")}rad`,
    "--actor-first": `${-first * size}px`,
    "--actor-last": `${-(track.loop ? last + 1 : last) * size}px`,
    "--actor-duration": `${animationDuration(pose)}ms`,
    "--actor-steps": track.loop
      ? track.frames.length
      : Math.max(1, track.frames.length - 1),
    "--actor-repeat": track.loop ? "infinite" : "1",
    "--weapon-color": weapon ? RARITIES[weapon.rarity].color : "transparent",
    width: size,
    height: size,
  } as CSSProperties;
  return (
    <span
      key={`${look.appearanceKey}:${pose}:${actionKey ?? ""}`}
      className={`character-preview ${className}`}
      style={animation}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative
          ? undefined
          : `${text(CHARACTERS[character].name)} · ${weapon ? text(weapon.name) : t("equipment", "Empty weapon slot")}`
      }
      data-character={character}
      data-appearance-key={look.appearanceKey}
      data-weapon-instance={weapon?.instanceId ?? ""}
      data-weapon-frame={frame ?? ""}
      data-weapon-tier={visual?.tier ?? ""}
      data-pose={pose}
    >
      <span className="actor-shadow" />
      {look.layers.map((layer) => (
        <span
          key={layer.slot}
          className="actor-layer"
          data-visual-layer={layer.slot}
          data-definition-id={layer.definitionId}
          data-instance-id={layer.instanceId}
          data-asset-key={layer.key}
          style={{
            backgroundImage: `url(${layer.path})`,
            backgroundSize: `${size * CHARACTER_ART.columns}px ${size * 4}px`,
            zIndex: layer.z,
          }}
        />
      ))}
      {tool !== null && (
        <span
          className="actor-weapon"
          style={{
            width: weaponSize,
            height: weaponSize,
            backgroundImage: "url(/assets/characters/weapons.png)",
            backgroundSize: `${weaponSize * WEAPON_ART.columns}px ${weaponSize}px`,
            backgroundPosition: `-${tool * weaponSize}px 0`,
            left: (24 + hand.x) * pixel,
            top: (36 + hand.y) * pixel,
            zIndex: 13,
          }}
        />
      )}
      {tool === null && weapon && (
        <WeaponSprite
          weapon={weapon}
          size={weaponSize}
          className="actor-weapon"
          style={{
            left: (24 + hand.x) * pixel,
            top: (36 + hand.y) * pixel,
            zIndex: 13,
          }}
        />
      )}
      {visual && visual.tier >= 2 && !reduced && (
        <span className="actor-enchantment" />
      )}
    </span>
  );
}
