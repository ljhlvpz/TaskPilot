import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, DarkColors } from "../constants/colors";

const STORAGE_KEY = "@taskpilot/themePreference";
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState("system");
  const [themeLoading, setThemeLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && ["light", "dark", "system"].includes(saved)) {
          setThemePreference(saved);
        }
      } catch (error) {
        console.warn("Could not load theme preference:", error);
      } finally {
        if (mounted) setThemeLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isDark = themePreference === "dark" ||
    (themePreference === "system" && systemScheme === "dark");
  const colors = isDark ? DarkColors : Colors;

  async function changeTheme(next) {
    if (!["light", "dark", "system"].includes(next)) return;
    const previous = themePreference;
    setThemePreference(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      setThemePreference(previous);
      throw error;
    }
  }

  const value = useMemo(() => ({ themePreference, themeLoading, isDark, colors, changeTheme }),
    [themePreference, themeLoading, isDark, colors]);
  return <ThemeContext.Provider value={value}><StatusBar barStyle={isDark ? "light-content" : "dark-content"} />{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAppTheme must be used inside ThemeProvider");
  return context;
}
