"use client";

import { useState } from "react";

const saveAllData = async () => {
  try {
    if (typeof window === "undefined") return;

    // Trigger save event that components can listen to
    const saveEvent = new CustomEvent('app:save-all');
    window.dispatchEvent(saveEvent);

    // Give components a moment to save
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('All data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

const closeTauriWindow = async () => {
  try {
    if (typeof window === "undefined") return;

    // Try multiple methods to close the window
    const win = (window as any);

    // Method 1: Try __TAURI__ API (v2)
    if (win.__TAURI__?.webviewWindow) {
      console.log("Closing via __TAURI__.webviewWindow");
      const currentWindow = win.__TAURI__.webviewWindow.getCurrentWebviewWindow();
      await currentWindow.close();
      return;
    }

    // Method 2: Try __TAURI_INTERNALS__ (production fallback)
    if (win.__TAURI_INTERNALS__?.invoke) {
      console.log("Closing via __TAURI_INTERNALS__");
      await win.__TAURI_INTERNALS__.invoke('close_window');
      return;
    }

    // Method 3: Fallback to window.close()
    console.log("Closing via window.close()");
    window.close();
  } catch (error) {
    console.error('Error closing window:', error);
    // Final fallback
    window.close();
  }
};

export const useExitConfirmation = () => {
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleExitAttempt = () => {
    console.log("Exit attempt triggered");
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    console.log("Exit confirmed");
    // Save all data before exiting
    await saveAllData();

    // Exit the application
    await closeTauriWindow();
  };

  const handleCancelExit = async () => {
    console.log("Exit cancelled");
    // Save data but don't exit
    await saveAllData();
    setShowExitDialog(false);
  };

  return {
    showExitDialog,
    handleExitAttempt,
    handleConfirmExit,
    handleCancelExit,
  };
};