"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useI18n } from "@/i18n/useI18n";
type View = { zoom: number; x: number; y: number };
type Pointer = { x: number; y: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Pointer gestures share one bounded transform. No animation loop or game input handlers. */
export default function MapViewport({
  children,
  ratio,
  center,
  onCenter,
  className = "",
}: {
  children: ReactNode;
  ratio: number;
  center: { x: number; y: number };
  onCenter?: () => void;
  className?: string;
}) {
  const { text } = useI18n(),
    element = useRef<HTMLDivElement>(null),
    pointers = useRef(new Map<number, Pointer>()),
    origin = useRef<{ view: View; points: Pointer[] } | null>(null),
    dragged = useRef(false);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const limit = (v: View) => {
    const b = element.current?.getBoundingClientRect();
    return {
      ...v,
      x: clamp(
        v.x,
        (-(v.zoom - 1) * (b?.width ?? 0)) / 2,
        ((v.zoom - 1) * (b?.width ?? 0)) / 2,
      ),
      y: clamp(
        v.y,
        (-(v.zoom - 1) * (b?.height ?? 0)) / 2,
        ((v.zoom - 1) * (b?.height ?? 0)) / 2,
      ),
    };
  };
  const zoomAt = (factor: number, point?: Pointer) =>
    setView((v) => {
      const b = element.current?.getBoundingClientRect(),
        z = clamp(v.zoom * factor, 1, 4),
        r = z / v.zoom,
        px = point ? point.x - (b?.left ?? 0) - (b?.width ?? 0) / 2 : 0,
        py = point ? point.y - (b?.top ?? 0) - (b?.height ?? 0) / 2 : 0;
      return limit({ zoom: z, x: px - (px - v.x) * r, y: py - (py - v.y) * r });
    });
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const b = node.getBoundingClientRect();
      setView((v) => {
        const z = clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), 1, 4),
          r = z / v.zoom,
          px = e.clientX - b.left - b.width / 2,
          py = e.clientY - b.top - b.height / 2;
        return {
          zoom: z,
          x: clamp(
            px - (px - v.x) * r,
            (-(z - 1) * b.width) / 2,
            ((z - 1) * b.width) / 2,
          ),
          y: clamp(
            py - (py - v.y) * r,
            (-(z - 1) * b.height) / 2,
            ((z - 1) * b.height) / 2,
          ),
        };
      });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);
  const recenter = () => {
    const b = element.current?.getBoundingClientRect();
    setView(
      limit({
        zoom: 2,
        x: (0.5 - center.x) * (b?.width ?? 0) * 2,
        y: (0.5 - center.y) * (b?.height ?? 0) * 2,
      }),
    );
    onCenter?.();
  };
  return (
    <div className="atlas-viewport-wrap">
      <div
        className={`atlas-viewport ${className}`}
        ref={element}
        style={{ aspectRatio: ratio, maxWidth: `calc(54dvh * ${ratio})` }}
        tabIndex={0}
        role="group"
        aria-label={text("Interactive map canvas")}
        data-zoom={view.zoom.toFixed(2)}
        data-pan-x={view.x.toFixed(1)}
        data-pan-y={view.y.toFixed(1)}
        onPointerDown={(e) => {
          const marker = (e.target as Element).closest("button");
          if (!marker) {
            e.preventDefault();
            element.current?.setPointerCapture(e.pointerId);
          }
          e.stopPropagation();
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          origin.current = { view, points: [...pointers.current.values()] };
          dragged.current = false;
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId) || !origin.current) return;
          e.preventDefault();
          e.stopPropagation();
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const values = [...pointers.current.values()],
            start = origin.current;
          if (values.length === 1 && start.points.length === 1) {
            const dx = values[0].x - start.points[0].x,
              dy = values[0].y - start.points[0].y;
            if (Math.hypot(dx, dy) > 4) {
              dragged.current = true;
              element.current?.setPointerCapture(e.pointerId);
            }
            setView(
              limit({
                ...start.view,
                x: start.view.x + dx,
                y: start.view.y + dy,
              }),
            );
          } else if (values.length >= 2 && start.points.length >= 2) {
            dragged.current = true;
            const b = element.current!.getBoundingClientRect(),
              c = {
                x: (values[0].x + values[1].x) / 2 - b.left - b.width / 2,
                y: (values[0].y + values[1].y) / 2 - b.top - b.height / 2,
              },
              o = {
                x:
                  (start.points[0].x + start.points[1].x) / 2 -
                  b.left -
                  b.width / 2,
                y:
                  (start.points[0].y + start.points[1].y) / 2 -
                  b.top -
                  b.height / 2,
              },
              distance = Math.max(
                1,
                Math.hypot(
                  start.points[0].x - start.points[1].x,
                  start.points[0].y - start.points[1].y,
                ),
              ),
              z = clamp(
                (start.view.zoom *
                  Math.hypot(
                    values[0].x - values[1].x,
                    values[0].y - values[1].y,
                  )) /
                  distance,
                1,
                4,
              ),
              r = z / start.view.zoom;
            setView(
              limit({
                zoom: z,
                x: c.x - (o.x - start.view.x) * r,
                y: c.y - (o.y - start.view.y) * r,
              }),
            );
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (element.current?.hasPointerCapture(e.pointerId))
            element.current.releasePointerCapture(e.pointerId);
          origin.current = pointers.current.size
            ? { view, points: [...pointers.current.values()] }
            : null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          origin.current = null;
        }}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
            dragged.current = false;
          }
        }}
        onKeyDown={(e) => {
          if ((e.target as Element).closest("button")) return;
          const moves: Record<string, Pointer> = {
            ArrowLeft: { x: 60, y: 0 },
            ArrowRight: { x: -60, y: 0 },
            ArrowUp: { x: 0, y: 60 },
            ArrowDown: { x: 0, y: -60 },
          };
          if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoomAt(1.3);
          } else if (e.key === "-") {
            e.preventDefault();
            zoomAt(1 / 1.3);
          } else if (moves[e.key]) {
            e.preventDefault();
            const d = moves[e.key];
            setView((v) => limit({ ...v, x: v.x + d.x, y: v.y + d.y }));
          }
        }}
      >
        <div
          className="atlas-viewport-content"
          style={
            {
              transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})`,
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
      <div
        className="atlas-map-controls"
        role="group"
        aria-label={text("Map controls")}
      >
        <button
          onClick={() => zoomAt(1.3)}
          aria-label={text("Zoom in")}
          disabled={view.zoom >= 4}
        >
          +
        </button>
        <output aria-label={text("Map zoom")}>
          {Math.round(view.zoom * 100)}%
        </output>
        <button
          onClick={() => zoomAt(1 / 1.3)}
          aria-label={text("Zoom out")}
          disabled={view.zoom <= 1}
        >
          −
        </button>
        <button onClick={recenter}>{text("Center on player")}</button>
        <button onClick={() => setView({ zoom: 1, x: 0, y: 0 })}>
          {text("Fit map")}
        </button>
      </div>
      <p className="atlas-gesture-hint">
        {text("Drag to pan · wheel or pinch to zoom · + / − and arrow keys")}
      </p>
    </div>
  );
}
