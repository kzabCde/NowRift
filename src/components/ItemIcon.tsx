import { ITEMS } from "@/game/rpg/content";
import type { VisualWeapon } from "@/game/presentation/weapon-visual";
import WeaponSprite from "./WeaponSprite";
import { wearableIcon } from "@/game/presentation/wearables";
export default function ItemIcon({
  id,
  size = 40,
  weapon,
}: {
  id: string;
  size?: number;
  weapon?: VisualWeapon;
}) {
  if (weapon && ITEMS[weapon.definitionId]?.weapon)
    return <WeaponSprite weapon={weapon} size={size} className="rpg-icon" />;
  const icon = ITEMS[id]?.icon ?? 42;
  const wearable = wearableIcon(id);
  if (wearable)
    return (
      <span
        aria-hidden="true"
        className="rpg-icon"
        data-wearable-frame={wearable.frame}
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${wearable.path})`,
          backgroundSize: `${size * wearable.columns}px ${size * wearable.rows}px`,
          backgroundPosition: `-${(wearable.frame % 4) * size}px -${Math.floor(wearable.frame / 4) * size}px`,
        }}
      />
    );
  return (
    <span
      aria-hidden="true"
      className="rpg-icon"
      style={{
        width: size,
        height: size,
        backgroundSize: `${size * 8}px ${size * 6}px`,
        backgroundPosition: `-${(icon % 8) * size}px -${Math.floor(icon / 8) * size}px`,
      }}
    />
  );
}
