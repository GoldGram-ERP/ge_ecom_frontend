import { ar } from "./ar";
import { en, type Dict } from "./en";

export type { Dict };

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

const dictionaries: Record<Locale, Dict> = { en, ar };
export const getDictionary = (locale: Locale): Dict => dictionaries[locale];

export const dirOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

/**
 * A localized path. Arabic is served at the root (no prefix); English lives under `/en`.
 * `localePath("ar", "/shop")` → `/shop`; `localePath("en", "/shop")` → `/en/shop`.
 * An anchor-only path (`#contact`) is kept relative to the locale's home.
 */
export function localePath(locale: Locale, path: string): string {
  if (path.startsWith("#")) return (locale === "en" ? "/en" : "/") + path;
  const clean = path === "/" ? "" : path;
  return locale === "en" ? `/en${clean}` : clean || "/";
}

/** Fills `{name}` placeholders in a dictionary string. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
