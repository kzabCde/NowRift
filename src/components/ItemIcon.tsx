import { ITEMS } from "@/game/rpg/content";
export default function ItemIcon({
  id,
  size = 40,
}: {
  id: string;
  size?: number;
}) {
  const icon = ITEMS[id]?.icon ?? 42;
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
