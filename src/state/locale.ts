"use client";
import { create } from "zustand";
import {
  defaultLocale,
  isLocale,
  preferredLocale,
  type Locale,
} from "@/i18n/config";
export const LOCALE_STORAGE_KEY = "nowrift-locale-v1";
export type LocaleState = {
  locale: Locale;
  hydrated: boolean;
  initialize: () => void;
  setLocale: (locale: Locale) => void;
};
export const useLocale = create<LocaleState>((set) => ({
  locale: defaultLocale,
  hydrated: false,
  initialize() {
    if (typeof window === "undefined") return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      /* private browsing */
    }
    const locale = preferredLocale(
      saved,
      navigator.languages?.length ? navigator.languages : [navigator.language],
    );
    set({ locale, hydrated: true });
  },
  setLocale(locale) {
    if (!isLocale(locale)) return;
    set({ locale, hydrated: true });
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* session-only */
    }
  },
}));
