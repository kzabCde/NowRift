"use client";
import type { WeaponSnapshot } from "@/game/rpg/model";
import { RARITIES } from "@/game/rpg/content";
import { useI18n } from "@/i18n/useI18n";
import ItemIcon from "./ItemIcon";
import { attackRange } from "@/game/content/forest";
import {
  resolveWeaponVisual,
  nextEvolution,
  EVOLUTION_TIERS,
} from "@/game/presentation/weapon-visual";
export default function EquippedWeapon({
  weapon,
  onInventory,
}: {
  weapon: WeaponSnapshot | null;
  onInventory?: () => void;
}) {
  const { t, text } = useI18n();
  const visual = resolveWeaponVisual(weapon),
    next = weapon ? nextEvolution(weapon.enhancement) : null;
  return (
    <section
      className="equipped-weapon"
      aria-label={t("equipment", "Equipped weapon")}
      data-weapon-instance={weapon?.instanceId ?? ""}
    >
      <span className="eyebrow">{t("equipment", "Equipped weapon")}</span>
      {weapon ? (
        <>
          <div className="equipped-weapon-title">
            <ItemIcon id={weapon.definitionId} weapon={weapon} />
            <div>
              <strong style={{ color: RARITIES[weapon.rarity].color }}>
                {text(weapon.name)} +{weapon.enhancement}
              </strong>
              <small>
                {text(RARITIES[weapon.rarity].name)} ·{" "}
                {t(
                  "equipment",
                  weapon.family === "staff"
                    ? "Staff"
                    : weapon.family === "sword"
                      ? "Sword"
                      : weapon.family === "scepter"
                        ? "Scepter"
                        : "Glaive",
                )}
              </small>
            </div>
          </div>
          {visual && (
            <small className="weapon-evolution-label">
              {text(EVOLUTION_TIERS[visual.tier])} ·{" "}
              {next ? (
                <>
                  {t("equipment", "Next evolution")} +{next.enhancement}
                </>
              ) : (
                t("equipment", "Final evolution")
              )}
            </small>
          )}
          <p>
            {t("equipment", "Damage")} {weapon.stats.damage.toFixed(1)} ·{" "}
            {t("equipment", "Attack interval")}{" "}
            {weapon.stats.interval.toFixed(2)}s · {t("equipment", "Range")}{" "}
            {Math.round(
              attackRange(
                weapon.attack,
                weapon.attack.range,
                weapon.stats.area,
              ),
            )}
          </p>
        </>
      ) : (
        <p>{t("equipment", "Empty weapon slot")}</p>
      )}
      {onInventory && (
        <button className="quiet-button" onClick={onInventory}>
          {t("equipment", weapon ? "Open Inventory" : "Equip Weapon")} →
        </button>
      )}
    </section>
  );
}
