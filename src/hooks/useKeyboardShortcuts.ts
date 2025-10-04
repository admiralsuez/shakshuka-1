import { useEffect } from "react";

export type ShortcutHandler = () => void;

export interface KeyboardShortcuts {
  [key: string]: ShortcutHandler;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if (isInput) return;

      // Check for shortcuts
      const key = e.key.toLowerCase();
      
      if (shortcuts[key]) {
        // CRITICAL FIX: Always prevent default to stop 'n' from being typed in the input
        e.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}