"use client";

import { useEffect } from "react";
import { loadSettings } from "@/lib/local-storage";

// Convert hex to RGB values
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function ColorCustomizer() {
  useEffect(() => {
    let mounted = true;

    const applyCustomColor = async () => {
      try {
        const settings = await loadSettings();
        if (!mounted) return;

        const buttonColor = settings.buttonColor || "#007AFF";
        
        // Convert hex to RGB
        const rgb = hexToRgb(buttonColor);
        if (!rgb) return;

        // Apply as RGB format that CSS can use
        const rgbValue = `${rgb.r} ${rgb.g} ${rgb.b}`;
        
        // Set both formats for compatibility
        document.documentElement.style.setProperty("--primary", buttonColor);
        document.documentElement.style.setProperty("--primary-rgb", rgbValue);
        
        // Also update the theme color variable to use RGB
        document.documentElement.style.setProperty(
          "--color-primary", 
          `rgb(${rgb.r} ${rgb.g} ${rgb.b})`
        );
      } catch (error) {
        console.error("Failed to load button color:", error);
      }
    };

    applyCustomColor();

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}