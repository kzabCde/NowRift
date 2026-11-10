"use client";
import { useEffect } from "react";
import { useLocale } from "@/state/locale";
import { useI18n } from "@/i18n/useI18n";
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale((state) => state.locale);
  const initialize = useLocale((state) => state.initialize);
  const setLocale = useLocale((state) => state.setLocale);
  const { t } = useI18n();
  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "th" ? "NowRift — ก้าวสู่รอยแยก" : "NowRift — Enter the Rift";
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = locale === "th"
      ? "สำรวจโลกแฟนตาซี NowRift ต่อสู้กับศัตรูและบอสในเกม Roguelike พิกเซลอาร์ต เล่นได้โดยไม่ต้องสมัครบัญชี"
      : "Enter NowRift as a guest. Explore a pixel-art roguelike adventure. No account required.";
  }, [locale]);
  return (
    <div className={compact ? "language-switcher compact" : "language-switcher"} role="group" aria-label={t("settings", "Language")}>
      <button type="button" aria-pressed={locale === "en"} className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>EN</button>
      <button type="button" aria-pressed={locale === "th"} className={locale === "th" ? "active" : ""} onClick={() => setLocale("th")}>TH</button>
    </div>
  );
}
