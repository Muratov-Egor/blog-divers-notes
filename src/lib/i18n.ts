import ru from "../../messages/ru.json";
import en from "../../messages/en.json";

export type Locale = "ru" | "en";
export const locales: Locale[] = ["ru", "en"];
export const defaultLocale: Locale = "ru";

const messages: Record<Locale, Record<string, unknown>> = { ru, en };

/** Translate a dot-separated key, e.g. t("ru", "nav.blog"). */
export function t(locale: Locale, key: string): string {
  let value: unknown = messages[locale];
  for (const part of key.split(".")) {
    if (value == null || typeof value !== "object") break;
    value = (value as Record<string, unknown>)[part];
  }
  if (typeof value === "string") return value;
  return key;
}

/** Locale-aware path: localePath("en", "/blog") -> "/en/blog". */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === defaultLocale ? clean || "/" : `/en${clean === "/" ? "" : clean}`;
}

/** The same page in the other locale (used by the language switcher / hreflang). */
export function alternatePath(locale: Locale, path: string): string {
  return localePath(locale === "ru" ? "en" : "ru", path);
}

/** Russian-aware plural for dive counts: "1 погружение / 2 погружения / 5 погружений". */
export function diveCount(locale: Locale, count: number): string {
  if (locale === "en") return count === 1 ? "dive" : "dives";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "погружение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "погружения";
  return "погружений";
}

export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
