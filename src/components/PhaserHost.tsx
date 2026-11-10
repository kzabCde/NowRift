"use client";
import { useEffect, useRef } from "react";
import type { GameBridge } from "@/game/bridge";
export default function PhaserHost({ bridge }: { bridge: GameBridge }) {
  const parent = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    import("@/game/phaser/create-game")
      .then(({ createGame }) => {
        if (cancelled || !parent.current) return;
        const game = createGame(parent.current, bridge);
        destroy = () => {
          game.destroy(true);
        };
      })
      .catch(() => {
        if (!cancelled)
          bridge.emit(
            "error",
            "The game renderer could not start. Reload to retry, or enable browser graphics acceleration.",
          );
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [bridge]);
  return (
    <div
      ref={parent}
      className="phaser-host"
      data-testid="phaser-host"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
