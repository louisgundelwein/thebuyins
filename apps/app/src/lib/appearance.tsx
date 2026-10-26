import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import { appearanceChoices, palettes, type AppearanceChoice, type ColorScheme, type Colors } from "./theme";

const STORAGE_KEY = "appearance";

type ThemeState = {
  c: Colors;
  scheme: ColorScheme;
  choice: AppearanceChoice;
  setChoice: (choice: AppearanceChoice) => Promise<void>;
  pending: boolean;
  error: Error | null;
};

const ThemeContext = createContext<ThemeState | null>(null);

/** A missing preference follows the device. Invalid stored values surface as errors. */
function readChoice(value: string | null): AppearanceChoice {
  if (value === null) return "system";
  const choice = appearanceChoices.find((option) => option === value);
  if (!choice) throw new Error(`Invalid saved appearance: ${value}`);
  return choice;
}

/** Native alerts and pickers follow the same appearance as the app's own controls. */
function applyNativeChoice(choice: AppearanceChoice) {
  if (Platform.OS !== "web") Appearance.setColorScheme(choice === "system" ? "unspecified" : choice);
}

/** Saved device preference, live system changes, and colours without remounting the current screen. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [choice, setChoiceState] = useState<AppearanceChoice>();
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = Platform.OS === "web" ? localStorage.getItem(STORAGE_KEY) : await SecureStore.getItemAsync(STORAGE_KEY);
        if (!active) return;
        const next = readChoice(saved);
        applyNativeChoice(next);
        setChoiceState(next);
      } catch (cause) {
        if (active) setFatalError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  // React Native reports no preference when appearance is unavailable. Light is the app's neutral appearance.
  const scheme = choice === "system" || choice === undefined ? (systemScheme === "dark" ? "dark" : "light") : choice;
  const c = palettes[scheme];

  useEffect(() => {
    if (choice === undefined) return;
    let active = true;
    void SystemUI.setBackgroundColorAsync(c.bg).catch((cause: unknown) => {
      if (active) setFatalError(cause instanceof Error ? cause : new Error(String(cause)));
    });
    return () => { active = false; };
  }, [c, choice]);

  if (fatalError) throw fatalError;
  if (choice === undefined) return null;

  const setChoice = async (next: AppearanceChoice) => {
    if (saving.current || next === choice) return;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      if (Platform.OS === "web") localStorage.setItem(STORAGE_KEY, next);
      else await SecureStore.setItemAsync(STORAGE_KEY, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      return;
    } finally {
      saving.current = false;
      setPending(false);
    }
    applyNativeChoice(next);
    setChoiceState(next);
  };

  return <ThemeContext value={{ c, scheme, choice, setChoice, pending, error }}>{children}</ThemeContext>;
}

/** Current colours and the reversible appearance choice. */
export function useTheme() {
  const theme = use(ThemeContext);
  if (!theme) throw new Error("useTheme outside AppearanceProvider");
  return theme;
}
