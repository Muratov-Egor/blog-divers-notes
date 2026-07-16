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

export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
