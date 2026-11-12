"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { profileRepository, uid } from "@/game/persistence/repository";
import type { PlayerView, SaveData } from "@/game/persistence/model";
import type { RunCheckpoint } from "@/game/persistence/checkpoint";
import { CHARACTERS, type CharacterId } from "@/game/loadout";
import { OUTFITS, type Outfit } from "@/game/world/save";
import { characterName } from "@/game/persistence/identity";
import {
  calculateStats,
  characterLevel,
  resolveEquippedWeapon,
} from "@/game/rpg/stats";
import CharacterPreview from "./CharacterPreview";
import { emptyProgress } from "@/game/campaign/progression";
import { initializeRpg } from "@/game/rpg/profile";
import { ITEMS } from "@/game/rpg/content";
import { storageError } from "@/game/persistence/status";
import { Brand } from "./GameUi";
import LanguageSwitcher from "./LanguageSwitcher";
import SaveIndicator from "./SaveIndicator";

export default function CharacterEntry({
  creating,
  onCreate,
  onSelect,
  onEnter,
  onResume,
  onManage,
  onBack,
}: {
  creating: boolean;
  onCreate: () => void;
  onSelect: () => void;
  onEnter: (save: SaveData) => void;
  onResume: (save: SaveData, checkpoint: RunCheckpoint) => void;
  onManage: () => void;
  onBack: () => void;
}) {
  const { t, text } = useI18n(),
    j = (key: Parameters<typeof t<"journey">>[1]) => t("journey", key);
  const [view, setView] = useState<PlayerView | null>(null),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [character, setCharacter] = useState<CharacterId>("wanderer"),
    [outfit, setOutfit] = useState<Outfit>("moss"),
    [touched, setTouched] = useState(false);
  const guard = useRef(false),
    requestId = useRef(uid()),
    nameField = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    setError("");
    try {
      const next = await profileRepository.entryView();
      setView(next);
      setSelected(next?.active?.local.id ?? next?.slots[0]?.local.id ?? "");
      setLoaded(true);
      return next;
    } catch (e) {
      setError(storageError(e));
      setLoaded(true);
      return undefined;
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void refresh().then((next) => {
      if (alive && next === null) onCreate();
    });
    return () => {
      alive = false;
    };
  }, [refresh, onCreate]);
  useEffect(() => {
    if (creating && loaded) nameField.current?.focus();
  }, [creating, loaded]);
  const base = useMemo(() => initializeRpg(emptyProgress()), []);
  const chosen = view?.slots.find((p) => p.local.id === selected),
    build = calculateStats(base, "arcane", character),
    equipment = base.rpg?.equipment ?? [];
  let nameError = "";
  try {
    characterName(name);
  } catch (e) {
    nameError = (e as Error).message;
  }
  const perform = async (create: boolean) => {
    if (guard.current) return;
    if (create && nameError) {
      setTouched(true);
      nameField.current?.focus();
      return;
    }
    if (!create && !chosen) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const p = create
        ? await profileRepository.createCharacter({
            id: requestId.current,
            name,
            character,
            outfit,
          })
        : await profileRepository.select(chosen!.local.id);
      const current = await profileRepository.load(p.local.id);
      if (current.local.checkpoint) onResume(current, current.local.checkpoint);
      else if (current.local.activeRun)
        throw new Error(
          "A saved run takes priority. Resume it or manage recovery before entering the city.",
        );
      else onEnter(current);
    } catch (e) {
      setError(storageError(e));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return (
    <main className="journey-entry">
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <SaveIndicator />
          <LanguageSwitcher compact />
          <button className="quiet-button" disabled={busy} onClick={onBack}>
            {j("Main Menu")}
          </button>
        </div>
      </header>
      <section className="journey-content" aria-busy={busy}>
        <span className="eyebrow">{j("Rift Heaven")}</span>
        <h1 tabIndex={-1}>
          {j(creating ? "Create your character" : "Your characters")}
        </h1>
        <p className="muted">
          {j(
            creating ? "A soul, a name, a home." : "Choose your next chapter.",
          )}
        </p>
        {!loaded && <p role="status">{j("Reading local saves…")}</p>}
        {error && (
          <div role="alert" className="journey-error">
            <p>{text(error)}</p>
            <p>
              {j(
                "Save could not be read. Retry or open save recovery. Your existing data was preserved.",
              )}
            </p>
            <button disabled={busy} onClick={() => void refresh()}>
              {j("Retry")}
            </button>
          </div>
        )}
        {loaded && creating && (
          <form
            className="journey-creation"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(true);
            }}
          >
            <aside
              className="journey-preview"
              style={
                { "--soul": CHARACTERS[character].color } as React.CSSProperties
              }
            >
              <CharacterPreview
                character={character}
                outfit={outfit}
                weapon={resolveEquippedWeapon(base, character)}
                profile={base}
              />
              <span className="eyebrow">
                {text(CHARACTERS[character].title)}
              </span>
              <h2>{text(CHARACTERS[character].name)}</h2>
              <p>{text(CHARACTERS[character].description)}</p>
              <h3>{j("Starting build")}</h3>
              <dl className="journey-stats">
                {[
                  [j("Health"), build.maxHp],
                  [j("Movement"), build.speed],
                  [
                    j("Critical chance"),
                    `${Math.round(build.critChance * 100)}%`,
                  ],
                  [j("Power"), build.power],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <h3>{j("Starting equipment")}</h3>
              <p>
                {equipment
                  .map((e) => text(ITEMS[e.definitionId].name))
                  .join(" · ") || text("Arcane Bolt")}
              </p>
            </aside>
            <div className="journey-customize">
              <label htmlFor="identity-name">{j("Character name")}</label>
              <input
                ref={nameField}
                id="identity-name"
                name="characterName"
                autoComplete="off"
                maxLength={80}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && !!nameError}
                aria-describedby="identity-hint identity-error"
              />
              <small id="identity-hint">
                {j("1–24 characters. English and Thai supported.")}
              </small>
              <p
                id="identity-error"
                className="journey-name-error"
                aria-live="polite"
              >
                {touched && nameError ? text(nameError) : " "}
              </p>
              <fieldset disabled={busy}>
                <legend>{j("Choose a class")}</legend>
                <div className="journey-class-list">
                  {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={character === id}
                      onClick={() => setCharacter(id)}
                    >
                      <strong>{text(CHARACTERS[id].name)}</strong>
                      <small>{text(CHARACTERS[id].title)}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={busy}>
                <legend>{j("Choose a cloak")}</legend>
                <div className="journey-outfits">
                  {OUTFITS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={outfit === id}
                      onClick={() => setOutfit(id)}
                    >
                      <CharacterPreview
                        character={character}
                        outfit={id}
                        weapon={null}
                        size={40}
                        decorative
                      />
                      {t(
                        "haven",
                        id === "moss"
                          ? "Moss"
                          : id === "ember"
                            ? "Ember"
                            : "Tide",
                      )}
                    </button>
                  ))}
                </div>
                <small>{j("Cloak changes appearance only.")}</small>
              </fieldset>
              <div className="journey-confirm">
                <strong>{name.trim() || "…"}</strong>
                <span>
                  {text(CHARACTERS[character].name)} ·{" "}
                  {t(
                    "haven",
                    outfit === "moss"
                      ? "Moss"
                      : outfit === "ember"
                        ? "Ember"
                        : "Tide",
                  )}
                </span>
              </div>
              <button
                className="primary-button"
                type="submit"
                disabled={busy || !loaded}
              >
                {j(
                  busy ? "Saving character…" : "CREATE CHARACTER & ENTER WORLD",
                )}
              </button>
              <button
                className="quiet-button"
                type="button"
                disabled={busy}
                onClick={view?.slots.length ? onSelect : onBack}
              >
                {j("Back")}
              </button>
            </div>
          </form>
        )}
        {loaded && !creating && (
          <>
            <div className="journey-slots" aria-label={j("Select character")}>
              {view?.slots.map((p) => (
                <button
                  key={p.local.id}
                  className="journey-slot"
                  disabled={busy}
                  aria-pressed={selected === p.local.id}
                  onClick={() => setSelected(p.local.id)}
                >
                  <CharacterPreview
                    character={p.local.character}
                    outfit={p.local.world?.outfit ?? "moss"}
                    weapon={resolveEquippedWeapon(p)}
                    profile={p}
                    size={64}
                    decorative
                  />
                  <strong>{p.local.name}</strong>
                  <span>{text(CHARACTERS[p.local.character].name)}</span>
                  <small>
                    {j("Level")} {characterLevel(p.xp).level} · {p.gold}{" "}
                    {j("Gold")}
                  </small>
                  {(p.local.checkpoint || p.local.activeRun) && (
                    <small>{j("Interrupted journey")}</small>
                  )}
                </button>
              ))}
            </div>
            {view &&
              Object.values(view.errors).map((e) => (
                <p role="alert" key={e}>
                  {text(e)}
                </p>
              ))}
            {chosen && (
              <button
                className="primary-button journey-continue"
                disabled={busy}
                onClick={() => void perform(false)}
              >
                {chosen.local.checkpoint
                  ? j("Resume checkpoint")
                  : t("journey", "Continue as {name}", {
                      name: chosen.local.name,
                    })}{" "}
                <span aria-hidden="true">→</span>
              </button>
            )}
            {chosen?.local.checkpoint && (
              <p>
                {j(
                  "A saved run takes priority. Resume it or manage recovery before entering the city.",
                )}
              </p>
            )}
            <button
              className="quiet-button"
              disabled={
                busy ||
                (view?.player.slots.length ?? 0) >= 3 ||
                (!!view && Object.keys(view.errors).length > 0)
              }
              onClick={() => {
                requestId.current = uid();
                onCreate();
              }}
            >
              {j("New character")}
            </button>
            {(view?.player.slots.length ?? 0) >= 3 && (
              <p>
                {j(
                  "All three slots are occupied. Manage saves to free a slot.",
                )}
              </p>
            )}
          </>
        )}
        <button
          className="quiet-button journey-manage"
          disabled={busy}
          onClick={onManage}
        >
          {j("Manage saves & backups")} →
        </button>
      </section>
    </main>
  );
}
