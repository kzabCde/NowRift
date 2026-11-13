"use client";
import { useState, type CSSProperties } from "react";
import {
  resolveWeaponVisual,
  type VisualWeapon,
} from "@/game/presentation/weapon-visual";
import { useI18n } from "@/i18n/useI18n";

/** Integer atlas cropping shared by icons, held layers and milestone comparisons. */
export default function WeaponSprite({
  weapon,
  size = 64,
  className = "",
  style,
}: {
  weapon: VisualWeapon;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const visual = resolveWeaponVisual(weapon);
  const [failed, setFailed] = useState<"evolution" | "legacy" | null>(null);
  const { t } = useI18n();
  if (!visual) return null;
  const source = failed ? visual.fallback : visual;
  return (
    <span
      aria-hidden="true"
      className={`weapon-sprite ${className}`}
      data-weapon-asset={source.key}
      data-weapon-frame={source.frame}
      data-weapon-tier={visual.tier}
      data-weapon-instance={visual.instanceId}
      data-weapon-fallback={failed ?? undefined}
      title={
        failed === "legacy"
          ? t("equipment", "Weapon art unavailable.")
          : failed
            ? t(
                "equipment",
                "Original appearance unavailable; showing base weapon.",
              )
            : undefined
      }
      style={
        {
          width: size,
          height: size,
          "--weapon-accent": visual.rarityAccent,
          ...style,
        } as CSSProperties
      }
    >
      {failed !== "legacy" && (
        // Exact pixel atlas; Next image optimization must not resample its cells.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source.path}
          alt=""
          draggable={false}
          onError={() => setFailed(failed ? "legacy" : "evolution")}
          style={{
            position: "absolute",
            width: size * source.columns,
            height: size * source.rows,
            maxWidth: "none",
            left: -(source.frame % source.columns) * size,
            top: -Math.floor(source.frame / source.columns) * size,
          }}
        />
      )}
      {failed === "legacy" && <span className="weapon-art-missing">?</span>}
    </span>
  );
}
