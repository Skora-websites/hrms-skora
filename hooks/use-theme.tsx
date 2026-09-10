"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ThemeConfig } from "@/types";

// ── Theme Color Palette Map ───────────────────────────────
// Each entry defines the gradient pair and derived colors
// for a theme color selection.

export interface ThemeColorPalette {
  primary: string;        // Main primary color
  primaryDark: string;     // Darker variant (gradient end)
  primaryLight: string;    // Light variant (for subtle backgrounds)
  ring: string;            // Focus ring color
}

export const THEME_COLORS: Record<string, ThemeColorPalette> = {
  "#5e72e4": { primary: "#5e72e4", primaryDark: "#825ee4", primaryLight: "#f0f1fe", ring: "rgba(94,114,228,0.3)" },
  "#344767": { primary: "#344767", primaryDark: "#212529", primaryLight: "#f0f1f4", ring: "rgba(52,71,103,0.3)" },
  "#11cdef": { primary: "#11cdef", primaryDark: "#1171ef", primaryLight: "#e8faff", ring: "rgba(17,205,239,0.3)" },
  "#2dce89": { primary: "#2dce89", primaryDark: "#2dcecc", primaryLight: "#eafbf3", ring: "rgba(45,206,137,0.3)" },
  "#fb6340": { primary: "#fb6340", primaryDark: "#fbb140", primaryLight: "#fff0eb", ring: "rgba(251,99,64,0.3)" },
  "#f5365c": { primary: "#f5365c", primaryDark: "#f56036", primaryLight: "#feeff2", ring: "rgba(245,54,92,0.3)" },
};

/**
 * Sync the primary colour palette to CSS custom properties on <html>.
 * Tailwind's `text-primary`, `bg-primary`, etc. all reference
 * `--color-primary` which we override inline so the entire app reacts.
 */
function syncPrimaryColorToDOM(color: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = THEME_COLORS[color] || THEME_COLORS["#5e72e4"];

  // Set the main primary colour — this overrides the :root value
  // from @theme, making all `text-primary` / `bg-primary` / etc. dynamic.
  root.style.setProperty("--color-primary", palette.primary);

  // Set gradient endpoints for @utility bg-gradient-*
  root.style.setProperty("--gradient-primary-start", palette.primary);
  root.style.setProperty("--gradient-primary-end", palette.primaryDark);

  // Set derived shades for primary-50 through primary-900
  root.style.setProperty("--color-primary-50", palette.primaryLight);
  root.style.setProperty("--color-primary-500", palette.primary);
  root.style.setProperty("--color-primary-600", palette.primaryDark);

  // Focus ring
  root.style.setProperty("--color-ring", palette.ring);

  // Primary alpha (used for form fill pulse animation)
  root.style.setProperty("--color-primary-alpha", palette.ring.replace("0.3", "0.15"));
}

interface ThemeContextType {
  theme: "light" | "dark";
  config: ThemeConfig;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  updateConfig: (updates: Partial<ThemeConfig>) => void;
  setSidebarMini: (mini: boolean) => void;
  setNavbarFixed: (fixed: boolean) => void;
  setSidebarType: (type: "bg-white" | "bg-default") => void;
  isSidebarMini: boolean;
  isNavbarFixed: boolean;
}

const defaultConfig: ThemeConfig = {
  mode: "light",
  isSidebarMini: false,
  sidebarMini: false,
  navbarFixed: true,
  primaryColor: "#5e72e4",
  sidebarType: "bg-white",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Synchronise the sidebar state CSS custom property and data attribute
 * on <html> so the visual width is correct before React hydrates.
 * This is called both from the inline script (in layout.tsx) and whenever
 * the React state changes during the session.
 */
function syncSidebarToDOM(mini: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--sidebar-width", mini ? "68px" : "270px");
  root.dataset.sidebarMini = String(mini);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [config, setConfig] = useState<ThemeConfig>(defaultConfig);
  const [mounted, setMounted] = useState(false);

  // First mount: load persisted config from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("crm-theme");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setThemeState(parsed.mode || "light");
        setConfig((prev) => ({ ...prev, ...parsed }));
        // Sync CSS var + data attribute to match the loaded config
        syncSidebarToDOM(parsed.sidebarMini === true);
        return; // correct width already synced from the parsed config
      } catch {
        // ignore
      }
    }
    // No stored config or parse failed — ensure default width
    syncSidebarToDOM(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When theme or config changes during the session, persist + sync DOM
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    // Sync sidebar state to DOM every time config changes
    syncSidebarToDOM(config.sidebarMini);
    // Sync primary colour to CSS custom properties
    syncPrimaryColorToDOM(config.primaryColor);
    // Persist to localStorage
    localStorage.setItem("crm-theme", JSON.stringify({ ...config, mode: theme }));
  }, [theme, config, mounted]);

  const toggleTheme = useCallback(() => {
    // Add scoped transition class for smooth theme animation
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 300);
    }
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((newTheme: "light" | "dark") => {
    setThemeState(newTheme);
  }, []);

  const updateConfig = useCallback((updates: Partial<ThemeConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const setSidebarMini = useCallback((mini: boolean) => {
    setConfig((prev) => ({ ...prev, sidebarMini: mini }));
    // Immediately sync DOM so there's no delay waiting for useEffect
    syncSidebarToDOM(mini);
  }, []);

  const setNavbarFixed = useCallback((fixed: boolean) => {
    setConfig((prev) => ({ ...prev, navbarFixed: fixed }));
  }, []);

  const setSidebarType = useCallback((type: "bg-white" | "bg-default") => {
    setConfig((prev) => ({ ...prev, sidebarType: type }));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        config,
        toggleTheme,
        setTheme,
        updateConfig,
        setSidebarMini,
        setNavbarFixed,
        setSidebarType,
        isSidebarMini: config.sidebarMini,
        isNavbarFixed: config.navbarFixed,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
