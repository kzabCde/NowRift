import { th } from "./dictionaries/th";
import type { Locale } from "./config";
export type Namespace = keyof typeof th;
export type MessageKey<N extends Namespace> = Extract<keyof (typeof th)[N], string>;
export type Variables = Record<string, string | number>;
const groups: ReadonlyArray<Record<string, string>> = Object.values(th);
const content = Object.assign({}, ...groups) as Record<string, string>;
const missing = new Set<string>();
function interpolate(value: string, vars?: Variables): string {
  return value.replace(/\{([a-zA-Z][\w]*)\}/g, (full, key: string) =>
    vars && Object.hasOwn(vars, key) ? String(vars[key]) : full,
  );
}
export function translate<N extends Namespace>(locale: Locale, namespace: N, key: MessageKey<N>, vars?: Variables): string {
  const translation: string | undefined = (th[namespace] as Record<string, string>)[key];
  if (locale === "th" && !translation && process.env.NODE_ENV !== "production") {
    const id = namespace + "." + key;
    if (!missing.has(id)) { missing.add(id); console.warn("[i18n] Missing Thai translation:", id); }
  }
  return interpolate(locale === "th" && translation ? translation : key, vars);
}
export function translateText(locale: Locale, source: string): string {
  if (locale === "en" || !source) return source;
  const exact = content[source];
  const missingArt = /^Missing art: (.+)\. A fallback is in use; reload to retry\.$/.exec(source);
  if (missingArt) return translate(locale, "errors", "Missing art: {asset}. A fallback is in use; reload to retry.", { asset: missingArt[1] });
  if (exact) return exact;
  // Existing progression messages keep their stable English return values for saved-state compatibility.
  const all = /^Clear all five (NORMAL|HARD|NIGHTMARE) stages in this world\.$/.exec(source);
  if (all) return translate(locale, "world", "Clear all five {difficulty} stages in this world.", { difficulty: content[all[1]] ?? all[1] });
  const stage = /^Clear Stage (\d+) on (NORMAL|HARD|NIGHTMARE)\.$/.exec(source);
  if (stage) return translate(locale, "world", "Clear Stage {stage} on {difficulty}.", { stage: stage[1], difficulty: content[stage[2]] ?? stage[2] });
  if (/^Defeat the previous world’s Normal final boss\.$/.test(source)) return translate(locale, "world", "Defeat the previous world’s Normal final boss.");
  if (source.startsWith("Campaign save failed; progression was not changed. ")) return content["Campaign save failed; progression was not changed. "] + source.slice("Campaign save failed; progression was not changed. ".length);
  return source;
}
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export function plural(locale: Locale, count: number, forms: PluralForms, vars?: Variables): string {
  const category = new Intl.PluralRules(locale === "th" ? "th-TH" : "en-US").select(count);
  return interpolate(forms[category] ?? forms.other, { ...vars, count });
}
export function number(locale: Locale, value: number): string { return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { numberingSystem: "latn" }).format(value); }
export function date(locale: Locale, value: number | Date): string { return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", calendar: "gregory", numberingSystem: "latn" }).format(value); }
