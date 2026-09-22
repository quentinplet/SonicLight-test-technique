import { createI18n } from "vue-i18n";
import { en } from "./en";
import { fr } from "./fr";

/** The locales offered, and how each names itself in the switcher. */
export const LOCALES = { en: "English", fr: "Français" } as const;
export type Locale = keyof typeof LOCALES;

const STORAGE_KEY = "soniclight.locale";

/** The two shapes the interface needs; d() has no built-in named formats. */
const DATE_FORMATS = {
  short: { year: "numeric", month: "numeric", day: "numeric" },
  long: { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" },
} as const;

function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "fr") return saved;
  return navigator.language.startsWith("fr") ? "fr" : "en";
}

export const i18n = createI18n({
  // Composition API mode: components reach the messages through useI18n(), not a mixin.
  legacy: false,
  locale: initialLocale(),
  // A key missing from fr falls back to English rather than rendering the key itself.
  fallbackLocale: "en",
  messages: { en, fr },
  datetimeFormats: { en: DATE_FORMATS, fr: DATE_FORMATS },
});

/** Persists the choice and tells the document, which a component's `locale` ref cannot do. */
export function setLocale(next: Locale): void {
  i18n.global.locale.value = next;
  localStorage.setItem(STORAGE_KEY, next);
  // Screen readers and hyphenation read this, not the switcher.
  document.documentElement.lang = next;
}

document.documentElement.lang = i18n.global.locale.value;
