import type { ReactNode } from "react";

/** The minimap and tracked quest share one normal-flow column in both worlds. */
export default function HudRail({ children }: { children: ReactNode }) {
  return <div className="hud-rail">{children}</div>;
}
