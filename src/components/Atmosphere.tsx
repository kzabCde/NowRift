/** CSS-only bounded ambience: no extra animation loop, layout reads, or event listeners. */
export default function Atmosphere({ world = "forest" }: { world?: string }) {
  return (
    <div className={`menu-atmosphere atmosphere-${world}`} aria-hidden="true">
      <div className="mist-layer" />
      <div className="rune-halo" />
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 29 + 7) % 100}%`,
            animationDelay: `-${i * 0.83}s`,
            animationDuration: `${9 + (i % 5) * 2}s`,
          }}
        />
      ))}
    </div>
  );
}
