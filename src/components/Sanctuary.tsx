"use client";
import { useI18n } from "@/i18n/useI18n";
import { useState } from "react";
import { Modal } from "./GameUi";
import { CHARACTERS, type CharacterId } from "@/game/loadout";
export function CharacterSelection({
  selected,
  onSelect,
  onClose,
}: {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  onClose: () => void;
}) {
  const { t, text } = useI18n();
  const [preview, setPreview] = useState(selected);
  const c = CHARACTERS[preview];
  return (
    <Modal title={t("sanctuary", "Choose a wanderer")} onClose={onClose}>
      <span className="eyebrow">
        {t("sanctuary", "THREE SOULS / ONE BREACH")}
      </span>
      <h2>
        {t("sanctuary", "Choose a")} <em>{t("sanctuary", "wanderer.")}</em>
      </h2>
      <div
        className="character-stage"
        key={preview}
        style={{ "--character-color": c.color } as React.CSSProperties}
      >
        <span
          className={`character-sprite character-${preview}`}
          role="img"
          aria-label={`${text(c.name)} ${t("sanctuary", "idle preview")}`}
        />
        <div>
          <span className="eyebrow">{text(c.title)}</span>
          <h3>{text(c.name)}</h3>
          <p>{text(c.description)}</p>
        </div>
      </div>
      <div
        className="character-choices"
        aria-label={t("sanctuary", "Character selection")}
      >
        {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => (
          <button
            type="button"
            data-sound="equip"
            key={id}
            className={`character-choice ${preview === id ? "selected" : ""}`}
            aria-pressed={preview === id}
            onClick={() => setPreview(id)}
          >
            {text(CHARACTERS[id].name)}
          </button>
        ))}
      </div>
      <div className="attribute-grid" key={`${preview}-stats`}>
        {[
          ["HEALTH", c.hp],
          ["MOVEMENT", c.speed],
          ["CRITICAL", `${Math.round(c.crit * 100)}%`],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span>{text(String(label))}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        {t(
          "sanctuary",
          "Shared original wanderer sprite with class tint. Stats apply at the start of each run. Choose any weapon in the sanctuary.",
        )}{" "}
      </p>
      <button
        className="primary-button"
        data-sound="confirm"
        type="button"
        onClick={() => {
          onSelect(preview);
          onClose();
        }}
      >
        {t("sanctuary", "CONFIRM WANDERER →")}{" "}
      </button>
    </Modal>
  );
}
