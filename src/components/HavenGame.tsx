"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GameBridge } from "@/game/bridge";
import {
  HAVEN,
  LANDMARKS,
  FARM,
  travelReason,
  type Point,
  type InteractionKind,
} from "@/game/world/content";
import { OUTFITS, type Outfit, type WorldCommand } from "@/game/world/save";
import type { HavenStart, HavenSnapshot } from "@/game/world/bridge";
import { profileRepository, uid } from "@/game/persistence/repository";
import type { SaveData } from "@/game/persistence/model";
import type { StageSelection } from "@/game/campaign/loader";
import { WORLDS, STAGES, type DifficultyId } from "@/game/campaign/content";
import { lockedReason } from "@/game/campaign/progression";
import {
  calculateStats,
  campaignLoadout,
  characterLevel,
  resolveEquippedWeapon,
} from "@/game/rpg/stats";
import CharacterPreview from "./CharacterPreview";
import EquippedWeapon from "./EquippedWeapon";
import { resolveAppearance } from "@/game/presentation/appearance";
import {
  APPEARANCE_CUSTOMIZATION,
  DEFAULT_CUSTOMIZATION,
  type AppearanceCustomization,
} from "@/game/presentation/customization";
import { committedWorldVisual } from "@/game/presentation/action-feedback";
import { audio } from "@/game/audio/engine";
import { storageError } from "@/game/persistence/status";
import { useI18n } from "@/i18n/useI18n";
import PhaserHost from "./PhaserHost";
import Image from "next/image";
import { ITEMS } from "@/game/rpg/content";
import SaveIndicator from "./SaveIndicator";
import LanguageSwitcher from "./LanguageSwitcher";
import RpgScreen, { ItemIcon } from "./RpgScreen";
import WorldMap from "./WorldMap";
import { Brand, Modal, Settings, DialogSurface } from "./GameUi";
import RiftTransition from "./RiftTransition";
import SanctuaryPanel from "./SanctuaryPanel";
import ProfileScreen from "./ProfileScreen";
import type { RunCheckpoint } from "@/game/persistence/checkpoint";
import { shortcutAllowed } from "@/game/navigation/flow";
import { ACTIVITIES } from "@/game/world/activities";
type Panel =
  | InteractionKind
  | "map"
  | "journal"
  | "settings"
  | "pause"
  | "campaign"
  | "tutorial"
  | "sanctuary"
  | "directory"
  | "profile"
  | null;
export default function HavenGame({
  slotId,
  onMenu,
  onAdventure,
  onRecovery,
  returning = false,
  onChanged,
}: {
  slotId: string;
  onMenu: (profiles?: boolean) => void;
  onAdventure: (stage: StageSelection) => void;
  onRecovery: (save: SaveData, checkpoint: RunCheckpoint) => void;
  returning?: boolean;
  onChanged: (save: SaveData) => void;
}) {
  const { t, text } = useI18n(),
    h = (key: Parameters<typeof t<"haven">>[1]) => t("haven", key),
    j = (key: Parameters<typeof t<"journey">>[1]) => t("journey", key);
  const bridge = useMemo(() => new GameBridge(), []),
    writer = useRef(uid()),
    sequence = useRef(0),
    busyRef = useRef(false),
    pending = useRef<Promise<unknown>>(Promise.resolve());
  const profileRef = useRef<SaveData | null>(null);
  const [p, setP] = useState<SaveData | null>(null),
    [initial, setInitial] = useState<HavenStart | null>(null),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [panels, setPanels] = useState<Exclude<Panel, null>[]>([]),
    [busy, setBusy] = useState(false),
    [outfit, setOutfit] = useState<Outfit>("moss"),
    [difficulty, setDifficulty] = useState<DifficultyId>("normal"),
    [atlasMode, setAtlasMode] = useState<"story" | "free">("story");
  const [customization, setCustomization] = useState<AppearanceCustomization>({
    ...DEFAULT_CUSTOMIZATION,
  });
  const panel = panels.at(-1) ?? null;
  const setPanel = (next: Panel) => setPanels(next ? [next] : []);
  const [revealed, setRevealed] = useState(false),
    [rendererError, setRendererError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [hud, setHud] = useState<HavenSnapshot>({
    position: { ...HAVEN.spawn },
    near: null,
    paused: false,
    moving: false,
    training: 0,
  });
  const current = useRef(hud);
  current.current = hud;
  const reload = useCallback(async () => {
    const next = await profileRepository.load(slotId);
    profileRef.current = next;
    setP(next);
    return next;
  }, [slotId]);
  useEffect(() => {
    let alive = true;
    profileRepository
      .load(slotId)
      .then(() =>
        profileRepository.world(slotId, {
          type: "enter",
          writer: writer.current,
        }),
      )
      .then((next) => {
        if (!alive) return;
        setP(next);
        profileRef.current = next;
        const w = next.local.world!;
        setOutfit(w.outfit);
        setCustomization({ ...(w.customization ?? DEFAULT_CUSTOMIZATION) });
        setInitial({
          session: writer.current,
          position: w.position,
          outfit: w.outfit,
          character: next.local.character,
          weapon: resolveEquippedWeapon(next),
          visualAppearance: resolveAppearance(next),
        });
        if (w.tutorial) setPanel("tutorial");
      })
      .catch((e) => {
        if (alive) setError(storageError(e));
      });
    return () => {
      alive = false;
    };
  }, [slotId]);
  const savePosition = useCallback(
    (position: Point) => {
      const command: WorldCommand = {
        type: "position",
        writer: writer.current,
        sequence: ++sequence.current,
        position,
      };
      pending.current = pending.current
        .then(() => profileRepository.world(slotId, command))
        .catch((e) => {
          setError(storageError(e));
          setPanel("pause");
        });
    },
    [slotId],
  );
  async function action(command: WorldCommand, message = "") {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await pending.current;
      const before = profileRef.current;
      const next = await profileRepository.world(slotId, command);
      profileRef.current = next;
      setP(next);
      const receipt = committedWorldVisual(before, next, command);
      if (receipt) bridge.emit("command", { type: "haven-feedback", receipt });
      if (message) setNotice(message);
      return next;
    } catch (e) {
      setError(storageError(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const off = [
      bridge.on("haven", setHud),
      bridge.on("ready", setReady),
      bridge.on("loading", setLoading),
      bridge.on("error", setRendererError),
      bridge.on("haven-save", savePosition),
      bridge.on("haven-shortcut", (name) =>
        setPanel(
          name === "inventory"
            ? "storage"
            : name === "quests"
              ? "journal"
              : name,
        ),
      ),
      bridge.on("interaction", ({ id, position }) => {
        const landmark = LANDMARKS.find((l) => l.id === id);
        if (!landmark || busyRef.current) return;
        bridge.emit("command", { type: "haven-lock", locked: true });
        void action({
          type: "visit",
          writer: writer.current,
          id,
          position,
        }).then((next) => {
          if (next) {
            audio.play(landmark.kind === "portal" ? "magic" : "confirm");
            setOutfit(next.local.world!.outfit);
            setCustomization({
              ...(next.local.world!.customization ?? DEFAULT_CUSTOMIZATION),
            });
            setPanel(landmark.kind);
          } else setPanel("pause");
        });
      }),
    ];
    return () => off.forEach((f) => f());
  }, [bridge, savePosition]);
  useEffect(() => {
    bridge.emit("command", {
      type: "haven-lock",
      locked: panel !== null || busy || !!error || !!rendererError || !revealed,
    });
  }, [panel, busy, error, rendererError, revealed, bridge, ready]);
  useEffect(() => {
    if (p && ready)
      bridge.emit("command", {
        type: "haven-equipment",
        character: p.local.character,
        weapon: resolveEquippedWeapon(p),
        visualAppearance: resolveAppearance(p),
      });
  }, [p, ready, bridge]);
  const close = useCallback(() => {
    setPanels((previous) => previous.slice(0, -1));
    void reload().catch((e) => setError(storageError(e)));
  }, [reload]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "h" ||
        !shortcutAllowed(event, event.target)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (panel === "sanctuary") close();
      else if (
        ready &&
        revealed &&
        !panel &&
        !busy &&
        !error &&
        !rendererError
      ) {
        bridge.emit("command", { type: "haven-lock", locked: true });
        savePosition(current.current.position);
        setPanels(["sanctuary"]);
      } else
        setNotice(
          t(
            "journey",
            "Sanctuary is available while freely exploring Rift Heaven. Close the current activity first.",
          ),
        );
    };
    window.addEventListener("keydown", keyboard, true);
    return () => window.removeEventListener("keydown", keyboard, true);
  }, [
    panel,
    ready,
    revealed,
    busy,
    error,
    rendererError,
    bridge,
    close,
    savePosition,
    t,
  ]);
  async function leave(profiles = false) {
    savePosition(current.current.position);
    await pending.current;
    onMenu(profiles);
  }
  async function travel(selection: StageSelection) {
    if (busyRef.current || !p) return;
    if (!resolveEquippedWeapon(p)) {
      setError(
        t("equipment", "Equip a weapon in Inventory before entering a stage."),
      );
      return;
    }
    const reason = travelReason(selection, p.clears);
    if (reason) {
      setError(reason);
      return;
    }
    const next = await action({ type: "travel", writer: writer.current });
    if (next) {
      audio.play("launch");
      onAdventure({
        ...selection,
        returnTo: "haven",
        startingHp: next.local.world!.hp,
        outfit: next.local.world!.outfit,
        ...campaignLoadout(next),
      });
    }
  }
  const w = p?.local.world,
    equipped = p ? resolveEquippedWeapon(p) : null,
    stats = p ? calculateStats(p, p.local.weapon, p.local.character) : null,
    near = LANDMARKS.find((l) => l.id === hud.near),
    stationTab =
      panel === "blacksmith"
        ? "blacksmith"
        : panel === "merchant" || panel === "crafting"
          ? "shop"
          : "inventory";
  const journal = () => (
    <>
      <span className="eyebrow">{h("Mara’s request")}</span>
      <h2>{h("A path home")}</h2>
      <p>
        {h(
          "Enter a forest expedition, gather supplies, and extract through its return portal.",
        )}
      </p>
      <p className="haven-objective">
        {h("Extract once from Whispering Forest")} ·{" "}
        {Math.min(1, w?.extractions ?? 0)}/1
      </p>
      <p>{h("Reward: 100 Gold + 2 Enhancement Stones")}</p>
      {w?.quest === "available" ? (
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            void action({ type: "accept", writer: writer.current })
          }
        >
          {h("Accept quest")}
        </button>
      ) : w?.quest === "completed" ? (
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            void action(
              { type: "claim", writer: writer.current },
              h("Quest rewards received."),
            )
          }
        >
          {h("Claim reward")}
        </button>
      ) : (
        <p className="eyebrow">
          {h(w?.quest === "claimed" ? "Claimed" : "Active")}
        </p>
      )}
      <p className="muted">
        {h(
          "No additional story chapters are included in this foundation release. The twenty campaign challenges remain available at the portal.",
        )}
      </p>
      <button
        className="quiet-button"
        onClick={() => setPanels((previous) => [...previous, "profile"])}
      >
        {h("Daily objectives and achievements")} →
      </button>
    </>
  );
  return (
    <main
      className={`haven-page ${revealed ? "world-revealed" : "world-loading"}`}
    >
      <div className="haven-canvas">
        {initial && (
          <PhaserHost
            key={attempt}
            bridge={bridge}
            world="haven"
            haven={initial}
          />
        )}
      </div>
      <header className="haven-topbar">
        <Brand />
        <div className="haven-title">
          <span className="eyebrow">{h("SAFE SANCTUARY")}</span>
          <h1>{j("Rift Heaven")}</h1>
        </div>
        <div className="haven-toolbar">
          <SaveIndicator />
          <LanguageSwitcher compact />
          <button onClick={() => void leave()}>{h("Menu")}</button>
        </div>
      </header>
      <aside className="haven-status" aria-label={j("Rift Heaven")}>
        {p && (
          <CharacterPreview
            character={p.local.character}
            outfit={w?.outfit ?? "moss"}
            weapon={equipped}
            profile={p}
            size={56}
            decorative
          />
        )}
        <div>
          <strong>{p?.local.name ?? "…"}</strong>
          <small>
            {h("Level")} {p ? characterLevel(p.xp).level : 1} · {h("Power")}{" "}
            {stats?.power ?? 0}
          </small>
          <div className="haven-hp">
            <i
              style={{
                width: `${stats ? Math.min(100, ((w?.hp ?? 1) / stats.maxHp) * 100) : 0}%`,
              }}
            />
          </div>
          <small>
            {Math.ceil(Math.min(w?.hp ?? 1, stats?.maxHp ?? 1))}/
            {stats?.maxHp ?? 100} HP · {p?.gold ?? 0} {h("Gold")}
          </small>
        </div>
      </aside>
      {w && w.quest !== "available" && w.quest !== "claimed" && (
        <button className="haven-tracker" onClick={() => setPanel("journal")}>
          <span>{h("A path home")}</span>
          <small>
            {h("Extract once from Whispering Forest")}{" "}
            {Math.min(1, w.extractions)}/1
          </small>
        </button>
      )}
      {p?.local.checkpoint && (
        <button className="haven-recovery" onClick={() => void leave(true)}>
          {h(
            "An interrupted run is available. Open Profiles & Saves to recover it.",
          )}
        </button>
      )}
      {(!revealed || rendererError) && (
        <RiftTransition
          home
          key={attempt}
          progress={loading}
          ready={ready && !!p}
          error={rendererError || error}
          returning={returning}
          onReveal={() => setRevealed(true)}
          onRetry={() => {
            if (!rendererError) location.reload();
            else {
              setRendererError("");
              setRevealed(false);
              setReady(false);
              setLoading(0);
              setAttempt((n) => n + 1);
            }
          }}
          onBack={() => onMenu()}
        />
      )}
      {notice && (
        <button
          className="haven-toast"
          role="status"
          onClick={() => setNotice("")}
        >
          {notice}
        </button>
      )}
      {error && (
        <div className="haven-error" role="alert">
          {text(error)}
          <button onClick={() => location.reload()}>{h("Retry")}</button>
          <button onClick={() => onMenu()}>{h("Return to launcher")}</button>
        </div>
      )}
      <nav className="haven-bottom">
        <button
          aria-label={j("Sanctuary")}
          onClick={() => setPanel("sanctuary")}
        >
          <span className="sanctuary-pixel" aria-hidden="true" />
          {j("Sanctuary")} <kbd>H</kbd>
        </button>
        <button
          aria-label={j("Activity Directory")}
          onClick={() => setPanel("directory")}
        >
          {j("Activity Directory")}
        </button>
        <button aria-label={h("Inventory")} onClick={() => setPanel("storage")}>
          {h("Inventory")} <kbd>I</kbd>
        </button>
        <button aria-label={h("Map")} onClick={() => setPanel("map")}>
          {h("Map")} <kbd>M</kbd>
        </button>
        <button aria-label={h("Journal")} onClick={() => setPanel("journal")}>
          {h("Journal")} <kbd>Q</kbd>
        </button>
        <button onClick={() => setPanel("settings")}>{h("Settings")}</button>
        <button aria-label={h("Paused")} onClick={() => setPanel("pause")}>
          {h("Paused")} <kbd>Esc</kbd>
        </button>
      </nav>
      {ready && revealed && !panel && !error && !rendererError && (
        <div className="haven-context">
          {near ? (
            <button
              className="haven-interact"
              onClick={() => bridge.emit("command", { type: "haven-interact" })}
            >
              <kbd>E</kbd>
              <span>{text(near.name)}</span>
              <small>{h("Interact")}</small>
            </button>
          ) : (
            <p>{h("Move closer to a station or NPC.")}</p>
          )}
        </div>
      )}
      {revealed && panel === "sanctuary" && p && (
        <SanctuaryPanel
          save={p}
          onClose={close}
          onMenu={() => void leave()}
          onAction={(name) => setPanels(["sanctuary", name])}
        />
      )}
      {revealed && panel === "directory" && (
        <Modal title={j("Activity Directory")} onClose={close}>
          <span className="eyebrow">
            {j("Find your way through the city.")}
          </span>
          <h2>{j("Activity Directory")}</h2>
          <p>
            {j(
              "Select a location to mark its entrance. Walk there to interact.",
            )}
          </p>
          <div className="activity-directory">
            {ACTIVITIES.map((activity) => (
              <article key={activity.id}>
                <span className="eyebrow">
                  {text(
                    LANDMARKS.find((l) => l.id === activity.landmark)!.name,
                  )}
                </span>
                <h3>{j(activity.name)}</h3>
                <p>{j(activity.description)}</p>
                <button
                  onClick={() => {
                    bridge.emit("command", {
                      type: "haven-locate",
                      id: activity.landmark,
                    });
                    setPanel(null);
                  }}
                >
                  {j("Mark entrance")} →
                </button>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {revealed && panel === "profile" && (
        <DialogSurface
          className="haven-screen-overlay"
          title={j("Daily activities & achievements")}
          onClose={close}
        >
          <ProfileScreen
            initialTab="daily"
            onBack={close}
            onChanged={(next) => {
              onChanged(next);
              if (next.local.id === slotId) setP(next);
              else void leave(true);
            }}
            onResume={(next, checkpoint) => {
              savePosition(current.current.position);
              void pending.current.then(() => onRecovery(next, checkpoint));
            }}
          />
        </DialogSurface>
      )}
      {revealed &&
        (panel === "storage" ||
          panel === "blacksmith" ||
          panel === "merchant" ||
          panel === "crafting") && (
          <DialogSurface
            className="haven-screen-overlay"
            title={text(
              LANDMARKS.find((l) => l.kind === panel)?.name ?? "Inventory",
            )}
            onClose={close}
          >
            <RpgScreen
              initialTab={stationTab}
              focusRecipes={panel === "crafting"}
              weapon={p?.local.weapon}
              character={p?.local.character}
              onCommitted={(receipt, progress) => {
                if (progress.local?.id === slotId) {
                  const saved = progress as SaveData;
                  profileRef.current = saved;
                  setP(saved);
                  onChanged(saved);
                }
                bridge.emit("command", { type: "haven-feedback", receipt });
              }}
              onBack={close}
            />
          </DialogSurface>
        )}
      {revealed && panel === "campaign" && (
        <DialogSurface
          className="haven-screen-overlay"
          title={h("Campaign challenges")}
          onClose={close}
        >
          <WorldMap
            initialMode={atlasMode}
            character={p!.local.character}
            onInventory={() => setPanels(["portal", "campaign", "storage"])}
            onBack={() => setPanel("portal")}
            onStart={(s) => void travel(s)}
          />
        </DialogSurface>
      )}
      {revealed && panel === "settings" && <Settings onClose={close} />}
      {revealed &&
        panel &&
        ![
          "storage",
          "blacksmith",
          "merchant",
          "crafting",
          "settings",
          "campaign",
          "sanctuary",
          "directory",
          "profile",
        ].includes(panel) && (
          <Modal
            title={
              panel === "npc"
                ? h("Mara · Rift Keeper")
                : panel === "map"
                  ? h("Town map")
                  : panel === "portal"
                    ? h("Portal Sanctuary")
                    : panel === "wardrobe"
                      ? h("Change appearance")
                      : panel === "pause"
                        ? h("Paused")
                        : panel === "tutorial"
                          ? h("A place to return to.")
                          : panel === "rest"
                            ? h("The Wayfarer’s Rest")
                            : panel === "training"
                              ? h("Training Grounds")
                              : panel === "treasure"
                                ? h("The Forgotten Cache")
                                : h("Journal")
            }
            onClose={close}
          >
            {panel === "tutorial" && (
              <>
                <h2>{h("A place to return to.")}</h2>
                <p>
                  {j(
                    "Walk with WASD or arrows, or drag on touch screens. E interacts. I opens inventory, M the map, Q your journal, and H Sanctuary.",
                  )}
                </p>
                <button
                  className="primary-button"
                  onClick={() =>
                    void action({
                      type: "tutorial",
                      writer: writer.current,
                    }).then(close)
                  }
                >
                  {h("Begin exploring")}
                </button>
              </>
            )}
            {(panel === "npc" ||
              panel === "journal" ||
              panel === "quest-board") && (
              <>
                {panel === "npc" && (
                  <p>
                    {t(
                      "journey",
                      "Welcome, {name}. The rifts once joined our worlds. Help me reopen the forest supply route, and you will always have a home here.",
                      { name: p?.local.name ?? "…" },
                    )}
                  </p>
                )}
                {journal()}
              </>
            )}
            {panel === "map" && (
              <>
                <h2>{h("Town map")}</h2>
                <div
                  className="haven-map"
                  role="img"
                  aria-label={h("Town map")}
                  style={{ backgroundImage: "url(/assets/haven/terrain.png)" }}
                >
                  {LANDMARKS.filter(
                    (l) =>
                      l.kind !== "treasure" || w?.discoveries.includes(l.id),
                  ).map((l) => (
                    <button
                      key={l.id}
                      title={text(l.name)}
                      style={{
                        left: `${(l.entrance.x / HAVEN.width) * 100}%`,
                        top: `${(l.entrance.y / HAVEN.height) * 100}%`,
                      }}
                      onClick={() => {
                        bridge.emit("command", {
                          type: "haven-locate",
                          id: l.id,
                        });
                        close();
                      }}
                    >
                      ◆
                    </button>
                  ))}
                  <i
                    style={{
                      left: `${(hud.position.x / HAVEN.width) * 100}%`,
                      top: `${(hud.position.y / HAVEN.height) * 100}%`,
                    }}
                    title={h("You are here")}
                  />
                </div>
                <div className="haven-map-list">
                  {LANDMARKS.filter(
                    (l) => l.kind !== "treasure" || w?.cacheClaimed,
                  ).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        bridge.emit("command", {
                          type: "haven-locate",
                          id: l.id,
                        });
                        close();
                      }}
                    >
                      {text(l.name)}
                      <small>
                        {h(
                          w?.discoveries.includes(l.id)
                            ? "Discovered"
                            : "Not visited",
                        )}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            )}
            {panel === "portal" && (
              <>
                <h2>{h("Travel through the rift")}</h2>
                {!equipped && (
                  <EquippedWeapon
                    weapon={null}
                    onInventory={() => setPanels(["portal", "storage"])}
                  />
                )}
                <p>
                  {h(
                    "Supply Expeditions are available in every world. Choose a map to gather resources and extract back to Rift Heaven.",
                  )}
                </p>
                <div className="haven-destinations">
                  {WORLDS.map((world) => (
                    <article key={world.id}>
                      <Image
                        unoptimized
                        width={180}
                        height={75}
                        src={`/assets/worlds/${world.id}/preview.png`}
                        alt=""
                      />
                      <strong>{text(world.name)}</strong>
                      <small>
                        {h("Recommended power")}:{" "}
                        {
                          STAGES.find((s) => s.id === world.id + "-1")!
                            .recommendedPower
                        }
                      </small>
                      {p &&
                        lockedReason(world.id + "-1", "normal", p.clears) && (
                          <small>
                            {text(
                              lockedReason(
                                world.id + "-1",
                                "normal",
                                p.clears,
                              )!,
                            )}
                          </small>
                        )}
                      <small>
                        {world.materials
                          .map((id) => text(ITEMS[id].name))
                          .join(" · ")}
                      </small>
                    </article>
                  ))}
                </div>
                <label className="setting-row">
                  {h("Farming Expedition")}
                  <select
                    value={difficulty}
                    onChange={(e) =>
                      setDifficulty(e.target.value as DifficultyId)
                    }
                    aria-label={h("Farming Expedition")}
                  >
                    {(["normal", "hard", "nightmare"] as const).map((d) => (
                      <option key={d} value={d}>
                        {h(
                          d === "normal"
                            ? "Normal"
                            : d === "hard"
                              ? "Hard"
                              : "Nightmare",
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {h(
                    "Extraction requires 20 seconds and 5 kills. Return to the portal near your starting point.",
                  )}
                </p>
                <p className="muted">
                  {h(
                    "Successful extraction banks enemy loot and gathered supplies. Defeat or abandonment loses unbanked loot. Your owned equipment is safe.",
                  )}
                </p>
                {p && lockedReason(FARM.stageId, difficulty, p.clears) && (
                  <p role="status">
                    {text(lockedReason(FARM.stageId, difficulty, p.clears)!)}
                  </p>
                )}
                <button
                  className="primary-button"
                  disabled={
                    busy ||
                    !equipped ||
                    !!(p && lockedReason(FARM.stageId, difficulty, p.clears))
                  }
                  onClick={() =>
                    p &&
                    void travel({
                      stageId: FARM.stageId,
                      activity: "farming",
                      difficulty,
                      seed: crypto.getRandomValues(new Uint32Array(1))[0],
                      clears: p.clears,
                    })
                  }
                >
                  {h(busy ? "Preparing travel…" : "Confirm travel")}
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    setAtlasMode("free");
                    setPanel("campaign");
                  }}
                >
                  {h("Choose any world for supplies")} →
                </button>
                <button
                  className="quiet-button"
                  onClick={() => {
                    setAtlasMode("story");
                    setPanel("campaign");
                  }}
                >
                  {h("Campaign challenges")} →
                </button>
                <p className="muted">
                  {h(
                    "World exploration and dungeons are planned for later slices.",
                  )}
                </p>
              </>
            )}
            {panel === "wardrobe" && (
              <>
                <h2>{h("Change appearance")}</h2>
                {p && (
                  <CharacterPreview
                    character={p.local.character}
                    outfit={outfit}
                    weapon={equipped}
                    profile={p}
                    appearance={resolveAppearance(
                      p,
                      p.local.character,
                      outfit,
                      customization,
                    )}
                    size={144}
                  />
                )}
                <p>{h("Cloak palette")}</p>
                <div className="haven-outfits">
                  {OUTFITS.map((o) => (
                    <button
                      key={o}
                      aria-pressed={outfit === o}
                      onClick={() => setOutfit(o)}
                    >
                      {h(
                        o === "moss"
                          ? "Moss"
                          : o === "ember"
                            ? "Ember"
                            : "Tide",
                      )}
                    </button>
                  ))}
                </div>
                {(
                  Object.keys(
                    APPEARANCE_CUSTOMIZATION,
                  ) as (keyof AppearanceCustomization)[]
                ).map((category) => (
                  <label className="setting-row" key={category}>
                    {t(
                      "visual",
                      category === "skin"
                        ? "Skin tone"
                        : category === "hair"
                          ? "Hair style"
                          : "Face detail",
                    )}
                    <select
                      value={customization[category]}
                      aria-label={t(
                        "visual",
                        category === "skin"
                          ? "Skin tone"
                          : category === "hair"
                            ? "Hair style"
                            : "Face detail",
                      )}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (
                          (
                            APPEARANCE_CUSTOMIZATION[
                              category
                            ] as readonly string[]
                          ).includes(value)
                        )
                          setCustomization((previous) => ({
                            ...previous,
                            [category]: value,
                          }));
                      }}
                    >
                      {APPEARANCE_CUSTOMIZATION[category].map((value) => (
                        <option key={value} value={value}>
                          {t(
                            "visual",
                            (
                              {
                                warm: "Warm",
                                umber: "Umber",
                                pale: "Pale",
                                short: "Short",
                                braid: "Braid",
                                crest: "Crest",
                                calm: "Calm",
                                scar: "Scar",
                                vigil: "Vigil",
                              } as const
                            )[value],
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <p className="muted">
                  {t(
                    "visual",
                    "Headwear may cover your hair; remove the equipped helmet to see the full style.",
                  )}
                </p>
                <p>
                  {h(
                    "Cosmetic only. Your class, equipment and combat stats stay the same.",
                  )}
                </p>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      {
                        type: "appearance",
                        writer: writer.current,
                        outfit,
                        customization,
                      },
                      h("Appearance saved."),
                    ).then((next) => {
                      if (next) {
                        bridge.emit("command", { type: "haven-look", outfit });
                        close();
                      }
                    })
                  }
                >
                  {h("Save appearance")}
                </button>
                <button
                  className="quiet-button"
                  onClick={() => {
                    setOutfit(w?.outfit ?? "moss");
                    setCustomization({
                      ...(w?.customization ?? DEFAULT_CUSTOMIZATION),
                    });
                  }}
                >
                  {h("Revert")}
                </button>
              </>
            )}
            {panel === "rest" && (
              <>
                <h2>{h("The Wayfarer’s Rest")}</h2>
                <p>
                  {h(
                    "Rest restores your haven health. Your next expedition starts with that health.",
                  )}
                </p>
                <p>
                  {Math.ceil(w?.hp ?? 1)} / {stats?.maxHp} HP
                </p>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      { type: "rest", writer: writer.current },
                      h("Rested. Your journey is saved."),
                    )
                  }
                >
                  {h("Rest and save")}
                </button>
              </>
            )}
            {panel === "treasure" && (
              <>
                <h2>{h("The Forgotten Cache")}</h2>
                <ItemIcon id="wood" />
                <p>
                  {h(
                    w?.cacheClaimed
                      ? "The cache is empty. Its supplies are already yours."
                      : "30 Gold + 2 Wood. Collected once per character.",
                  )}
                </p>
                <button
                  className="primary-button"
                  disabled={busy || w?.cacheClaimed}
                  onClick={() =>
                    void action(
                      { type: "treasure", writer: writer.current },
                      h("Supplies collected."),
                    )
                  }
                >
                  {h("Open cache")}
                </button>
              </>
            )}
            {panel === "training" && (
              <div className="haven-training">
                <h2>{h("Training Grounds")}</h2>
                <p>{h("This target resets freely and grants no rewards.")}</p>
                <strong>
                  {h("Damage dealt")}: {Math.round(hud.training)}
                </strong>
                <EquippedWeapon
                  weapon={equipped}
                  onInventory={() => setPanels(["training", "storage"])}
                />
                <button
                  className="primary-button"
                  disabled={!equipped}
                  onClick={() => bridge.emit("command", { type: "haven-test" })}
                >
                  {t("equipment", "Test equipped weapon")}
                </button>
              </div>
            )}
            {panel === "pause" && (
              <>
                <h2>{h("Paused")}</h2>
                <p>{h("The haven will wait.")}</p>
                <button className="primary-button" onClick={close}>
                  {h("Resume")}
                </button>
                <button className="quiet-button" onClick={() => void leave()}>
                  {h("Return to launcher")}
                </button>
              </>
            )}
          </Modal>
        )}
    </main>
  );
}
