"use client";

import { useState, useEffect } from "react";

export const useExitConfirmation = () => {
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your progress may be lost.";
      return "Are you sure you want to leave? Your progress may be lost.";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Alt+F4, Ctrl+Q, Ctrl+W, etc.
      if (
        (e.altKey && e.key === "F4") ||
        (e.ctrlKey && e.key === "q") ||
        (e.ctrlKey && e.key === "Q") ||
        (e.ctrlKey && e.key === "w") ||
        (e.ctrlKey && e.key === "W")
      ) {
        e.preventDefault();
        setShowExitDialog(true);
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleExitAttempt = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    console.log("🚪 Confirming exit...");
    // Close the application
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      try {
        console.log("🔍 Using Tauri v2 API to close window...");
        // If running in Tauri, use the Tauri v2 webview API
        const { getCurrentWebviewWindow } = (window as any).__TAURI__.webviewWindow;
        const webview = getCurrentWebviewWindow();
        await webview.close();
        console.log("✅ Window closed via Tauri v2 API");
      } catch (error) {
        console.error("❌ Error closing window with Tauri v2 API:", error);
        // Fallback to old API
        try {
          console.log("🔍 Trying fallback to Tauri v1 API...");
          (window as any).__TAURI__.core.exit();
        } catch (fallbackError) {
          console.error("❌ Fallback also failed:", fallbackError);
          window.close();
        }
      }
    } else {
      // If running in browser, close the window
      console.log("🔍 Closing browser window...");
      window.close();
    }
  };

  const handleCancelExit = () => {
    setShowExitDialog(false);
  };

  return {
    showExitDialog,
    handleExitAttempt,
    handleConfirmExit,
    handleCancelExit,
  };
};
