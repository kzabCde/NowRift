"use client";
import { useI18n } from "@/i18n/useI18n";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="modal-shade">
      <section className="modal-panel">
        <span className="eyebrow">{t("errors","A BREAK IN THE VEIL")}</span>
        <h1>{t("errors","The journey was interrupted.")}</h1>
        <p>{t("errors","Your completed run records have not been reset. Retry the page to return to the forest.")}{" "}</p>
        <button className="primary-button" onClick={reset} type="button">{t("errors","TRY AGAIN →")}{" "}</button>
      </section>
    </main>
  );
}
