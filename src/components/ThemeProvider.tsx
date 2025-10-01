"use client";

import { createContext, useContext } from "react";

// Modern theme only - no switching
interface ThemeContextType {
  theme: "modern";
}

const ThemeContext = createContext<ThemeContextType>({ theme: "modern" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "modern" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}