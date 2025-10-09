"use client";

import { useEffect } from "react";

// Tauri v2 API and Autostart plugin (safe to import in browser; guards included)
import { getVersion } from "@tauri-apps/api/app";
import { isEnabled, enable } from "@tauri-apps/plugin-autostart";

export const AutoStartInit = () => {
  useEffect(() => {
    const init = async () => {
      try {
        // Detect if running inside Tauri by attempting a benign API call
        await getVersion();
        // If autostart isn't enabled yet, enable it by default
        const enabled = await isEnabled();
        if (!enabled) {
          await enable();
        }
      } catch (_err) {
        // Not running in Tauri (web/SSR) – safely ignore
      }
    };
    init();
  }, []);

  // No UI – this component just runs a side effect
  return null;
};