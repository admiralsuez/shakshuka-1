"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "modern";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("modern");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read theme from localStorage and document class after mount
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = storedTheme || "modern";
    
    if (!storedTheme) {
      localStorage.setItem("theme", "modern");
    }
    
    setThemeState(initialTheme);
    setMounted(true);

    // Sync with localStorage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        const newTheme = e.newValue as Theme;
        document.documentElement.classList.remove("light", "dark", "modern");
        if (newTheme !== "light") {
          document.documentElement.classList.add(newTheme);
        }
        setThemeState(newTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem("theme", newTheme);
      
      const cls = document.documentElement.classList;
      cls.remove("light", "dark", "modern");
      if (newTheme !== "light") {
        cls.add(newTheme);
      }
      
      setThemeState(newTheme);
    } catch (e) {
      console.error("Failed to set theme:", e);
    }
  };

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

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