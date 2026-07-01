"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const THEME_LS_KEY = "emergency_web_dark_mode";

type ThemeContextValue = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setIsDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkModeState] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_LS_KEY);
      if (saved === "1") setIsDarkModeState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setIsDarkMode = useCallback((value: boolean) => {
    setIsDarkModeState(value);
    try {
      localStorage.setItem(THEME_LS_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_LS_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setIsDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
