import { en } from "./translations/en";
import { de } from "./translations/de";
import { Language, TranslationStructure } from "./types";

export const translations: Record<Language, TranslationStructure> = {
  en,
  de,
};

export const SUPPORTED_LANGUAGES: {
  code: Language;
  name: string;
  nativeName: string;
}[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "de", name: "German", nativeName: "Deutsch" },
];

export const DEFAULT_LANGUAGE: Language = "en";

export function getTranslations(language: Language): TranslationStructure {
  return translations[language] || translations[DEFAULT_LANGUAGE];
}
