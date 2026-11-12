"use client";
import type { ActionVisualReceipt } from "@/game/presentation/action-feedback";
import { ITEMS } from "@/game/rpg/content";
import { useI18n } from "@/i18n/useI18n";
import ItemIcon from "./ItemIcon";
import styles from "./ActionReceipt.module.css";
/** The caller can create this receipt only after the persistence transaction resolves. */
export default function ActionReceipt({
  receipt,
  onFinish,
}: {
  receipt: ActionVisualReceipt;
  onFinish: () => void;
}) {
  const { text, t } = useI18n();
  return (
    <aside
      key={receipt.id}
      className={styles.receipt}
      data-committed-receipt={receipt.id}
      aria-label={t("visual", "Committed inventory action")}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onFinish();
      }}
    >
      <span className={styles.seal} aria-hidden="true" />
      <div>
        <strong>{text(receipt.label)}</strong>
        <span className={styles.items}>
          {receipt.items.slice(0, 4).map((item) => (
            <span key={item.definitionId} className={styles.item}>
              <ItemIcon id={item.definitionId} size={24} />
              <span>
                {text(ITEMS[item.definitionId].name)} ×{item.quantity}
              </span>
            </span>
          ))}
          {receipt.gold > 0 && (
            <span className={styles.coin}>
              +{receipt.gold} {text("Gold")}
            </span>
          )}
        </span>
      </div>
      <small>{text("Saved")}</small>
    </aside>
  );
}
