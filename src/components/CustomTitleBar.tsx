"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useExitConfirmationContext } from "@/components/ExitConfirmationProvider";

// Hook to detect if we're in Tauri
export const useIsTauri = () => {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const checkTauri = () => {
      const tauriAvailable = typeof window !== "undefined" && (window as any).__TAURI__;
      setIsTauri(tauriAvailable);
    };

    checkTauri();
  }, []);

  return isTauri;
};

export const CustomTitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { handleExitAttempt } = useExitConfirmationContext();

  // Check if running in Tauri
  const isTauri = useIsTauri();

  useEffect(() => {
    if (!isTauri) return;

    // Check initial maximized state
    const checkMaximized = async () => {
      try {
        const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
        const maximized = await webview.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Error checking maximized state:", error);
      }
    };

    checkMaximized();

    // Listen for window resize events
    const setupResizeListener = async () => {
      try {
        const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
        const unlisten = await webview.onResized(() => {
          checkMaximized();
        });
        return unlisten;
      } catch (error) {
        console.error("Error setting up resize listener:", error);
      }
    };

    setupResizeListener();
  }, [isTauri]);

  const handleMinimize = async () => {
    if (!isTauri) return;
    try {
      const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
      await webview.minimize();
    } catch (error) {
      console.error("Error minimizing:", error);
    }
  };

  const handleMaximize = async () => {
    if (!isTauri) return;
    try {
      const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
      if (isMaximized) {
        await webview.unmaximize();
      } else {
        await webview.maximize();
      }
    } catch (error) {
      console.error("Error maximizing:", error);
    }
  };

  const handleClose = () => {
    if (!isTauri) return;
    handleExitAttempt();
  };

  // Only render in Tauri
  if (!isTauri) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between bg-slate-800 text-white h-8 px-4 fixed top-0 left-0 right-0 z-50"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-white">S</span>
        </div>
        <span className="text-sm font-medium">Shakshuka</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMinimize}
          className="h-6 w-8 p-0 hover:bg-slate-700 text-white"
          data-tauri-drag-region="false"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect width="10" height="1" x="1" y="5.5" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMaximize}
          className="h-6 w-8 p-0 hover:bg-slate-700 text-white"
          data-tauri-drag-region="false"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            {isMaximized ? (
              <path d="M3 3h6v6H3V3zm1 1v4h4V4H4z" />
            ) : (
              <path d="M2 2h8v8H2V2zm1 1v6h6V3H3z" />
            )}
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-6 w-8 p-0 hover:bg-red-500 text-white"
          data-tauri-drag-region="false"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 3l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

// Component that conditionally positions header based on Tauri detection
export const ConditionalHeader = ({ children }: { children: React.ReactNode }) => {
  const isTauri = useIsTauri();

  return (
    <header className={`w-full border-b bg-background sticky ${isTauri ? 'top-8' : 'top-0'} z-40`}>
      {children}
    </header>
  );
};