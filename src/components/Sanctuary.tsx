"use client";
import { useI18n } from "@/i18n/useI18n";
import { useState } from "react";
import { Modal } from "./GameUi";
import { CHARACTERS, type CharacterId } from "@/game/loadout";
import CharacterPreview from "./CharacterPreview";
import type { WeaponSnapshot } from "@/game/rpg/model";
import type { Progress } from "@/game/campaign/progression";
import type { Outfit } from "@/game/world/save";
export function CharacterSelection({
  selected,
  onSelect,
  onClose,
  weapon = null,
  outfit = "moss",
  profile,
}: {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  onClose: () => void;
  weapon?: WeaponSnapshot | null;
  outfit?: Outfit;
  profile?: Progress;
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
        <CharacterPreview
          character={preview}
          outfit={outfit}
          weapon={weapon}
          profile={profile}
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
          "equipment",
          "Distinct body models share the same inventory weapon independently. Choosing a wanderer changes no equipment.",
        )}
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
