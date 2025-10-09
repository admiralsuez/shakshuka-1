"use client";

import { useState } from "react";

export const useExitConfirmation = () => {
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleExitAttempt = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow().close();
    } else {
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