import type { Currency } from "@thebuyins/core";
import * as SecureStore from "expo-secure-store";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { dictionaries, languageChoices, localeTags, resolveLanguage, type Dict, type Language, type LanguageChoice } from "./i18n";
import { formatMoney, formatSignedMoney } from "./money";

const STORAGE_KEY = "language";

type LanguageState = {
  choice: LanguageChoice;
  setChoice: (choice: LanguageChoice) => void;
  language: Language;
  t: Dict;
  /** BCP 47 tag for Intl and toLocale* formatting. */
  locale: string;
  money: (cents: number, currency: Currency) => string;
  signedMoney: (cents: number, currency: Currency) => string;
};

const LanguageContext = createContext<LanguageState | null>(null);

// SecureStore has no web implementation, so the website keeps the choice in localStorage.
const storage =
  Platform.OS === "web"
    ? {
        get: async () => localStorage.getItem(STORAGE_KEY),
        set: async (value: string) => localStorage.setItem(STORAGE_KEY, value),
      }
    : {
        get: () => SecureStore.getItemAsync(STORAGE_KEY),
        set: (value: string) => SecureStore.setItemAsync(STORAGE_KEY, value),
      };

const isChoice = (value: string | null): value is LanguageChoice => languageChoices.some((c) => c === value);

/**
 * Holds the language choice (saved on device, default "system") and provides its strings.
 * Changing the choice re-renders every consumer in place, so navigation state survives.
 * Renders nothing until the saved choice is read, so the first frame is never in the wrong language.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<LanguageChoice>();

  useEffect(() => {
    void storage.get().then((saved) => setChoiceState(isChoice(saved) ? saved : "system"));
  }, []);

  if (!choice) return null;

  const setChoice = (next: LanguageChoice) => {
    setChoiceState(next);
    void storage.set(next);
  };
  const language = resolveLanguage(choice);
  const locale = localeTags[language];
  const value = {
    choice,
    setChoice,
    language,
    t: dictionaries[language],
    locale,
    money: (cents: number, currency: Currency) => formatMoney(cents, locale, currency),
    signedMoney: (cents: number, currency: Currency) => formatSignedMoney(cents, locale, currency),
  };
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

/** Strings, locale, money formatting and the language setting. Components that show text must call this so they update on change. */
export function useLanguage() {
  const ctx = use(LanguageContext);
  if (!ctx) throw new Error("useLanguage outside LanguageProvider");
  return ctx;
}

/** Binds monetary formatting to one game or group currency. */
export function useMoney(currency: Currency) {
  const { money, signedMoney } = useLanguage();
  return {
    money: (cents: number) => money(cents, currency),
    signedMoney: (cents: number) => signedMoney(cents, currency),
  };
}
