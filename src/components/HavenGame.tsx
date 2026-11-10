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
} from "@/game/rpg/stats";
import { WEAPONS } from "@/game/content/forest";
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
type Panel =
  | InteractionKind
  | "map"
  | "journal"
  | "settings"
  | "pause"
  | "campaign"
  | "tutorial"
  | null;
export default function HavenGame({
  slotId,
  onMenu,
  onAdventure,
}: {
  slotId: string;
  onMenu: (profiles?: boolean) => void;
  onAdventure: (stage: StageSelection) => void;
}) {
  const { t, text } = useI18n(),
    h = (key: Parameters<typeof t<"haven">>[1]) => t("haven", key);
  const bridge = useMemo(() => new GameBridge(), []),
    writer = useRef(uid()),
    sequence = useRef(0),
    busyRef = useRef(false),
    pending = useRef<Promise<unknown>>(Promise.resolve());
  const [p, setP] = useState<SaveData | null>(null),
    [initial, setInitial] = useState<HavenStart | null>(null),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [panel, setPanel] = useState<Panel>(null),
    [busy, setBusy] = useState(false),
    [outfit, setOutfit] = useState<Outfit>("moss"),
    [difficulty, setDifficulty] = useState<DifficultyId>("normal");
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
        const w = next.local.world!;
        setOutfit(w.outfit);
        setInitial({
          session: writer.current,
          position: w.position,
          outfit: w.outfit,
          character: next.local.character,
          damage: calculateStats(next).damage,
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
      const next = await profileRepository.world(slotId, command);
      setP(next);
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
      bridge.on("error", setError),
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
      locked: panel !== null || busy || !!error,
    });
  }, [panel, busy, error, bridge, ready]);
  const close = useCallback(() => {
    setPanel(null);
    void reload().catch((e) => setError(storageError(e)));
  }, [reload]);
  async function leave(profiles = false) {
    savePosition(current.current.position);
    await pending.current;
    onMenu(profiles);
  }
  async function travel(selection: StageSelection) {
    if (busyRef.current || !p) return;
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
        ...campaignLoadout(next, next.local.weapon, next.local.character),
      });
    }
  }
  const w = p?.local.world,
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
      <button className="quiet-button" onClick={() => void leave(true)}>
        {h("Daily objectives and achievements")} →
      </button>
    </>
  );
  return (
    <main className="haven-page">
      <div className="haven-canvas">
        {initial && (
          <PhaserHost bridge={bridge} world="haven" haven={initial} />
        )}
      </div>
      <header className="haven-topbar">
        <Brand />
        <div className="haven-title">
          <span className="eyebrow">{h("SAFE SANCTUARY")}</span>
          <h1>{h("Rift Haven")}</h1>
        </div>
        <div className="haven-toolbar">
          <SaveIndicator />
          <LanguageSwitcher compact />
          <button onClick={() => void leave()}>{h("Menu")}</button>
        </div>
      </header>
      <aside className="haven-status" aria-label={h("Rift Haven")}>
        <span
          className="haven-portrait"
          style={{
            backgroundImage: `url(/assets/haven/player-${w?.outfit ?? "moss"}.png)`,
          }}
        />
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
      {!ready && !error && (
        <div className="haven-loading" role="status">
          <span className="eyebrow">{h("THE WORLD BETWEEN WORLDS")}</span>
          <h2>{h("Preparing Rift Haven…")}</h2>
          <progress
            max={1}
            value={loading}
            aria-label={h("Loading town assets")}
          />
        </div>
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
      {ready && !panel && !error && (
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
      {(panel === "storage" ||
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
            onBack={close}
          />
        </DialogSurface>
      )}
      {panel === "campaign" && (
        <DialogSurface
          className="haven-screen-overlay"
          title={h("Campaign challenges")}
          onClose={close}
        >
          <WorldMap
            weapon={p!.local.weapon}
            character={p!.local.character}
            onBack={() => setPanel("portal")}
            onStart={(s) => void travel(s)}
          />
        </DialogSurface>
      )}
      {panel === "settings" && <Settings onClose={close} />}
      {panel &&
        ![
          "storage",
          "blacksmith",
          "merchant",
          "crafting",
          "settings",
          "campaign",
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
                  {h(
                    "Walk with WASD or arrow keys. Drag in the world on touch screens. Press E near a doorway or NPC. I opens inventory, M opens the map, and Q opens your journal.",
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
                    {h(
                      "Welcome, Wanderer. These rifts once joined our worlds. Now they carry a corruption we do not understand. Help me reopen the forest supply route, and you will always have a home here.",
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
                <p>
                  {h(
                    "The first forest expedition is ready. Other biomes retain their campaign challenges.",
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
                  className="quiet-button"
                  onClick={() => setPanel("campaign")}
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
                <div
                  className="haven-wardrobe-preview"
                  style={{
                    backgroundImage: `url(/assets/haven/player-${outfit}.png)`,
                  }}
                />
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
                      { type: "outfit", writer: writer.current, outfit },
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
                  onClick={() => setOutfit(w?.outfit ?? "moss")}
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
                <div className="haven-outfits">
                  {Object.entries(WEAPONS).map(([id, weapon]) => (
                    <button
                      key={id}
                      onClick={() =>
                        p &&
                        bridge.emit("command", {
                          type: "haven-test",
                          weapon: id as keyof typeof WEAPONS,
                          build: calculateStats(
                            p,
                            id as keyof typeof WEAPONS,
                            p.local.character,
                          ),
                        })
                      }
                    >
                      {text(weapon.name)}
                    </button>
                  ))}
                </div>
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
