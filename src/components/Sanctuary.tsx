"use client";
import { useState } from "react";
import { Modal, PixelIcon } from "./GameUi";
import {
  CHARACTERS,
  RELICS,
  enhancementCost,
  type CharacterId,
  type RelicId,
} from "@/game/loadout";
import type { Progress } from "@/game/campaign/progression";
import { campaignRepository } from "@/game/campaign/persistence";
import { audio } from "@/game/audio/engine";
export function CharacterSelection({
  selected,
  onSelect,
  onClose,
}: {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState(selected);
  const c = CHARACTERS[preview];
  return (
    <Modal title="Choose a wanderer" onClose={onClose}>
      <span className="eyebrow">THREE SOULS / ONE BREACH</span>
      <h2>
        Choose a <em>wanderer.</em>
      </h2>
      <div
        className="character-stage"
        key={preview}
        style={{ "--character-color": c.color } as React.CSSProperties}
      >
        <span
          className={`character-sprite character-${preview}`}
          role="img"
          aria-label={`${c.name} idle preview`}
        />
        <div>
          <span className="eyebrow">{c.title}</span>
          <h3>{c.name}</h3>
          <p>{c.description}</p>
        </div>
      </div>
      <div className="character-choices" aria-label="Character selection">
        {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => (
          <button
            type="button"
            data-sound="equip"
            key={id}
            className={`character-choice ${preview === id ? "selected" : ""}`}
            aria-pressed={preview === id}
            onClick={() => setPreview(id)}
          >
            {CHARACTERS[id].name}
          </button>
        ))}
      </div>
      <div className="attribute-grid" key={`${preview}-stats`}>
        {[
          ["HEALTH", c.hp],
          ["MOVEMENT", c.speed],
          ["CRITICAL", `${Math.round(c.crit * 100)}%`],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        Shared original wanderer sprite with class tint. Stats apply at the
        start of each run. Choose any weapon in the sanctuary.
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
        CONFIRM WANDERER →
      </button>
    </Modal>
  );
}
export function Inventory({
  progress,
  ready,
  onChange,
  onClose,
}: {
  progress: Progress;
  ready: boolean;
  onChange: (p: Progress) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function change(action: "equip" | "enhance", id: RelicId | null) {
    setBusy(true);
    setNotice("");
    try {
      const p = await campaignRepository[action](id as RelicId);
      onChange(p);
      setNotice(
        action === "equip"
          ? "Equipment saved. Applies to your next run."
          : "Relic enhanced. Saved on this device.",
      );
      audio.play(action === "equip" ? "equip" : "upgrade");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Equipment could not be saved.",
      );
      audio.play("error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Inventory & equipment" onClose={onClose}>
      <span className="eyebrow">RELICS OF THE SHATTERED WORLDS</span>
      <h2>
        Inventory & <em>equipment.</em>
      </h2>
      <p className="inventory-wallet">
        {progress.gold} CAMPAIGN GOLD <span>· {progress.xp} PROFILE XP</span>
      </p>
      {!ready && (
        <p className="notice">
          Campaign storage is unavailable or still loading. Play survival
          freely; equipment requires readable local saves.
        </p>
      )}
      <h3>
        Relic slot <span className="muted">/ one equipped</span>
      </h3>
      {!progress.candidates.length && (
        <p className="inventory-empty">
          Your relic pouch is empty. Defeat a campaign world guardian to earn
          its relic.
        </p>
      )}
      <div className="relic-list">
        {(Object.keys(RELICS) as RelicId[]).map((id) => {
          const r = RELICS[id],
            owned = progress.candidates.includes(id),
            equipped = progress.equipment?.equipped === id,
            rank = progress.equipment?.ranks[id] ?? 0,
            cost = enhancementCost(rank);
          const enough =
            progress.gold >= cost.gold &&
            (progress.materials[r.material] ?? 0) >= cost.material;
          return (
            <article
              className={`relic-row ${owned ? "owned" : "locked"} ${equipped ? "selected" : ""}`}
              key={id}
            >
              <PixelIcon index={r.icon} large />
              <div>
                <strong>
                  {r.name} {owned && <span className="gold">+{rank}</span>}
                </strong>
                <p>{r.detail}</p>
                <small>
                  {owned
                    ? equipped
                      ? "EQUIPPED"
                      : "OWNED"
                    : `Defeat the ${r.world} campaign guardian`}
                </small>
              </div>
              {owned && (
                <div className="relic-actions">
                  <button
                    className="action-button"
                    data-silent="true"
                    disabled={!ready || busy}
                    type="button"
                    onClick={() => void change("equip", equipped ? null : id)}
                  >
                    {equipped ? "UNEQUIP" : "EQUIP"}
                  </button>
                  <button
                    className="action-button"
                    data-silent="true"
                    disabled={!ready || busy || rank >= 3 || !enough}
                    type="button"
                    onClick={() => void change("enhance", id)}
                  >
                    {rank >= 3 ? "MAX +3" : `ENHANCE · ${cost.gold}G`}
                  </button>
                  <small>
                    {rank < 3 &&
                      `${cost.material} ${r.material.replaceAll("-", " ")}`}
                  </small>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <h3>Materials</h3>
      <div className="material-pouch">
        {Object.entries(progress.materials).filter(([, n]) => n > 0).length ? (
          Object.entries(progress.materials)
            .filter(([, n]) => n > 0)
            .map(([id, n]) => (
              <span key={id}>
                {id.replaceAll("-", " ")} <b>×{n}</b>
              </span>
            ))
        ) : (
          <p className="muted">
            Complete campaign encounters to gather materials.
          </p>
        )}
      </div>
      <p role="status" className="audio-status">
        {busy ? "Saving equipment…" : notice}
      </p>
      <p className="muted">
        Campaign rewards and equipment stay in IndexedDB on this device.
        Enhancements spend the displayed resources immediately. Run blessings
        are temporary.
      </p>
      <button className="primary-button" onClick={onClose} type="button">
        DONE
      </button>
    </Modal>
  );
}
