"use client";

import { useState } from "react";

const saveAllData = async () => {
  try {
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

export const useExitConfirmation = () => {
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleExitAttempt = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = async () => {
    // Save all data before exiting
    await saveAllData();

    // Exit the application
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow().close();
    } else {
      window.close();
    }
  };

  const handleCancelExit = async () => {
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