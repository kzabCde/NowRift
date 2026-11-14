"use client";
import { useSettings } from "@/state/settings";
import { keyHint } from "@/game/input/bindings";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { WildernessNavigation } from "@/game/world/wilderness-map";
import type { SaveData } from "@/game/persistence/model";
import { defaultWorld } from "@/game/world/save";
import { regionById, type RegionId } from "@/game/world/regions";
import { useI18n } from "@/i18n/useI18n";
import { DialogSurface } from "./GameUi";
import MapViewport from "./MapViewport";
import ThailandOverview from "./ThailandOverview";
import WildernessSurface from "./WildernessSurface";

export default function ExpeditionAtlas({
  navigation,
  progress,
  open,
  disabled,
  onOpen,
  onClose,
  onTarget,
}: {
  navigation: WildernessNavigation;
  progress: SaveData | null;
  open: boolean;
  disabled: boolean;
  onOpen: () => void;
  onClose: () => void;
  onTarget: (id: string | null) => void;
}) {
  const prefs = useSettings();
  const { text } = useI18n(),
    [mode, setMode] = useState<"local" | "world">("local"),
    [selected, setSelected] = useState<string>(
      navigation.target ?? navigation.markers[0]?.id ?? "",
    ),
    [selectedRegion, setSelectedRegion] = useState<RegionId>(navigation.region);
  const target = navigation.markers.find((m) => m.id === navigation.target),
    marker = navigation.markers.find((m) => m.id === selected),
    world = progress?.local.world ?? defaultWorld();
  const bearing = target
    ? (Math.atan2(
        target.y - navigation.position.y,
        target.x - navigation.position.x,
      ) *
        180) /
        Math.PI +
      90
    : 0;
  return (
    <>
      <aside
        className={`regional-minimap expedition-minimap ${navigation.free ? "free-minimap" : "story-minimap"}`}
        aria-label={text("Expedition minimap")}
      >
        <button
          className="regional-minimap-open"
          aria-label={text("Open map")}
          onClick={onOpen}
          disabled={disabled || open}
        >
          <WildernessSurface navigation={navigation} mini />
          <span>
            <b>{text(regionById(navigation.region).name)}</b>
            <kbd>{keyHint(prefs, "map")}</kbd>
          </span>
        </button>
        {target && (
          <div className="minimap-destination">
            <i
              style={{ transform: `rotate(${bearing}deg)` }}
              aria-hidden="true"
            >
              ↑
            </i>
            <span>
              {text(target.name)}
              <small>{text("Direction only · follow walkable ground")}</small>
            </span>
          </div>
        )}
      </aside>
      {open &&
        createPortal(
          <div className="expedition-atlas-backdrop">
            <DialogSurface
              className="expedition-atlas-dialog"
              title={text("Expedition map")}
              onClose={onClose}
            >
              <div className="atlas-dialog-heading">
                <button
                  className="quiet-button"
                  onClick={onClose}
                  aria-label={text("Close map")}
                >
                  ×
                </button>
              </div>
              <section className="unified-atlas expedition-atlas">
                <span className="eyebrow">
                  {text(regionById(navigation.region).name)}
                </span>
                <h2>{text("Expedition map")}</h2>
                <div
                  className="atlas-mode-tabs"
                  role="group"
                  aria-label={text("Map view")}
                >
                  <button
                    aria-pressed={mode === "local"}
                    onClick={() => setMode("local")}
                  >
                    {text("Local map")}
                  </button>
                  <button
                    aria-pressed={mode === "world"}
                    onClick={() => setMode("world")}
                  >
                    {text("Thailand world map")}
                  </button>
                </div>
                {mode === "local" ? (
                  <>
                    <MapViewport
                      key={`wilderness-${navigation.stageId}`}
                      ratio={navigation.layout.width / navigation.layout.height}
                      center={{
                        x: navigation.position.x / navigation.layout.width,
                        y: navigation.position.y / navigation.layout.height,
                      }}
                    >
                      <WildernessSurface
                        navigation={navigation}
                        selected={selected}
                        onSelect={setSelected}
                      />
                    </MapViewport>
                    <div className="atlas-legend">
                      <span>◆ {text("Resources")}</span>
                      <span>↗ {text("Return portal")}</span>
                      <span>! {text("Mission objectives")}</span>
                    </div>
                    <div
                      className="atlas-wilderness-locations"
                      role="group"
                      aria-label={text("Expedition locations")}
                    >
                      {navigation.markers.map((m) => (
                        <button
                          key={m.id}
                          aria-pressed={selected === m.id}
                          onClick={() => setSelected(m.id)}
                        >
                          {text(m.name)}
                          {m.complete ? ` · ${text("Gathered")}` : ""}
                        </button>
                      ))}
                    </div>
                    {marker && (
                      <article className="atlas-region-detail">
                        <h3>{text(marker.name)}</h3>
                        {marker.complete && <p>{text("Gathered")}</p>}
                        <button
                          className="primary-button"
                          disabled={disabled}
                          onClick={() => onTarget(marker.id)}
                        >
                          {text("Set destination")} →
                        </button>
                        <small>
                          {text(
                            "Direction markers indicate a destination, not a verified path through obstacles.",
                          )}
                        </small>
                      </article>
                    )}
                    {target && (
                      <button
                        className="quiet-button"
                        disabled={disabled}
                        onClick={() => onTarget(null)}
                      >
                        {text("Clear destination")}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <MapViewport
                      key="wilderness-world"
                      ratio={800 / 840}
                      center={{
                        x: regionById(navigation.region).overview.x / 800,
                        y: regionById(navigation.region).overview.y / 840,
                      }}
                      onCenter={() => setSelectedRegion(navigation.region)}
                    >
                      <ThailandOverview
                        world={world}
                        playerRegion={navigation.region}
                        selection={selectedRegion}
                        clears={progress?.clears ?? []}
                        legacy={progress?.local.journal?.legacyAccess ?? []}
                        journal={progress?.local.journal}
                        onSelect={setSelectedRegion}
                      />
                    </MapViewport>
                    <article className="atlas-region-detail">
                      <h3>{text(regionById(selectedRegion).name)}</h3>
                      <p>{text(regionById(selectedRegion).story)}</p>
                      <p>
                        {text("Return to the city before using fast travel.")}
                      </p>
                    </article>
                  </>
                )}
              </section>
            </DialogSurface>
          </div>,
          document.body,
        )}
    </>
  );
}
