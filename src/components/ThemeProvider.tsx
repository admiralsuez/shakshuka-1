"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply theme class immediately on mount
    try {
      let theme = localStorage.getItem("theme");
      if (!theme) {
        theme = "modern";
        localStorage.setItem("theme", "modern");
      }
      const cls = document.documentElement.classList;
      cls.remove("dark", "modern");
      if (theme === "dark") {
        cls.add("dark");
      } else if (theme === "modern") {
        cls.add("modern");
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  return <>{children}</>;
}