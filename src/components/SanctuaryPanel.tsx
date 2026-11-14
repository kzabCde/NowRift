"use client";
import { useSettings } from "@/state/settings";
import { keyHint } from "@/game/input/bindings";
import { useI18n } from "@/i18n/useI18n";
import type { SaveData } from "@/game/persistence/model";
import {
  calculateStats,
  characterLevel,
  resolveEquippedWeapon,
} from "@/game/rpg/stats";
import CharacterPreview from "./CharacterPreview";
import EquippedWeapon from "./EquippedWeapon";
import { CHARACTERS } from "@/game/loadout";
import { ITEMS } from "@/game/rpg/content";
import { SLOTS } from "@/game/rpg/model";
import { WORLDS, STAGES } from "@/game/campaign/content";
import { clearKey } from "@/game/campaign/progression";
import { ItemIcon } from "./RpgScreen";
import SaveIndicator from "./SaveIndicator";
import { Modal } from "./GameUi";
export type SanctuaryAction =
  | "storage"
  | "journal"
  | "map"
  | "directory"
  | "settings"
  | "profile";
export default function SanctuaryPanel({
  save,
  onAction,
  onClose,
  onMenu,
}: {
  save: SaveData;
  onAction: (name: SanctuaryAction) => void;
  onClose: () => void;
  onMenu: () => void;
}) {
  const prefs = useSettings();
  const { t, text } = useI18n(),
    j = (key: Parameters<typeof t<"journey">>[1]) => t("journey", key),
    stats = calculateStats(save, save.local.weapon, save.local.character);
  return (
    <Modal title={j("Sanctuary")} onClose={onClose}>
      <span className="eyebrow">{j("Your place between journeys.")}</span>
      <h2>
        {j("Sanctuary")} <kbd>{keyHint(prefs, "sanctuary")}</kbd>
      </h2>
      <section
        className="sanctuary-summary"
        aria-label={j("Character overview")}
      >
        <CharacterPreview
          character={save.local.character}
          outfit={save.local.world?.outfit ?? "moss"}
          weapon={resolveEquippedWeapon(save)}
          profile={save}
          size={64}
          decorative
        />
        <div>
          <h3>{save.local.name}</h3>
          <p>
            {text(CHARACTERS[save.local.character].name)} · {j("Level")}{" "}
            {characterLevel(save.xp).level}
          </p>
          <small>
            {save.gold} {j("Gold")} · {stats.power} {j("Power")}
          </small>
        </div>
      </section>
      <dl className="journey-stats">
        {[
          [
            j("Health"),
            `${Math.ceil(save.local.world?.hp ?? stats.maxHp)}/${stats.maxHp}`,
          ],
          [j("Damage"), stats.damage.toFixed(1)],
          [j("Armor"), stats.armor.toFixed(1)],
          [j("Movement"), stats.speed.toFixed(0)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <EquippedWeapon
        weapon={resolveEquippedWeapon(save)}
        onInventory={() => onAction("storage")}
      />
      <h3>{j("Equipment overview")}</h3>
      <div className="sanctuary-equipment">
        {SLOTS.map((slot) => {
          const item = save.rpg!.equipment.find(
            (e) => e.id === save.rpg!.equipped[slot],
          );
          return (
            <div key={slot}>
              {item && <ItemIcon id={item.definitionId} weapon={item} />}
              <small>{text(slot)}</small>
              <strong>
                {item
                  ? `${text(ITEMS[item.definitionId].name)} +${item.enhancement}`
                  : j("Empty")}
              </strong>
            </div>
          );
        })}
      </div>
      <h3>{j("World progression")}</h3>
      <div className="sanctuary-worlds">
        {WORLDS.map((w) => (
          <div key={w.id}>
            <span>{text(w.name)}</span>
            <small>
              {j("Cleared")}{" "}
              {
                STAGES.filter(
                  (s) =>
                    s.worldId === w.id &&
                    save.clears.includes(clearKey(s.id, "normal")),
                ).length
              }
              /5
            </small>
          </div>
        ))}
      </div>
      <div className="sanctuary-actions">
        {(
          [
            ["storage", "Open inventory"],
            ["journal", "Quest journal"],
            ["directory", "Activity Directory"],
            ["map", "Town map"],
            ["profile", "Daily activities & achievements"],
            ["settings", "Settings"],
          ] as const
        ).map(([action, label]) => (
          <button key={action} onClick={() => onAction(action)}>
            {j(label)} →
          </button>
        ))}
      </div>
      <div className="sanctuary-save" aria-label={j("Save status")}>
        <SaveIndicator />
        <small>{save.local.name}</small>
      </div>
      <button className="primary-button" onClick={onClose}>
        {j("Close Sanctuary")}
      </button>
      <button className="quiet-button" onClick={onMenu}>
        {j("Return to Main Menu")}
      </button>
    </Modal>
  );
}
