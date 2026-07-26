"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY } from "@/components/theme/ThemeScript";

type StoredTheme = "light" | "dark";

function readStoredTheme(): StoredTheme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Private browsing / storage disabled — fall back to the OS preference.
    return null;
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

type ThemeContextValue = {
  resolvedTheme: StoredTheme;
  /** True while the theme is still following the operating system. */
  isSystem: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return context;
}

/**
 * Theme state: an explicit choice wins and is remembered; with no explicit
 * choice the OS preference is followed live.
 *
 * Nothing rendered here depends on the theme, which is deliberate — the toggle's
 * icon is swapped by CSS off the `.dark` class instead. That keeps server and
 * client markup identical, so there is no hydration mismatch and no need for a
 * "mounted" flag that would make the button pop in late.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredTheme | null>(() =>
    typeof window === "undefined" ? null : readStoredTheme(),
  );
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window === "undefined" ? false : systemPrefersDark(),
  );

  const resolvedTheme: StoredTheme = stored ?? (prefersDark ? "dark" : "light");

  // Track the OS preference so a system-following reader flips live. The
  // current value was already read by the state initialiser above, so this
  // effect only has to subscribe.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Keep other tabs in step with a choice made here.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setStored(readStoredTheme());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Mirror the resolved theme onto <html>. ThemeScript already did this for the
  // first paint; this keeps it true for every change afterwards.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const toggle = useCallback(() => {
    setStored((current) => {
      const now = current ?? (systemPrefersDark() ? "dark" : "light");
      const next: StoredTheme = now === "dark" ? "light" : "dark";

      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Not persisting is survivable; the class still flips for this session.
      }

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ resolvedTheme, isSystem: stored === null, toggle }),
    [resolvedTheme, stored, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
