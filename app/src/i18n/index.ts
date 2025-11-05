import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en, es } from "./translations";

// Types
export type Language = "en" | "es";

type TranslationKeys = typeof en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
}

// Translation dictionaries
const translations: Record<Language, any> = {
  en,
  es,
};

// Create context
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper function to get nested translation value
function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Helper to replace template variables
function interpolate(text: string, params?: Record<string, any>): string {
  if (!params) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

// Translation function
export function t(key: string, params?: Record<string, any>): string {
  const context = useI18n();
  return context.t(key, params);
}

// Provider component
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference
  useEffect(() => {
    AsyncStorage.getItem("@app_language")
      .then((savedLang) => {
        if (savedLang === "es") {
          setLanguageState("es");
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Save language preference - use useCallback to maintain stable reference
  const setLanguage = useCallback(async (lang: Language) => {
    console.log("setLanguage called with:", lang);
    setLanguageState(lang);
    await AsyncStorage.setItem("@app_language", lang);
    console.log("Language saved to AsyncStorage:", lang);
  }, []);

  // Translation function - use useCallback with language dependency
  const translate = useCallback(
    (key: string, params?: Record<string, any>): string => {
      // Safety check for translations object
      if (!translations || !translations[language]) {
        console.warn(`Translations not loaded for language: ${language}`);
        return key;
      }

      const translation = getNestedValue(translations[language], key);

      if (!translation) {
        // Fallback to English if translation not found
        const fallback = translations.en ? getNestedValue(translations.en, key) : undefined;
        if (!fallback) {
          console.warn(`Translation missing for key: ${key}`);
          return key;
        }
        return interpolate(fallback, params);
      }

      return interpolate(translation, params);
    },
    [language],
  );

  // Memoize the context value to prevent unnecessary re-renders
  const value: I18nContextType = useMemo(
    () => ({
      language,
      setLanguage,
      t: translate,
    }),
    [language, setLanguage, translate],
  );

  if (isLoading) {
    return null; // Or a loading component
  }

  return React.createElement(I18nContext.Provider, { value }, children);
}

// Hook to use i18n
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

// Export languages list for settings
export const LANGUAGES = [
  { code: "en" as Language, name: "English", nativeName: "English" },
  { code: "es" as Language, name: "Spanish", nativeName: "Español" },
];