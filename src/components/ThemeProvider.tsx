"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "modern";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read initial theme from document class (already set by inline script)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "modern";
    
    const cls = document.documentElement.classList;
    if (cls.contains("dark")) return "dark";
    if (cls.contains("modern")) return "modern";
    return "light";
  });

  const setTheme = (newTheme: Theme) => {
    try {
      // Update localStorage
      localStorage.setItem("theme", newTheme);
      
      // Update document classes
      const cls = document.documentElement.classList;
      cls.remove("dark", "modern", "light");
      if (newTheme !== "light") {
        cls.add(newTheme);
      }
      
      // Update state
      setThemeState(newTheme);
    } catch (e) {
      console.error("Failed to set theme:", e);
    }
  };

  // Sync with localStorage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        const newTheme = e.newValue as Theme;
        const cls = document.documentElement.classList;
        cls.remove("dark", "modern", "light");
        if (newTheme !== "light") {
          cls.add(newTheme);
        }
        setThemeState(newTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}