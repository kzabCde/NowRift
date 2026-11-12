"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Brand, Modal, clock } from "./GameUi";
import { ItemIcon } from "./RpgScreen";
import { storageError } from "@/game/persistence/status";
import SaveIndicator from "./SaveIndicator";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/i18n/useI18n";
import { profileRepository } from "@/game/persistence/repository";
import type {
  PlayerView,
  SaveData,
  Backup,
  SaveBundle,
} from "@/game/persistence/model";
import type { RunCheckpoint } from "@/game/persistence/checkpoint";
import {
  CHECKINS,
  QUESTS,
  ACHIEVEMENTS,
  gameDay,
  type Gift,
} from "@/game/persistence/daily";
import {
  exportSave,
  importSave,
  downloadJson,
  MAX_IMPORT_BYTES,
} from "@/game/persistence/backup";
import CharacterPreview from "./CharacterPreview";
import {
  calculateStats,
  characterLevel,
  resolveEquippedWeapon,
} from "@/game/rpg/stats";
import { CHARACTERS, type CharacterId } from "@/game/loadout";
import { WORLDS } from "@/game/campaign/content";
import { ITEMS } from "@/game/rpg/content";
import { inventory } from "@/game/rpg/inventory";
type Tab =
  | "profile"
  | "slots"
  | "daily"
  | "quests"
  | "achievements"
  | "backups";
type Confirmation = {
  title: string;
  body: ReactNode;
  confirm: () => Promise<unknown>;
};
export default function ProfileScreen({
  onBack,
  onChanged,
  onResume,
  initialTab = "profile",
}: {
  onBack: () => void;
  onChanged: (save: SaveData) => void;
  onResume: (save: SaveData, checkpoint: RunCheckpoint) => void;
  initialTab?: Tab;
}) {
  const { text, locale } = useI18n(),
    [view, setView] = useState<PlayerView | null>(null),
    [tab, setTab] = useState<Tab>(initialTab),
    [backups, setBackups] = useState<Backup[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [changedElsewhere, setChangedElsewhere] = useState(false),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [username, setUsername] = useState(""),
    [rename, setRename] = useState(""),
    [createName, setCreateName] = useState(""),
    [archetype, setArchetype] = useState<CharacterId>("wanderer"),
    guard = useRef(false),
    day = useRef(gameDay()),
    file = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    const next = await profileRepository.view();
    setView(next);
    setChangedElsewhere(false);
    setBackups(await profileRepository.backups());
    if (next.active) onChanged(next.active);
    return next;
  }, [onChanged]);
  useEffect(() => {
    let alive = true;
    profileRepository
      .view()
      .then((v) => {
        if (alive) {
          setView(v);
          setUsername(v.player.username);
          setRename(v.active?.local.name ?? "");
        }
      })
      .catch((e) => {
        if (alive) setError(String(e));
      });
    profileRepository
      .backups()
      .then((v) => {
        if (alive) setBackups(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useEffect(
    () =>
      profileRepository.subscribe(() => {
        if (!guard.current) setChangedElsewhere(true);
      }),
    [],
  );
  useEffect(() => {
    const timer = setInterval(() => {
      if (gameDay() !== day.current) {
        day.current = gameDay();
        void refresh().catch((e) => setError(String(e)));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (view) {
      setUsername(view.player.username);
      setRename(view.active?.local.name ?? "");
    }
  }, [view?.player.username, view?.active?.local.id, view?.active?.local.name]);
  async function perform(fn: () => Promise<unknown>, message: string) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setConfirmation(null);
    try {
      await fn();
      setNotice(message);
      await refresh();
    } catch (e) {
      setError(storageError(e));
      try {
        await refresh();
      } catch {
        /* Original data remains in storage. */
      }
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const active = view?.active ?? null,
    dayKey = gameDay(),
    today = view?.player.checkins.some((c) => c.day === dayKey) ?? false,
    cycle = (view?.player.checkins.length ?? 0) % 7;
  const fmt = (at: number) =>
    new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short",
      calendar: "gregory",
      numberingSystem: "latn",
    }).format(at);
  function gift(g: Gift) {
    return [
      g.gold ? `${g.gold.toLocaleString()} ${text("Gold")}` : "",
      ...Object.entries(g.materials ?? {}).map(
        ([id, n]) => `${text(ITEMS[id].name)} ×${n}`,
      ),
      g.epic ? text("One Epic forest weapon, opened immediately") : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  function prepareImport(bundle: SaveBundle) {
    const target = active?.local.id ?? view?.player.activeSlotId ?? null,
      expected = active?.local.revision ?? null;
    setConfirmation({
      title: "Confirm save import",
      body: (
        <>
          <p>
            {text("Replace character:")}{" "}
            <strong>{active?.local.name ?? text("Recovered character")}</strong>
          </p>
          <div className="profile-import-preview">
            <strong>{bundle.save.local.name}</strong>
            <span>
              {text("Player ID")}: {bundle.player.id}
            </span>
            <span>
              {text("Level")} {characterLevel(bundle.save.xp).level} ·{" "}
              {bundle.save.gold} {text("Gold")}
            </span>
            <span>
              {inventory(bundle.save, false).length} {text("bag slots")} ·{" "}
              {bundle.save.clears.length} {text("stage clears")}
            </span>
            <span>
              {text("Backup created")}: {fmt(bundle.exportedAt)}
            </span>
          </div>
          <p>
            {text(
              "A recovery backup is created before replacement. Existing local Player ID stays. Profile-wide check-in history is merged. Other tabs must reload this character.",
            )}
          </p>
        </>
      ),
      confirm: () =>
        profileRepository.replace(
          bundle.save,
          bundle.player.checkins,
          expected,
          target,
          bundle.player,
        ),
    });
  }
  async function readFile(selected: File | undefined) {
    if (!selected) return;
    setError("");
    try {
      if (selected.size > MAX_IMPORT_BYTES)
        throw new Error("Save files must be smaller than 5 MB.");
      prepareImport(await importSave(await selected.text()));
    } catch (e) {
      setError(storageError(e));
    }
    if (file.current) file.current.value = "";
  }
  return (
    <main className="rpg-page profile-page">
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <SaveIndicator />
          <LanguageSwitcher compact />
          <button className="quiet-button" disabled={busy} onClick={onBack}>
            {text("← RETURN TO HUB")}
          </button>
        </div>
      </header>
      <div className="rpg-shell">
        <div className="rpg-heading">
          <div>
            <span className="eyebrow">{text("THE WANDERER’S CHRONICLE")}</span>
            <h1>
              {text("A life beyond")} <em>{text("one journey.")}</em>
            </h1>
            <p className="muted">
              {text(
                "Three characters. One local player. Your world stays on this device.",
              )}
            </p>
          </div>
          <div className="rpg-wallet">
            <span>{text("LOCAL PLAYER")}</span>
            <strong className="profile-player-id">
              {view?.player.id ?? "—"}
            </strong>
            <small>{text("Local identifier; not server verified")}</small>
          </div>
        </div>
        <nav
          className="rpg-tabs profile-tabs"
          aria-label={text("Profile systems")}
        >
          {(
            [
              "profile",
              "slots",
              "daily",
              "quests",
              "achievements",
              "backups",
            ] as Tab[]
          ).map((id) => (
            <button
              key={id}
              aria-pressed={tab === id}
              className={tab === id ? "selected" : ""}
              onClick={() => setTab(id)}
            >
              {text(
                {
                  profile: "PROFILE",
                  slots: "SAVE SLOTS",
                  daily: "CHECK-IN",
                  quests: "DAILY QUESTS",
                  achievements: "ACHIEVEMENTS",
                  backups: "BACKUP & RESTORE",
                }[id],
              )}
            </button>
          ))}
        </nav>
        <div className="profile-messages">
          {changedElsewhere && (
            <p className="notice">
              {text("This save changed in another tab.")}{" "}
              <button
                className="quiet-button"
                onClick={() => void perform(refresh, "Profile refreshed.")}
              >
                {text("REFRESH LOCAL DATA")}
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className="notice negative">
              {text(error)}
            </p>
          )}
          {notice && (
            <p role="status" className="notice profile-claimed">
              {text(notice)}
            </p>
          )}
          {busy && <p className="muted">{text("Saving transaction…")}</p>}
          {view &&
            Object.entries(view.errors).map(([id, message]) => (
              <p key={id} role="alert" className="notice negative">
                {text(message)}
              </p>
            ))}
        </div>
        {!view && (
          <section className="rpg-panel">
            <h2>{text("Keep your progress safe.")}</h2>
            <p>
              {text(
                "Existing data is preserved. Retry loading or import a validated backup to recover.",
              )}
            </p>
            <button
              className="rpg-button"
              onClick={() => void perform(refresh, "Profile loaded.")}
            >
              {text("Retry loading")}
            </button>
            <button
              className="rpg-button"
              onClick={() => file.current?.click()}
            >
              {text("IMPORT JSON BACKUP")}
            </button>
          </section>
        )}
        {view && tab === "profile" && (
          <div className="profile-columns">
            <section className="rpg-panel">
              <span className="eyebrow">{text("GUEST PLAYER PROFILE")}</span>
              <h2>{view.player.username}</h2>
              <p>
                {text("Created")}: {fmt(view.player.createdAt)}
              </p>
              <label className="profile-field">
                {text("Player name")}
                <input
                  aria-label={text("Player name")}
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <button
                className="rpg-button"
                disabled={busy || !username.trim()}
                onClick={() =>
                  void perform(
                    () =>
                      profileRepository.renamePlayer(
                        username,
                        view.player.revision,
                      ),
                    "Player name saved.",
                  )
                }
              >
                {text("SAVE PLAYER NAME")}
              </button>
              <p className="muted">
                {text(
                  "Guest players can access every offline PvE system. No cloud account or authentication is used.",
                )}
              </p>
            </section>
            {active && (
              <section className="rpg-panel">
                <div className="profile-character-hero">
                  <CharacterPreview
                    character={active.local.character}
                    outfit={active.local.world?.outfit ?? "moss"}
                    weapon={resolveEquippedWeapon(active)}
                    profile={active}
                    size={96}
                  />
                  <div>
                    <span className="eyebrow">{text("ACTIVE CHARACTER")}</span>
                    <h2>{active.local.name}</h2>
                    <p>
                      {text(CHARACTERS[active.local.character].name)} ·{" "}
                      {text("Level")} {characterLevel(active.xp).level} ·{" "}
                      {text("Power")}{" "}
                      {
                        calculateStats(
                          active,
                          active.local.weapon,
                          active.local.character,
                        ).power
                      }
                    </p>
                  </div>
                </div>
                <div className="profile-stats">
                  {[
                    [
                      "Total Playtime",
                      `${Math.floor(active.local.stats.seconds / 3600)}h ${Math.floor((active.local.stats.seconds % 3600) / 60)}m`,
                    ],
                    ["Total Kills", active.local.stats.kills],
                    ["Bosses Defeated", active.local.stats.bosses],
                    [
                      "Worlds Cleared",
                      WORLDS.filter((w) =>
                        active.clears.includes(w.id + "-5:normal"),
                      ).length,
                    ],
                    [
                      "Highest Enhancement",
                      "+" + active.local.stats.highestEnhancement,
                    ],
                    [
                      "Achievement Progress",
                      `${Object.values(active.local.achievements).filter((a) => a.unlockedAt !== null).length} / ${ACHIEVEMENTS.length}`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{text(String(label))}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  {text("Last Played")}: {fmt(active.local.lastPlayed)}
                </p>
                <div className="profile-equipped">
                  {Object.entries(active.rpg!.equipped).map(([slot, id]) => {
                    const item = active.rpg!.equipment.find((e) => e.id === id);
                    return (
                      <div key={slot}>
                        <span>{text(slot.toUpperCase())}</span>
                        {item ? (
                          <>
                            <ItemIcon id={item.definitionId} />
                            <small>
                              {text(ITEMS[item.definitionId].name)} +
                              {item.enhancement}
                            </small>
                          </>
                        ) : (
                          <small>—</small>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button className="rpg-primary" onClick={onBack}>
                  {text("CONTINUE GAME →")}
                </button>
              </section>
            )}
          </div>
        )}
        {view && tab === "slots" && (
          <>
            <section className="profile-slot-grid">
              {view.player.slots.map((ref, index) => {
                const p = view.slots.find((s) => s.local.id === ref.id);
                return (
                  <article
                    key={ref.id}
                    className={`rpg-panel profile-slot ${active?.local.id === ref.id ? "selected" : ""}`}
                  >
                    <span className="eyebrow">
                      {text("SAVE SLOT")} 0{index + 1}
                    </span>
                    <h2>{p?.local.name ?? text("Unreadable character")}</h2>
                    {p ? (
                      <>
                        <CharacterPreview
                          character={p.local.character}
                          outfit={p.local.world?.outfit ?? "moss"}
                          weapon={resolveEquippedWeapon(p)}
                          profile={p}
                          size={96}
                        />
                        <p>
                          {text("Level")} {characterLevel(p.xp).level} ·{" "}
                          {p.gold} {text("Gold")}
                        </p>
                        <p>
                          {text("Power")}{" "}
                          {
                            calculateStats(p, p.local.weapon, p.local.character)
                              .power
                          }{" "}
                          · {p.clears.length} {text("stage clears")}
                        </p>
                        <small>{fmt(p.local.lastPlayed)}</small>
                        <button
                          className="rpg-primary"
                          disabled={busy}
                          onClick={() =>
                            void perform(async () => {
                              const chosen = await profileRepository.select(
                                ref.id,
                              );
                              onChanged(chosen);
                              setRename(chosen.local.name);
                            }, "Character selected.")
                          }
                        >
                          {text(
                            active?.local.id === ref.id
                              ? "SELECTED"
                              : "SELECT CHARACTER",
                          )}
                        </button>
                        <button
                          className="rpg-button danger"
                          disabled={busy || view.player.slots.length === 1}
                          onClick={() =>
                            setConfirmation({
                              title: "Delete character?",
                              body: (
                                <p>
                                  {text("Permanently delete")}{" "}
                                  <strong>{p.local.name}</strong>?{" "}
                                  {text(
                                    "A recovery backup will be kept. Other characters are preserved.",
                                  )}
                                </p>
                              ),
                              confirm: () =>
                                profileRepository.deleteSlot(
                                  ref.id,
                                  p.local.revision,
                                ),
                            })
                          }
                        >
                          {text("DELETE SLOT")}
                        </button>
                      </>
                    ) : (
                      <button
                        className="rpg-button"
                        onClick={() =>
                          setConfirmation({
                            title: "Discard damaged checkpoint?",
                            body: (
                              <p>
                                {text(
                                  "Only the run checkpoint is discarded. Permanent inventory and progression are kept.",
                                )}
                              </p>
                            ),
                            confirm: () =>
                              profileRepository.discardDamagedCheckpoint(
                                ref.id,
                              ),
                          })
                        }
                      >
                        {text("DISCARD DAMAGED CHECKPOINT")}
                      </button>
                    )}
                  </article>
                );
              })}
              {Array.from(
                { length: 3 - view.player.slots.length },
                (_, index) => (
                  <article className="rpg-panel profile-empty-slot" key={index}>
                    <span className="eyebrow">{text("EMPTY SAVE SLOT")}</span>
                    <h2>{text("An unwritten story.")}</h2>
                    <p>
                      {text(
                        "A new character starts with independent equipment, currency and world progression.",
                      )}
                    </p>
                  </article>
                ),
              )}
            </section>
            <section className="rpg-panel profile-form-row">
              <div>
                <h2>{text("Create a character")}</h2>
                <label className="profile-field">
                  {text("Character name")}
                  <input
                    aria-label={text("New character name")}
                    maxLength={24}
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </label>
                <label className="profile-field">
                  {text("Character class")}
                  <select
                    aria-label={text("Character class")}
                    value={archetype}
                    onChange={(e) =>
                      setArchetype(e.target.value as CharacterId)
                    }
                  >
                    {Object.entries(CHARACTERS).map(([id, c]) => (
                      <option key={id} value={id}>
                        {text(c.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="rpg-primary"
                  disabled={
                    busy || view.player.slots.length >= 3 || !createName.trim()
                  }
                  onClick={() =>
                    void perform(async () => {
                      const p = await profileRepository.create(
                        createName,
                        archetype,
                      );
                      onChanged(p);
                      setCreateName("");
                      setRename(p.local.name);
                    }, "Character created.")
                  }
                >
                  {text("CREATE SLOT")}
                </button>
              </div>
              {active && (
                <div>
                  <h2>{text("Rename active character")}</h2>
                  <label className="profile-field">
                    {text("Character name")}
                    <input
                      aria-label={text("Rename character")}
                      value={rename}
                      maxLength={24}
                      onChange={(e) => setRename(e.target.value)}
                    />
                  </label>
                  <button
                    className="rpg-button"
                    disabled={busy || !rename.trim()}
                    onClick={() =>
                      void perform(
                        () =>
                          profileRepository.renameSlot(
                            active.local.id,
                            rename,
                            active.local.revision,
                          ),
                        "Character renamed.",
                      )
                    }
                  >
                    {text("RENAME CHARACTER")}
                  </button>
                  <p className="muted">
                    {text(
                      "At least one character must remain. Deleting a slot never deletes daily check-in history.",
                    )}
                  </p>
                </div>
              )}
            </section>
          </>
        )}
        {view && tab === "daily" && (
          <section className="rpg-panel">
            <span className="eyebrow">{text("A LIGHT TO RETURN TO")}</span>
            <h2>{text("Seven days of provisions.")}</h2>
            <p>
              {text(
                "One claim per local player each Bangkok game-day. Rewards go to the active character. Missed days do not reset the cycle.",
              )}
            </p>
            <div className="profile-checkins">
              {CHECKINS.map((c, index) => (
                <article
                  key={index}
                  className={index === cycle ? "selected" : ""}
                >
                  <span>
                    {text("DAY")} {index + 1}
                  </span>
                  <ItemIcon
                    id={
                      c.gift.epic
                        ? "forest-weapon"
                        : c.gift.materials
                          ? Object.keys(c.gift.materials)[0]
                          : "gold-ore"
                    }
                    size={52}
                  />
                  <h3>{text(c.name)}</h3>
                  <p>{gift(c.gift)}</p>
                  {index === cycle && (
                    <small>
                      {text(today ? "Next reward" : "AVAILABLE TODAY")}
                    </small>
                  )}
                </article>
              ))}
            </div>
            <button
              className="rpg-primary"
              disabled={
                busy ||
                today ||
                !active ||
                view.player.checkins.some((c) => c.day > dayKey)
              }
              onClick={() =>
                active &&
                void perform(
                  () =>
                    profileRepository.claim(
                      "checkin",
                      "",
                      active.local.revision,
                      active.local.id,
                    ),
                  "Daily check-in claimed.",
                )
              }
            >
              {text(today ? "CLAIMED TODAY" : "CLAIM DAILY REWARD")}
            </button>
            <p className="muted">
              {text(
                "Resets at midnight Asia/Bangkok. An offline device clock can be changed; this is not server-grade anti-cheat.",
              )}
            </p>
            {view.player.checkins.some((c) => c.day > dayKey) && (
              <p className="notice">
                {text(
                  "The device clock is earlier than your last check-in. Correct the clock before claiming.",
                )}
              </p>
            )}
            <details>
              <summary>{text("Claim history")}</summary>
              {view.player.checkins
                .slice(-30)
                .reverse()
                .map((c) => (
                  <p key={c.day}>
                    {c.day} · {text("DAY")} {c.cycle + 1} · {fmt(c.at)}
                  </p>
                ))}
            </details>
          </section>
        )}
        {active && tab === "quests" && (
          <section className="rpg-panel">
            <span className="eyebrow">{dayKey} / ASIA/BANGKOK</span>
            <h2>{text("A purpose for today.")}</h2>
            <p className="muted">
              {text(
                "Kills and playtime are recorded at checkpoints; loot and stage objectives update when rewards are banked. Reward gifts do not count as earned combat gold.",
              )}
            </p>
            <div className="profile-objectives">
              {QUESTS.map((q) => {
                const n = active.local.daily.progress[q.id] ?? 0,
                  claimed = active.local.daily.claimed.includes(q.id);
                return (
                  <article key={q.id}>
                    <div>
                      <h3>{text(q.name)}</h3>
                      <p>{text(q.detail)}</p>
                      <progress value={n} max={q.target} />
                      <small>
                        {n} / {q.target} · {gift(q.gift)}
                      </small>
                    </div>
                    <button
                      className="rpg-button"
                      disabled={busy || claimed || n < q.target}
                      onClick={() =>
                        void perform(
                          () =>
                            profileRepository.claim(
                              "quest",
                              q.id,
                              active.local.revision,
                              active.local.id,
                            ),
                          "Daily quest reward claimed.",
                        )
                      }
                    >
                      {text(
                        claimed
                          ? "CLAIMED"
                          : n >= q.target
                            ? "CLAIM REWARD"
                            : "IN PROGRESS",
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {active && tab === "achievements" && (
          <section className="rpg-panel">
            <span className="eyebrow">{text("MEMORIES THAT ENDURE")}</span>
            <h2>{text("Marks upon the world.")}</h2>
            <div className="profile-objectives">
              {ACHIEVEMENTS.map((a) => {
                const state = active.local.achievements[a.id];
                return (
                  <article key={a.id}>
                    <ItemIcon
                      id={
                        Object.values(ITEMS).find((i) => i.icon === a.icon)
                          ?.id ?? "forest-weapon"
                      }
                    />
                    <div>
                      <span className="eyebrow">{text(a.category)}</span>
                      <h3>{text(a.name)}</h3>
                      <p>{text(a.detail)}</p>
                      <progress value={state?.progress ?? 0} max={a.target} />
                      <small>
                        {state?.progress ?? 0} / {a.target} · {gift(a.gift)}
                      </small>
                    </div>
                    <button
                      className="rpg-button"
                      disabled={
                        busy || state?.unlockedAt == null || state.claimed
                      }
                      onClick={() =>
                        void perform(
                          () =>
                            profileRepository.claim(
                              "achievement",
                              a.id,
                              active.local.revision,
                              active.local.id,
                            ),
                          "Achievement reward claimed.",
                        )
                      }
                    >
                      {text(
                        state?.claimed
                          ? "CLAIMED"
                          : state?.unlockedAt != null
                            ? "CLAIM REWARD"
                            : "LOCKED",
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {view && tab === "backups" && (
          <section className="rpg-panel">
            <span className="eyebrow">{text("KEEP A LIGHT IN RESERVE")}</span>
            <h2>{text("Backup & restore")}</h2>
            <p>
              {text(
                "Export includes this character, profile metadata and shared check-in history. SHA-256 detects accidental corruption; it is not anti-tamper security.",
              )}
            </p>
            <div className="profile-actions">
              <button
                className="rpg-primary"
                disabled={busy || !active}
                onClick={() =>
                  active &&
                  void perform(
                    async () =>
                      downloadJson(
                        await exportSave(view.player, active),
                        `NowRift-${active.local.name.replace(/[^\w-]/g, "_")}-${dayKey}.json`,
                      ),
                    "Backup downloaded.",
                  )
                }
              >
                {text("EXPORT JSON BACKUP")}
              </button>
              <button
                className="rpg-button"
                disabled={busy}
                onClick={() => file.current?.click()}
              >
                {text("IMPORT JSON BACKUP")}
              </button>
            </div>
            <p className="muted">
              {text(
                "Imports replace only the selected character after preview and confirmation. Other slots remain untouched. Keep an external copy: browser storage can be deleted or evicted.",
              )}
            </p>
            <h3>{text("Automatic recovery backups")}</h3>
            {backups.length ? (
              backups.slice(0, 20).map((b) => (
                <div className="profile-backup" key={b.id}>
                  <div>
                    <strong>{b.save.local.name}</strong>
                    <small>
                      {fmt(b.at)} · {text(b.reason)}
                    </small>
                  </div>
                  <button
                    className="rpg-button"
                    disabled={busy}
                    onClick={() =>
                      prepareImport({
                        format: "nowrift-save",
                        version: 2,
                        exportedAt: b.at,
                        player: b.player,
                        save: b.save,
                      })
                    }
                  >
                    {text("PREVIEW RECOVERY")}
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() =>
                      void exportSave(b.player, b.save)
                        .then((data) =>
                          downloadJson(data, `NowRift-recovery-${b.at}.json`),
                        )
                        .catch((e) => setError(String(e)))
                    }
                  >
                    {text("DOWNLOAD")}
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">
                {text("Recovery copies are created before import or deletion.")}
              </p>
            )}
          </section>
        )}
        {active?.local.checkpoint && (
          <section className="rpg-panel profile-recovery">
            <span className="eyebrow">{text("AN UNFINISHED JOURNEY")}</span>
            <h3>
              {text("Saved run")} ·{" "}
              {clock(Math.floor(active.local.checkpoint.state.time))}
            </h3>
            <p>
              {text(
                "Resume from the latest committed checkpoint, paused. Unsaved seconds and cosmetic effects are not restored. Resuming takes over other tabs of this character.",
              )}
            </p>
            <button
              className="rpg-primary"
              disabled={busy}
              onClick={() => onResume(active, active.local.checkpoint!)}
            >
              {text("RESUME CHECKPOINT →")}
            </button>
            <button
              className="rpg-button danger"
              disabled={busy}
              onClick={() =>
                setConfirmation({
                  title: "Discard saved run?",
                  body: (
                    <p>
                      {text(
                        "Only the interrupted run is discarded. Permanent rewards and character progress stay saved.",
                      )}
                    </p>
                  ),
                  confirm: () => profileRepository.discardRun(active.local.id),
                })
              }
            >
              {text("DISCARD CHECKPOINT")}
            </button>
          </section>
        )}
        {active?.local.activeRun && !active.local.checkpoint && (
          <section className="rpg-panel profile-recovery">
            <span className="eyebrow">{text("AN UNFINISHED JOURNEY")}</span>
            <h3>{text("No committed checkpoint")}</h3>
            <p>
              {text(
                "The run started before its first checkpoint was saved. You can release it and return to permanent character progress. Another tab playing this character will be stopped.",
              )}
            </p>
            <button
              className="rpg-button danger"
              disabled={busy}
              onClick={() =>
                setConfirmation({
                  title: "Discard saved run?",
                  body: (
                    <p>
                      {text(
                        "Only the interrupted run is discarded. Permanent rewards and character progress stay saved.",
                      )}
                    </p>
                  ),
                  confirm: () => profileRepository.discardRun(active.local.id),
                })
              }
            >
              {text("RELEASE INTERRUPTED RUN")}
            </button>
          </section>
        )}
        <input
          ref={file}
          className="profile-file-input"
          type="file"
          accept="application/json,.json"
          aria-label={text("Import save file")}
          onChange={(e) => void readFile(e.target.files?.[0])}
        />
      </div>
      {confirmation && (
        <Modal
          title={text(confirmation.title)}
          onClose={() => {
            if (!guard.current) setConfirmation(null);
          }}
        >
          <span className="eyebrow">{text("REVIEW BEFORE YOU COMMIT")}</span>
          <h2>{text(confirmation.title)}</h2>
          {confirmation.body}
          <div className="dialog-actions">
            <button
              className="rpg-button"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              {text("CANCEL")}
            </button>
            <button
              className="rpg-primary"
              disabled={busy}
              onClick={() =>
                void perform(confirmation.confirm, "Save action completed.")
              }
            >
              {text("CONFIRM")}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
