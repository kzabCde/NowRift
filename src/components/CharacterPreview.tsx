"use client";
import type { CharacterId } from "@/game/loadout";
import { CHARACTERS } from "@/game/loadout";
import type { Outfit } from "@/game/world/save";
import type { WeaponSnapshot } from "@/game/rpg/model";
import { bodyPath, handPoint } from "@/game/presentation/character";
import { RARITIES } from "@/game/rpg/content";
import { useI18n } from "@/i18n/useI18n";
/** Same body atlas, equipment atlas and hand anchors as CharacterRig; never a composite character image. */
export default function CharacterPreview({
  character,
  outfit = "moss",
  weapon,
  size = 96,
  decorative = false,
  className = "",
}: {
  character: CharacterId;
  outfit?: Outfit;
  weapon: WeaponSnapshot | null;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const { text, t } = useI18n(),
    hand = handPoint(character, "down");
  return (
    <span
      className={`character-preview ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative
          ? undefined
          : `${text(CHARACTERS[character].name)} · ${weapon ? text(weapon.name) : t("equipment", "Empty weapon slot")}`
      }
      data-character={character}
      data-weapon-instance={weapon?.instanceId ?? ""}
      data-weapon-frame={weapon?.frame ?? ""}
      style={
        {
          width: size,
          height: size,
          "--actor-size": `${size}px`,
          "--actor-pixel": `${size / 32}px`,
          "--weapon-color": weapon
            ? RARITIES[weapon.rarity].color
            : "transparent",
        } as React.CSSProperties
      }
    >
      <span className="actor-shadow" />
      <span
        className="actor-body"
        style={{
          backgroundImage: `url(${bodyPath(character, outfit)})`,
          backgroundSize: `${size * 12}px ${size * 4}px`,
        }}
      />
      {weapon && (
        <span
          className="actor-weapon"
          style={{
            backgroundImage: "url(/assets/characters/weapons.png)",
            backgroundSize: `${size * 6}px ${size}px`,
            backgroundPosition: `-${weapon.frame * size}px 0`,
            left: ((16 + hand.x) / 32) * size,
            top: ((24 + hand.y) / 32) * size,
          }}
        />
      )}
      {weapon && weapon.enhancement > 0 && (
        <span className="actor-enchantment" />
      )}
    </span>
  );
}
