"use client";
import { useEffect } from "react";
import type { EquipmentInstance } from "@/game/rpg/model";
import {
  resolveWeaponVisual,
  nextEvolution,
  EVOLUTION_TIERS,
} from "@/game/presentation/weapon-visual";
import { useI18n } from "@/i18n/useI18n";
import { useSettings } from "@/state/settings";
import { Modal } from "./GameUi";
import WeaponSprite from "./WeaponSprite";

export function WeaponEvolutionPreview({ item }: { item: EquipmentInstance }) {
  const { t, text } = useI18n();
  const visual = resolveWeaponVisual(item);
  if (!visual) return null;
  const next = nextEvolution(item.enhancement);
  return (
    <section
      className={`weapon-evolution ${next?.enhancement === item.enhancement + 1 ? "milestone-ready" : ""}`}
      aria-label={t("equipment", "Weapon evolution")}
    >
      <span className="rpg-caption">{t("equipment", "Weapon evolution")}</span>
      <div className="weapon-evolution-comparison">
        <figure>
          <span className="weapon-evolution-stage">
            <WeaponSprite weapon={item} size={96} />
          </span>
          <figcaption>
            <small>
              {t("equipment", "Current appearance")} · +{item.enhancement}
            </small>
            <strong>{text(visual.tierName)}</strong>
          </figcaption>
        </figure>
        {next && (
          <>
            <span className="evolution-arrow" aria-hidden="true">
              →
            </span>
            <figure>
              <span className="weapon-evolution-stage future">
                <WeaponSprite
                  weapon={{ ...item, enhancement: next.enhancement }}
                  size={96}
                />
              </span>
              <figcaption>
                <small>
                  {t("equipment", "Next evolution")} · +{next.enhancement}
                </small>
                <strong>{text(EVOLUTION_TIERS[next.tier])}</strong>
              </figcaption>
            </figure>
          </>
        )}
      </div>
      <p>
        {next
          ? t(
              "equipment",
              "{count} successful enhancements until the next evolution.",
              { count: next.enhancement - item.enhancement },
            )
          : t("equipment", "Final evolution")}
      </p>
      {next?.enhancement === item.enhancement + 1 && (
        <p className="evolution-callout">
          {t("equipment", "Your next success transforms this weapon.")}
        </p>
      )}
      <details className="weapon-evolution-collection">
        <summary>{t("equipment", "Appearance collection")}</summary>
        <div>
          {EVOLUTION_TIERS.map((name, tier) => (
            <figure key={name} data-locked={tier > visual.tier}>
              <WeaponSprite
                weapon={{ ...item, enhancement: tier * 3 }}
                size={48}
              />
              <figcaption>
                +{tier * 3}
                <small>{text(name)}</small>
                {tier > visual.tier && (
                  <small>{t("equipment", "Locked preview")}</small>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </details>
    </section>
  );
}

/** Runs only after the repository commits a successful milestone; snapshots are display-only. */
export function WeaponEvolutionReveal({
  before,
  after,
  onClose,
}: {
  before: EquipmentInstance;
  after: EquipmentInstance;
  onClose: () => void;
}) {
  const { t, text } = useI18n();
  const reduced = useSettings((s) => s.reducedEffects);
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  const visual = resolveWeaponVisual(after)!;
  return (
    <Modal title={t("equipment", "Weapon evolved")} onClose={onClose}>
      <div className={`weapon-evolution-reveal ${reduced ? "reduced" : ""}`}>
        <span className="eyebrow">{t("equipment", "Weapon evolved")}</span>
        <div
          className="evolution-transform"
          style={
            { "--evolution-color": visual.effectColor } as React.CSSProperties
          }
        >
          <WeaponSprite
            className="evolution-before"
            weapon={before}
            size={160}
          />
          <span className="evolution-forge-pulse" />
          <WeaponSprite className="evolution-after" weapon={after} size={160} />
        </div>
        <h2>
          {text(visual.tierName)} +{after.enhancement}
        </h2>
        <p>{t("equipment", "A new form, forged by your progress.")}</p>
        <button className="rpg-primary" onClick={onClose}>
          {t("equipment", "Continue")}
        </button>
      </div>
    </Modal>
  );
}
