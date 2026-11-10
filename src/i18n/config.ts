export const locales = ["en", "th"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export function isLocale(value: unknown): value is Locale { return value === "en" || value === "th"; }
export function resolveLocale(value: string | readonly string[] | null | undefined): Locale {
  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    const language = String(candidate ?? "").split("-")[0].toLowerCase();
    if (isLocale(language)) return language;
  }
  return defaultLocale;
}
