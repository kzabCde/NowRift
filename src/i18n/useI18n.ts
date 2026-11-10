"use client";
import { useLocale } from "@/state/locale";
import {
  translate,
  translateText,
  number,
  date,
  plural,
  type PluralForms,
  type MessageKey,
  type Namespace,
  type Variables,
} from "./translator";
export function useI18n() {
  const locale = useLocale((state) => state.locale);
  return {
    locale,
    t: <N extends Namespace>(
      namespace: N,
      key: MessageKey<N>,
      vars?: Variables,
    ) => translate(locale, namespace, key, vars),
    text: (value: string) => translateText(locale, value),
    number: (value: number) => number(locale, value),
    plural: (count: number, forms: PluralForms) => plural(locale, count, forms),
    date: (value: number | Date) => date(locale, value),
  };
}
